/* The search-path patch against a real directory, rather than against strings.
 *
 * test/patcher.test.js pins the text transforms byte for byte and never calls apply(), state()
 * or revert(). That gap had a cost: apply() demanded `dota.signatures` before it would do
 * anything, and Valve's Linux build ships `bin/linuxsteamrt64/` without one. A Linux user
 * pressing "safe mode off" got "dota.signatures not found" and no way forward - reported on
 * 2026-09-11 with a photograph of that folder, holding the client, forty shared libraries and
 * no list.
 *
 * So: both shapes of installation, built in a temporary directory, patched and reverted.
 * `paths()` decides where the list belongs, so this reads the same on either platform.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const patcher = require('../src/patcher.js');
const i18n = require('../src/i18n.js');
const { MARKER, FOLDER } = patcher;

const GAMEINFO = `"GameInfo"
{
	FileSystem
	{
		SearchPaths
		{
			Game_Language		dota_*LANGUAGE*
			Game				dota
			Game				core
			Mod					dota
			Write				dota
		}
	}
}
`;

const BRANCH = '"GameInfo"\r\n{\r\n\tgame \t\t"Dota 2"\r\n\r\n\tFileSystem\r\n\t{\r\n\t\tSteamAppId\t\t\t\t570\r\n\t}\r\n}\r\n';

/* A list with no entry for the branch file: `vanillaBranchHashes` finds nothing to compare
   against, which is the same answer it gives for a build whose list does not mention it. The
   point here is whether our own line goes in and comes out, not hash arithmetic. */
const SIGNATURES = 'somefile.dll~SHA1:' + 'A'.repeat(40) + ';CRC:' + 'B'.repeat(8) + '\r\nDIGEST:' + 'C'.repeat(40) + '\r\n';

/**
 * A throwaway game tree.
 * @param {object} t
 * @param {boolean} withList  give it a dota.signatures, the way Windows ships one
 */
function tree(t, withList) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'd2mm-patch-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const game = path.join(root, 'game');
  const backupDir = path.join(root, 'backups');
  fs.mkdirSync(path.join(game, 'dota'), { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(game, 'dota', 'gameinfo.gi'), GAMEINFO);
  fs.writeFileSync(path.join(game, 'dota', 'gameinfo_branchspecific.gi'), Buffer.from(BRANCH, 'latin1'));
  const sig = patcher.paths(game).signatures;
  if (withList) {
    fs.mkdirSync(path.dirname(sig), { recursive: true });
    fs.writeFileSync(sig, Buffer.from(SIGNATURES, 'latin1'));
  }
  return { game, backupDir, sig };
}

const branchOf = (game) => fs.readFileSync(patcher.paths(game).branch, 'latin1');

test('an install that ships no signature list is still patched', (t) => {
  const { game, backupDir, sig } = tree(t, false);
  assert.equal(fs.existsSync(sig), false, 'the tree really has no list');

  const st = patcher.apply({ gamePath: game, folder: FOLDER, backupDir });

  assert.ok(branchOf(game).includes(MARKER), 'the branch file carries the patch');
  assert.ok(branchOf(game).includes(FOLDER), 'and names the mod folder');
  assert.equal(st.patched, true);
  assert.equal(fs.existsSync(path.join(game, FOLDER)), true, 'the folder the patch registers exists');
  assert.equal(fs.existsSync(sig), false, 'and no list was invented for it');
});

test('an install with no list reports that, rather than reporting an unsigned patch', (t) => {
  // Both consumers of this - the status bar dot and schemaService.heal - treat "patched but
  // not signed" as something wrong. On Linux that would be permanent, and re-patching on every
  // check would be the app fighting itself.
  const { game, backupDir } = tree(t, false);
  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });

  const st = patcher.state(game, FOLDER);
  assert.equal(st.signable, false, 'there is nothing here to sign into');
  assert.equal(st.signed, false, 'so nothing was signed');
  assert.equal(st.patched, true, 'and the patch is on, which is the finished state here');
});

