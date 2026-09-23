// Living next to Minify. The two apps name a language folder by different means - Dota's own
// setting here, a Steam launch option there - and Dota mounts exactly one, so the only
// question worth answering is whose mods the game is going to read. Getting that answer wrong in either direction is worse than saying nothing: telling
// somebody their mods are dark when they are fine sends them reinstalling over a working
// setup, and the opposite leaves them staring at a game with no mods in it.
const test = require('node:test');
const assert = require('node:assert/strict');

const fs = require('fs');
const os = require('os');
const path = require('path');
const { crc32 } = require('node:zlib');

const { readMinify: read, readConfig, MINIFY_FOLDER, MINIFY_BORROWED, RESERVED_PAKS, RESERVED_LABEL, isMinifyFile, isMinifyLegacyPak, ownedByNote, OWNERSHIP_FILE, prelaunchHook } = require('../src/minify.js');
const { buildVpk } = require('../src/vpk.js');

/* Every case below describes a whole machine, so none of them may read the Minify that is
 * installed on the one running the tests: without this the suite passes or fails depending on
 * whether the developer happens to use it. */
const DOTA_LANGUAGES = require('../src/gamelang.js').DOTA_LANGUAGES;
const readMinify = (p) => read({ config: null, gameLanguages: DOTA_LANGUAGES, ...p });

/** One entry of gamelang.langFolders(). */
const folder = (suffix, modFiles = 0, official = false) => ({
  suffix, official, valveContent: false, modFiles,
});

test('with no Minify anywhere, ours are the mods that load', () => {
  const got = readMinify({
    folders: [folder('russian', 4, true)],
    audio: 'russian',
    ourFolder: 'russian',
    ourMods: 4,
  });
  assert.equal(got.present, false);
  assert.equal(got.folder, null);
  assert.equal(got.live, 'ours');
});

test('its own folder is proof enough, even before it holds anything', () => {
  const got = readMinify({
    folders: [folder('russian', 4, true), folder(MINIFY_FOLDER, 0)],
    audio: 'russian',
    ourFolder: 'russian',
    ourMods: 4,
  });
  assert.equal(got.present, true);
  assert.equal(got.folder, MINIFY_FOLDER);
  assert.equal(got.mods, 0);
  assert.equal(got.live, 'ours', 'an empty Minify folder does not take the game from us');
});

test('its own locale is not a language, so that folder never mounts and nothing is a conflict', () => {
  // Since Dota's 2026-07-24 update the mount path comes from the game's language setting
  // rather than from -language, and the setting takes a language. "minify" is not one, so
  // dota_minify is read by nothing - which is why Minify itself moved to Dutch. Saying "the
  // game is reading its mods" here would be wrong in the way that sends somebody digging.
  const got = readMinify({
    folders: [folder('russian', 7, true), folder(MINIFY_FOLDER, 3)],
    audio: MINIFY_FOLDER,
    ourFolder: 'russian',
    ourMods: 7,
  });
  assert.equal(got.present, true);
  assert.equal(got.mounts, false, 'dota_minify cannot be mounted by this game');
  assert.equal(got.live, 'neither', 'the setting points at a folder the game will not read');
});

test('the Dutch it moved to is a real language, and that one does mount', () => {
  const got = readMinify({
    folders: [folder('russian', 7, true), folder(MINIFY_BORROWED, 3)],
    audio: MINIFY_BORROWED,
    ourFolder: 'russian',
    ourMods: 7,
  });
  assert.equal(got.mounts, true);
  assert.equal(got.live, 'minify', 'this is the version that can actually take the folder');
});

test("Minify's Dutch trick for English is recognised as its doing", () => {
  // Not the same move this app makes. It sets Dutch through a Steam launch option, which
  // locks both language settings, creates a folder that did not exist, and needs a VPK of
  // English localization to give the text back. See src/gamelang.js for the rules.
  const got = readMinify({
    folders: [folder('russian', 7, true), folder(MINIFY_BORROWED, 2)],
    audio: MINIFY_BORROWED,
    ourFolder: 'russian',
    ourMods: 7,
  });
  assert.equal(got.present, true);
  assert.equal(got.folder, MINIFY_BORROWED);
  assert.equal(got.mounts, true, 'Dutch is a language Dota knows, so the folder is read');
  assert.equal(got.live, 'minify');
});

test('an empty Dutch folder is somebody who owns the Dutch voice pack, not Minify', () => {
  const got = readMinify({
    folders: [folder('russian', 7, true), folder(MINIFY_BORROWED, 0)],
    audio: 'russian',
    ourFolder: 'russian',
    ourMods: 7,
  });
  assert.equal(got.present, false, 'a guess dressed as a finding');
  assert.equal(got.live, 'ours');
});

