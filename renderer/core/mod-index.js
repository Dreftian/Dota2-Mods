/* The catalog's mods, found again from what a card, a star or a record remembers of them.
 *
 * A name is not an identity. Nine names in the catalog belong to two categories at once -
 * mega-kill 'Lina' is pak23, the announcer 'Lina' is pak13 - and an index keyed by the name
 * alone let the later category overwrite the earlier one. Everything that asked it with a
 * category in hand got the other mod back: a mega-kill card redrawn after an install rebound
 * its plus to the announcer and queued pak13 under 'mega-kill' (which there is Bristleback),
 * a starred mega-kill 'Lina' showed the announcer in Favourites, and the Library lost the
 * picture of whichever one lost the index.
 *
 * So there are two indexes. The one keyed by category and name answers everyone who knows the
 * category, which is nearly everyone. The name-only one is kept for the callers that have
 * nothing else to go by: a pack's member list, which names mods and not categories, and a
 * fingerprint match that carries no category.
 *
 * No imports, so the rules can be tested in Node without a window around them.
 */

/** `${categoryId}|${lower-cased name}` -> { categoryId, mod } */
export const modsByCategory = new Map();

export function catKey(categoryId, name) {
  return `${categoryId}|${String(name || '').toLowerCase()}`;
}

/**
 * Rebuild both indexes from the catalog.
 * @param {Array<{id: string}>} categories  constants.categories, in the catalog's order
 * @param {(id: string) => Array<{name?: string}>} modsOf  the mods one category shows
 * @param {Map<string, {categoryId: string, mod: object}>} byName  the name-only index
 * @param {Map<string, {categoryId: string, mod: object}>} [byCat]
 */
export function indexCatalog(categories, modsOf, byName, byCat = modsByCategory) {
  byName.clear();
  byCat.clear();
  for (const c of categories || []) {
    for (const m of modsOf(c.id)) {
      if (!m.name) continue;
      const hit = { categoryId: c.id, mod: m };
      // the later category wins here, as it always has: a pack names its members without a
      // category, and which of two same-named mods it installs is not something to change
      // under it silently
      byName.set(m.name.toLowerCase(), hit);
      // and the first one within a category, which is the card the grid draws for that key
      const key = catKey(c.id, m.name);
      if (!byCat.has(key)) byCat.set(key, hit);
    }
  }
}

/** The mod filed under this name in this category, and never one from another category. */
export function modInCategory(categoryId, name, byCat = modsByCategory) {
  return byCat.get(catKey(categoryId, name)) || null;
}

/**
 * Starred keys ("<categoryId>|<name>") resolved back to mods, each mod once.
 *
 * Once, because two keys can land on one mod - the same name starred in two spellings of its
 * case - and a Favourites grid with two identical cards has one heart that cannot be unset.
 * A key whose mod the catalog no longer carries is skipped rather than drawn empty.
 * @param {Iterable<string>} keys
 * @param {(categoryId: string, name: string) => ({_cat: string, name: string}|null)} find
 * @param {string} [skipPrefix]  keys that are not mods at all (a cosmetic look's star)
 */
export function starredMods(keys, find, skipPrefix) {
  const out = [];
  const seen = new Set();
  for (const key of keys) {
    if (skipPrefix && key.startsWith(skipPrefix)) continue;
    const cut = key.indexOf('|');
    if (cut < 0) continue;
    const mod = find(key.slice(0, cut), key.slice(cut + 1));
    if (!mod) continue;
    const id = catKey(mod._cat, mod.name);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(mod);
  }
  return out;
}
