/* The part of src/installer.js that writes a mod into the game and takes it out again.
 *
 * On 2026-09-16 a third of this file had no unit test at all: installInto, the font, cursor and
 * tool installs, switching a mod off, removing it, the clean-up after a killed transaction, and
 * the check for files Steam's verify put back. The window test (tools/e2e.mjs) clicks through a
 * catalog install, so the common path was covered from outside; everything that path does not
 * reach was covered by nothing. These call the same methods against a throwaway game folder.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');

const { Installer } = require('../src/installer.js');
const { FileTx } = require('../src/file-tx.js');
const { Library } = require('../src/library.js');
const { SLOT_CAPACITY } = require('../src/slots.js');
const { listVpkPaths } = require('../src/vpk.js');
const { rawZip } = require('./fixtures/raw-zip.js');

const FONTS = ['dota', 'panorama', 'fonts'];
const CURSOR = ['dota', 'resource', 'cursor'];

/** A game folder the installer accepts, and an installer pointed at it. */
function stand(t, { game: withGame = true, masterExplicitOff = null, ownedRelPaths = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd2mm-installer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const game = path.join(dir, 'game');
  fs.mkdirSync(path.join(game, 'dota'), { recursive: true });
  fs.writeFileSync(path.join(game, 'dota', 'pak01_dir.vpk'), "the game's own archive");
  const installer = new Installer({
    userDataDir: path.join(dir, 'userdata'),
    getGamePath: () => (withGame ? game : null),
    getLangSuffix: () => 'russian',
    onProgress: () => {},
    masterExplicitOff,
    ownedRelPaths,
  });
  const lang = path.join(game, 'dota_russian');
  const incoming = path.join(dir, 'incoming');
  fs.mkdirSync(incoming);
  /** A file as the download step would leave it. */
  const arrive = (name, body) => {
    const p = path.join(incoming, name);
    fs.writeFileSync(p, body);
    return p;
  };
  const zip = (name, entries) => {
    const z = new AdmZip();
    for (const [inner, body] of entries) z.addFile(inner, Buffer.from(body));
    return arrive(name, z.toBuffer());
  };
  const read = (...parts) => fs.readFileSync(path.join(game, ...parts), 'utf-8');
  const has = (...parts) => fs.existsSync(path.join(game, ...parts));
  return { dir, game, lang, installer, arrive, zip, read, has };
}

const install = (installer, categoryId, local, modName = 'Test Mod') =>
  FileTx.run((tx) => installer.installInto(tx, { categoryId, modName, local }));

// ---------- into the language folder ----------

test('a single VPK takes the first free slot, and a category that must load early takes a low one', (t) => {
  const s = stand(t);
  assert.deepEqual(install(s.installer, 'heroes', s.arrive('Axe.vpk', 'axe')), [{ root: 'lang', relPath: 'pak10_dir.vpk' }]);
  assert.deepEqual(install(s.installer, 'heroes', s.arrive('Lina.vpk', 'lina')), [{ root: 'lang', relPath: 'pak11_dir.vpk' }]);
  assert.deepEqual(install(s.installer, 'trees', s.arrive('Trees.vpk', 'trees')), [{ root: 'lang', relPath: 'pak02_dir.vpk' }]);
  assert.equal(s.read('dota_russian', 'pak10_dir.vpk'), 'axe');
  assert.equal(s.read('dota_russian', 'pak02_dir.vpk'), 'trees');
});

test('an archive keeps its volume sets whole, its maps where the game reads them, and drops the guide', (t) => {
  const s = stand(t);
  const local = s.zip('Arcana.zip', [
    ['Arcana/pak01_dir.vpk', 'index'],
    ['Arcana/pak01_000.vpk', 'volume'],
    ['Arcana/extra.vpk', 'second mod'],
    ['Arcana/maps/dota.vpk', 'terrain'],
    ['Arcana/particles/custom.vpcf_c', 'loose file'],
    ['Arcana/readme.txt', 'how to install'],
    ['Arcana/install.bat', 'copy *.*'],
    ['Arcana/!guide/step1.png', 'picture'],
  ]);

  const records = install(s.installer, 'heroes', local, 'Arcana');
  const paks = records.map((r) => r.relPath).filter((p) => p.startsWith('pak'));
  assert.deepEqual(paks.map((p) => p.replace(/^pak\d+/, 'pakNN')).sort(), ['pakNN_000.vpk', 'pakNN_dir.vpk', 'pakNN_dir.vpk']);
  assert.deepEqual([...new Set(paks.map((p) => p.slice(0, 5)))].sort(), ['pak10', 'pak11'], 'two sets, two slots');
  // which set takes 10 follows the archive's own order; the index and its volume share one
  const index = paks.find((p) => s.read('dota_russian', p) === 'index');
  assert.ok(index, 'the index was written');
  assert.equal(s.read('dota_russian', index.replace('_dir.vpk', '_000.vpk')), 'volume', 'the volume moved with its index');
  assert.deepEqual(records.map((r) => r.relPath).filter((p) => !p.startsWith('pak')).sort(), ['maps/dota.vpk', 'particles/custom.vpcf_c']);
  assert.equal(s.read('dota_russian', 'maps', 'dota.vpk'), 'terrain');
  assert.equal(s.read('dota_russian', 'particles', 'custom.vpcf_c'), 'loose file', 'the archive folder is not repeated');
  for (const gone of ['readme.txt', 'install.bat', '!guide']) {
    assert.equal(s.has('dota_russian', gone), false, `${gone} reached the game folder`);
  }
});

test('a file that is neither an archive nor a VPK is dropped into the folder under its own name', (t) => {
  const s = stand(t);
  assert.deepEqual(install(s.installer, 'heroes', s.arrive('config.cfg', 'cfg')), [{ root: 'lang', relPath: 'config.cfg' }]);
  assert.equal(s.read('dota_russian', 'config.cfg'), 'cfg');
});

test('an archive that breaks halfway leaves nothing behind', (t) => {
  /* One transaction around the whole install: the first file is written, the second turns out
     to be damaged, and the first has to go again, or the game mounts half a mod the library has
     no record of. */
  const s = stand(t);
  const first = { name: 'Mod/pak01_dir.vpk', data: Buffer.from('good index') };
  const second = { name: 'Mod/particles/fx.vpcf_c', data: Buffer.from('damaged bytes') };
  const buf = rawZip([first, second]);
  buf[30 + first.name.length + first.data.length + 30 + second.name.length] ^= 0xff;
  const local = s.arrive('Broken.zip', buf);

  assert.throws(() => install(s.installer, 'heroes', local, 'Broken'), (err) => err.safeZip === true);
  assert.deepEqual(fs.readdirSync(s.lang).filter((f) => f !== 'gameinfo.gi'), []);
});

// ---------- fonts, cursors, tools ----------

test("a font goes over the game's own, which is kept once and put back on removal", (t) => {
  const s = stand(t);
  fs.mkdirSync(path.join(s.game, ...FONTS), { recursive: true });
  fs.writeFileSync(path.join(s.game, ...FONTS, 'radiance.ttf'), 'valve font');
  const first = s.zip('Font A.zip', [['Font A/assets/custom/radiance.ttf', 'font A'], ['Font A/assets/default/radiance.ttf', 'valve font']]);
  const second = s.zip('Font B.zip', [['Font B/assets/custom/radiance.ttf', 'font B']]);

  const records = install(s.installer, 'fonts', first, 'Font A');
  assert.deepEqual(records, [{ root: 'fonts', relPath: 'radiance.ttf' }]);
  assert.equal(s.read(...FONTS, 'radiance.ttf'), 'font A');
  install(s.installer, 'fonts', second, 'Font B');
  assert.equal(
    fs.readFileSync(path.join(s.installer.backupsDir, 'fonts', 'radiance.ttf'), 'utf-8'), 'valve font',
    'the second font would otherwise be kept as the original',
  );

  s.installer.remove(records);
  assert.equal(s.read(...FONTS, 'radiance.ttf'), 'valve font');
});

test('a font archive without assets/custom is refused by name', (t) => {
  const s = stand(t);
  const local = s.zip('Wrong.zip', [['Wrong/fonts/radiance.ttf', 'x']]);
  assert.throws(() => install(s.installer, 'fonts', local, 'Wrong Font'), /Wrong Font/);
});

test('a cursor set is installed over the game, packed back into the catalog layout, and removed', (t) => {
  const s = stand(t);
  fs.mkdirSync(path.join(s.game, ...CURSOR), { recursive: true });
  fs.writeFileSync(path.join(s.game, ...CURSOR, 'cursor_default.bmp'), 'valve cursor');
  const local = s.zip('Neon.zip', [['Neon/cursor/cursor_default.bmp', 'neon'], ['Neon/cursor/cursor_spell.bmp', 'neon spell']]);

  const files = install(s.installer, 'cursors', local, 'Neon');
  assert.deepEqual(files.map((f) => f.relPath).sort(), ['cursor_default.bmp', 'cursor_spell.bmp']);
  assert.equal(s.read(...CURSOR, 'cursor_default.bmp'), 'neon');

  const packed = new AdmZip(s.installer.cursorZip({ id: 'neon', name: 'Neon', files }));
  assert.deepEqual(packed.getEntries().map((e) => e.entryName).sort(), ['Neon/cursor/cursor_default.bmp', 'Neon/cursor/cursor_spell.bmp']);

  s.installer.remove(files, { recId: 'neon' });
  assert.equal(s.read(...CURSOR, 'cursor_default.bmp'), 'valve cursor');
  assert.equal(s.has(...CURSOR, 'cursor_spell.bmp'), false, 'a file Valve does not ship is simply gone');
  assert.deepEqual(s.installer.overlays.written(), {}, 'nothing is remembered about files that are gone');

  const ghost = { id: 'ghost', name: 'Ghost', files: [{ root: 'cursor', relPath: 'cursor_ghost.bmp' }] };
  assert.throws(() => s.installer.cursorZip(ghost), /курсора|cursor/i, 'a set with no file anywhere cannot be packed');
});

test('a cursor archive without a cursor folder is refused by name', (t) => {
  const s = stand(t);
  const local = s.zip('Nope.zip', [['Nope/pointer.bmp', 'x']]);
  assert.throws(() => install(s.installer, 'cursors', local, 'Nope Cursor'), /Nope Cursor/);
});

test('fonts and cursors need a game path, and say so', (t) => {
  const s = stand(t, { game: false });
  const local = s.zip('Font.zip', [['Font/assets/custom/a.ttf', 'x']]);
  assert.throws(() => s.installer.overlays.installFonts(local, 'Font'), /Dota 2/);
  assert.throws(() => s.installer.overlays.installCursor(local, 'Font'), /Dota 2/);
});

test('a tool is unpacked into its own folder in the app, needs no game, and is removed whole', (t) => {
  const s = stand(t, { game: false });
  const local = s.zip('VPK Tool.zip', [['bin/tool.exe', 'exe'], ['readme.txt', 'read me']]);
  const records = install(s.installer, 'tools', local, 'VPK: Tool');
  assert.deepEqual(records, [{ root: 'tools', relPath: 'VPK_ Tool' }]);
  const dir = path.join(s.installer.toolsDir, 'VPK_ Tool');
  assert.equal(fs.readFileSync(path.join(dir, 'bin', 'tool.exe'), 'utf-8'), 'exe');

  const single = install(s.installer, 'tools', s.arrive('helper.exe', 'single'), 'Helper');
  assert.equal(fs.readFileSync(path.join(s.installer.toolsDir, 'Helper', 'helper.exe'), 'utf-8'), 'single');

  s.installer.remove(records);
  assert.equal(fs.existsSync(dir), false);
  assert.ok(fs.existsSync(path.join(s.installer.toolsDir, single[0].relPath)), 'the other tool stays');
});

// ---------- on, off, gone ----------

test('switching a mod off renames its files, on renames them back, and fonts are left alone', (t) => {
  const s = stand(t);
  const files = install(s.installer, 'heroes', s.zip('Two.zip', [['Two/pak01_dir.vpk', 'i'], ['Two/pak01_000.vpk', 'v']]));
  const withFont = [...files, { root: 'fonts', relPath: 'radiance.ttf' }, { root: 'tools', relPath: 'Tool' }];

  s.installer.setEnabled(withFont, false);
  assert.deepEqual(fs.readdirSync(s.lang).filter((f) => f.startsWith('pak')).sort(), ['pak10_000.vpk.off', 'pak10_dir.vpk.off']);
  s.installer.setEnabled(withFont, false);
  assert.ok(s.has('dota_russian', 'pak10_dir.vpk.off'), 'switching off twice changes nothing');

  s.installer.setEnabled(withFont, true);
  assert.deepEqual(fs.readdirSync(s.lang).filter((f) => f.startsWith('pak')).sort(), ['pak10_000.vpk', 'pak10_dir.vpk']);
});

test('removing a mod deletes it whether it is on, off or switched off by the master switch', (t) => {
  const s = stand(t);
  const a = install(s.installer, 'heroes', s.arrive('A.vpk', 'a'));
  const b = install(s.installer, 'heroes', s.arrive('B.vpk', 'b'));
  const c = install(s.installer, 'heroes', s.arrive('C.vpk', 'c'));
  s.installer.setEnabled(b, false);
  fs.renameSync(path.join(s.lang, c[0].relPath), path.join(s.lang, `${c[0].relPath}.moff`));

  s.installer.remove([...a, ...b, ...c]);
  assert.deepEqual(fs.readdirSync(s.lang).filter((f) => f.startsWith('pak')), []);
});

test('a switched-off cursor set is removed without putting the vanilla file over its replacement', (t) => {
  const s = stand(t);
  fs.mkdirSync(path.join(s.game, ...CURSOR), { recursive: true });
  fs.writeFileSync(path.join(s.game, ...CURSOR, 'cursor_default.bmp'), 'another set');
  fs.mkdirSync(path.join(s.installer.backupsDir, 'cursor'), { recursive: true });
  fs.writeFileSync(path.join(s.installer.backupsDir, 'cursor', 'cursor_default.bmp'), 'valve cursor');

  s.installer.remove([{ root: 'cursor', relPath: 'cursor_default.bmp' }], { recId: 'old', deployed: false });
  assert.equal(s.read(...CURSOR, 'cursor_default.bmp'), 'another set');
});

test('an unknown root is an error, not a guess', (t) => {
  const s = stand(t);
  assert.throws(() => s.installer.rootAbs('somewhere'), /somewhere/);
});

// ---------- after the app was killed mid-write ----------

test('a parked file whose original is missing is put back, and an old leftover is dropped', (t) => {
  const s = stand(t);
  fs.mkdirSync(s.lang, { recursive: true });
  // an interrupted switch-off: the file was parked and the app died before the rename landed
  fs.writeFileSync(path.join(s.lang, 'pak10_dir.vpk.a1b2.mmtx'), 'the mod');
  // a finished write whose old copy was never cleaned up, a fortnight ago
  fs.writeFileSync(path.join(s.lang, 'pak11_dir.vpk'), 'new');
  const stale = path.join(s.lang, 'pak11_dir.vpk.c3d4.mmtx');
  fs.writeFileSync(stale, 'old');
  const fortnight = (Date.now() - 14 * 24 * 3600 * 1000) / 1000;
  fs.utimesSync(stale, fortnight, fortnight);
  // the same, yesterday: kept a while in case somebody wants it
  fs.writeFileSync(path.join(s.lang, 'pak12_dir.vpk'), 'new');
  fs.writeFileSync(path.join(s.lang, 'pak12_dir.vpk.e5f6.mmtx'), 'old');

  assert.deepEqual(s.installer.sweepStaged(), { restored: 1, dropped: 1 });
  assert.equal(s.read('dota_russian', 'pak10_dir.vpk'), 'the mod');
  assert.equal(fs.existsSync(stale), false);
  assert.ok(s.has('dota_russian', 'pak12_dir.vpk.e5f6.mmtx'));
});

test('with no game path there is nothing to sweep', (t) => {
  const s = stand(t, { game: false });
  assert.deepEqual(s.installer.sweepStaged(), { restored: 0, dropped: 0 });
});

// ---------- after Steam verified the game files ----------

test("a font Steam's verify replaced is noticed, and put back from the download cache", (t) => {
  const s = stand(t);
  fs.mkdirSync(path.join(s.game, ...FONTS), { recursive: true });
  fs.writeFileSync(path.join(s.game, ...FONTS, 'radiance.ttf'), 'valve font');
  const cached = path.join(s.installer.downloadsDir, 'fonts', 'Font A.zip');
  fs.mkdirSync(path.dirname(cached), { recursive: true });
  const z = new AdmZip();
  z.addFile('Font A/assets/custom/radiance.ttf', Buffer.from('font A'));
  z.addFile('Font A/assets/custom/extra.ttf', Buffer.from('font A extra'));
  fs.writeFileSync(cached, z.toBuffer());
  const rec = { id: 'a', name: 'Font A', categoryId: 'fonts', fileRef: 'Font A.zip', enabled: true, files: install(s.installer, 'fonts', cached, 'Font A') };
  const off = { ...rec, id: 'b', enabled: false };

  assert.deepEqual(s.installer.lostToVerify([rec, off]), []);
  // what a verify does: Valve's file back, ours untouched where Valve has none
  fs.copyFileSync(path.join(s.installer.backupsDir, 'fonts', 'radiance.ttf'), path.join(s.game, ...FONTS, 'radiance.ttf'));
  assert.deepEqual(s.installer.lostToVerify([rec, off]).map((r) => r.id), ['a'], 'a switched-off mod is not missing anything');
  const back = (f) => s.installer.overlays.vanillaIsBack(f);
  assert.equal(back({ root: 'fonts', relPath: 'extra.ttf' }), false, 'a file with no original cannot be one');
  assert.equal(back({ root: 'lang', relPath: 'pak10_dir.vpk' }), false);

  assert.equal(s.installer.restoreDeployed(rec), 'cache');
  assert.equal(s.read(...FONTS, 'radiance.ttf'), 'font A');
  assert.deepEqual(s.installer.lostToVerify([rec]), []);
  /* The repair met extra.ttf still on disk, and it is the mod's own file. Keeping it as the
     game's original meant removing the mod later put it straight back. */
  assert.equal(fs.existsSync(path.join(s.installer.backupsDir, 'fonts', 'extra.ttf')), false, 'the mod was kept as an original');

  fs.rmSync(path.join(s.game, ...FONTS, 'extra.ttf'));
  assert.equal(back({ root: 'fonts', relPath: 'extra.ttf' }), true, 'a deleted file is as good as reverted');

  s.installer.remove(rec.files);
  assert.equal(s.read(...FONTS, 'radiance.ttf'), 'valve font');
  assert.deepEqual(fs.readdirSync(path.join(s.game, ...FONTS)), ['radiance.ttf'], 'removing the font left a file of its own behind');
});

test("a font that ships some of Valve's files unchanged is not taken for one a verify undid", (t) => {
  /* Nothing Font carries creepster-regular.ttf and grenze-bold.ttf in assets/custom byte for byte
     as Valve ships them. Compared with the kept originals, the mod looked undone the moment it was
     installed, and the app wrote it out again at every start. */
  const s = stand(t);
  fs.mkdirSync(path.join(s.game, ...FONTS), { recursive: true });
  fs.writeFileSync(path.join(s.game, ...FONTS, 'creepster-regular.ttf'), 'valve creepster');
  fs.writeFileSync(path.join(s.game, ...FONTS, 'radiance-light.otf'), 'valve radiance');
  const local = s.zip('Nothing Font.zip', [
    ['Nothing Font/assets/custom/creepster-regular.ttf', 'valve creepster'],
    ['Nothing Font/assets/custom/radiance-light.otf', 'nothing radiance'],
    ['Nothing Font/assets/default/creepster-regular.ttf', 'valve creepster'],
  ]);
  const rec = { id: 'nf', name: 'Nothing Font', categoryId: 'fonts', fileRef: 'Nothing Font.zip', enabled: true, files: install(s.installer, 'fonts', local, 'Nothing Font') };

  assert.deepEqual(s.installer.lostToVerify([rec]), [], 'reported as undone straight after installing');
  assert.ok(fs.existsSync(path.join(s.installer.backupsDir, 'fonts', 'creepster-regular.ttf')), "the game's copy is still kept, even though it matches");

  // a real verify still shows
  fs.writeFileSync(path.join(s.game, ...FONTS, 'radiance-light.otf'), 'valve radiance');
  assert.deepEqual(s.installer.lostToVerify([rec]).map((r) => r.id), ['nf']);

  // and removing it leaves Valve's copies where they were
  s.installer.remove(rec.files);
  assert.equal(s.read(...FONTS, 'creepster-regular.ttf'), 'valve creepster');
  assert.equal(s.read(...FONTS, 'radiance-light.otf'), 'valve radiance');
});

test('a cursor set installed before the app recorded its writes stops being reported once it is put back', (t) => {
  /* One real install logged "restored after verify" for the same cursor set 29 times in August:
     66 of its 110 files matched the kept originals. An install from before the fix has no record
     of what was written, so the first check still reports it; putting it back writes that record,
     and the next check is quiet. */
  const s = stand(t);
  fs.mkdirSync(path.join(s.game, ...CURSOR), { recursive: true });
  fs.writeFileSync(path.join(s.game, ...CURSOR, 'cursor.res'), 'valve res');
  fs.writeFileSync(path.join(s.game, ...CURSOR, 'cursor_default.bmp'), 'valve arrow');
  const local = s.zip('Purple.zip', [['Purple/cursor/cursor.res', 'valve res'], ['Purple/cursor/cursor_default.bmp', 'purple arrow']]);
  const files = install(s.installer, 'cursors', local, 'Purple');
  s.installer.ensureCursorStore('purple', files);
  const rec = { id: 'purple', name: 'Purple', categoryId: 'cursors', enabled: true, files };
  fs.rmSync(path.join(s.installer.backupsDir, 'written.json'));

  assert.deepEqual(s.installer.lostToVerify([rec]).map((r) => r.id), ['purple'], 'the old check, with nothing recorded');
  assert.equal(s.installer.restoreDeployed(rec), 'store');
  assert.deepEqual(s.installer.lostToVerify([rec]), [], 'still reported after being put back');
  assert.equal(s.read(...CURSOR, 'cursor_default.bmp'), 'purple arrow');
});

test('a cursor set comes back from its own store, and a font with no cached archive does not', (t) => {
  const s = stand(t);
  const local = s.zip('Neon.zip', [['Neon/cursor/cursor_default.bmp', 'neon']]);
  const files = install(s.installer, 'cursors', local, 'Neon');
  s.installer.ensureCursorStore('neon', files);
  fs.rmSync(path.join(s.game, ...CURSOR, 'cursor_default.bmp'));

  assert.equal(s.installer.restoreDeployed({ id: 'neon', name: 'Neon', files }), 'store');
  assert.equal(s.read(...CURSOR, 'cursor_default.bmp'), 'neon');

  const font = { id: 'f', name: 'Gone', categoryId: 'fonts', fileRef: 'Gone.zip', files: [{ root: 'fonts', relPath: 'x.ttf' }] };
  assert.equal(s.installer.restoreDeployed(font), null);
  assert.equal(s.installer.cachedArchive(null, 'Gone.zip'), null);
});

test('without a game path nothing is reported lost', (t) => {
  const s = stand(t, { game: false });
  assert.deepEqual(s.installer.lostToVerify([{ enabled: true, files: [{ root: 'fonts', relPath: 'a.ttf' }] }]), []);
  assert.equal(s.installer.fontFolderHashes(), null);
});

// ---------- what is on disk ----------

test('the font folder is fingerprinted file by file, under lower-case names', (t) => {
  const s = stand(t);
  assert.equal(s.installer.fontFolderHashes(), null, 'no font folder yet');
  fs.mkdirSync(path.join(s.game, ...FONTS, 'sub'), { recursive: true });
  fs.writeFileSync(path.join(s.game, ...FONTS, 'Radiance.TTF'), 'abc');
  fs.writeFileSync(path.join(s.game, ...FONTS, 'sub', 'b.ttf'), '');
  assert.deepEqual(s.installer.fontFolderHashes(), {
    'radiance.ttf': 'a9993e364706816aba3e25717850c26c9cd0d89d',
    'b.ttf': 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
  });
});

test('the download cache reports its size and can be emptied', (t) => {
  const s = stand(t);
  assert.equal(s.installer.downloadCacheSize(), 0);
  fs.mkdirSync(path.join(s.installer.downloadsDir, 'heroes'), { recursive: true });
  fs.writeFileSync(path.join(s.installer.downloadsDir, 'heroes', 'Axe.zip'), Buffer.alloc(1000));
  fs.writeFileSync(path.join(s.installer.downloadsDir, 'index.json'), '{}');
  assert.equal(s.installer.downloadCacheSize(), 1002);
  assert.equal(s.installer.cachedArchive('heroes', 'Axe.zip'), path.join(s.installer.downloadsDir, 'heroes', 'Axe.zip'));

  s.installer.clearDownloadCache();
  assert.equal(s.installer.downloadCacheSize(), 0);
  assert.ok(fs.existsSync(s.installer.downloadsDir), 'the folder itself is still there to download into');
  assert.equal(s.installer.cachedArchive('heroes', 'Axe.zip'), null);
});

test('a cursor set another program put in the game is found, folders and all, unless the app manages cursors', (t) => {
  const s = stand(t);
  fs.mkdirSync(path.join(s.game, ...CURSOR, 'anim'), { recursive: true });
  fs.writeFileSync(path.join(s.game, ...CURSOR, 'cursor_default.bmp'), 'someone else');
  fs.writeFileSync(path.join(s.game, ...CURSOR, 'anim', 'spin.ani'), 'frames');

  const found = s.installer.externalFiles([]).filter((x) => x.kind === 'cursor');
  assert.equal(found.length, 1);
  assert.deepEqual(found[0].files.map((f) => f.relPath).sort(), ['anim/spin.ani', 'cursor_default.bmp']);
  assert.equal(found[0].size, 'someone else'.length + 'frames'.length);

  assert.deepEqual(s.installer.externalFiles([{ root: 'cursor', relPath: 'cursor_default.bmp' }]).filter((x) => x.kind === 'cursor'), []);
});

test('generateRankVpk produces self-contained VPK with pure native textures and no crashing stylesheets', () => {
  const { generateRankVpk } = require('../src/rank-generator.js');
  const { listVpkPaths } = require('../src/vpk.js');
  const result = generateRankVpk({
    medal: 'rank8c',
    baseRank: 'rank0',
    immortalRank: 8,
    mmr: 12620,
    heroTier: 5,
    heroLevel: 30,
  });

  assert.ok(result.buffer && result.buffer.length > 0, 'VPK buffer should be generated');
  assert.equal(result.immortalRank, 8);
  assert.equal(result.heroTier, 5);
  assert.equal(result.heroLevel, 30);
  assert.equal(result.baseRank, 'rank0');

  const paths = listVpkPaths(result.buffer);
  // Replaces the user's uncalibrated profile rank slot without replacing other players' ranks
  assert.ok(paths.includes('panorama/images/rank_tier_icons/rank0_psd.vtex_c'), 'user target rank0 must exist');
  assert.ok(paths.includes('panorama/images/rank_tier_icons/mini/rank0_psd.vtex_c'), 'mini rank0 must exist');
  assert.ok(!paths.includes('panorama/images/rank_tier_icons/rank1_psd.vtex_c'), 'other players rank1 must NOT be overridden');
  assert.ok(paths.includes('panorama/images/hero_badges/hero_badge_rank_5_png.vtex_c'), 'grandmaster hero badge must exist');
  assert.ok(paths.includes('panorama/images/hero_badges/hero_badge_rank_0_png.vtex_c'), 'base hero badge override must exist');
  assert.ok(paths.includes('panorama/images/hero_badges/hero_badge_rank_5_small_png.vtex_c'), 'small hero badge must exist');
  assert.ok(paths.includes('panorama/images/hero_badges/hero_badge_rank_5_tiny_png.vtex_c'), 'tiny hero badge must exist');

  // Strict check: NO .vcss_c stylesheets to prevent Dota 2 layout fatal crashes (e.g. mini_showcase.xml)
  assert.ok(!paths.some((p) => p.endsWith('.vcss_c')), 'must NOT contain any .vcss_c stylesheets to prevent Dota 2 layout fatal errors');

  // Global baseRank test
  const globalResult = generateRankVpk({
    medal: 'rank8c',
    baseRank: 'all',
    immortalRank: 10,
  });
  const globalPaths = listVpkPaths(globalResult.buffer);
  assert.ok(globalPaths.includes('panorama/images/rank_tier_icons/rank8c_psd.vtex_c'), 'all slots replaced when baseRank is all');
  assert.ok(globalPaths.includes('panorama/images/rank_tier_icons/rank1_psd.vtex_c'), 'all slots replaced when baseRank is all');
});

test('renderRankPlaqueDigits and renderHeroBadgeDigits draw authentic digits across all sizes', () => {
  const { renderRankPlaqueDigits, renderHeroBadgeDigits, createHeroLevelVtex } = require('../src/rank-drawing.js');
  const path = require('path');
  const fs = require('fs');

  // Plaque digits on 256x256, 128x64, 80x80 and edge cases
  const fake256 = Buffer.concat([Buffer.alloc(2068), Buffer.alloc(262144, 100)]);
  fake256.writeUInt32LE(2068, 0);
  const res256 = renderRankPlaqueDigits(fake256, 10);
  assert.equal(res256.length, fake256.length);

  const fake128 = Buffer.concat([Buffer.alloc(2068), Buffer.alloc(32768, 100)]);
  fake128.writeUInt32LE(2068, 0);
  const res128 = renderRankPlaqueDigits(fake128, 10);
  assert.equal(res128.length, fake128.length);

  const fake80 = Buffer.concat([Buffer.alloc(2068), Buffer.alloc(25600, 100)]);
  fake80.writeUInt32LE(2068, 0);
  const res80 = renderRankPlaqueDigits(fake80, 10);
  assert.equal(res80.length, fake80.length);

  assert.equal(renderRankPlaqueDigits(null, 10), null);
  assert.equal(renderRankPlaqueDigits(fake256, ''), fake256);

  // Hero badge digits on PNG, 256x256 raw, 64x64 raw, 32x32 raw
  const gmVtex = fs.readFileSync(path.join(__dirname, '../src/assets/ranks/hero_badges/hero_badge_rank_5_png.vtex_c'));
  const bakedPng = renderHeroBadgeDigits(gmVtex, 30);
  assert.ok(bakedPng.length > 2068);

  const bakedRaw256 = renderHeroBadgeDigits(fake256, 30);
  assert.equal(bakedRaw256.length, fake256.length);

  const fake64 = Buffer.concat([Buffer.alloc(2068), Buffer.alloc(16384, 100)]);
  fake64.writeUInt32LE(2068, 0);
  const baked64 = renderHeroBadgeDigits(fake64, 30);
  assert.equal(baked64.length, fake64.length);

  const fake32 = Buffer.concat([Buffer.alloc(2068), Buffer.alloc(4096, 100)]);
  fake32.writeUInt32LE(2068, 0);
  const baked32 = renderHeroBadgeDigits(fake32, 30);
  assert.equal(baked32.length, fake32.length);

  assert.equal(renderHeroBadgeDigits(null, 30), null);
  assert.equal(renderHeroBadgeDigits(fake64, ''), fake64);

  // createHeroLevelVtex
  const baseTinyPath = path.join(__dirname, '../src/assets/ranks/hero_badges/hero_badge_rank_0_tiny_png.vtex_c');
  const levelBuf = createHeroLevelVtex(30, baseTinyPath);
  assert.ok(levelBuf.length > 2068);
});

test('generateRankVpk covers all immortal tiers and star ranks', () => {
  const { generateRankVpk } = require('../src/rank-generator.js');

  const top100 = generateRankVpk({ medal: 'rank8', immortalRank: 50 });
  assert.ok(top100.name.includes('Top 100'));

  const top1000 = generateRankVpk({ medal: 'rank8', immortalRank: 500 });
  assert.ok(top1000.name.includes('Top 1000'));

  const topGeneral = generateRankVpk({ medal: 'rank8', immortalRank: 5000 });
  assert.ok(topGeneral.name.includes('Immortal'));

  const starred = generateRankVpk({ medal: 'rank5', stars: 3, baseRank: 'rank5' });
  assert.ok(starred.name.includes('3★'));
  assert.equal(starred.stars, 3);

  const explicit8c = generateRankVpk({ medal: 'rank8c', immortalRank: 25 });
  assert.equal(explicit8c.immortalRank, 10);

  const explicit8b = generateRankVpk({ medal: 'rank8b', immortalRank: 5 });
  assert.equal(explicit8b.immortalRank, 11);

  const explicit8a = generateRankVpk({ medal: 'rank8a', immortalRank: 9999 });
  assert.equal(explicit8a.immortalRank, 6000);

  const unknownMedal = generateRankVpk({ medal: 'rank_nonexistent' });
  assert.ok(unknownMedal.buffer.length > 0);
});

// ---------- slots: how many, and what happens when there are none ----------

/** Mod paks in the language folder, sorted, suffixes and all. */
const paks = (s) => fs.readdirSync(s.lang).filter((f) => /^pak\d+_/.test(f)).sort();

/** Somebody's mod in every slot the allocator would hand out. */
function fillEverySlot(s) {
  s.installer.ensureLangFolder();
  const used = s.installer.usedPakNames();
  for (;;) {
    let name;
    try { name = s.installer.allocatePak(used, true); } catch { return; }
    fs.writeFileSync(path.join(s.lang, name), `other mod in ${name}`);
  }
}

test('the slots a mod can have are counted from the rule, and the last one refuses by range', (t) => {
  /* The Library said 98, then 100, then 9999 for premium, while the allocator gave out 95.
     The number is counted now, and this holds it to what allocatePak actually does. */
  const s = stand(t);
  const used = new Set();
  const handed = [];
  for (;;) {
    try { handed.push(s.installer.allocatePak(used, false)); } catch (err) {
      assert.match(err.message, /02-99/, 'the error names the range that is really full');
      break;
    }
  }
  assert.equal(handed.length, SLOT_CAPACITY);
  assert.equal(SLOT_CAPACITY, 95, 'eight early slots and ninety more, less the three Minify writes');
  assert.ok(handed.every((n) => /^pak\d\d_dir\.vpk$/.test(n)), 'nothing the game would never mount');
  assert.equal(new Set(handed).size, handed.length, 'no slot handed out twice');
});

test('a rank written from bytes takes an early slot, and refuses rather than write over a mod', async (t) => {
  /* With every slot taken the rank used to fall back to pak05 and write over whatever mod was
     there, whose record then pointed at a generated medal. */
  const s = stand(t);
  assert.deepEqual(await s.installer.installDirectBuffer(Buffer.from('rank'), 'Rank', 'ranks'),
    [{ root: 'lang', relPath: 'pak02_dir.vpk' }]);
  fillEverySlot(s);
  await assert.rejects(s.installer.installDirectBuffer(Buffer.from('another rank'), 'Rank', 'ranks'), /02-99/);
  assert.equal(s.read('dota_russian', 'pak05_dir.vpk'), 'other mod in pak05_dir.vpk', 'somebody\'s mod was written over');
  assert.equal(s.read('dota_russian', 'pak02_dir.vpk'), 'rank');
});

test('a medal pack from the catalog is downloaded like any mod; only a generator entry is generated', async (t) => {
  /* The eight packs in the catalog's Ranks all went to the generator because of their category,
     so every one of them installed the same generated file and none was ever downloaded. */
  const s = stand(t);
  const asked = [];
  s.installer.download = async (categoryId, fileRef, label) => {
    asked.push(fileRef);
    return s.arrive(fileRef, `bytes of ${label}`);
  };

  const imperial = await s.installer.install({ categoryId: 'ranks', modName: 'Imperial Medals', fileRef: 'pak10_dir.vpk' });
  const named = await s.installer.install({ categoryId: 'heroes', modName: 'Hero Tier Changer Skin', fileRef: 'Tier.vpk' });
  assert.deepEqual(asked, ['pak10_dir.vpk', 'Tier.vpk'], 'both went to the download');
  assert.deepEqual(imperial, [{ root: 'lang', relPath: 'pak02_dir.vpk' }], 'a rank still loads early');
  assert.equal(s.read('dota_russian', 'pak02_dir.vpk'), 'bytes of Imperial Medals', 'its own archive, not the generator\'s');
  assert.equal(s.read('dota_russian', named[0].relPath), 'bytes of Hero Tier Changer Skin', 'a name is not a category');

  const generated = await s.installer.install({ categoryId: 'ranks', modName: 'Rank Changer', fileRef: 'generator:ranks' });
  assert.equal(asked.length, 2, 'the generator entry downloads nothing');
  const inside = listVpkPaths(fs.readFileSync(path.join(s.lang, generated[0].relPath)));
  assert.ok(inside.some((p) => p.startsWith('panorama/images/rank_tier_icons/')), 'and is the generated medal');
});

// ---------- the master switch ----------

test('mods switched off by the user are off for the next install, even with nothing on disk to say so', (t) => {
  /* An empty library, or every mod already off one by one: switching mods off renames nothing,
     so the folder alone never said "off", and the next mod went live under a Library that
     showed mods off. */
  let explicit = false;
  const s = stand(t, { masterExplicitOff: () => explicit });
  s.installer.ensureLangFolder();
  assert.deepEqual(s.installer.setMasterEnabled(false), { changed: 0 });
  assert.equal(s.installer.masterIsOff(), false, 'nothing on disk, and the switch not yet recorded');
  explicit = true;
  assert.equal(s.installer.masterIsOff(), true, 'the user\'s switch is enough on its own');

  const built = stand(t);
  built.installer.ensureLangFolder();
  install(built.installer, 'heroes', built.arrive('A.vpk', 'a'));
  built.installer.setMasterEnabled(false);
  assert.equal(built.installer.masterIsOff(), true, 'without the flag the folder still answers');
});

test('a preset applied while mods are off switches mods behind the switch, not past it', (t) => {
  /* A on, B off, mods off, then a preset holding only B - in the order presets-service applies
     it, switching off first. B used to go live while the switch said off, and A came back on
     with the rest although the Library showed it off. */
  let explicit = false;
  const s = stand(t, { masterExplicitOff: () => explicit });
  const a = install(s.installer, 'heroes', s.arrive('A.vpk', 'a'));
  const b = install(s.installer, 'heroes', s.arrive('B.vpk', 'b'));
  s.installer.setEnabled(b, false);
  s.installer.setMasterEnabled(false);
  explicit = true;
  assert.deepEqual(paks(s), ['pak10_dir.vpk.moff', 'pak11_dir.vpk.off']);

  s.installer.setEnabled(a, false);
  s.installer.setEnabled(b, true);
  assert.deepEqual(paks(s), ['pak10_dir.vpk.off', 'pak11_dir.vpk.moff'], 'B waits for the switch, A is off for good');

  explicit = false;
  s.installer.setMasterEnabled(true);
  assert.deepEqual(paks(s), ['pak10_dir.vpk.off', 'pak11_dir.vpk'], 'mods on brings back exactly the preset');
});

test('a file the game is holding stops the master switch whole, and says which', (t) => {
  /* The renames were one at a time: a pak Dota held stopped the sweep, the ones before it
     stayed renamed, and the one .moff on disk had the Library say "mods off" while the rest
     went on loading. */
  const s = stand(t);
  for (const n of ['A', 'B', 'C']) install(s.installer, 'heroes', s.arrive(`${n}.vpk`, n));
  const rename = fs.renameSync;
  t.after(() => { fs.renameSync = rename; });
  const holdOn = (code) => {
    fs.renameSync = (from, to) => {
      if (String(from).endsWith('pak11_dir.vpk') && String(to).endsWith('.moff')) {
        throw Object.assign(new Error(`${code}: held, rename '${from}'`), { code });
      }
      return rename(from, to);
    };
  };

  holdOn('EBUSY');
  assert.throws(() => s.installer.setMasterEnabled(false),
    (err) => err.message.includes('pak11_dir.vpk') && !err.message.includes('EBUSY') && err.cause.code === 'EBUSY');
  fs.renameSync = rename;
  assert.deepEqual(paks(s), ['pak10_dir.vpk', 'pak11_dir.vpk', 'pak12_dir.vpk'], 'nothing is left half switched');
  assert.equal(s.installer.masterIsOff(), false, 'and nothing on disk says mods are off');

  holdOn('EIO');
  assert.throws(() => s.installer.setMasterEnabled(false), (err) => err.message.includes('EIO: held'));
  fs.renameSync = rename;
  assert.deepEqual(paks(s), ['pak10_dir.vpk', 'pak11_dir.vpk', 'pak12_dir.vpk']);
});

test('our own mod in pak99 goes off with the rest; a pak99 nobody claims is left to Minify', (t) => {
  /* The 87th mod somebody installs lands in pak99, the slot older Minify releases wrote their
     English fix to. By number alone "Mods off" left ours live. */
  const s = stand(t);
  s.installer.ensureLangFolder();
  fs.writeFileSync(path.join(s.lang, 'pak10_dir.vpk'), 'ours');
  fs.writeFileSync(path.join(s.lang, 'pak99_dir.vpk'), 'the 87th');

  s.installer.writeOwnership(['pak10_dir.vpk', 'pak99_dir.vpk']);
  s.installer.setMasterEnabled(false);
  assert.deepEqual(paks(s), ['pak10_dir.vpk.moff', 'pak99_dir.vpk.moff'], 'the note says it is ours');
  s.installer.setMasterEnabled(true);

  s.installer.writeOwnership(['pak10_dir.vpk']);
  s.installer.setMasterEnabled(false);
  assert.deepEqual(paks(s), ['pak10_dir.vpk.moff', 'pak99_dir.vpk'], 'claimed by nobody: Minify\'s English fix');
  assert.deepEqual(s.installer.externalFiles([{ root: 'lang', relPath: 'pak10_dir.vpk' }], { scanExtras: false }), [],
    'and not offered as a loose file either');
  s.installer.setMasterEnabled(true);

  // the note is only rewritten when the Library lists; the library's own list is fresher
  s.installer.setMasterEnabled(false, ['pak10_dir.vpk', 'pak99_dir.vpk']);
  assert.deepEqual(paks(s), ['pak10_dir.vpk.moff', 'pak99_dir.vpk.moff']);
});

test('a pak99 a preset, a pack or an import just wrote goes off with the rest, with no list handed over', (t) => {
  /* Only mods:install passed the library's list. main.js after a preset or a pack deploy, and
     src/adopt.js after an import, switched mods off against the note, which did not name the mod
     that had just landed in pak99 yet, and left it live as Minify's. */
  let owned = ['pak10_dir.vpk'];
  const s = stand(t, { ownedRelPaths: () => owned });
  s.installer.ensureLangFolder();
  fs.writeFileSync(path.join(s.lang, 'pak10_dir.vpk'), 'ours');
  s.installer.writeOwnership(owned);
  fs.writeFileSync(path.join(s.lang, 'pak99_dir.vpk'), 'the 87th, from a preset');
  owned = ['pak10_dir.vpk', 'pak99_dir.vpk'];

  s.installer.setMasterEnabled(false);
  assert.deepEqual(paks(s), ['pak10_dir.vpk.moff', 'pak99_dir.vpk.moff'], 'the library knew it before the note did');
  s.installer.setMasterEnabled(true);
  assert.deepEqual(paks(s), ['pak10_dir.vpk', 'pak99_dir.vpk']);

  owned = ['pak10_dir.vpk'];
  s.installer.setMasterEnabled(false);
  assert.deepEqual(paks(s), ['pak10_dir.vpk.moff', 'pak99_dir.vpk'], 'one the library does not have is still Minify\'s');

  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  assert.match(main, /new Installer\(\{[\s\S]*?ownedRelPaths: \(\) => library\.knownLangRelPaths\(\)[\s\S]*?\}\);/,
    'and the app hands the installer its library, or none of this happens outside the tests');
});

// ---------- what older versions left where the game never looks ----------

test('mods an older version parked in pak100 and above come back to slots the game reads', (t) => {
  /* 1.0.6, 1.0.8 and 1.0.9 went on to pak100-pak250 once 02-99 were full. The engine reads two
     digits, so those mods were listed, switched on, and did nothing, and nothing moved them. */
  const s = stand(t);
  s.installer.ensureLangFolder();
  const userData = path.join(s.dir, 'userdata');
  const lib = new Library(userData);
  const put = (name, body) => fs.writeFileSync(path.join(s.lang, name), body);
  const lang = (...relPaths) => relPaths.map((relPath) => ({ root: 'lang', relPath }));
  put('pak10_dir.vpk', 'ordinary');
  put('pak150_dir.vpk', 'upper');
  put('pak120_dir.vpk.off', 'lower, switched off');
  put('pak130_dir.vpk', 'pack index');
  put('pak130_000.vpk', 'pack volume');
  lib.add({ name: 'Ordinary', categoryId: 'heroes', files: lang('pak10_dir.vpk') });
  const upper = lib.add({ name: 'Upper', categoryId: 'heroes', files: lang('pak150_dir.vpk') });
  const lower = lib.add({ name: 'Lower', categoryId: 'trees', files: lang('pak120_dir.vpk') });
  const pack = lib.add({ name: 'Pack', categoryId: 'heroes', kind: 'pack', files: lang('pak130_dir.vpk', 'pak130_000.vpk') });

  assert.deepEqual(s.installer.migrateLegacyPriorityPaks(lib), { moved: 3, stuck: 0 }, 'it runs with the startup repair');

  const saved = new Library(userData);
  assert.deepEqual(saved.find(lower.id).files, lang('pak02_dir.vpk'), 'an early category gets an early slot');
  assert.deepEqual(saved.find(pack.id).files, lang('pak11_dir.vpk', 'pak11_000.vpk'), 'a set moves whole');
  assert.deepEqual(saved.find(upper.id).files, lang('pak12_dir.vpk'), 'and the lower of two stays on top');
  assert.deepEqual(paks(s), ['pak02_dir.vpk.off', 'pak10_dir.vpk', 'pak11_000.vpk', 'pak11_dir.vpk', 'pak12_dir.vpk']);
  assert.equal(s.read('dota_russian', 'pak02_dir.vpk.off'), 'lower, switched off', 'switched off stays off');
  assert.deepEqual(s.installer.migrateLegacyPriorityPaks(lib), { moved: 0, stuck: 0 }, 'a second start finds nothing to do');
});

test('a parked mod with no slot to go to is kept and marked, and moves once one frees up', (t) => {
  const s = stand(t);
  const userData = path.join(s.dir, 'userdata');
  const lib = new Library(userData);
  fillEverySlot(s);
  fs.writeFileSync(path.join(s.lang, 'pak140_dir.vpk'), 'parked');
  const rec = lib.add({ name: 'Parked', categoryId: 'heroes', files: [{ root: 'lang', relPath: 'pak140_dir.vpk' }] });

  assert.deepEqual(s.installer.migrateLegacyPriorityPaks(lib), { moved: 0, stuck: 1 });
  assert.equal(new Library(userData).find(rec.id).notMounted, true, 'the Library can say it does not load');
  assert.equal(s.read('dota_russian', 'pak140_dir.vpk'), 'parked', 'and the mod is still there');

  fs.rmSync(path.join(s.lang, 'pak50_dir.vpk'));
  assert.deepEqual(s.installer.migrateLegacyPriorityPaks(lib), { moved: 1, stuck: 0 });
  const moved = new Library(userData).find(rec.id);
  assert.deepEqual(moved.files, [{ root: 'lang', relPath: 'pak50_dir.vpk' }]);
  assert.equal(moved.notMounted, undefined, 'the mark goes once it loads');
  assert.equal(s.read('dota_russian', 'pak50_dir.vpk'), 'parked');
});

// ---------- the channels that install, and the rank ones ----------

/** A settings.json that lives as long as the object: what one run of the app would see. */
function memorySettings(seed = {}) {
  const data = { ...seed };
  return { data, get: (k) => data[k], set: (k, v) => { data[k] = v; } };
}

/**
 * src/ipc-mods.js registered against a stand, with Electron's ipcMain standing in. Registering
 * is what a start of the app does, so a second call with the same settings is the next start.
 */
function modsChannels(s, { settings = memorySettings() } = {}) {
  const Module = require('module');
  const handlers = new Map();
  const electron = { ipcMain: { handle: (channel, fn) => handlers.set(channel, fn) }, dialog: {} };
  const load = Module._load;
  Module._load = function stubbed(request, ...rest) {
    return request === 'electron' ? electron : load.call(this, request, ...rest);
  };
  const file = require.resolve('../src/ipc-mods.js');
  const library = new Library(path.join(s.dir, 'userdata'));
  const log = [];
  try {
    delete require.cache[file];
    require(file).registerModsIpc({
      applyMasterToCursors: (on) => log.push(`cursors ${on}`), blocked: () => null, catalog: {},
      diag: (msg) => log.push(msg), disableOtherCursors: () => [],
      fingerprints: { hasData: () => false, match: () => null, fonts: [] },
      importVpkBuffers: () => null, importVpkPaths: () => null, installer: s.installer,
      isCursorRecord: () => false, library, refreshPresence: () => {},
      schemaService: { harvest: () => null, refresh: () => {}, state: () => ({ enabled: false }) },
      sendProgress: () => {}, settings, verifyStuck: () => false, win: () => null,
    });
  } finally {
    Module._load = load;
    delete require.cache[file];
  }
  return { call: (channel, ...args) => handlers.get(channel)({}, ...args), library, log };
}

/** download() as the network would answer it, from bytes named after the mod. */
function offline(s) {
  s.installer.download = async (categoryId, fileRef, label) => s.arrive(path.basename(fileRef), `bytes of ${label}`);
}

test('the Library is told how many slots there really are', async (t) => {
  const s = stand(t);
  s.installer.ensureLangFolder();
  const res = await modsChannels(s).call('mods:list');
  assert.equal(res.slotCeil, SLOT_CAPACITY);
});

test('the slot count counts the slots the allocator hands out, and nothing else in the folder', async (t) => {
  /* Every pakNN in the folder counted against a ceiling that leaves out Minify's three, so the
     arrangement the Library recommends - Minify in the same folder - read 98 of 95. */
  const s = stand(t);
  s.installer.ensureLangFolder();
  for (const name of ['pak65_dir.vpk', 'pak66_dir.vpk', 'pak67_dir.vpk.moff', 'pak00_dir.vpk', 'pak01_dir.vpk', 'pak150_dir.vpk']) {
    fs.writeFileSync(path.join(s.lang, name), 'not a slot of ours');
  }
  assert.deepEqual(s.installer.slotUse([]), { taken: 0, ceiling: SLOT_CAPACITY });
  fillEverySlot(s);
  const ch = modsChannels(s);
  ch.library.add({ categoryId: 'heroes', name: 'The 87th', files: [{ root: 'lang', relPath: 'pak99_dir.vpk' }] });
  const full = await ch.call('mods:list');
  assert.deepEqual([full.slots, full.slotCeil], [SLOT_CAPACITY, SLOT_CAPACITY], 'full is exactly full');

  // an old Minify's English fix in pak99: not a mod of ours, and a slot we cannot have
  const beside = stand(t);
  beside.installer.ensureLangFolder();
  fs.writeFileSync(path.join(beside.lang, 'pak99_dir.vpk'), 'Minify\'s English fix');
  assert.deepEqual(beside.installer.slotUse([]), { taken: 0, ceiling: SLOT_CAPACITY - 1 });
  fillEverySlot(beside);
  assert.deepEqual(beside.installer.slotUse([]), { taken: SLOT_CAPACITY - 1, ceiling: SLOT_CAPACITY - 1 },
    'the count still meets the ceiling where installing stops');
  assert.deepEqual(beside.installer.slotUse(['pak99_dir.vpk']), { taken: SLOT_CAPACITY, ceiling: SLOT_CAPACITY },
    'and one of ours in pak99 is just a slot in use');
});

test('a mod installed while the user has mods off goes in switched off', async (t) => {
  const s = stand(t, { masterExplicitOff: () => true });
  offline(s);
  const ch = modsChannels(s);
  const res = await ch.call('mods:install', { categoryId: 'heroes', name: 'Axe', fileRef: 'Axe.vpk' });
  assert.equal(res.ok, true);
  assert.deepEqual(paks(s), ['pak10_dir.vpk.moff'], 'it went live while the Library said mods were off');
  assert.ok(ch.log.includes('cursors false'), 'and cursors follow the switch as well');
});

test('Apply puts the new rank in before the old one comes out, and leaves the catalog\'s medal packs alone', async (t) => {
  const s = stand(t);
  offline(s);
  const ch = modsChannels(s);
  const pack = await ch.call('mods:install', { categoryId: 'ranks', name: 'Imperial Medals', fileRef: 'pak10_dir.vpk' });
  assert.deepEqual(pack.record.files, [{ root: 'lang', relPath: 'pak02_dir.vpk' }]);
  assert.deepEqual(await ch.call('ranks:getCustom'), { active: false }, 'a medal pack is not the custom rank');

  const first = await ch.call('ranks:applyCustom', { medal: 'rank5', heroTier: 5, heroLevel: 30 });
  assert.equal(first.ok, true);
  assert.deepEqual(first.record.files, [{ root: 'lang', relPath: 'pak03_dir.vpk' }]);
  const second = await ch.call('ranks:applyCustom', { medal: 'rank6', heroTier: 5, heroLevel: 30 });
  assert.deepEqual(second.record.files, [{ root: 'lang', relPath: 'pak04_dir.vpk' }], 'written while the old one was still there');
  assert.deepEqual(paks(s), ['pak02_dir.vpk', 'pak04_dir.vpk'], 'the old rank is gone, the medal pack is not');
  assert.deepEqual(ch.library.list().map((r) => r.name).sort(), ['Imperial Medals', second.name].sort());
  assert.equal((await ch.call('ranks:getCustom')).record.id, second.record.id);

  assert.deepEqual(await ch.call('ranks:removeCustom'), { ok: true });
  assert.deepEqual(paks(s), ['pak02_dir.vpk'], 'Reset takes out the generated rank only');
  assert.deepEqual(ch.library.list().map((r) => r.name), ['Imperial Medals']);
});

test('a rank the game is holding is reported, and the folder is left as it was', async (t) => {
  /* The failure used to be swallowed: Apply added a second rank that the first, on its lower
     slot, went on beating, and Reset said "restored" with the rank still in the game. */
  const s = stand(t);
  const ch = modsChannels(s);
  const first = await ch.call('ranks:applyCustom', { medal: 'rank5' });
  const remove = s.installer.remove.bind(s.installer);
  let held = (files) => files.some((f) => f.relPath === 'pak02_dir.vpk');
  s.installer.remove = (files, opts) => {
    if (held(files)) throw Object.assign(new Error('EBUSY: locked'), { code: 'EBUSY' });
    return remove(files, opts);
  };

  const again = await ch.call('ranks:applyCustom', { medal: 'rank6' });
  assert.ok(again.error && !again.error.includes('EBUSY'), `a message for people, got ${again.error}`);
  assert.deepEqual(paks(s), ['pak02_dir.vpk'], 'the new rank came back out');
  assert.deepEqual(ch.library.list().map((r) => r.id), [first.record.id]);

  const reset = await ch.call('ranks:removeCustom');
  assert.ok(reset.error, 'Reset does not say it worked');
  assert.deepEqual(ch.library.list().map((r) => r.id), [first.record.id], 'and keeps the record of what is still there');

  // nothing can come out at all: the new pak stays, and so does a record pointing at it
  held = () => true;
  assert.ok((await ch.call('ranks:applyCustom', { medal: 'rank7' })).error);
  assert.deepEqual(paks(s), ['pak02_dir.vpk', 'pak03_dir.vpk']);
  assert.equal(ch.library.list().length, 2, 'no pak is left that the library does not know about');

  held = () => false;
  assert.deepEqual(await ch.call('ranks:removeCustom'), { ok: true });
  assert.deepEqual(paks(s), []);
});

test('a rank applied while mods are off is off too', async (t) => {
  const s = stand(t, { masterExplicitOff: () => true });
  const ch = modsChannels(s);
  const res = await ch.call('ranks:applyCustom', { medal: 'rank5' });
  assert.equal(res.ok, true);
  assert.deepEqual(paks(s), ['pak02_dir.vpk.moff']);
});


test('a rank 1.0.14 generated for a medal card is the rank Apply replaces and Reset takes out; a pack bought since is not', async (t) => {
  /* 1.0.14 sent every Ranks card to the generator and recorded the card's own fileRef, with no
     customRank. Once only customRank counted, those ranks went on beating the one applied over
     them from their lower slot, and Reset said "restored" with them still in the game. */
  const s = stand(t);
  const files = await s.installer.installDirectBuffer(Buffer.from('what 1.0.14 generated'), 'Divine Medals', 'ranks');
  const legacy = new Library(path.join(s.dir, 'userdata'))
    .add({ categoryId: 'ranks', name: 'Divine Medals', fileRef: 'pak17_dir.vpk', files });
  const settings = memorySettings();

  const ch = modsChannels(s, { settings });
  assert.equal(settings.data.legacyRanksMigrated, true, 'marked once, and said so');
  assert.equal((await ch.call('ranks:getCustom')).record.id, legacy.id, 'the Customizer sees it as its own');
  const applied = await ch.call('ranks:applyCustom', { medal: 'rank5', heroTier: 5, heroLevel: 30 });
  assert.equal(applied.ok, true);
  assert.deepEqual(paks(s), ['pak03_dir.vpk'], 'the old generated rank is out, not left on the lower slot');

  offline(s);
  const pack = await ch.call('mods:install', { categoryId: 'ranks', name: 'Imperial Medals', fileRef: 'pak10_dir.vpk' });
  const nextStart = modsChannels(s, { settings });
  assert.equal(nextStart.library.find(pack.record.id).customRank, undefined, 'a real medal pack is not taken for a generated rank');
  assert.equal((await nextStart.call('ranks:getCustom')).record.id, applied.record.id);
  assert.deepEqual(await nextStart.call('ranks:removeCustom'), { ok: true });
  assert.deepEqual(paks(s), ['pak02_dir.vpk'], 'Reset leaves the pack');
  assert.deepEqual(nextStart.library.list().map((r) => r.name), ['Imperial Medals']);
});

test('Apply keeps the rank it just wrote when the old one\'s file is already gone, and still changes it with every slot taken', async (t) => {
  /* New before old: the new rank takes the first free slot, which is the old one's when its file
     was deleted by hand, and removing the old record then deleted the new file. And with every
     slot taken there was no room for the new one until the old one was out. */
  const s = stand(t);
  const ch = modsChannels(s);
  const first = await ch.call('ranks:applyCustom', { medal: 'rank5' });
  assert.deepEqual(first.record.files, [{ root: 'lang', relPath: 'pak02_dir.vpk' }]);
  fs.rmSync(path.join(s.lang, 'pak02_dir.vpk'));

  const second = await ch.call('ranks:applyCustom', { medal: 'rank6' });
  assert.equal(second.ok, true);
  assert.deepEqual(second.record.files, [{ root: 'lang', relPath: 'pak02_dir.vpk' }]);
  assert.deepEqual(paks(s), ['pak02_dir.vpk'], 'the rank just applied is still on disk');
  assert.deepEqual(ch.library.list().map((r) => r.id), [second.record.id]);

  fillEverySlot(s);
  const before = fs.readFileSync(path.join(s.lang, 'pak02_dir.vpk'));
  const third = await ch.call('ranks:applyCustom', { medal: 'rank7' });
  assert.equal(third.ok, true, `changing the rank at the limit failed: ${third.error}`);
  assert.deepEqual(third.record.files, [{ root: 'lang', relPath: 'pak02_dir.vpk' }], 'into the slot the old one gave up');
  assert.ok(!fs.readFileSync(path.join(s.lang, 'pak02_dir.vpk')).equals(before), 'and it is the new rank');
  assert.deepEqual(ch.library.list().map((r) => r.id), [third.record.id]);
  assert.equal(s.read('dota_russian', 'pak05_dir.vpk'), 'other mod in pak05_dir.vpk', 'nobody else made room');
});

test('a mod parked above pak99 is listed as not loading, and covers nobody', async (t) => {
  /* remountHighSlots marked the ones it could not bring back, and nothing read the mark: the row
     showed the mod on, the count counted it, and coverage took it for mounted. */
  const vpk = require('../src/vpk.js');
  const { crc32: crc } = require('../src/schema.js');
  const hook = (body) => vpk.buildVpk([{
    ext: 'vmdl_c', folder: 'models/items/pudge/hook', name: 'hook', data: Buffer.from(body),
    preload: Buffer.alloc(0), crc: crc(Buffer.from(body)) >>> 0,
  }]);
  const s = stand(t);
  s.installer.ensureLangFolder();
  fs.writeFileSync(path.join(s.lang, 'pak20_dir.vpk'), hook('mounted'));
  fs.writeFileSync(path.join(s.lang, 'pak150_dir.vpk'), hook('parked'));
  fs.writeFileSync(path.join(s.lang, 'pak30_dir.vpk'), 'moved down since');
  const ch = modsChannels(s);
  const lang = (relPath) => [{ root: 'lang', relPath }];
  ch.library.add({ categoryId: 'heroes', name: 'Mounted', files: lang('pak20_dir.vpk') });
  ch.library.add({ categoryId: 'heroes', name: 'Parked', files: lang('pak150_dir.vpk') });
  const since = ch.library.add({ categoryId: 'heroes', name: 'Since', files: lang('pak30_dir.vpk') });
  ch.library.update(since.id, { notMounted: true });

  const listed = new Map((await ch.call('mods:list')).installed.map((r) => [r.name, r]));
  assert.equal(listed.get('Parked').notMounted, true);
  assert.equal(listed.get('Parked').coveredBy, undefined, 'the game never mounts it, so nobody covers it');
  assert.ok(!listed.get('Since').notMounted, 'the slot decides, not a mark a move left behind');
  assert.ok(!listed.get('Mounted').notMounted);

  s.installer.migrateLegacyPriorityPaks(ch.library);
  assert.equal(new Library(path.join(s.dir, 'userdata')).find(since.id).notMounted, undefined, 'and the next start drops it');
});
