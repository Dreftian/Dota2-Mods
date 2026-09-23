/* Installing, removing, switching and importing mods: the channels the Library screen and
 * the catalog's install buttons reach for.
 *
 * The bodies are unchanged from where they were in main.js. What changed is that everything
 * they use arrives as an argument, so the list at the top of the function is an honest answer
 * to "what does managing a mod actually touch".
 */
const fs = require('fs');
const path = require('path');
const { dialog, ipcMain } = require('electron');

const { t } = require('./i18n');
const { SLOT_CAPACITY } = require('./slots');
const { isLocked } = require('./master-switch');

// What the Rank Customizer generated, and nothing else. Every 'ranks' record used to count, so
// Apply and Reset uninstalled the catalog's medal packs along with it.
const isGeneratedRank = (r) => !!r.customRank || String(r.fileRef || '').startsWith('generator:');
const fileKey = (f) => `${f.root}/${f.relPath}`.toLowerCase();

// The game holding a file is the usual reason a change to the folder fails, and "EBUSY: resource
// busy or locked" tells nobody what to do about it.
const forPeople = (err) => (isLocked(err) ? t('Закрой Dota 2 перед изменением файлов игры') : String((err && err.message) || err));

/** @param {object} ctx  the services and main-process callbacks these channels use */
function registerModsIpc({
  applyMasterToCursors, blocked, catalog, diag, disableOtherCursors, fingerprints, importVpkBuffers, importVpkPaths, installer, isCursorRecord, library, refreshPresence, schemaService, sendProgress, settings, verifyStuck, win,
}) {
  /* Up to 1.0.14 every 'ranks' install was generated, the catalog's eight medal cards included,
   * and recorded under the card's own fileRef without customRank. isGeneratedRank does not know
   * those, so a rank applied over one lost to it and Reset left it in the game. They are marked
   * once, on the first start after, which leaves alone a medal pack downloaded since. Not by
   * their bytes: the generator changed between 1.0.12 and 1.0.14. Here beside the rule rather
   * than with main.js's startup repairs, and registering runs once, before any channel answers. */
  try {
    if (!settings.get('legacyRanksMigrated')) {
      for (const r of library.list()) {
        if (r.categoryId === 'ranks' && r.kind !== 'pack' && !isGeneratedRank(r)) library.update(r.id, { customRank: true });
      }
      settings.set('legacyRanksMigrated', true);
    }
  } catch (err) { diag(`legacy ranks not marked: ${err && err.message}`); }

  /* A mod written while mods are off goes off with the rest, or it loads while the Library says
   * nothing does. installer.masterIsOff() is the one predicate: the user's switch, or a .moff
   * on disk. The library's own list goes along because the note in the folder, which is what
   * tells a pak99 of ours from Minify's, is only rewritten when the Library lists - and the mod
   * installed a moment ago may be that pak99. */
  const keepMasterOff = () => {
    let off = false;
    try { off = installer.masterIsOff(); } catch { /* no game path: nothing is loading anyway */ }
    if (!off) return;
    try { installer.setMasterEnabled(false, library.knownLangRelPaths()); } catch (err) { diag(`master switch after install: ${err.message}`); }
    applyMasterToCursors(false);
  };

  /* Every generated rank out, as one change or none. A removal that failed used to be swallowed:
   * Reset said the rank was restored with it still in the game, and Apply added a second one
   * that the first, on its lower slot, went on beating. `keep` is what Apply just wrote: an old
   * record whose pak was already gone from disk gave its name to the new one, and this deleted it. */
  const removeGeneratedRanks = (keep = []) => {
    const old = library.list().filter(isGeneratedRank);
    const fresh = new Set(keep.map(fileKey));
    const files = old.flatMap((r) => r.files || []).filter((f) => !fresh.has(fileKey(f)));
    if (files.length) installer.remove(files);
    for (const r of old) library.removeRecord(r.id);
  };

  // `win` arrives as a getter, not as the window. These are registered before the window
  // is created, so a value captured here would be undefined forever - which is exactly
  // what win:isMaximized did on the first run after this file was split out.
  ipcMain.handle('mods:install', async (e, payload) => {
    // payload: { categoryId, name, styleLabel, fileRef, preview }
    const stop = blocked('install');
    if (stop) return stop;
    try {
      const existing = library.findByKey(payload.categoryId, payload.name, payload.styleLabel);
      if (existing) return { error: t('Уже установлено'), already: true };
      // a cursor set is written straight over the one in resource\cursor, so the set that
      // is on has to step aside first — otherwise its files are gone with no way back
      const replaced = payload.categoryId === 'cursors' ? disableOtherCursors(null) : [];
      const files = await installer.install({
        categoryId: payload.categoryId,
        modName: payload.name,
        fileRef: payload.fileRef,
      });
      const rec = library.add({ ...payload, files });
      // lift any item-schema changes out of the mod and rebuild the schema pak
      const harvest = schemaService.harvest(rec);
      if (harvest && harvest.deltas) schemaService.refresh();
      // keep the set's own copy, so it can be switched back on later without a re-download
      if (payload.categoryId === 'cursors') { try { installer.ensureCursorStore(rec.id, files); } catch { /* noop */ } }
      keepMasterOff();
      sendProgress({ type: 'done', label: payload.name });
      return { ok: true, record: rec, replaced };
    } catch (err) {
      sendProgress({ type: 'error', label: payload.name, message: String(err.message || err) });
      return { error: String(err.message || err) };
    }
  });

  ipcMain.handle('mods:exportSingle', async (e, id) => {
    const rec = library.find(id);
    if (!rec) return { error: t('Мод не найден') };
    try {
      // a cursor set is loose files, not a pak — it travels as the zip the catalog uses
      const cursor = isCursorRecord(rec);
      const buf = cursor ? installer.cursorZip(rec) : installer.mergeToSingleVpk(rec, rec.schema);
      const safe = rec.name.replace(/[<>:"/\\|?*]/g, '_') || 'mod';
      const res = await dialog.showSaveDialog(win(), {
        title: cursor ? t('Сохранить курсор архивом') : t('Сохранить мод одним .vpk файлом'),
        defaultPath: `${safe}.${cursor ? 'zip' : 'vpk'}`,
        filters: [cursor
          ? { name: t('Архив курсора'), extensions: ['zip'] }
          : { name: t('VPK мод'), extensions: ['vpk'] }],
      });
      if (res.canceled || !res.filePath) return { cancelled: true };
      fs.writeFileSync(res.filePath, buf);
      return { ok: true, path: res.filePath, size: buf.length };
    } catch (err) {
      return { error: String(err.message || err) };
    }
  });

  // The other half of "pack a folder": hand the author back the files themselves, so a mod
  // can be opened, changed and dropped in again without any other tool.
  ipcMain.handle('mods:unpackToFolder', async (e, id) => {
    const rec = library.find(id);
    if (!rec) return { error: t('Мод не найден') };
    try {
      const res = await dialog.showOpenDialog(win(), {
        title: t('Куда распаковать мод'),
        properties: ['openDirectory', 'createDirectory'],
      });
      if (res.canceled || !res.filePaths.length) return { cancelled: true };
      const safe = rec.name.replace(/[<>:"/\\|?*]/g, '_') || 'mod';
      const dest = path.join(res.filePaths[0], safe);
      fs.mkdirSync(dest, { recursive: true });
      const out = installer.unpackToFolder(rec, dest);
      return { ok: true, path: dest, ...out };
    } catch (err) {
      return { error: String(err.message || err) };
    }
  });

  ipcMain.handle('mods:importDialog', async () => {
    const res = await dialog.showOpenDialog(win(), {
      title: t('Выбери .vpk файлы модов или .zip с ними'),
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: t('Моды (.vpk, .zip)'), extensions: ['vpk', 'zip'] }],
    });
    if (res.canceled || !res.filePaths.length) return { cancelled: true };
    return importVpkPaths(res.filePaths);
  });

  // folder picker — Windows can't offer files and folders in one dialog, so a pack that
  // unzipped to a whole game tree (Skinchanger) gets its own entry point
  ipcMain.handle('mods:importFolderDialog', async () => {
    const res = await dialog.showOpenDialog(win(), {
      title: t('Выбери папку с модами'),
      properties: ['openDirectory'],
    });
    if (res.canceled || !res.filePaths.length) return { cancelled: true };
    return importVpkPaths(res.filePaths);
  });

  ipcMain.handle('mods:importPaths', (e, paths) => importVpkPaths(Array.isArray(paths) ? paths : []));
  ipcMain.handle('mods:importBuffers', (e, items) => importVpkBuffers(items));

  ipcMain.handle('mods:list', () => {
    // folder sync: a mod deleted straight from the game folder drops out of the library
    try {
      for (const rec of [...library.list()]) {
        if (rec.kind === 'pack') {
          if ((rec.files || []).length && !installer.langPrimaryPresent(rec)) {
            installer.removePackFully(rec);
            library.removeRecord(rec.id);
          }
        } else if (!installer.langPrimaryPresent(rec)) {
          library.removeRecord(rec.id);
        }
      }
    } catch { /* no game path yet — nothing to sync */ }

    let external = [];
    // fingerprint -> a mod already in the library, so a file that is byte-identical to
    // something managed can be called what it is (a leftover copy) instead of a mystery
    const installedFps = new Map();
    try {
      for (const rec of library.list()) {
        if (rec.kind === 'pack') continue;
        const a = installer.analyzeRecord(rec);
        if (a && a.fp && !installedFps.has(a.fp)) installedFps.set(a.fp, rec.name);
      }
    } catch { /* no game path — nothing to compare against */ }
    try {
      const known = library.knownFiles();
      const canMatch = fingerprints.hasData();
      external = installer.externalFiles(known, { scanExtras: canMatch });
      for (const f of external) {
        if (!f.fp) continue;
        f.match = fingerprints.match(f.fp); // recognise catalog mods
        if (installedFps.has(f.fp)) f.duplicateOf = installedFps.get(f.fp);
      }
      // lang-root files are always worth listing; maps/cursor only when recognised
      external = external.filter((f) => f.primary || f.match);
      // fonts share panorama\fonts with vanilla — subset-match instead of a folder fp
      if (canMatch && fingerprints.fonts.length && !known.some((f) => f.root === 'fonts')) {
        const fh = installer.fontFolderHashes();
        for (const m of (fh ? fingerprints.matchFonts(fh) : [])) {
          external.push({
            kind: 'font', key: `__font__${m.name}`, name: m.name, primary: false,
            size: 0, enabled: true, files: Object.keys(m.files).map((bn) => ({ root: 'fonts', relPath: bn })),
            match: [{ name: m.name, categoryId: m.categoryId, styleLabel: m.styleLabel || null }],
          });
        }
      }
    } catch { /* lang folder may not exist yet */ }
    // imported mods have no catalog identity — tag them by content, match to catalog if known
    const installed = library.list().map((rec) => {
      if (rec.categoryId !== 'imported') return rec;
      try {
        const a = installer.analyzeRecord(rec) || {};
        // fpOriginal: the file was repacked to drop the whole-game tables it shipped, so
        // match on what it hashed to before that, or a recognised mod becomes unknown
        const matches = fingerprints.match(rec.fpOriginal || a.fp);
        // one-time: give bare "pakNN" imports a real name — the catalog name if the file
        // is recognised, otherwise the content (hero / set / kind)
        if (/^!?pak\d+$/i.test(rec.name)) {
          const dir = rec.files.find((f) => f.root === 'lang' && /_dir\.vpk$/i.test(f.relPath));
          const nm = (matches && matches[0] && matches[0].name) || (dir && installer.displayNameForFile(dir.relPath));
          if (nm && nm !== rec.name) { library.update(rec.id, { name: nm }); rec.name = nm; }
        }
        return { ...rec, ...a, match: matches };
      } catch { return rec; }
    });
    // pak100 and above is never mounted (src/slots.js). Read off the slot rather than the
    // notMounted that remountHighSlots leaves, which a swap or a pack rebuild can outrun.
    const parked = (r) => installer.slotNumber(r) > 99;
    // Who is quietly covering whom. Both lists take part: a foreign file in the folder is
    // mounted by the game exactly like a managed one, so leaving it out would name the wrong
    // winner. Only switched-on mods, because a switched-off one is renamed and never mounted,
    // and not a parked one, which the game never mounts either.
    let covered = new Map();
    try {
      const live = [
        ...installed.filter((r) => r.enabled && !parked(r)).map((r) => ({ key: r.id, name: r.name, files: r.files })),
        ...external.filter((f) => f.enabled).map((f) => ({ key: f.key, name: f.name, files: f.files })),
      ];
      covered = installer.coverage(live);
    } catch { /* no game path — nothing is mounted, nothing covers anything */ }
    external = external.map((f) => (covered.has(f.key) ? { ...f, coveredBy: covered.get(f.key) } : f));

    let slots = 0;
    let slotCeil = SLOT_CAPACITY;
    try { ({ taken: slots, ceiling: slotCeil } = installer.slotUse(library.knownLangRelPaths())); } catch { /* no game path */ }
    /* Leave a note on disk saying which files here are ours. This handler already reconciles
     * the library against the folder and the renderer re-lists after every install, toggle,
     * preset and bulk action, so it is the one place that keeps the note honest without
     * hooking a dozen handlers - the same reason refreshPresence() sits here. */
    try { installer.writeOwnership(library.knownLangRelPaths()); } catch (err) { diag(`ownership note skipped: ${err.message}`); }
    // the renderer re-lists after every install, toggle, preset and bulk action, so this is
    // the one place that keeps the Discord status honest without hooking a dozen handlers
    refreshPresence();
    // The lifted item blocks are only ever needed in the main process; the renderer just
    // shows that a mod has them, and whether the patch that makes them work is on. Copies,
    // never the stored records — dropping the field off those would erase it on save.
    const schemaOn = schemaService.state().enabled;
    const listed = installed.map((rec) => {
      const by = covered.get(rec.id);
      const own = { ...rec, notMounted: parked(rec) || undefined, ...(by ? { coveredBy: by } : {}) };
      if (!Array.isArray(rec.schema)) return own;
      const { schema, ...rest } = own;
      return { ...rest, schemaCount: schema.length, schemaLive: schemaOn };
    });
    // slotCeil is what the allocator can actually hand out, for every plan: counted in
    // src/slots.js, because a number written here drifted from it once already
    return { installed: listed, external, slots, slotCeil, verifyStuck: verifyStuck() };
  });

  ipcMain.handle('ranks:getMetadata', async () => {
    const { RANK_MEDALS, HERO_TIERS } = require('./rank-generator');
    return { medals: RANK_MEDALS, tiers: HERO_TIERS };
  });

  ipcMain.handle('ranks:getCustom', async () => {
    const active = library.list().find(isGeneratedRank);
    if (!active) return { active: false };
    return { active: true, record: active, settings: active.rankSettings || null };
  });

  ipcMain.handle('ranks:applyCustom', async (e, payload) => {
    const stop = blocked('install');
    if (stop) return stop;
    try {
      const { generateRankVpk } = require('./rank-generator');
      const gen = generateRankVpk(payload);
      const record = (written) => library.add({
        categoryId: 'ranks',
        name: gen.name,
        styleLabel: null,
        fileRef: 'custom_rank.vpk',
        customRank: true,
        rankSettings: {
          medal: payload.medal,
          baseRank: gen.baseRank || payload.baseRank || 'rank0',
          stars: gen.stars,
          mmr: gen.mmr,
          immortalRank: gen.immortalRank,
          heroTier: payload.heroTier,
          heroLevel: payload.heroLevel,
        },
        files: written,
      });

      // The new rank goes in before the old one comes out: the other way round, an install
      // that failed left the player with no rank at all. Except with every slot taken, where
      // the old one has to make room first or the rank could not be changed at all.
      let files;
      try {
        files = await installer.installDirectBuffer(gen.buffer, gen.name, 'ranks');
      } catch (err) {
        if (err.code !== 'ENOSLOT' || !library.list().some(isGeneratedRank)) throw err;
        removeGeneratedRanks();
        files = await installer.installDirectBuffer(gen.buffer, gen.name, 'ranks');
      }
      try {
        removeGeneratedRanks(files);
      } catch (err) {
        // The old one is still there, on a lower slot, and would go on winning. Take the new one
        // back out so the game is as it was; if even that fails, keep it in the library rather
        // than leave a pak nothing points at.
        try { installer.remove(files); } catch { record(files); }
        throw err;
      }
      const rec = record(files);
      keepMasterOff();

      sendProgress({ type: 'done', label: gen.name });
      return { ok: true, record: rec, name: gen.name };
    } catch (err) {
      sendProgress({ type: 'error', label: 'Rank Changer', message: forPeople(err) });
      return { error: forPeople(err) };
    }
  });

  ipcMain.handle('ranks:removeCustom', async () => {
    try {
      removeGeneratedRanks();
      return { ok: true };
    } catch (err) {
      return { error: forPeople(err) };
    }
  });
}

module.exports = { registerModsIpc };