test('both in the one folder the game mounts means both load', () => {
  const got = readMinify({
    folders: [folder(MINIFY_FOLDER, 5)],
    audio: MINIFY_FOLDER,
    ourFolder: MINIFY_FOLDER,
    ourMods: 2,
  });
  assert.equal(got.sharing, true);
  assert.equal(got.live, 'both');
});

test('a setting pointing at a folder nobody filled means nothing loads', () => {
  const got = readMinify({
    folders: [folder('russian', 7, true), folder(MINIFY_FOLDER, 3)],
    audio: 'koreana',
    ourFolder: 'russian',
    ourMods: 7,
  });
  assert.equal(got.live, 'neither');
});

test('without a language to read, no claim is made about whose mods load', () => {
  const got = readMinify({
    folders: [folder('russian', 7, true), folder(MINIFY_FOLDER, 3)],
    audio: null,
    ourFolder: 'russian',
    ourMods: 7,
  });
  assert.equal(got.present, true);
  assert.equal(got.live, 'unknown');
  assert.equal(got.mounted, null);
});

test('the setting is read whatever case it was written in', () => {
  const got = readMinify({
    folders: [folder(MINIFY_BORROWED, 3)],
    audio: 'Dutch',
    ourFolder: 'russian',
    ourMods: 1,
  });
  assert.equal(got.mounted, MINIFY_BORROWED);
  assert.equal(got.live, 'minify');
});

test("Minify's own config beats anything guessed from folder names", (t) => {
  // It publishes the locale it sets, and that is the whole question between the two apps -
  // so a folder that does not exist yet (nothing patched since it was installed) is still
  // known about, and a locale we would never have guessed is taken at its word.
  const got = read({
    folders: [folder('russian', 4, true)],
    audio: 'russian',
    ourFolder: 'russian',
    ourMods: 4,
    config: { outputPath: 'C:/Steam/steamapps/common/dota 2 beta/game/dota_polish', locale: 'polish' },
  });
  assert.equal(got.present, true);
  assert.equal(got.folder, 'polish');
  assert.equal(got.declared, true);
  assert.equal(got.live, 'ours', 'ours are mounted; its folder is not the one the game reads');
});

test('a slot is kept empty only where Minify may still write it', () => {
  /* Two different questions that used to share one list. 65 merged, 66 compiled and 67 from
   * its d2pfx browser are the slots it writes on a future patch, so they stay empty whether or
   * not it is installed today - reading the folder cannot see a program somebody adds next
   * week. 99 is not one of them any more: the English fix moved into pak66 in v1.14rc7, so
   * nothing will write there again and the slot goes back into circulation. */
  assert.deepEqual(RESERVED_PAKS, [65, 66, 67]);
  assert.ok(!RESERVED_PAKS.includes(99), '99 is free to hand out');
});

test('a pak Minify writes is recognised as its own by the slot alone', () => {
  /* 65 to 67 are the slots it may write on any patch, so whatever sits there is its work and
   * stays out of reach of the master switch and the foreign-file scan - the two things that
   * rename and offer to delete. */
  for (const n of [65, 66, 67]) {
    assert.equal(isMinifyFile(`pak${n}_dir.vpk`), true, `pak${n} is Minify's`);
    assert.equal(isMinifyFile(`pak${n}_000.vpk`), true, 'and so are its volumes');
    assert.equal(isMinifyFile(`pak${n}_dir.vpk.moff`), true, 'even switched off by us');
  }
  assert.equal(isMinifyFile('pak64_dir.vpk'), false);
  assert.equal(isMinifyFile('pak98_dir.vpk'), false, 'the slot below 99 was always ours');
  /* 99 is a slot we hand out, so its number cannot say whose it is. Deciding by number left the
   * 87th mod somebody installed live through "Mods off", and behind in a language move. */
  assert.equal(isMinifyFile('pak99_dir.vpk'), false, 'pak99 is decided by who made it, not where it is');
});

/** A throwaway folder for one test. */
function tmp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-minify-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** A VPK holding the named files, which is all isMinifyPak reads. */
function vpkOf(...names) {
  return buildVpk(names.map((n) => {
    const data = Buffer.from(n);
    const [name, ext] = n.split('.');
    return { ext, folder: ' ', name, data, preload: Buffer.alloc(0), crc: crc32(data) >>> 0 };
  }));
}

