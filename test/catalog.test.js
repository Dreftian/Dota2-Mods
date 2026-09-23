// The shape of the upstream catalog, which we do not control. A mod's links come in two
// spellings and 26 previews live in the older one - the whole TI battle-pass row showed up
// with no preview button for exactly that reason. It also carries the odd entry twice, and
// what the app shows has to be what the catalog publishes, nothing added to it. At the end,
// how the window finds a catalog mod again from what a card or a star remembers of it.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const catalogModule = require('../src/catalog.js');
const { normalizeCatalog, Catalog } = catalogModule;

test('the older link spelling becomes a links array', () => {
  const data = {
    modsData: {
      'ti-bp-effects': [
        { name: 'TI 2019 Battle Pass', linkType: 'preview', linkUrl: 'assets/previews/ti/x.mp4' },
      ],
    },
  };
  normalizeCatalog(data);
  assert.deepEqual(data.modsData['ti-bp-effects'][0].links, [
    { type: 'preview', url: 'assets/previews/ti/x.mp4' },
  ]);
});

test('a sender name rides along as the link label', () => {
  const data = { modsData: { other: [{ name: 'M', linkType: 'sender', linkUrl: 'u', senderName: 'Someone' }] } };
  normalizeCatalog(data);
  assert.deepEqual(data.modsData.other[0].links, [{ type: 'sender', url: 'u', name: 'Someone' }]);
});

test('mods inside hero groups are reached too', () => {
  const data = {
    modsData: {
      'hero-items': { groups: [{ id: 'lion', mods: [{ name: 'X', linkType: 'preview', linkUrl: 'p.mp4' }] }] },
    },
  };
  normalizeCatalog(data);
  assert.equal(data.modsData['hero-items'].groups[0].mods[0].links[0].url, 'p.mp4');
});

test('an existing links array is added to, not replaced', () => {
  const data = {
    modsData: {
      heroes: [{ name: 'X', links: [{ type: 'author', url: 'a' }], linkType: 'preview', linkUrl: 'p.mp4' }],
    },
  };
  normalizeCatalog(data);
  assert.deepEqual(data.modsData.heroes[0].links.map((l) => l.type), ['author', 'preview']);
});

test('the same link twice stays one link', () => {
  const data = {
    modsData: {
      heroes: [{ name: 'X', links: [{ type: 'preview', url: 'p.mp4' }], linkType: 'preview', linkUrl: 'p.mp4' }],
    },
  };
  normalizeCatalog(data);
  assert.equal(data.modsData.heroes[0].links.length, 1);
});

test('a catalog with neither spelling survives the walk', () => {
  const data = { modsData: { heroes: [{ name: 'X' }], packs: null, tools: { groups: [] } } };
  assert.doesNotThrow(() => normalizeCatalog(data));
  assert.equal(data.modsData.heroes[0].links, undefined);
  assert.doesNotThrow(() => normalizeCatalog({}));
  assert.doesNotThrow(() => normalizeCatalog(undefined));
});

// ---------- repeats ----------

const names = (list) => list.map((m) => `${m.name}:${m.file}`);

test('an entry published twice in one category is shown once, and the first copy stays', () => {
  // the real case: sounds[0] and sounds[12] are the same bytes
  const first = { name: 'ReZero Respawn Sound', file: 'ReZero Respawn Sound.zip', preview: 'a.webp' };
  const data = {
    modsData: {
      sounds: [first, { name: 'Other', file: 'Other.zip' }, { ...first, preview: 'b.webp' }],
    },
  };
  normalizeCatalog(data);
  assert.deepEqual(names(data.modsData.sounds), ['ReZero Respawn Sound:ReZero Respawn Sound.zip', 'Other:Other.zip']);
  assert.equal(data.modsData.sounds[0], first);
});