test('an install with a list gets the patch signed into it', (t) => {
  const { game, backupDir, sig } = tree(t, true);

  const st = patcher.apply({ gamePath: game, folder: FOLDER, backupDir });

  assert.equal(st.signable, true);
  assert.equal(st.signed, true, 'the patched branch file is accounted for in the list');
  const text = fs.readFileSync(sig, 'latin1');
  assert.ok(text.includes('gameinfo_branchspecific.gi~SHA1:'), 'our line is in the list');
  assert.ok(text.includes('DIGEST:'), "and Valve's own lines are still there");
});

test('reverting puts both files back exactly as they were', (t) => {
  for (const withList of [true, false]) {
    const { game, backupDir, sig } = tree(t, withList);
    const branchBefore = fs.readFileSync(patcher.paths(game).branch);
    const sigBefore = withList ? fs.readFileSync(sig) : null;

    patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
    const st = patcher.revert({ gamePath: game, folder: FOLDER, backupDir });

    assert.deepEqual(fs.readFileSync(patcher.paths(game).branch), branchBefore,
      `the branch file came back byte for byte (list: ${withList})`);
    if (withList) assert.deepEqual(fs.readFileSync(sig), sigBefore, 'and so did the list');
    assert.equal(st.patched, false);
  }
});

test('applying twice does not stack, with a list or without one', (t) => {
  for (const withList of [true, false]) {
    const { game, backupDir } = tree(t, withList);
    patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
    const once = branchOf(game);
    patcher.apply({ gamePath: game, folder: FOLDER, backupDir });

    assert.equal(branchOf(game), once, `the second patch changed nothing (list: ${withList})`);
    // twice by design: the folder is registered on a Game line and on a Mod line, and each
    // carries the marker. The count is pinned so a third registration is a deliberate change.
    const marks = once.split(MARKER).length - 1;
    assert.equal(marks, 2, `the marker appears twice, not ${marks} times`);
  }
});

test('a tree with no gameinfo at all is still refused, and says which file', (t) => {
  const { game, backupDir } = tree(t, true);
  fs.rmSync(path.join(game, 'dota', 'gameinfo.gi'));

  assert.throws(
    () => patcher.apply({ gamePath: game, folder: FOLDER, backupDir }),
    /gameinfo\.gi/,
    'the file it cannot do without is named in the error',
  );
});

/*
 * The signature list belongs to the build of Dota that is installed right now.
 *
 * Valve ships a new dota.signatures with every build: the hash of every DLL it checks, and a
 * DIGEST over the lot. This app appends one line to it. Rebuilding that file from a copy taken
 * weeks ago puts an old build's hashes back, the client compares its real DLLs against them and
 * refuses matchmaking - while the app reports patched, signed and vanilla, because nothing here
 * ever looked at the rest of the list.
 *
 * Measured on a real installation on 2026-09-11: the backup was from 29 July and named
 * dota2.exe~SHA1:0A281119…, the game's own list said 72ED2906…, and the next apply() would have
 * written the July one back over it.
 */
const listFor = (build, branchBuf) => {
  const h = patcher.fileHashes(branchBuf);
  const dll = (name, seed) => `...\\${name}~SHA1:${seed.repeat(40).slice(0, 40)};CRC:${seed.repeat(8).slice(0, 8)}`;
  return [
    `...\\..\\..\\dota\\gameinfo_branchspecific.gi~SHA1:${h.sha1};CRC:${h.crc}`,
    dll('client.dll', build), dll('dota2.exe', build),
    `DIGEST:${build.repeat(64).slice(0, 64)}`,
  ].join('\r\n') + '\r\n';
};
const exeHash = (text) => (text.match(/dota2\.exe~SHA1:(\w{40})/) || [])[1];