test('a pak99 is ours when we say so, and the English fix of an older Minify when we do not', (t) => {
  /* Anybody on Minify v1.14rc6 or older has a pak99 on disk, which it copied there and may not
   * have marked. Letting go of the number must not turn that file into a stranger; claiming it
   * must not happen to ours. So: named by the library or by our note, ours; named by nobody,
   * its; and with nothing known about ownership at all, only its marker makes it Minify's. */
  const dir = tmp(t);
  const full = path.join(dir, 'pak99_dir.vpk');
  fs.writeFileSync(full, vpkOf('hero.txt'));
  const ours = new Set(['pak99_dir.vpk']);

  assert.equal(isMinifyLegacyPak(full, ours), false, 'the library holds it');
  assert.equal(isMinifyLegacyPak(path.join(dir, 'pak99_000.vpk'), ours), false, 'a volume goes with its index');
  assert.equal(isMinifyLegacyPak(`${full}.moff`, ours), false, 'switched off by us is still ours');
  assert.equal(isMinifyLegacyPak(full, new Set(['pak10_dir.vpk'])), true, 'claimed by nobody: the English fix');
  assert.equal(isMinifyLegacyPak(full, null), false, 'unmarked and nothing known: not something to claim for it');

  fs.writeFileSync(full, vpkOf('minify_version.txt', 'english.txt'));
  assert.equal(isMinifyLegacyPak(full, null), true, 'its marker says so');
  assert.equal(isMinifyLegacyPak(path.join(dir, 'pak99_000.vpk'), null), true, 'and its volume goes with it');

  assert.equal(isMinifyLegacyPak(path.join(dir, 'pak98_dir.vpk'), new Set()), false, 'only the slot both apps used');
  assert.equal(isMinifyLegacyPak(path.join(dir, 'pak66_dir.vpk'), new Set()), false, 'the reserved ones are isMinifyFile\'s');
  assert.equal(isMinifyLegacyPak(path.join(dir, 'gameinfo.gi'), new Set()), false);
});

test('a language move takes our pak99 along and leaves one nobody claims where Minify put it', (t) => {
  /* The move runs at startup, before there is a library to ask, so the note decides. Going by
   * the number left our own pak99 behind in a folder the game stopped reading, and the library
   * then dropped it as a mod that had been deleted. */
  const { moveLangFolder } = require('../src/gamelang.js');
  const note = (dir, files) => fs.writeFileSync(path.join(dir, OWNERSHIP_FILE), JSON.stringify({ files }));
  const game = tmp(t);
  const from = path.join(game, 'dota_russian');
  fs.mkdirSync(from);
  for (const f of ['pak10_dir.vpk', 'pak99_dir.vpk']) fs.writeFileSync(path.join(from, f), f);
  note(from, ['pak10_dir.vpk', 'pak99_dir.vpk']);

  moveLangFolder(game, 'russian', 'schinese');
  const moved = fs.readdirSync(path.join(game, 'dota_schinese'));
  assert.ok(moved.includes('pak10_dir.vpk') && moved.includes('pak99_dir.vpk'), `ours went together: ${moved}`);

  const other = tmp(t);
  const old = path.join(other, 'dota_russian');
  fs.mkdirSync(old);
  for (const f of ['pak10_dir.vpk', 'pak99_dir.vpk']) fs.writeFileSync(path.join(old, f), f);
  note(old, ['pak10_dir.vpk']);
  moveLangFolder(other, 'russian', 'schinese');
  assert.deepEqual(fs.readdirSync(old), ['pak99_dir.vpk'], 'the English fix stays in the folder Minify uses');
});

test('the note beside our mods reads back as the files it names, and no note is not an empty one', (t) => {
  const dir = tmp(t);
  assert.equal(ownedByNote(dir), null, 'no note: nothing known, which is not "nothing is ours"');

  fs.writeFileSync(path.join(dir, OWNERSHIP_FILE), JSON.stringify({ files: ['pak10_dir.vpk', 'Maps\\Dota.vpk'] }));
  assert.deepEqual([...ownedByNote(dir)].sort(), ['maps/dota.vpk', 'pak10_dir.vpk'], 'compared the way the folder spells it');

  fs.writeFileSync(path.join(dir, OWNERSHIP_FILE), JSON.stringify({ files: 'pak10_dir.vpk' }));
  assert.deepEqual([...ownedByNote(dir)], [], 'a note that names nothing claims nothing');

  fs.writeFileSync(path.join(dir, OWNERSHIP_FILE), '{ half a note');
  assert.equal(ownedByNote(dir), null, 'a note nobody can read tells us nothing');
});