test('a shared name or a shared file alone is not a repeat', () => {
  const data = {
    modsData: {
      'mega-kill': [
        // two names on one pak, which is an upstream mistake the app cannot settle
        { name: 'GLaDOS', file: 'pak26_dir.vpk' },
        { name: 'Ru GLaDOS', file: 'pak26_dir.vpk' },
        { name: 'Lina', file: 'pak23_dir.vpk' },
        { name: 'Lina', file: 'pak24_dir.vpk' },
      ],
    },
  };
  normalizeCatalog(data);
  assert.equal(data.modsData['mega-kill'].length, 4);
});

test('the same name in two categories is two mods', () => {
  const data = {
    modsData: {
      'mega-kill': [{ name: 'Lina', file: 'pak23_dir.vpk' }],
      announcers: [{ name: 'Lina', file: 'pak23_dir.vpk' }],
    },
  };
  normalizeCatalog(data);
  assert.equal(data.modsData['mega-kill'].length, 1);
  assert.equal(data.modsData.announcers.length, 1);
});

test('inside a hero group a repeat goes, and one mod under two heroes stays under both', () => {
  const shared = { name: 'Kunkka & Tidehunter Set', file: 'KT.zip' };
  const data = {
    modsData: {
      'hero-items': {
        groups: [
          { id: 'kunkka', name: 'Kunkka', mods: [shared, { name: 'Sword', file: 'Sword.zip' }, { ...shared }] },
          { id: 'tidehunter', name: 'Tidehunter', mods: [{ ...shared }] },
        ],
      },
    },
  };
  normalizeCatalog(data);
  const [kunkka, tide] = data.modsData['hero-items'].groups;
  assert.deepEqual(names(kunkka.mods), ['Kunkka & Tidehunter Set:KT.zip', 'Sword:Sword.zip']);
  assert.deepEqual(names(tide.mods), ['Kunkka & Tidehunter Set:KT.zip']);
});

test('a mod with looks is a repeat only when every look is the same file', () => {
  const styled = (files) => ({ name: 'Arcana', styles: files.map((file, i) => ({ label: `S${i}`, file })) });
  const data = {
    modsData: {
      heroes: [styled(['a.vpk', 'b.vpk']), styled(['a.vpk', 'b.vpk']), styled(['a.vpk', 'c.vpk'])],
    },
  };
  normalizeCatalog(data);
  assert.deepEqual(data.modsData.heroes.map((m) => m.styles.map((s) => s.file).join('+')), ['a.vpk+b.vpk', 'a.vpk+c.vpk']);
});

test('rubbish inside a list is kept where it is rather than thrown on', () => {
  const data = { modsData: { other: [null, { name: 'X', file: 'x.zip' }, 'text', { name: 'X', file: 'x.zip' }] } };
  assert.doesNotThrow(() => normalizeCatalog(data));
  assert.deepEqual(data.modsData.other, [null, { name: 'X', file: 'x.zip' }, 'text']);
  // a group with no list, or no group at all, is walked past
  assert.doesNotThrow(() => normalizeCatalog({ modsData: { creeps: { groups: [null, { id: 'x' }] } } }));
});

// ---------- what load() hands the window ----------

/* Until 2026-09-23 load() added 43 entries of its own after reading the cache: announcer packs,
 * hero sets and two rank generators credited to Dota2Changer. Every downloadable one 404'd on
 * both hosts, most restated a real catalog mod under another name (the announcers went from 7
 * cards to 31), two named categories that do not exist, and each carried the launch time as its
 * date, so "newest first" put them above everything real on every run. What the catalog did not
 * publish, the app does not show. */
function cacheWith(t, mods) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd2mm-catalog-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const cache = path.join(dir, 'catalog-cache');
  fs.mkdirSync(cache, { recursive: true });
  fs.writeFileSync(path.join(cache, 'mods.json'), JSON.stringify(mods));
  fs.writeFileSync(path.join(cache, 'constants.json'), JSON.stringify({ categories: [{ id: 'announcers' }] }));
  fs.writeFileSync(path.join(cache, 'guides.json'), '{}');
  return dir;
}