test('the patch is signed into the list the installed build shipped, not an older one', (t) => {
  const { game, backupDir, sig } = tree(t, true);
  const vanilla = fs.readFileSync(patcher.paths(game).branch);
  fs.writeFileSync(sig, Buffer.from(listFor('A', vanilla), 'latin1'));

  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
  assert.equal(exeHash(fs.readFileSync(sig, 'latin1')), 'A'.repeat(40), 'build A to start with');

  /* Dota updates to build B while our line is still in the file. The app's copy of the list
     stays at A, because a file that still carries our line is not taken as new ground truth. */
  const patchedBranch = fs.readFileSync(patcher.paths(game).branch);
  fs.writeFileSync(sig, Buffer.from(
    listFor('B', vanilla).replace(/\s+$/, '') + '\r\n' + patcher.signatureLine(patchedBranch) + '\r\n', 'latin1',
  ));

  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });

  const after = fs.readFileSync(sig, 'latin1');
  assert.equal(exeHash(after), 'B'.repeat(40),
    'the list still belongs to the build that is installed, not to the one that was');
  assert.ok(after.includes(patcher.signatureLine(fs.readFileSync(patcher.paths(game).branch))),
    'and our own line is in it exactly once');
  assert.equal(after.split('gameinfo_branchspecific').length - 1, 2, 'Valve\'s entry and ours, no more');
});

test('signing twice does not pile our line up in the list', (t) => {
  const { game, backupDir, sig } = tree(t, true);
  const vanilla = fs.readFileSync(patcher.paths(game).branch);
  fs.writeFileSync(sig, Buffer.from(listFor('A', vanilla), 'latin1'));

  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });

  const after = fs.readFileSync(sig, 'latin1');
  assert.equal(after.split('gameinfo_branchspecific').length - 1, 2, 'one Valve entry, one of ours');
  assert.equal(exeHash(after), 'A'.repeat(40), "and Valve's own lines are untouched");
});

test('a backup from an older build is replaced, or reverting would put the old build back', (t) => {
  /* backupOnce keeps the copy it took before patching, and revert() restores from that copy. A
     copy that no longer matches the list the game ships is worse than none: it loads, so nothing
     looks wrong until the client stops matchmaking. The check that replaces such a copy had no
     test - a mutation run on 2026-09-16 took it out and nothing noticed. */
  const { game, backupDir, sig } = tree(t, true);
  const { sha1, crc } = patcher.fileHashes(Buffer.from(BRANCH, 'latin1'));
  const listed = `...\\..\\..\\dota\\gameinfo_branchspecific.gi~SHA1:${sha1};CRC:${crc}\r\nDIGEST:${'C'.repeat(40)}\r\n`;
  fs.writeFileSync(sig, Buffer.from(listed, 'latin1'));

  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
  // the copy taken before an update: the same file, with a line Valve has since changed
  fs.writeFileSync(path.join(backupDir, 'gameinfo_branchspecific.gi.orig'), Buffer.from(BRANCH.replace('570', '569'), 'latin1'));

  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
  assert.ok(branchOf(game).includes('570'), 'the patch was rebuilt on top of the old build');
  patcher.revert({ gamePath: game, folder: FOLDER, backupDir });

  assert.equal(branchOf(game), BRANCH, 'reverting put the old build back');
  assert.equal(patcher.state(game, FOLDER).vanillaOk, true);
});

test('reverting ignores .bak copies beside the game files, which belong to an older build', (t) => {
  /* No part of this app writes dota.signatures.bak or gameinfo.gi.bak; a foreign patcher or a
     hand-made copy does, and after the next Dota update both name an older build. revert() used
     to write them back unchecked: the list then named the old dota2.exe hash, the client
     compared its real binaries against it and refused matchmaking, while state() reported
     vanilla because it read that same stale list. */
  const { game, backupDir, sig } = tree(t, true);
  const vanilla = fs.readFileSync(patcher.paths(game).branch);
  fs.writeFileSync(sig, Buffer.from(listFor('B', vanilla), 'latin1'));
  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });

  fs.writeFileSync(sig + '.bak', Buffer.from(listFor('A', vanilla), 'latin1'));
  const gameinfo = patcher.paths(game).gameinfo;
  fs.writeFileSync(gameinfo + '.bak', GAMEINFO.replace('Game				core', 'Game				core_old_build'));

  patcher.revert({ gamePath: game, folder: FOLDER, backupDir });

  assert.equal(exeHash(fs.readFileSync(sig, 'latin1')), 'B'.repeat(40), 'the list is still the installed build\'s');
  assert.equal(fs.readFileSync(gameinfo, 'utf8'), GAMEINFO, 'gameinfo.gi was not rolled back to the copy');
  assert.equal(branchOf(game), BRANCH, 'the branch file is vanilla again');
  assert.equal(patcher.state(game, FOLDER).vanillaOk, true);
});

