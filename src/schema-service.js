// Orchestration around the item schema: what goes into it, when it is rebuilt, and how a
// game update is repaired. Kept out of main.js so the whole flow can be exercised without
// starting Electron.
//
// The rules it enforces:
//   - the schema is ALWAYS rebuilt from the installed game's own items_game.txt, so it can
//     never be the stale copy a mod happened to ship;
//   - a mod's changes live in the library record (record.schema), never in its VPK;
//   - nothing is written to the game unless the user turned the patch on.
const fs = require('fs');
const path = require('path');
const patcher = require('./patcher');
const schema = require('./schema');
const heroItems = require('./hero-items');
const { readVpkEntryFile } = require('./vpk');
const { t } = require('./i18n');

// Where the game keeps the English names of item styles, and the loose copy a modder may have.
const STYLE_LOC = 'resource/localization/items_english.txt';

/**
 * @param {object} deps
 * @param {import('./settings').Settings} deps.settings
 * @param {import('./library').Library} deps.library
 * @param {import('./installer').Installer} deps.installer
 * @param {string} deps.userDataDir
 * @param {() => boolean} [deps.entitled]  may hero picks go into the build (the Arsenal is VIP)
 */
function createSchemaService({ settings, library, installer, userDataDir, entitled = () => true }) {
  const backupDir = path.join(userDataDir, 'backups', 'patch');
  const gamePath = () => settings.get('dotaGamePath');
  // an entitlement check that throws is a no, not a failed rebuild
  const isEntitled = () => { try { return !!entitled(); } catch { return false; } };

  // The game's table is 50 MB and walking its 25k items costs ~300 ms, while the picker
  // asks about a dozen slots in a row. Hold on to the text until the game itself changes:
  // the stamp is a stat() of the paks, so noticing an update stays cheap.
  let cache = { stamp: null, base: null };
  /** The game's own table, read once per build of the game. */
  function vanillaBase() {
    const game = gamePath();
    let stamp = null;
    try { stamp = schema.gameSchemaStamp(game); } catch { /* fall through to a fresh read */ }
    if (stamp && cache.stamp === stamp && cache.base) return cache.base;
    const base = schema.readGameSchema(game);
    cache = { stamp, base };
    return base;
  }
  const vanilla = () => vanillaBase().text;

  // Enabled mods' lifted item blocks + the free cosmetics the user picked. A cosmetic pick
  // is a library record like any other (categoryId 'cosmetic', slot + itemId of its own),
  // so toggling, deleting and sharing it in a preset all go through the normal machinery.
  //
  // Arsenal picks ('hero:' slots, src/hero-items.js) go in last, so an explicit pick wins over a
  // Skinchanger block for the same default item, and only while entitled() says yes: the check
  // lives here, where the table is built, not only on the screen that makes the pick.
  function build(vanillaText) {
    const out = [];
    const heroRecs = [];
    for (const rec of library.list()) {
      if (rec.enabled === false) continue;
      if (rec.categoryId === 'cosmetic' && heroItems.isHeroSlot(rec.slot)) { heroRecs.push(rec); continue; }
      if (rec.categoryId === 'cosmetic') {
        try {
          const target = schema.baseItemFor(vanillaText, rec.slot);
          if (!target) continue;
          out.push({ id: target.id, block: schema.baseItemPatch(vanillaText, target.id, rec.itemId), source: rec.name });
        } catch { /* a donor Valve removed simply drops out of the build */ }
        continue;
      }
      if (!Array.isArray(rec.schema)) continue;
      for (const d of rec.schema) out.push({ id: d.id, block: d.block, source: rec.name });
    }
    const heroes = heroRecs.length > 0 && isEntitled();
    if (heroes) out.push(...heroItems.heroPatches(vanillaText, heroRecs));
    return { list: out, heroes };
  }
  const patches = (vanillaText) => build(vanillaText).list;

  /* A rebuild that failed leaves the old table live under a library that says otherwise, and
   * nothing about the game's stamp tells heal() so. `schemaDirty` does: set on a failure, cleared
   * by the next rebuild that lands, and heal() treats it like a game update.
   * `schemaHeroes` is whether the live build let Arsenal picks in. A subscription that runs out
   * while the app is closed sends no event, so heal() compares it with what is owed now. */
  const mark = (key, value) => { if (!!settings.get(key) !== value) settings.set(key, value); };

  const hasLiveHeroPick = () => library.list().some((r) => r.categoryId === 'cosmetic' && r.enabled !== false && heroItems.isHeroSlot(r.slot));
  // the entitlement last: it reads the account's files
  const heroesOwed = () => !!settings.get('schemaPatch') && hasLiveHeroPick() && isEntitled();

  // Rebuild and write the schema pak, or remove it when nothing needs one.
  function refresh() {
    const game = gamePath();
    if (!game) return { ok: false, reason: 'no-game-path' };
    try {
      const drop = (heroes = false) => {
        schema.undeploy({ gamePath: game, folder: patcher.FOLDER });
        settings.set('schemaStamp', null);
        mark('schemaDirty', false);
        mark('schemaHeroes', heroes);
        return { ok: true, deployed: false, patches: 0 };
      };
      if (!settings.get('schemaPatch')) return drop();
      // through the cache, not around it: this runs on every mod removed, enabled or
      // switched off, and re-extracting 50 MB from the game's pak each time was the wait
      const base = vanillaBase();
      const { list, heroes } = build(base.text);
      if (!list.length) return drop(heroes);
      const res = schema.deploy({ gamePath: game, folder: patcher.FOLDER, patches: list, base });
      settings.set('schemaStamp', res.stamp);
      mark('schemaDirty', false);
      mark('schemaHeroes', heroes);
      return { ok: true, deployed: true, patches: res.applied.length, missing: res.missing, conflicts: res.conflicts, bytes: res.bytes };
    } catch (err) {
      try { mark('schemaDirty', true); } catch { /* the settings file is the least of it */ }
      return { ok: false, error: String(err.message || err) };
    }
  }

  /**
   * Signing in or out, or subscribing, can change what the table may carry. It is rebuilt only
   * when that changed while a hero pick is live - a password change or a second sign-in costs
   * nothing - and this never throws: it runs off an auth event, with nobody waiting on the
   * answer. A failure is logged and left to schemaDirty and heal().
   * @param {(msg: string) => void} [log]
   * @returns {object|null} what refresh() said, or null when nothing needed building
   */
  function entitlementChanged(log = () => {}) {
    try {
      if (heroesOwed() === !!settings.get('schemaHeroes')) return null;
      const res = refresh();
      if (!res.ok && res.error) log(`arsenal: rebuild after an account change failed: ${res.error}`);
      return res;
    } catch (err) {
      log(`arsenal: rebuild after an account change failed: ${err.message || err}`);
      return null;
    }
  }

  // A Dota update overwrites the patched gameinfo and moves the item table underneath our
  // build. Runs on startup and before launching the game.
  function heal() {
    const game = gamePath();
    if (!game) return { ok: true, healed: [] };
    // Safe mode still needs a look: if the game's own file is not what Valve signed, the
    // client refuses the install and nothing in the app is on to explain it. Putting the
    // verified original back is the whole repair (see patcher.restoreBranch).
    if (!settings.get('schemaPatch')) {
      try {
        if (patcher.state(game, patcher.FOLDER).vanillaOk) return { ok: true, healed: [] };
        patcher.revert({ gamePath: game, folder: patcher.FOLDER, backupDir });
        return { ok: true, healed: patcher.state(game, patcher.FOLDER).vanillaOk ? ['vanilla'] : [] };
      } catch (err) {
        return { ok: false, error: String(err.message || err), healed: [] };
      }
    }
    const healed = [];
    try {
      const st = patcher.state(game, patcher.FOLDER);
      // an install with no signature list has nothing to sign the patch into, so an unsigned
      // patch there is finished rather than half-done (Linux; see patcher.state)
      if (!st.patched || (st.signable && !st.signed)) {
        patcher.apply({ gamePath: game, folder: patcher.FOLDER, backupDir });
        healed.push('patch');
      }
      const stamp = schema.readGameSchema(game).stamp;
      const behind = settings.get('schemaDirty') || heroesOwed() !== !!settings.get('schemaHeroes');
      if (stamp !== settings.get('schemaStamp') || !schema.isDeployed(game, patcher.FOLDER) || behind) {
        // a rebuild that failed is not a repair, and saying 'schema' for it hid the failure
        const res = refresh();
        if (!res.ok) return { ok: false, error: res.error || res.reason, healed };
        healed.push('schema');
      }
    } catch (err) {
      return { ok: false, error: String(err.message || err), healed };
    }
    return { ok: true, healed };
  }

  // Turn the patch on or off. This is the only place that edits files of the game install
  // itself, and it is reached only from an explicit user action.
  function setEnabled(on) {
    const game = gamePath();
    if (!game) return { error: 'no-game-path' };
    if (on) {
      patcher.apply({ gamePath: game, folder: patcher.FOLDER, backupDir });
      settings.set('schemaPatch', true);
      return { ok: true, ...refresh() };
    }
    settings.set('schemaPatch', false);
    schema.undeploy({ gamePath: game, folder: patcher.FOLDER });
    patcher.revert({ gamePath: game, folder: patcher.FOLDER, backupDir });
    settings.set('schemaStamp', null);
    // nothing is built in safe mode, so nothing can be behind
    mark('schemaDirty', false);
    mark('schemaHeroes', false);
    return { ok: true, deployed: false };
  }

  function cleanForeign() {
    const game = gamePath();
    if (!game) return { error: 'no-game-path' };
    return patcher.cleanForeign({ gamePath: game, folder: patcher.FOLDER, backupDir });
  }

  // Lift the item blocks a freshly installed mod changed, drop the whole-game tables it
  // shipped, and remember the blocks on its record.
  function harvest(rec) {
    const game = gamePath();
    if (!game || !rec || !Array.isArray(rec.files)) return null;
    try {
      // Repacking changes the file, and with it the fingerprint the catalog is matched by.
      // Keep the original so a recognised mod does not turn into an unknown one.
      let fpBefore = null;
      try { fpBefore = (installer.analyzeRecord(rec) || {}).fp || null; } catch { /* not a vpk record */ }
      const { deltas, stripped } = installer.harvestSchema(rec.files, vanilla());
      if (!deltas.length && !stripped.length) return null;
      const fields = { files: rec.files };
      if (deltas.length) fields.schema = deltas;
      if (stripped.length && fpBefore) fields.fpOriginal = fpBefore;
      library.update(rec.id, fields);
      return { deltas: deltas.length, stripped: stripped.length };
    } catch { return null; }
  }

  /**
   * A Skinchanger export can hold several heroes at once - its packer bundles whatever was
   * in the cart, so a "Grimstroke" pack may also carry Morphling's files and the item block
   * that goes with them. Split such a record into one mod per hero and hand each part the
   * blocks that talk about its own files.
   * @returns {Array<object>|null} the new records, or null when there was nothing to split
   */
  function split(rec) {
    const dir = (rec.files || []).find((f) => f.root === 'lang' && /_dir\.vpk$/i.test(f.relPath));
    if (!dir) return null;
    let parts;
    try { parts = installer.splitVpkFile(dir.relPath); } catch { return null; }
    if (!parts.length) return null;

    const blocks = Array.isArray(rec.schema) ? rec.schema : [];
    const added = [];
    for (const part of parts) {
      const mine = blocks.filter((b) => schema.blockUsesAssets(b.block, part.paths || []));
      const created = library.add({
        name: part.name,
        categoryId: 'imported',
        styleLabel: null,
        fileRef: rec.fileRef || rec.name,
        preview: null,
        files: part.files,
      });
      const fields = { schemaChecked: true };
      if (mine.length) fields.schema = mine;
      if (rec.fpOriginal) fields.fpOriginal = rec.fpOriginal;
      library.update(created.id, fields);
      added.push({ ...created, ...fields });
    }
    installer.remove(rec.files);
    library.removeRecord(rec.id);
    return added;
  }

  /**
   * Mods installed before this existed still carry the whole-game tables inside their VPK:
   * a stale item schema (dead weight) and a stale localization copy (which outranks the
   * game's own and rolls UI text back to whenever the mod was built). Sweep them once.
   * @returns {{ scanned: number, changed: number, deltas: number, freedMB: number }}
   */
  function migrate() {
    const game = gamePath();
    const out = { scanned: 0, changed: 0, deltas: 0, freedMB: 0 };
    if (!game) return out;
    for (const rec of library.list()) {
      if (rec.kind === 'pack' || Array.isArray(rec.schema) || rec.schemaChecked) continue;
      if (!Array.isArray(rec.files) || !rec.files.some((f) => f.root === 'lang' && /_dir\.vpk$/i.test(f.relPath))) continue;
      out.scanned++;
      let before = 0;
      try { before = installer.installedSize(rec); } catch { /* size is only for the log line */ }
      const res = harvest(rec);
      // remember that this record was looked at, so a clean mod is not re-scanned every start
      if (!res) { library.update(rec.id, { schemaChecked: true }); continue; }
      out.changed++;
      out.deltas += res.deltas;
      try { out.freedMB += Math.max(0, before - installer.installedSize(rec)) / 1048576; } catch { /* noop */ }
      library.update(rec.id, { schemaChecked: true });
    }
    out.freedMB = Math.round(out.freedMB);
    return out;
  }

  // Two mods changing the same item block DIFFERENTLY: only one of them can be in the built
  // table (the one installed later), so the library has to say so instead of quietly
  // dropping the other. Identical blocks are not a conflict at all - Skinchanger bundles
  // the whole cart into every export, so two of its packs routinely carry the same block.
  function conflicts() {
    const flat = (s) => s.replace(/\s+/g, ' ').trim();
    const byId = new Map();
    for (const rec of library.list()) {
      if (rec.enabled === false || !Array.isArray(rec.schema)) continue;
      for (const d of rec.schema) {
        if (!byId.has(d.id)) byId.set(d.id, { id: d.id, name: d.name, mods: [], texts: new Set() });
        const entry = byId.get(d.id);
        entry.mods.push(rec.name);
        entry.texts.add(flat(d.block));
      }
    }
    return [...byId.values()]
      .filter((c) => c.texts.size > 1)
      .map(({ id, name, mods }) => ({ id, name, mods }))
      .concat(heroClashes());
  }

  // Hero picks left on together over one default item (see heroItems.targetClashes). Only the
  // game's table knows which slots share a default, so it is read only when two picks are on.
  function heroClashes() {
    const recs = library.list().filter((r) => r.categoryId === 'cosmetic' && r.enabled !== false && heroItems.isHeroSlot(r.slot));
    if (recs.length < 2 || !gamePath()) return [];
    try { return heroItems.targetClashes(vanilla(), recs); } catch { return []; }
  }

  function state() {
    const game = gamePath();
    const out = {
      enabled: !!settings.get('schemaPatch'),
      folder: patcher.FOLDER,
      patched: false,
      signed: false,
      foreign: null,
      deployed: false,
      stale: false,
      mods: library.list().filter((r) => r.enabled !== false && Array.isArray(r.schema) && r.schema.length).length,
      cosmeticsPicked: library.list().filter((r) => r.categoryId === 'cosmetic' && r.enabled !== false).length,
      conflicts: conflicts(),
    };
    if (!game) return out;
    try {
      Object.assign(out, patcher.state(game, patcher.FOLDER));
      out.deployed = schema.isDeployed(game, patcher.FOLDER);
      // a rebuild that failed is stale whether or not the old pak survived it
      out.dirty = !!settings.get('schemaDirty');
      out.stale = out.dirty || (out.deployed && schema.readGameSchema(game).stamp !== settings.get('schemaStamp'));
    } catch (err) {
      out.error = String(err.message || err);
    }
    return out;
  }

  // The live cosmetic record for a slot, if any — at most one is ever enabled at a time
  // (see pickCosmetic), the same rule the app already applies to cursor sets.
  function cosmeticRecordFor(slot) {
    return library.list().find((r) => r.categoryId === 'cosmetic' && r.slot === slot && r.enabled !== false) || null;
  }

  /**
   * Every slot that has both a free "base item" and something to put on it, in one call.
   * The list comes from the installed game, so a slot Valve adds later appears by itself.
   * @returns {{ slots: Array<{slot, base, picked, options}> }}
   */
  function cosmeticSlots() {
    const game = gamePath();
    if (!game) return { slots: [] };
    try {
      const text = vanilla();
      const bases = schema.listItems(text).filter((i) => i.baseitem);
      const seen = new Set();
      const slots = [];
      for (const base of bases) {
        // the same rule baseItemFor and cosmeticOptions file items by, or a slot offered here
        // has no base to dress when it is picked
        const slot = schema.slotOf(base, text);
        if (!slot || seen.has(slot)) continue;
        seen.add(slot);
        const options = schema.cosmeticOptions(text, slot);
        if (!options.length) continue;
        const rec = cosmeticRecordFor(slot);
        slots.push({ slot, base: base.id, picked: rec ? rec.itemId : null, recordId: rec ? rec.id : null, options });
      }
      return { slots };
    } catch (err) {
      return { slots: [], error: String(err.message || err) };
    }
  }

  /* Make `itemId` the live look of `slot`, without rebuilding. Switching to a genuinely new item
   * disables whatever was live for that slot (never deletes it: a preset saved earlier may still
   * point at that record, exactly like disabling a regular mod doesn't erase it) and creates a
   * fresh record — or reactivates a dormant one for that same item, so flipping back and forth
   * between two looks doesn't spawn a new row each time.
   * An Arsenal pick also keeps the item's own name (`itemName`): its record is named after the
   * hero as well, and the item's picture is found by the item's name alone. */
  function stage(slot, itemId, name, itemName) {
    const live = cosmeticRecordFor(slot);
    if (live && live.itemId === itemId) return live;
    if (live) library.setEnabled(live.id, false);
    const dormant = library.list().find((r) => r.categoryId === 'cosmetic' && r.slot === slot && r.itemId === itemId);
    const named = itemName ? { name, itemName } : { name };
    const rec = dormant
      ? library.update(dormant.id, { ...named, enabled: true })
      : library.add({ name, categoryId: 'cosmetic', styleLabel: null, fileRef: null, preview: null, files: [] });
    if (!dormant) library.update(rec.id, { slot, itemId, ...named });
    return library.find(rec.id);
  }

  /* A pick is only as good as the table it lands in. It used to report success whatever the
   * rebuild said, so a failed one left a record that read "on" over a table that never changed
   * (audit, schema-service.js:330). Now the library goes back to what the live table was built
   * from and the caller hears why. No game path is not a failure of the build: the pick stays
   * and is built once there is a game to build it into. */
  function committed(change) {
    const before = new Map(library.list().map((r) => [r.id, { enabled: r.enabled, name: r.name, itemName: r.itemName }]));
    /* Every Library write changes the list in memory before it saves, so carrying on past a save
     * that fails still puts the whole list back in memory. The file may then be behind until the
     * next save and the table was never told: schemaDirty makes state() say so and heal() build
     * from what the library holds. */
    const undo = () => {
      let failed = false;
      for (const r of library.list().slice()) {
        const was = before.get(r.id);
        try {
          if (!was) library.removeRecord(r.id);
          else if (Object.keys(was).some((k) => r[k] !== was[k])) library.update(r.id, was);
        } catch { failed = true; }
      }
      if (failed) { try { mark('schemaDirty', true); } catch { /* the settings file is the least of it */ } }
    };
    let out;
    try {
      out = change();
    } catch (err) {
      // a manifest write that failed half-way (a lock, a full disk) left a record switched off or
      // a new one with no slot yet, and no rebuild to match: it goes back like a failed build
      undo();
      throw new Error(t('Выбор не удалось сохранить: {0}', err.message || err));
    }
    const res = refresh();
    if (res.ok || !res.error) return out;
    undo();
    throw new Error(t('Таблицу предметов собрать не удалось, выбор отменён: {0}', res.error));
  }

  /**
   * Pick a look for a slot and rebuild. Returns the now-live record; throws, with the library
   * as it was, when the rebuild fails. An Arsenal slot ('hero:...', which is how a received
   * preset or link names one) goes through pickHero and its checks.
   */
  function pickCosmetic(slot, itemId, itemName) {
    const at = heroItems.parseSlotKey(slot);
    if (at) {
      const { itemId: donor, style } = heroItems.parseItemKey(itemId);
      return pickHero(at.hero, at.slot, donor, style);
    }
    const id = String(itemId);
    const live = cosmeticRecordFor(slot);
    if (live && live.itemId === id) return live; // already this
    return committed(() => stage(slot, id, itemName || id));
  }

  // One-time move of picks that used to live in settings.json into library records, from
  // before cosmetics could be toggled/deleted/shared like any other mod. One rebuild for all of
  // them, and no undo: these records are the only copy of those picks, and a failed build is
  // left to schemaDirty and heal().
  function migrateCosmeticSettings() {
    const picks = settings.get('cosmetics');
    if (!picks || !Object.keys(picks).length) return;
    const game = gamePath();
    if (!game) return;
    try {
      const text = vanilla();
      let staged = 0;
      for (const [slot, itemId] of Object.entries(picks)) {
        if (!itemId || cosmeticRecordFor(slot)) continue;
        const opt = schema.cosmeticOptions(text, slot).find((o) => o.id === String(itemId));
        stage(slot, String(itemId), opt ? opt.name : slot);
        staged++;
      }
      if (staged) refresh();
    } catch { /* the game path may not be ready yet; nothing lost, just retried next start */ }
    settings.set('cosmetics', {});
  }

  // ---------- the Arsenal: hero picks (the rules are in src/hero-items.js) ----------

  // Live picks: of one hero by slot, or of everybody by hero. In library order, which is the
  // order the build writes their blocks in.
  function livePicks() {
    const out = [];
    for (const r of library.list()) {
      if (r.categoryId !== 'cosmetic' || r.enabled === false) continue;
      const at = heroItems.parseSlotKey(r.slot);
      if (at) out.push({ ...at, ...heroItems.parseItemKey(r.itemId), recordId: r.id, itemName: r.itemName || r.name });
    }
    return out;
  }

  /* A default several heroes share (8366, the pet of ten) wears one look, whoever picked it, and
   * the build keeps the block written last. So a pick switches off every other hero's live pick
   * on the same default: the latest pick is the one the game draws, and no hero's Arsenal calls
   * worn a look the table does not carry. The same slot's own pick is stage()'s business. */
  function rivalsOf(text, p) {
    return livePicks().filter((o) => !(o.hero === p.hero && o.slot === p.slot) && heroItems.targetOf(text, o.hero, o.slot) === p.target);
  }

  function wear(text, p) {
    for (const o of rivalsOf(text, p)) library.setEnabled(o.recordId, false);
    return stage(p.key, p.itemId, p.name, p.itemName);
  }

  // Style names are tokens ("#DOTA_Style_...") that only the game's own English text turns into
  // words. Read once per build of the game, lazily - only a hero with a styled look asks - and
  // kept to the tokens styles use. A game without the file keeps its tokens, and the screen
  // says "Style N" for them.
  let styleNames = { stamp: undefined, names: null };
  function styleNamer(text) {
    return (name) => {
      if (!name || name[0] !== '#') return name;
      if (!styleNames.names || styleNames.stamp !== cache.stamp) {
        let names = new Map();
        try {
          const loc = readStyleLocalization(gamePath());
          if (loc) names = heroItems.readTokens(loc, heroItems.styleTokens(text));
        } catch { /* no English text to be had: tokens stay tokens */ }
        styleNames = { stamp: cache.stamp, names };
      }
      return styleNames.names.get(name.slice(1).toLowerCase()) || name;
    };
  }

  // The live pick each default item ends up wearing: the last one on it in the library, since the
  // build writes their blocks in that order. Only a default several heroes share can have two.
  function wornOn(text, live) {
    const out = new Map();
    for (const p of live) {
      const target = heroItems.targetOf(text, p.hero, p.slot);
      if (target) out.set(target, p);
    }
    return out;
  }
  const outranked = (text, worn, p) => {
    const target = heroItems.targetOf(text, p.hero, p.slot);
    return !!target && worn.get(target) !== p;
  };

  /* `active` is whether live picks go into the build at all. build() leaves them out without VIP,
   * so a lapsed plan's picks stay on in the library and off in the game, and the screen has to
   * show them as dormant, not worn. It is `vip` today; the screen reads this one for that. */
  function access() {
    const vip = isEntitled();
    return { vip, active: vip, schemaPatch: !!settings.get('schemaPatch') };
  }

  /** @returns {{vip: boolean, active: boolean, schemaPatch: boolean, heroes: Array<object>, error?: string}} */
  function arsenalHeroes() {
    const out = { ...access(), heroes: [] };
    if (!gamePath()) return { ...out, error: t('Путь к Dota 2 не задан') };
    try {
      const text = vanilla();
      const live = livePicks();
      const worn = wornOn(text, live);
      const picked = new Map();
      for (const p of live) if (!outranked(text, worn, p)) picked.set(p.hero, (picked.get(p.hero) || 0) + 1);
      out.heroes = heroItems.heroList(text).map((h) => ({ ...h, picked: picked.get(h.hero) || 0 }));
      return out;
    } catch (err) {
      return { ...out, error: String(err.message || err) };
    }
  }

  /**
   * One hero's slots, options, live picks and sets; see heroItems.heroView. A slot whose default
   * another hero's pick is dressing names that pick in `sharedPick` and has no `picked` of its
   * own, because that is the look the game draws there.
   */
  function arsenalHero(hero) {
    const out = { hero: String(hero || ''), ...access(), slots: [], sets: [] };
    if (!gamePath()) return { ...out, error: t('Путь к Dota 2 не задан') };
    try {
      const text = vanilla();
      const H = heroItems.findHero(text, hero);
      if (!H) return { ...out, error: t('Героя {0} нет в таблице предметов игры', out.hero) };
      const live = livePicks();
      const worn = wornOn(text, live);
      const picks = new Map();
      for (const p of live) {
        if (p.hero === H.hero && !outranked(text, worn, p)) picks.set(p.slot, { recordId: p.recordId, itemId: p.itemId, style: p.style });
      }
      const view = heroItems.heroView(text, H.hero, { picks, styleName: styleNamer(text) });
      for (const s of view.slots) {
        const on = worn.get(s.target);
        if (on && !(on.hero === H.hero && on.slot === s.slot)) {
          Object.assign(s, { sharedPick: { hero: on.hero, recordId: on.recordId, itemId: on.itemId, style: on.style, itemName: on.itemName } });
        }
      }
      return { ...out, ...view };
    } catch (err) {
      return { ...out, error: String(err.message || err) };
    }
  }

  function arsenalText() {
    if (!gamePath()) throw new Error(t('Путь к Dota 2 не задан'));
    return vanilla();
  }

  /**
   * Put a wearable, in a style, on a hero's slot, and rebuild. The pick is a cosmetic record
   * (slot 'hero:<hero>:<slot>', itemId '<donor>' or '<donor>#<style>', name '<Hero> · <item>',
   * itemName '<item>'), so My mods, presets and the one-look-per-slot rule treat it like any other.
   * @returns {object} the now-live record; throws with the library untouched when it cannot be built
   */
  function pickHero(hero, slot, itemId, style) {
    const text = arsenalText();
    const p = heroItems.resolvePick(text, hero, slot, itemId, style);
    const live = cosmeticRecordFor(p.key);
    // already on, unless another hero's pick was left on over the same default too
    if (live && live.itemId === p.itemId && !rivalsOf(text, p).length) return live;
    return committed(() => wear(text, p));
  }

  /** Switch a slot back to the hero's own item. The pick stays in the library, dormant. */
  function clearHero(hero, slot) {
    const H = gamePath() ? heroItems.findHero(vanilla(), hero) : null;
    const live = cosmeticRecordFor(heroItems.slotKey(H ? H.hero : String(hero || ''), String(slot || '')));
    if (!live) return { ok: true, cleared: false };
    committed(() => library.setEnabled(live.id, false));
    return { ok: true, cleared: true };
  }

  /**
   * Every wearable of one of the game's bundles on the hero, in one rebuild. Whatever in the
   * bundle is not a wearable of this hero (loading screens, taunts, tools) is named, not picked.
   * @returns {{ok: true, picked: number, skipped: string[]}}
   */
  function equipSet(hero, bundleId) {
    const text = arsenalText();
    const set = heroItems.setFor(text, hero, bundleId);
    if (!set.members.length) throw new Error(t('В наборе {0} нет ничего, что можно надеть на этого героя', set.name));
    const picks = set.members.map((m) => heroItems.resolvePick(text, set.hero, m.slot, m.itemId, null));
    committed(() => picks.forEach((p) => wear(text, p)));
    return { ok: true, picked: picks.length, skipped: set.skipped };
  }

  return {
    backupDir, patches, refresh, heal, setEnabled, cleanForeign, harvest, split, migrate, state,
    cosmeticSlots, pickCosmetic, migrateCosmeticSettings, entitlementChanged,
    arsenalHeroes, arsenalHero, pickHero, clearHero, equipSet,
  };
}

// The English text of the game's items: a loose file first (a modder's, or an older layout),
// then the one packed into pak01. UTF-16 with a byte-order mark, or UTF-8.
function readStyleLocalization(game) {
  if (!game) return null;
  const loose = path.join(game, 'dota', ...STYLE_LOC.split('/'));
  /** @type {Buffer|null} */
  let buf = fs.existsSync(loose) ? fs.readFileSync(loose) : null;
  if (!buf) {
    const pak = path.join(game, 'dota', 'pak01_dir.vpk');
    const hit = fs.existsSync(pak) ? readVpkEntryFile(pak, STYLE_LOC) : null;
    buf = hit ? hit.data : null;
  }
  if (!buf) return null;
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  return buf.toString('utf8').replace(/^\uFEFF/, '');
}

module.exports = { createSchemaService };