test('load() gives back what the catalog published, repeats aside, and nothing of its own', async (t) => {
  const published = {
    modsData: {
      announcers: [{ name: 'Lina', file: 'pak13_dir.vpk' }, { name: 'Lina', file: 'pak13_dir.vpk' }],
      ranks: [{ name: 'Imperial Medals', file: 'pak10_dir.vpk' }],
      'hero-items': { groups: [{ id: 'invoker', name: 'Invoker', mods: [{ name: 'Invoker Magus Apex', file: 'x.zip' }] }] },
    },
  };
  const out = await new Catalog(cacheWith(t, published)).load();
  assert.deepEqual(Object.keys(out.mods.modsData).sort(), ['announcers', 'hero-items', 'ranks']);
  assert.deepEqual(names(out.mods.modsData.announcers), ['Lina:pak13_dir.vpk']);
  assert.deepEqual(names(out.mods.modsData.ranks), ['Imperial Medals:pak10_dir.vpk']);
  assert.deepEqual(out.mods.modsData['hero-items'].groups.map((g) => g.id), ['invoker']);
  assert.equal(out.mods.modsData['hero-items'].groups[0].mods.length, 1);
});

test('the injection is gone from the module, not just switched off', () => {
  assert.deepEqual(Object.keys(catalogModule).sort(), ['Catalog', 'HASH_FILE', 'RAW_BASE', 'normalizeCatalog']);
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'catalog.js'), 'utf8');
  assert.doesNotMatch(src, /dota2changer|generator:ranks|Date\.now\(\) \/ 1000/i);
});

// ---------- finding a mod again in the window ----------

/* The renderer kept one index keyed by the lower-cased name, across every category. Nine names
 * live in two categories at once, so the later category won: a mega-kill 'Lina' card redrawn
 * after an install rebound its plus to the announcer 'Lina' and queued the announcer's pak13
 * under 'mega-kill', where pak13 is Bristleback. Favourites showed the other mod, and the
 * Library lost the picture of whichever one lost the index. renderer/core/mod-index.js keeps
 * a second index by category and name; these are the rules it has to keep. */
const ROOT = path.resolve(__dirname, '..');