test('a gameinfo cut off inside its SearchPaths block is refused before anything is written', (t) => {
  /* A game update that was interrupted, or a disk that filled up, can leave gameinfo.gi ending in
     the middle of the block the patch is copied from. Building from half a block would register
     half the game's search paths, so the file is refused and the game folder left as it was. */
  const { game, backupDir } = tree(t, true);
  fs.writeFileSync(patcher.paths(game).gameinfo, GAMEINFO.slice(0, GAMEINFO.indexOf('Mod\t')));

  assert.throws(
    () => patcher.apply({ gamePath: game, folder: FOLDER, backupDir }),
    { message: i18n.t('gameinfo.gi: блок SearchPaths не закрыт') },
  );
  assert.equal(branchOf(game), BRANCH, 'the branch file was not touched');
  assert.equal(fs.existsSync(path.join(game, FOLDER)), false, 'and no folder was registered');
});

/*
 * Writing a game file while something holds it open.
 *
 * Steam keeps the gameinfo files open while it runs, and Windows refuses to rename over a file
 * another process has open. writeAtomic() has two fallbacks for that and a refusal for everything
 * else. None of the three can be produced on demand on a real disk, so the refused rename is staged
 * on fs.renameSync and the rest is the real file system.
 */
const refusedRename = (code) => Object.assign(new Error(`${code}: rename refused`), { code });
const leftovers = (game) => fs.readdirSync(path.join(game, 'dota')).filter((f) => f.endsWith('.mmtmp'));

test('a rename refused because the file is held open is retried after moving the file aside', (t) => {
  const { game, backupDir } = tree(t, false);
  const real = fs.renameSync;
  let refused = 0;
  const rename = t.mock.method(fs, 'renameSync', (from, to) => {
    if (!refused && fs.existsSync(to)) { refused++; throw refusedRename('EPERM'); }
    return real(from, to);
  });

  const st = patcher.apply({ gamePath: game, folder: FOLDER, backupDir });

  assert.equal(refused, 1, 'the first rename over the live file was refused');
  assert.equal(rename.mock.callCount(), 2, 'and the second, onto a path with nothing in it, went through');
  assert.ok(branchOf(game).includes(MARKER), 'the patch is on disk');
  assert.equal(st.patched, true);
  assert.deepEqual(leftovers(game), [], 'no temporary file is left in the game folder');
});

test('a rename that keeps being refused falls back to writing the file in place', (t) => {
  const { game, backupDir } = tree(t, false);
  const rename = t.mock.method(fs, 'renameSync', () => { throw refusedRename('EBUSY'); });

  const st = patcher.apply({ gamePath: game, folder: FOLDER, backupDir });

  assert.equal(rename.mock.callCount(), 2, 'both renames were tried before writing in place');
  assert.ok(branchOf(game).includes(MARKER), 'the patch was written in place');
  assert.equal(st.patched, true);
  assert.deepEqual(leftovers(game), [], 'and the temporary copy was cleaned up');
});

test('a rename error that is not a lock is thrown, with the game file as it was', (t) => {
  // another drive (EXDEV) or a full disk is not something waiting fixes, and deleting the live
  // file to retry would turn a failed write into a missing gameinfo
  const { game, backupDir } = tree(t, false);
  t.mock.method(fs, 'renameSync', () => { throw refusedRename('EXDEV'); });

  assert.throws(() => patcher.apply({ gamePath: game, folder: FOLDER, backupDir }), { code: 'EXDEV' });
  assert.equal(branchOf(game), BRANCH, 'the branch file is still the original');
  assert.deepEqual(leftovers(game), [], 'and the half-finished temporary file is gone');
});

