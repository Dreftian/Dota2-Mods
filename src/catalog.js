// Catalog: fetch + cache mods.json / constants.json / guides.json from the Dota2PornFx repo
const fs = require('fs');
const path = require('path');
const { fetchText } = require('./net');
const signature = require('./catalog-signature');

const RAW_BASE = 'https://raw.githubusercontent.com/h6rd/Dota2PornFxWeb/main';
const DATA_FILES = ['mods.json', 'constants.json', 'guides.json'];

/* The published sha256 of every archive in the catalog, signed like the data.
 *
 * Deliberately not one of DATA_FILES. Those are the files the app cannot start without, and
 * this one it has never had: until 2026-09-09 an archive was trusted on first sight and
 * checked against that first copy afterwards, which catches a substitution on every download
 * except the one that matters. So it is fetched beside them and a failure costs the old
 * behaviour rather than the catalog.
 */
const HASH_FILE = 'mod-hashes.json';

/** The site's own copy, which goes out in one deploy and so is never half-updated. */
const SNAPSHOT_BASE = 'https://dota2modmanager.com/mirror/';

// Walk every mod in a mods.json, whatever shape its category is in: a plain array, or a
// group list for the categories that are sorted by hero.
function eachMod(modsData, fn) {
  for (const category of Object.values(modsData || {})) {
    if (!category) continue;
    const lists = Array.isArray(category)
      ? [category]
      : Array.isArray(category.groups)
        ? category.groups.map((g) => g.mods || [])
        : [category.mods || []];
    for (const list of lists) {
      for (const mod of list) if (mod && typeof mod === 'object') fn(mod);
    }
  }
}

/**
 * The catalog describes a mod's links two ways: a `links` array, and an older pair of fields
 * on the mod itself. 32 mods still carry the old pair and 26 of those are previews - the
 * whole TI battle-pass row - so a reader that knows only the array shows them with no
 * preview at all. The site reads both; folding one into the other here means the rest of the
 * app only ever sees the array. The cache on disk keeps whatever the author wrote.
 */
function normalizeCatalog(mods) {
  eachMod(mods && mods.modsData, (mod) => {
    if (!mod.linkType || !mod.linkUrl) return;
    const link = { type: mod.linkType, url: mod.linkUrl };
    if (mod.senderName) link.name = mod.senderName;
    if (!Array.isArray(mod.links)) mod.links = [link];
    else if (!mod.links.some((l) => l.type === link.type && l.url === link.url)) mod.links.push(link);
  });
  return mods;
}

