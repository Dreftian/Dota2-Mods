/* The master switch: every mod off at once, and back, without touching anybody's own choice.
 *
 * Off renames each live mod file <f> to <f>.moff and on renames each <f>.moff back. The game
 * only mounts pakNN_dir.vpk, so a .moff is invisible to it and the bytes stay. The suffix is
 * its own, distinct from one mod's .off, so the two states never clobber each other: turning
 * mods back on must not resurrect the ones somebody had switched off one at a time.
 *
 * Split out of src/installer.js, which had reached its size budget. The installer still
 * decides which files are ours to rename; this does the renaming.
 */
const fs = require('fs');
const path = require('path');

const { FileTx } = require('./file-tx');
const { t } = require('./i18n');

// What a file switched off by the master switch is called: <file>.moff. Never ".off", which is
// one mod's own choice and has to survive the master switch going off and on again.
const MASTER_OFF = '.moff';

// What Windows answers when the game, Steam or an antivirus is holding the file open.
const LOCKED = ['EBUSY', 'EPERM', 'EACCES'];

/** Did this fail because somebody else has the file open? */
function isLocked(err) {
  return !!err && LOCKED.includes(err.code);
}

/** Is there a .moff anywhere in the language folder's root? */
function moffOnDisk(lang) {
  if (!fs.existsSync(lang)) return false;
  return fs.readdirSync(lang).some((f) => f.toLowerCase().endsWith(MASTER_OFF));
}

/**
 * Switch every mod in the language folder, and in its maps folder where terrains live.
 *
 * One transaction, because the renames used to be one at a time: a pak the game was holding
 * stopped the sweep halfway, the ones before it stayed renamed, and the Library read the
 * single .moff on disk as "mods off" while the rest went on loading. Now a failure puts every
 * rename back and says which file was held.
 *
 * @param {string} lang  the language folder
 * @param {boolean} enabled
 * @param {(lower: string, full: string) => boolean} mayToggle  whether a file in the folder root
 *   is ours to switch off; the maps folder holds nothing but mods
 * @returns {{ changed: number }}
 */
function sweepMaster(lang, enabled, mayToggle) {
  if (!fs.existsSync(lang)) return { changed: 0 };
  let current = null;
  try {
    return FileTx.run((tx) => {
      let changed = 0;
      const pass = (dir) => {
        for (const f of fs.readdirSync(dir)) {
          current = f;
          const full = path.join(dir, f);
          if (!fs.statSync(full).isFile()) continue;
          const lower = f.toLowerCase();
          // a file a transaction parked belongs to sweepStaged, under exactly that name
          if (lower.endsWith('.mmtx')) continue;
          if (enabled) {
            if (!lower.endsWith(MASTER_OFF)) continue;
            tx.move(full, path.join(dir, f.slice(0, -MASTER_OFF.length)));
          } else {
            if (lower.endsWith(MASTER_OFF) || lower.endsWith('.off')) continue; // already off
            if (dir === lang && !mayToggle(lower, full)) continue;
            tx.move(full, full + MASTER_OFF);
          }
          changed++;
        }
      };
      pass(lang);
      const maps = path.join(lang, 'maps');
      if (fs.existsSync(maps)) pass(maps);
      return { changed };
    });
  } catch (err) {
    const msg = isLocked(err)
      ? t('Моды не переключены: файл {0} занят — закрой Dota 2 и попробуй снова', current)
      : t('Моды не переключены: {0}', String((err && err.message) || err));
    throw new Error(msg, { cause: err });
  }
}

module.exports = { MASTER_OFF, isLocked, moffOnDisk, sweepMaster };