/*
 * cleanForeign(): another patcher's lines, taken out of a game this app has patched.
 *
 * Dota2SkinChanger registers its own folder ahead of the game's, in gameinfo.gi and in the branch
 * file, signs its edit into the list after the DIGEST line, and leaves a junction called
 * Dota2SkinChanger in the game folder. Two tools registering folders at once reads to the user as
 * "some of my mods do not load", so the other tool's lines come out - and only those.
 */
const SKIN = 'Dota2SkinChanger';
/** The two lines the foreign tool adds, put ahead of the first Game line of a search path block. */
function withSkinChanger(text, eol) {
  const at = text.search(/^[ \t]*Game[ \t]+/m);
  assert.ok(at > 0, 'the fixture has a Game line to put the foreign lines in front of');
  return text.slice(0, at) + `\t\t\tGame\t\t\t\t${SKIN}${eol}\t\t\tMod\t\t\t\t\t${SKIN}${eol}` + text.slice(at);
}

test('cleaning out a foreign patcher keeps our own patch, signed, and changes nothing else', (t) => {
  const { game, backupDir, sig } = tree(t, true);
  const branch = patcher.paths(game).branch;
  const gameinfo = patcher.paths(game).gameinfo;
  fs.writeFileSync(sig, Buffer.from(listFor('A', fs.readFileSync(branch)), 'latin1'));
  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
  const ours = fs.readFileSync(branch);
  const oursSigned = fs.readFileSync(sig);

  // the foreign tool edits both files, signs its own version of the branch file, and adds a folder
  const foreign = Buffer.from(withSkinChanger(ours.toString('latin1'), '\r\n'), 'latin1');
  fs.writeFileSync(branch, foreign);
  fs.appendFileSync(sig, Buffer.from(patcher.signatureLine(foreign) + '\r\n', 'latin1'));
  // plus an unmarked dota_mods line: what an interrupted patch or a copying tool leaves behind
  fs.writeFileSync(gameinfo, withSkinChanger(GAMEINFO, '\n')
    .replace('\t\t\tGame\t\t\t\tcore', `\t\t\tGame\t\t\t\t${FOLDER}\n\t\t\tGame\t\t\t\tcore`));
  fs.mkdirSync(path.join(game, SKIN));
  assert.equal(patcher.state(game, FOLDER).foreign, SKIN, 'the foreign patch is seen before cleaning');

  const st = patcher.cleanForeign({ gamePath: game, folder: FOLDER });

  assert.deepEqual(fs.readFileSync(branch), ours, 'the branch file is our patch again, byte for byte');
  assert.deepEqual(fs.readFileSync(sig), oursSigned,
    "the list is signed for that file: the foreign signature is gone and Valve's lines are untouched");
  assert.equal(fs.readFileSync(gameinfo, 'utf8'), GAMEINFO, 'gameinfo.gi is back to what the game shipped');
  assert.equal(fs.existsSync(path.join(game, SKIN)), false, 'the empty folder it left is gone');
  assert.equal(st.patched, true);
  assert.equal(st.signed, true);
  assert.equal(st.foreign, null);
});

test('cleaning an install with nothing foreign in it writes nothing at all', (t) => {
  /* Every write into the game folder is a chance to meet a file Steam holds open, so a clean that
     finds nothing to clean must not rewrite the files it read. */
  const { game, backupDir } = tree(t, true);
  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
  const writes = t.mock.method(fs, 'writeFileSync');

  const st = patcher.cleanForeign({ gamePath: game, folder: FOLDER });

  assert.equal(writes.mock.callCount(), 0, 'nothing was written');
  assert.equal(st.patched, true);
  assert.equal(st.signed, true);
});