const DOTA2CHANGER_MODS = [
  {
    categoryId: 'heroes',
    name: 'Kez Zangetsu Katana & Bankai Spirit',
    file: 'Kez Zangetsu Katana.zip',
    tags: { effects: true, weapon: true, anime: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'heroes',
    name: 'Shadow Fiend Demon Eater Arcana + Arms',
    file: 'Shadow Fiend Demon Eater Combo.zip',
    tags: { effects: true, icons: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'heroes',
    name: 'Juggernaut Bladeform Legacy & Demon Slayer',
    file: 'Juggernaut Bladeform Legacy Demon Slayer.zip',
    tags: { effects: true, weapon: true, anime: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'heroes',
    name: 'Pudge Chainsaw of Toy Abscess',
    file: 'Pudge Chainsaw Toy Abscess.zip',
    tags: { effects: true, weapon: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'hero-items',
    group: 'invoker',
    groupName: 'Invoker',
    name: 'Invoker Dark Artistry Magus Apex',
    file: 'Invoker Dark Artistry Magus Apex.zip',
    tags: { effects: true, shoulders: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'hero-items',
    group: 'phantom-assassin',
    groupName: 'Phantom Assassin',
    name: 'Phantom Assassin Manifold Paradox Crimson',
    file: 'PA Manifold Paradox Crimson.zip',
    tags: { effects: true, weapon: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'hero-items',
    group: 'anti-mage',
    groupName: 'Anti-Mage',
    name: "Anti-Mage Disciple's Path Twin Azzinoth",
    file: 'Anti-Mage Disciples Path Azzinoth.zip',
    tags: { effects: true, weapon: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'hero-items',
    group: 'windranger',
    groupName: 'Windranger',
    name: 'Windranger Compass of Rising Gale Autumn',
    file: 'Windranger Rising Gale Autumn.zip',
    tags: { effects: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'terrains',
    name: 'Immortal Gardens 2026 Enhanced HD',
    file: 'Immortal Gardens 2026 HD.zip',
    tags: { effects: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'shaders',
    name: 'Weather Pack: Aurora Borealis & Ash Storm',
    file: 'Weather Aurora and Ash.zip',
    tags: { effects: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'ranks',
    name: 'Dota Plus Hero Tier Changer (Grandmaster Lv 30)',
    file: 'Dota Plus Grandmaster Badge Lv30.zip',
    tags: { effects: true, interface: true, dota_plus: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'versus',
    name: 'Custom Hero Pick Screen & Grid Layout HD',
    file: 'Custom Hero Pick Screen Grid.zip',
    tags: { interface: true, versus: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'deny',
    name: 'Efecto Denegar Creeps - Signo de Interrogación Dorado',
    file: 'Creep Deny Gold Question Mark.zip',
    tags: { effects: true, deny: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'item-icons',
    name: 'Pack de Iconos de Objetos Reforged & Minimalist',
    file: 'Reforged Item Icons Pack.zip',
    tags: { icons: true, interface: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
  {
    categoryId: 'hero-sounds',
    name: 'Pack de Voces de Héroes Anime & Special FX',
    file: 'Anime Voices and Special FX Pack.zip',
    tags: { audio: true, sounds: true },
    meta: { date: Math.floor(Date.now() / 1000), changer: true },
    links: [
      { type: 'preview', url: 'https://es.dota2changer.com/profile/?v=1789867182', name: 'Dota2Changer Profile' },
    ],
  },
];

/**
 * Injects custom mods from Dota2Changer into catalog data so they appear across categories.
 * @param {object} mods The catalog mods object containing modsData.
 */
function injectChangerMods(mods) {
  if (!mods || !mods.modsData) return;
  const data = mods.modsData;
  for (const m of DOTA2CHANGER_MODS) {
    if (!data[m.categoryId] && !m.group) data[m.categoryId] = [];
    const cat = data[m.categoryId];
    if (Array.isArray(cat)) {
      if (!cat.some((x) => x.name === m.name)) {
        cat.unshift({
          name: m.name,
          file: m.file,
          tags: m.tags || {},
          meta: m.meta,
          links: m.links || [],
        });
      }
    } else if (cat && Array.isArray(cat.groups)) {
      let g = cat.groups.find((group) => group.id === m.group);
      if (!g && m.group) {
        g = { id: m.group, name: m.groupName || m.group, mods: [] };
        cat.groups.unshift(g);
      }
      if (g) {
        if (!Array.isArray(g.mods)) g.mods = [];
        if (!g.mods.some((x) => x.name === m.name)) {
          g.mods.unshift({
            name: m.name,
            file: m.file,
            tags: m.tags || {},
            meta: m.meta,
            links: m.links || [],
          });
        }
      }
    }
  }
}

class Catalog {
  /**
   * @param {string} userDataDir
   * @param {object} [opts]
   * @param {string} [opts.snapshotBase]  where to look for a data-and-signature pair that is
   *   guaranteed to be from one moment; the site's own copy unless a test says otherwise
   */
  constructor(userDataDir, { snapshotBase = SNAPSHOT_BASE } = {}) {
    this.cacheDir = path.join(userDataDir, 'catalog-cache');
    this.snapshotBase = snapshotBase;
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  cachePath(name) {
    return path.join(this.cacheDir, name);
  }

  cacheInfo() {
    const metaFile = this.cachePath('meta.json');
    try {
      return JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    } catch {
      return { fetchedAt: null };
    }
  }

  hasCache() {
    return DATA_FILES.every((f) => fs.existsSync(this.cachePath(f)));
  }

  /** Fetches one published file and, when a key is pinned, refuses bytes it did not sign. */
  /**
   * Fetches one published file and, when a key is pinned, refuses bytes it did not sign.
   *
   * The signatures sit in a folder of their own rather than beside the data. They were
   * published as assets/data/<name>.sig on 2026-09-09 and moved to assets/signatures/ the same
   * day, which is why this is built from a path and not from a suffix glued onto the data URL:
   * a layout that has already moved once can move again.
   */
  async fetchSigned(name) {
    const dataUrl = `${RAW_BASE}/assets/data/${name}`;
    const sigUrl = `${RAW_BASE}/${signature.SIG_DIR}/${name}${signature.SIG_SUFFIX}`;
    const text = await fetchText(dataUrl);
    if (!signature.configured()) {
      JSON.parse(text);
      return text;
    }

    const sig = await fetchText(sigUrl);
    if (signature.verify(text, sig)) {
      JSON.parse(text); // validate before persisting
      return text;
    }

    /* A pair that does not verify is usually not an attack. It is the two files arriving from
     * different moments in time.
     *
     * The catalog writes a data file and its signature in one commit, so the repository is
     * never inconsistent. raw.githubusercontent is: it caches per file and purges per file,
     * and on 2026-09-10 it served this project its own config from one commit and that
     * config's signature from the one before, for minutes after the push. Measured, not
     * feared. A query string does not shake it loose either.
     *
     * So before calling it a forgery, ask the one source that cannot be half-updated: the
     * site's own copy goes out in a single deploy, where the data and the signature are
     * always from the same snapshot. It can be up to a day behind, and a day-old catalog that
     * verifies beats no catalog at all - which is what a fresh install would otherwise get.
     *
     * A real rewrite fails here too, because whoever rewrote the proxy did not write this.
     */
    const snapshot = `${this.snapshotBase}${name}`;
    const consistent = await fetchText(snapshot);
    const consistentSig = await fetchText(`${snapshot}${signature.SIG_SUFFIX}`);
    if (!signature.verify(consistent, consistentSig)) {
      throw new Error(`${name}: signature does not match the catalog's key`);
    }
    JSON.parse(consistent);
    return consistent;
  }

  async refresh() {
    for (const name of DATA_FILES) {
      // through the mirrors: this is the one fetch that has to work before the app can show
      // anything at all, and raw.githubusercontent is not reachable everywhere.
      //
      // CodeQL reads this as network data written to a file, and so it is. What reaches the
      // disk has already passed fetchSigned: an ed25519 signature against the key pinned in
      // catalog-signature.js, then JSON.parse. The name is one of DATA_FILES, a constant, so
      // nothing that arrives over the network decides where it is written.
      fs.writeFileSync(this.cachePath(name), await this.fetchSigned(name));
    }

    // and the hashes, which the app is allowed to do without
    try {
      fs.writeFileSync(this.cachePath(HASH_FILE), await this.fetchSigned(HASH_FILE));
    } catch {
      this.hashes = undefined; // re-read whatever is on disk next time it is asked
    }
    fs.writeFileSync(this.cachePath('meta.json'), JSON.stringify({ fetchedAt: Date.now() }));
  }

  async load({ forceRefresh = false } = {}) {
    let stale = null;
    if (forceRefresh || !this.hasCache()) {
      try {
        await this.refresh();
      } catch (e) {
        // A catalog that could not be fetched is not the same as no catalog. GitHub was down
        // for three hours on 2026-08-17 and the window came up empty for everyone whose cache
        // had passed half an hour, when yesterday's list of mods would have done fine. With
        // nothing on disk there is still nothing to show, and that error goes up as before.
        if (!this.hasCache()) throw e;
        stale = String(e.message || e);
      }
    }
    const out = { fetchedAt: this.cacheInfo().fetchedAt };
    if (stale) out.stale = stale;
    for (const name of DATA_FILES) {
      out[name.replace('.json', '')] = JSON.parse(fs.readFileSync(this.cachePath(name), 'utf-8'));
    }
    normalizeCatalog(out.mods);
    injectChangerMods(out.mods);
    return out;
  }
  /**
   * What the catalog says this archive should hash to, or null when it does not say.
   *
   * Null is the common case for a mod added since the list was last rebuilt - 21 of 992 on the
   * day this was written - and it means the old behaviour, not a refusal. A list that has not
   * caught up must never be a reason a mod cannot be installed.
   *
   * @param {string} categoryId  e.g. "heroes"
   * @param {string} file        the archive's name in the catalog, e.g. "Bare Brewmaster.zip"
   * @returns {string|null} sha256 in lower-case hex
   */
  publishedHash(categoryId, file) {
    if (this.hashes === undefined) {
      try { this.hashes = JSON.parse(fs.readFileSync(this.cachePath(HASH_FILE), 'utf-8')); } catch { this.hashes = null; }
    }
    if (!this.hashes || !categoryId || !file) return null;
    const value = this.hashes[`${categoryId}/${file}`];
    return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value) ? value.toLowerCase() : null;
  }
}

module.exports = { Catalog, RAW_BASE, HASH_FILE, normalizeCatalog, injectChangerMods };
