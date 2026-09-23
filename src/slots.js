/* Which pak slots a mod can have, and handing them out.
 *
 * The game mounts pakNN_dir.vpk in numeric order and the first copy of a file wins, so a slot
 * is two things at once: a place to put a mod, and its priority. filesystem_stdio.dll checks
 * the name at thirteen characters and reads exactly two digits, so pak100 and above are never
 * mounted at all - a mod written there is installed, listed, switched on, and does nothing.
 *
 * Split out of src/installer.js, which had reached its size budget. The installer still owns
 * the folder; this owns the arithmetic, and the one repair that needs nothing but that.
 */
const fs = require('fs');

const { RESERVED_PAKS } = require('./minify');
const { FileTx } = require('./file-tx');
const { t } = require('./i18n');

// Categories whose VPKs must load with higher priority: lower pak numbers (02-09).
// The game only mounts files named pakNN_dir.vpk — the "!pak" prefix seen in
// Dota2PornFx cart zips is a merge-order hint for VPKMerge, not a valid install name.
const PRIORITY_CATEGORIES = ['ranks', 'trees', 'river', 'shaders', 'herofx', 'ranged-attack', 'hero-items', 'optimization'];

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// pak01 is the game's own voice pack and pak00 is where swapSlots parks a mod mid-swap.
const PRIORITY_SLOTS = range(2, 9);
// Minify writes 65, 66 and 67 into whichever language folder it is set to, and if that is
// ours, whoever writes second replaces the other's mod. Three slots out of ninety buys never
// having to coordinate - see src/minify.js. A pak it has already written needs no reserving:
// it is in `used`, read off the folder.
const MOD_SLOTS = range(10, 99).filter((n) => !RESERVED_PAKS.includes(n));

/* How many mods can have a slot of their own, whatever plan anybody is on.
 *
 * Counted from the two lists rather than written down, because the Library said 98 and then
 * 100 and then 9999 while the allocator gave out 95: the number on screen had its own copy of
 * a rule that lives here. */
const SLOT_CAPACITY = PRIORITY_SLOTS.length + MOD_SLOTS.length;

const slotBase = (n) => `pak${String(n).padStart(2, '0')}`;

/**
 * The next free slot, taken out of `used` so a plan made in one pass never hands one out twice.
 * A category that must load early starts at 02; everything else starts at 10 and falls back to
 * the early slots only when the rest are gone.
 * @param {Set<string>} used  lowercased file names already in the folder, suffixes stripped
 * @param {boolean} priority
 * @returns {string} "pakNN_dir.vpk"
 */
function allocatePak(used, priority) {
  const order = priority ? [...PRIORITY_SLOTS, ...MOD_SLOTS] : [...MOD_SLOTS, ...PRIORITY_SLOTS];
  for (const n of order) {
    const name = `${slotBase(n)}_dir.vpk`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  // the code, because a caller that can make room (Rank Customizer's Apply) has to tell this
  // apart from every other failure, and the message is in whichever language the UI is
  throw Object.assign(new Error(t('Свободных слотов pakNN не осталось (02-99 заняты)')), { code: 'ENOSLOT' });
}

/**
 * The Library's "N of M slots", both counted in the slots allocatePak hands out. Every pakNN in
 * the folder used to count, so beside Minify it read 98 of 95: its 65-67 are not slots of ours,
 * and neither are pak00, pak01 or pak100+. An old Minify's pak99 is not a mod of ours either and
 * takes the slot with it, so the count still reaches the ceiling when installing starts to fail.
 * @param {string[]} names  file names in the language folder
 * @param {(name: string) => boolean} [isMinifys]  whether a pak99_dir.vpk there is Minify's
 * @returns {{ taken: number, ceiling: number }}
 */
function countSlots(names, isMinifys = () => false) {
  const out = { taken: 0, ceiling: SLOT_CAPACITY };
  for (const f of new Set(names.map((x) => String(x).toLowerCase().replace(/\.moff$/, '').replace(/\.off$/, '')))) {
    const n = Number((f.match(/^pak(\d\d)_dir\.vpk$/) || [])[1]);
    if (!PRIORITY_SLOTS.includes(n) && !MOD_SLOTS.includes(n)) continue;
    if (n === 99 && isMinifys(f)) out.ceiling--;
    else out.taken++;
  }
  return out;
}

/**
 * The highest free slot strictly below `n`, so climbing over one mod does not eat the whole low
 * range that the priority categories want.
 * @returns {string|null} "pakNN", or null when there is none
 */
function freeSlotBelow(n, used) {
  for (let i = n - 1; i >= 2; i--) {
    // `used` is read off the folder, so Minify's paks are already in it once it has run.
    // Skipped by number as well, for the machine where it is installed but has not patched
    // yet: taking 66 today means losing that mod the first time it does.
    if (RESERVED_PAKS.includes(i)) continue;
    const base = slotBase(i);
    if (!used.has(`${base}_dir.vpk`)) return base;
  }
  return null;
}

/**
 * Bring back the mods 1.0.6, 1.0.8 and 1.0.9 parked where the game never looks.
 *
 * Those three releases went on handing out pak100 to pak250 once 02-99 were full, and 1.0.10
 * stopped doing it without moving anything back. Each such mod gets a real slot if there is
 * one. One that cannot is kept, and flagged notMounted, so the Library can say it is not
 * loading instead of showing it switched on. Lowest first, so whichever of them was on top
 * stays on top. Safe to run on every start: with nothing above 99 it reads one folder listing.
 *
 * @param {object} installer  the Installer: langFolder, usedPakNames, slotNumber, moveToSlot
 * @param {object} library
 * @returns {{ moved: number, stuck: number }}
 */
function remountHighSlots(installer, library) {
  const out = { moved: 0, stuck: 0 };
  if (!fs.existsSync(installer.langFolder())) return out;
  // A mark outlives the move when something else carried the mod down: a swap in the load
  // order, a pack rebuilt into a fresh slot. The slot is the truth, so the mark follows it.
  for (const rec of library.list()) {
    if (rec.notMounted && !(installer.slotNumber(rec) > 99)) { delete rec.notMounted; library.save(); }
  }
  const high = library.list()
    .map((rec) => ({ rec, n: installer.slotNumber(rec) }))
    .filter((x) => x.n !== null && x.n > 99)
    .sort((a, b) => a.n - b.n);
  if (!high.length) return out;
  const used = installer.usedPakNames();
  for (const { rec } of high) {
    let name = null;
    try {
      name = allocatePak(used, PRIORITY_CATEGORIES.includes(rec.categoryId));
      // every volume of a set or none: half a set in a slot the game reads is a broken mod
      const files = FileTx.run((tx) => installer.moveToSlot(rec, name.replace(/_dir\.vpk$/i, ''), tx));
      delete rec.notMounted;
      library.update(rec.id, { files });
      out.moved++;
    } catch {
      // No slot left, or a file somebody is holding. Say so on the record, and try again next
      // start; a slot this one could not move into is still free for the next.
      if (name) used.delete(name);
      if (!rec.notMounted) library.update(rec.id, { notMounted: true });
      out.stuck++;
    }
  }
  return out;
}

module.exports = {
  PRIORITY_CATEGORIES, PRIORITY_SLOTS, MOD_SLOTS, SLOT_CAPACITY, allocatePak, countSlots, freeSlotBelow, remountHighSlots,
};