test('cleaning an install with no list takes the lines out and invents no list', (t) => {
  const { game, backupDir, sig } = tree(t, false);
  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
  const ours = branchOf(game);
  fs.writeFileSync(patcher.paths(game).branch, Buffer.from(withSkinChanger(ours, '\r\n'), 'latin1'));

  const st = patcher.cleanForeign({ gamePath: game, folder: FOLDER });

  assert.equal(branchOf(game), ours, 'the foreign lines are gone and ours are still there');
  assert.equal(fs.existsSync(sig), false, 'no signature list was created for it');
  assert.equal(st.foreign, null);
  assert.equal(st.patched, true);
});

test('cleaning with no branch file cleans gameinfo.gi and creates nothing', (t) => {
  const { game, sig } = tree(t, true);
  const branch = patcher.paths(game).branch;
  const gameinfo = patcher.paths(game).gameinfo;
  fs.rmSync(branch);
  const listBefore = fs.readFileSync(sig);
  fs.writeFileSync(gameinfo, withSkinChanger(GAMEINFO, '\n'));

  const st = patcher.cleanForeign({ gamePath: game, folder: FOLDER });

  assert.equal(fs.readFileSync(gameinfo, 'utf8'), GAMEINFO, 'gameinfo.gi lost the foreign lines');
  assert.equal(fs.existsSync(branch), false, 'no branch file was made up');
  assert.deepEqual(fs.readFileSync(sig), listBefore, 'and the list was not touched');
  assert.equal(st.patched, false);
});

test('a folder the foreign tool left with files in it is not deleted', (t) => {
  // rmdir, not rm: an empty folder or a link is clutter, a folder holding somebody's files is not ours
  const { game } = tree(t, false);
  const dir = path.join(game, SKIN);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'pak01_dir.vpk'), 'their mod');

  patcher.cleanForeign({ gamePath: game, folder: FOLDER });
  patcher.revert({ gamePath: game, folder: FOLDER });

  assert.equal(fs.readFileSync(path.join(dir, 'pak01_dir.vpk'), 'utf8'), 'their mod', 'their files are still there');
});

test('the junction the foreign tool leaves is removed, and what it points at is not',
  { skip: process.platform !== 'win32' && 'directory junctions are a Windows thing' }, (t) => {
    const { game } = tree(t, false);
    const target = path.join(path.dirname(game), 'skinchanger-data');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'pak01_dir.vpk'), 'their mod');
    fs.symlinkSync(target, path.join(game, SKIN), 'junction');

    patcher.cleanForeign({ gamePath: game, folder: FOLDER });

    assert.equal(fs.existsSync(path.join(game, SKIN)), false, 'the junction is gone from the game folder');
    assert.equal(fs.readFileSync(path.join(target, 'pak01_dir.vpk'), 'utf8'), 'their mod',
      'and the folder it pointed at is intact');
  });

/*
 * revert() when the copies it would like to use are missing or cannot be trusted.
 *
 * The order is: a .bak beside the file if this build's list vouches for it, else the copy in the
 * app's own folder if it verifies (or there is no list to verify it against), else the live file
 * with our block taken out. Each step is there because the one before it can be absent or wrong.
 */
/** A branch file somebody edited by hand: nothing of ours in it, so stripping cannot undo it. */
const HAND_EDITED = BRANCH.replace('\t\tSteamAppId', '\t\tToolsAppId\t\t\t\t571\r\n\t\tSteamAppId');

test("a .bak the installed build's list vouches for is what goes back", (t) => {
  for (const withBak of [true, false]) {
    const { game, backupDir, sig } = tree(t, true);
    const branch = patcher.paths(game).branch;
    fs.writeFileSync(sig, Buffer.from(listFor('A', Buffer.from(BRANCH, 'latin1')), 'latin1'));
    fs.writeFileSync(branch, Buffer.from(HAND_EDITED, 'latin1'));
    if (withBak) fs.writeFileSync(branch + '.bak', Buffer.from(BRANCH, 'latin1'));

    const st = patcher.revert({ gamePath: game, folder: FOLDER, backupDir });

    if (withBak) {
      assert.equal(branchOf(game), BRANCH, 'the .bak hashes to what Valve signed, so it was restored');
      assert.equal(st.vanillaOk, true);
    } else {
      // the contrast: with nothing trustworthy to restore from, the edit stays and is reported
      assert.equal(branchOf(game), HAND_EDITED, 'without the .bak nothing could undo the edit');
      assert.equal(st.vanillaOk, false, 'and the state says the file is not what Valve shipped');
    }
  }
});