test('Minify putting itself in front of the game launch is recognised', () => {
  /* v1.14rc7's "Run patches upon launch", on by default, wraps the game in Steam's launch
   * options so that pressing Play patches first. This app is not in that path - it opens the
   * same steam:// link the Play button does - but it is the window somebody is looking at when
   * the game does not start, so it has to be able to name what is set. */
  assert.equal(prelaunchHook(String.raw`cmd /c "C:\Users\me\Dota2-Minify\Dota2-Minify.exe" prelaunch && %command% -novid`), true);
  assert.equal(prelaunchHook('bash -c "/home/me/Dota2-Minify/Dota2-Minify prelaunch" && %command%'), true, 'and on Linux');

  // matched on what the wrapper is, so ordinary options never trip it
  assert.equal(prelaunchHook('-novid -console -language dutch'), false);
  assert.equal(prelaunchHook(''), false);
  assert.equal(prelaunchHook(null), false);
  assert.equal(prelaunchHook('cmd /c other.exe prelaunch && %command%'), false, 'somebody else\'s hook is not Minify\'s');
  assert.equal(prelaunchHook('cmd /c "Dota2-Minify.exe" patch'), false, 'and patching by hand is not a launch wrapper');
});

test('the launch wrapper is reported even when nothing else says Minify is here', () => {
  /* The wrapper lives in Steam's config, not in the game folder, so it outlives a Minify that
   * was deleted rather than uninstalled - and that is exactly the machine where the game stops
   * starting and nobody can see why. */
  const got = read({
    folders: [folder('russian', 4, true)],
    audio: 'russian',
    gameLanguages: ['russian', 'dutch'],
    ourFolder: 'russian',
    config: null,
    launchOptions: String.raw`cmd /c "C:\Dota2-Minify\Dota2-Minify.exe" prelaunch && %command%`,
  });
  assert.equal(got.present, false, 'no folder of its own on disk');
  assert.equal(got.prelaunch, true, 'but Steam is still told to run it first');
});

test('a config that is not there is not an answer', () => {
  assert.equal(readConfig('C:/no/such/minify_config.json'), null);
});

test('the folder it writes to is not the language the player asked it for', () => {
  /* Asked for English, Minify records output_locale "english" - the player's choice - while
   * writing into dota_dutch, which is the folder it borrows to make English work. Reading the
   * locale had this app announce a folder called dota_english, which exists nowhere, and then
   * conclude that neither program's mods were loading while Minify's plainly were. */
  const got = read({
    folders: [folder('russian', 13, true), folder(MINIFY_BORROWED, 2)],
    audio: MINIFY_BORROWED,
    gameLanguages: DOTA_LANGUAGES,
    ourFolder: 'russian',
    ourMods: 13,
    config: {
      outputPath: 'C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota_dutch',
      locale: 'english',
    },
  });
  assert.equal(got.folder, MINIFY_BORROWED, 'the path says dutch; the locale says english');
  assert.equal(got.mods, 2, 'and the mods are counted in the folder it really uses');
  assert.equal(got.live, 'minify', 'that folder is the mounted one, so its mods are the live ones');
});

test('in a shared folder its mods are counted by who wrote them, not by what is there', () => {
  // Once both apps use one folder, the folder's total is both of ours. Reporting that as
  // Minify's would tell somebody their own fourteen mods belong to another program.
  const got = read({
    folders: [folder(MINIFY_BORROWED, 16)],   // 14 ours + 2 its own, all in one folder
    audio: MINIFY_BORROWED,
    gameLanguages: DOTA_LANGUAGES,
    ourFolder: MINIFY_BORROWED,
    ourMods: 14,
    config: { outputPath: 'C:/x/game/dota_dutch', locale: 'english' },
    countMods: () => 2,
  });
  assert.equal(got.mods, 2, 'only what Minify wrote');
  assert.equal(got.sharing, true);
  assert.equal(got.live, 'both');
});

/*
 * What the Library tells people about the slots, against what the allocator actually skips.
 *
 * 2.6.4 stopped reserving pak99 and the sentence on screen went on promising it for a whole
 * release: "the slots it writes - pak65-67 and pak99 - are left to it", while pak99 was being
 * handed out to the next mod somebody installed. The numbers were written twice and only one
 * copy was updated, so the label is built from the list now and this is the check that they
 * stay the same thing.
 */
test('the slots the interface promises are the slots that are reserved', () => {
  const numbers = RESERVED_LABEL.match(/\d+/g).map(Number);
  assert.equal(numbers[0], RESERVED_PAKS[0], 'the label starts where the reserved range does');
  assert.equal(numbers[numbers.length - 1], RESERVED_PAKS[RESERVED_PAKS.length - 1], 'and ends where it ends');
  assert.ok(!/99/.test(RESERVED_LABEL), 'pak99 has not been reserved since 2.6.4');
});