// The module has no imports on purpose, so it can be loaded from its source; loading the file
// itself makes Node guess its module type from a CommonJS package.json and say so on stderr.
async function loadModIndex() {
  const src = fs.readFileSync(path.join(ROOT, 'renderer', 'core', 'mod-index.js'), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
}

// the real collision, as the catalog ships it: mega-kill comes before announcers
const CATALOG = {
  'mega-kill': [
    { name: 'Lina', file: 'pak23_dir.vpk', preview: 'lina.webp' },
    { name: 'Bristleback', file: 'pak13_dir.vpk' },
  ],
  announcers: [
    { name: 'Lina', file: 'pak13_dir.vpk', preview: 'Lina.webp' },
    { name: 'Tusk', file: 'pak20_dir.vpk' },
  ],
  sounds: [
    { name: 'Twice', file: 'first.zip' },
    { name: 'twice', file: 'second.zip' },
    { file: 'nameless.zip' },
  ],
};
const CATEGORIES = Object.keys(CATALOG).map((id) => ({ id }));
const modsOf = (id) => CATALOG[id] || [];

async function built() {
  const m = await loadModIndex();
  const byName = new Map();
  const byCat = new Map();
  m.indexCatalog(CATEGORIES, modsOf, byName, byCat);
  // what findModByName in renderer/views/catalog.js does with a hit
  const find = (cat, name) => {
    const hit = m.modInCategory(cat, name, byCat);
    return hit ? { ...hit.mod, _cat: hit.categoryId } : null;
  };
  return { m, byName, byCat, find };
}

test('a name in two categories is two mods, each found in its own category', async () => {
  const { find } = await built();
  assert.equal(find('mega-kill', 'Lina').file, 'pak23_dir.vpk');
  assert.equal(find('announcers', 'Lina').file, 'pak13_dir.vpk');
  assert.equal(find('mega-kill', 'lina')._cat, 'mega-kill', 'the name is matched without its case');
});

test('a card redrawn after an install keeps the mod it was drawn for', async () => {
  // refreshCardBadges splits the card key and asks again; the plus it rebinds installs this file
  const { find } = await built();
  const [cat, name] = 'mega-kill|Lina|'.split('|');
  const mod = find(cat, name);
  assert.equal(mod.file, 'pak23_dir.vpk', 'not the announcer pak13, which in mega-kill is Bristleback');
  assert.equal(mod.preview, 'lina.webp');
});

test('a category that does not carry the name answers nothing rather than another category', async () => {
  // what renderHome used to substitute, and what thumb.js used to refuse after the fact
  const { find } = await built();
  assert.equal(find('announcers', 'Bristleback'), null);
  assert.equal(find('heroes', 'Lina'), null);
  assert.equal(find(undefined, 'Lina'), null);
});

test('the name-only index still answers callers with no category, as it always has', async () => {
  // a pack member names a mod, not a category; the later category keeps winning there
  const { byName } = await built();
  assert.equal(byName.get('lina').categoryId, 'announcers');
  assert.equal(byName.get('tusk').mod.file, 'pak20_dir.vpk');
});

test('within one category the first of two same-named mods is the one found', async () => {
  // the grid draws both under one key, and bindCards takes the first
  const { find } = await built();
  assert.equal(find('sounds', 'TWICE').file, 'first.zip');
});

test('a mod with no name is not indexed', async () => {
  const { byName, byCat } = await built();
  assert.equal([...byName.keys()].some((k) => k.includes('undefined') || k === ''), false);
  assert.equal([...byCat.keys()].some((k) => k.endsWith('|') || k.includes('undefined')), false);
});

test('rebuilding forgets what the old catalog had', async () => {
  const { m, byName, byCat } = await built();
  m.indexCatalog([{ id: 'announcers' }], () => [{ name: 'Tusk', file: 'pak20_dir.vpk' }], byName, byCat);
  assert.equal(m.modInCategory('mega-kill', 'Lina', byCat), null);
  assert.deepEqual([...byName.keys()], ['tusk']);
  // and a catalog that has not arrived yet is an empty index, not a throw
  m.indexCatalog(undefined, modsOf, byName, byCat);
  assert.equal(byName.size + byCat.size, 0);
});

test('the module-level index is the default one', async () => {
  const m = await loadModIndex();
  m.indexCatalog(CATEGORIES, modsOf, new Map());
  assert.equal(m.modInCategory('mega-kill', 'Lina').mod.file, 'pak23_dir.vpk');
  assert.equal(m.modsByCategory.get(m.catKey('announcers', 'LINA')).mod.file, 'pak13_dir.vpk');
});

test('two starred Linas are two favourites, each the mod that was starred', async () => {
  const { m, find } = await built();
  const got = m.starredMods(['mega-kill|Lina', 'announcers|Lina'], find, 'cosmetic:');
  assert.deepEqual(got.map((x) => `${x._cat}|${x.file}`), ['mega-kill|pak23_dir.vpk', 'announcers|pak13_dir.vpk']);
});

test('one mod starred twice is one favourite, and what is not a mod is passed over', async () => {
  const { m, find } = await built();
  const got = m.starredMods([
    'mega-kill|Lina',
    'mega-kill|lina',         // the same mod in another spelling of its case
    'cosmetic:courier|Ace',   // a starred look: favoriteCosmetics() owns those
    'no separator',
    'announcers|Gone',        // dropped from the catalog since it was starred
  ], find, 'cosmetic:');
  assert.deepEqual(got.map((x) => `${x._cat}|${x.name}`), ['mega-kill|Lina']);
  // with nothing to skip, a key is only a key
  assert.equal(m.starredMods(new Set(['sounds|Twice']), find).length, 1);
});

test('neither view decides a plan from an email address', () => {
  // premium is what the signed-in user says it is: isPremium, or an admin
  for (const file of ['renderer/views/catalog.js', 'renderer/views/library.js']) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotMatch(src, /currentUser\?\.email\s*===/, file);
    assert.doesNotMatch(src, /9999/, `${file}: the slot ceiling is the game's, for every plan`);
  }
});