test('a .bak the list does not vouch for is not used, and neither is one when there is no list', (t) => {
  for (const withList of [true, false]) {
    const { game, backupDir, sig } = tree(t, withList);
    if (withList) fs.writeFileSync(sig, Buffer.from(listFor('A', Buffer.from(BRANCH, 'latin1')), 'latin1'));
    patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
    fs.writeFileSync(patcher.paths(game).branch + '.bak', Buffer.from(BRANCH.replace('570', '569'), 'latin1'));

    patcher.revert({ gamePath: game, folder: FOLDER, backupDir });

    assert.equal(branchOf(game), BRANCH, `the app's own copy went back, not the older build's .bak (list: ${withList})`);
  }
});

test('a copy in the app folder that the list disowns is not written back', (t) => {
  // the revert() half of 'a backup from an older build is replaced': revert can meet that copy
  // before an apply() has had the chance to replace it
  const { game, backupDir, sig } = tree(t, true);
  fs.writeFileSync(sig, Buffer.from(listFor('A', Buffer.from(BRANCH, 'latin1')), 'latin1'));
  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
  fs.writeFileSync(path.join(backupDir, 'gameinfo_branchspecific.gi.orig'), Buffer.from(BRANCH.replace('570', '569'), 'latin1'));

  const st = patcher.revert({ gamePath: game, folder: FOLDER, backupDir });

  assert.equal(branchOf(game), BRANCH, 'the live file was un-patched instead of the old build going back');
  assert.equal(st.vanillaOk, true);
});

test('without a backup folder, reverting takes our block out of the live files', (t) => {
  for (const withList of [true, false]) {
    const { game, backupDir, sig } = tree(t, withList);
    if (withList) fs.writeFileSync(sig, Buffer.from(listFor('A', Buffer.from(BRANCH, 'latin1')), 'latin1'));
    const listBefore = withList ? fs.readFileSync(sig) : null;
    patcher.apply({ gamePath: game, folder: FOLDER, backupDir });

    const st = patcher.revert({ gamePath: game, folder: FOLDER });

    assert.equal(branchOf(game), BRANCH, `the branch file is the original again (list: ${withList})`);
    if (withList) assert.deepEqual(fs.readFileSync(sig), listBefore, 'and the list lost our line');
    assert.equal(st.patched, false);
    assert.equal(st.vanillaOk, true);
    assert.equal(fs.existsSync(path.join(game, FOLDER)), false, 'the empty mod folder went with it');
  }
});

test('a signature list that has gone missing comes back from the copy taken before patching', (t) => {
  const { game, backupDir, sig } = tree(t, true);
  const listBefore = fs.readFileSync(sig);
  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
  fs.rmSync(sig);

  patcher.revert({ gamePath: game, folder: FOLDER, backupDir });

  assert.deepEqual(fs.readFileSync(sig), listBefore, 'the list is back, without our line in it');
  assert.equal(branchOf(game), BRANCH);
});

test('reverting also takes a foreign patcher out of gameinfo.gi and removes its empty folder', (t) => {
  const { game, backupDir } = tree(t, true);
  patcher.apply({ gamePath: game, folder: FOLDER, backupDir });
  const gameinfo = patcher.paths(game).gameinfo;
  fs.writeFileSync(gameinfo, withSkinChanger(GAMEINFO, '\n'));
  fs.mkdirSync(path.join(game, SKIN));

  const st = patcher.revert({ gamePath: game, folder: FOLDER, backupDir });

  assert.equal(fs.readFileSync(gameinfo, 'utf8'), GAMEINFO, 'gameinfo.gi is what the game shipped');
  assert.equal(fs.existsSync(path.join(game, SKIN)), false, 'the foreign folder is gone');
  assert.equal(branchOf(game), BRANCH);
  assert.equal(st.patched, false);
});
