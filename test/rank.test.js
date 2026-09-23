/* The rank customizer, from what the generator puts in the VPK to what the page sends it.
 *
 * The older checks in installer.test.js ask which paths exist. These read the entries back and
 * ask what the game will draw: whether the stars someone picked are in a texture the game
 * reads, and whether a plain Immortal medal stays plain. Both used to be wrong while every path
 * check passed. The second one was decided in the page, by what Apply sends, so its rules are
 * loaded here too (renderer/ui/rank-rules.js). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { generateRankVpk } = require('../src/rank-generator.js');
const { compositeVtexLayer, renderRankPlaqueDigits } = require('../src/rank-drawing.js');
const { readVpkEntries } = require('../src/vpk.js');

const ASSETS = path.join(__dirname, '..', 'src', 'assets', 'ranks', 'ranks');
const asset = (name) => fs.readFileSync(path.join(ASSETS, name));
const ICONS = 'panorama/images/rank_tier_icons';

/** { 'folder/name.ext': data } for everything the generated VPK carries. */
function contents(gen) {
  const out = {};
  for (const e of readVpkEntries(gen.buffer, '')) out[`${e.folder}/${e.name}.${e.ext}`] = e.data;
  return out;
}

/** A texture of `side` x `side` raw pixels behind a header of the shipped size, every pixel `rgba`. */
function fakeVtex(side, rgba) {
  const header = Buffer.alloc(2068);
  header.writeUInt32LE(2068, 0);
  const px = Buffer.alloc(side * side * 4);
  for (let i = 0; i < px.length; i += 4) px.set(rgba, i);
  return Buffer.concat([header, px]);
}

test('the stars picked for one profile medal are drawn into that medal, not into a file the game never reads', () => {
  const gen = generateRankVpk({ medal: 'rank5', baseRank: 'rank0', stars: 3, heroTier: null });
  const files = contents(gen);
  const paths = Object.keys(files);

  assert.equal(gen.stars, 3);
  assert.deepEqual(paths.filter((p) => /custom_profile/.test(p)), [], 'custom_profile_* is read by nothing since the Panorama CSS went (e458486)');
  assert.deepEqual(paths.filter((p) => /pip\d_psd/.test(p)), [], 'the pip slots are every player\'s, so a single-profile mod leaves them alone');

  const medal = files[`${ICONS}/rank0_psd.vtex_c`];
  const plain = asset('rank5_psd.vtex_c');
  const pip3 = asset('pip3_psd.vtex_c');
  assert.equal(medal.length, plain.length, 'the texture keeps its size and header');
  assert.ok(!medal.equals(plain), 'the medal is not the bare Legend any more');
  assert.ok(medal.equals(compositeVtexLayer(plain, pip3)), 'it is Legend with pip3 stacked on it, as Panorama would stack it');
  assert.ok(files[`${ICONS}/rank8inactive_psd.vtex_c`].equals(medal), 'the inactive slot for the same profile gets the same medal');

  // Where pip3 has an opaque star, the medal now has that star's colour
  const header = pip3.readUInt32LE(0);
  let checked = 0;
  for (let i = header; i < pip3.length; i += 4) {
    if (pip3[i + 3] !== 255) continue;
    assert.deepEqual([...medal.subarray(i, i + 4)], [...pip3.subarray(i, i + 4)]);
    checked++;
  }
  assert.ok(checked > 100, `only ${checked} opaque star pixels found in pip3; the asset is not what this test reads`);
});

test('a different star count gives a different medal, for every single base slot', () => {
  for (const baseRank of ['rank0', 'rank3', 'rank8']) {
    const one = contents(generateRankVpk({ medal: 'rank4', baseRank, stars: 1, heroTier: null }));
    const five = contents(generateRankVpk({ medal: 'rank4', baseRank, stars: 5, heroTier: null }));
    const slot = `${ICONS}/${baseRank}_psd.vtex_c`;
    assert.ok(one[slot] && five[slot], `${slot} is written`);
    assert.ok(!one[slot].equals(five[slot]), `stars reach the medal for base ${baseRank}`);
  }
});

test('Immortal medals and zero stars leave the medal without pips', () => {
  const plain = generateRankVpk({ medal: 'rank6', baseRank: 'rank0', stars: 0, heroTier: null });
  assert.equal(plain.stars, 0);
  assert.ok(contents(plain)[`${ICONS}/rank0_psd.vtex_c`].equals(asset('rank6_psd.vtex_c')));

  const top = generateRankVpk({ medal: 'rank8b', baseRank: 'rank0', stars: 5, immortalRank: 42, heroTier: null });
  assert.equal(top.stars, 0, 'an Immortal medal has a plate, not stars');
  const expected = renderRankPlaqueDigits(asset('rank8b_psd.vtex_c'), 42);
  assert.ok(contents(top)[`${ICONS}/rank0_psd.vtex_c`].equals(expected), 'only the plate number is drawn on it');
});

test('with every medal replaced the stars still go through the shared pip slots, and the medals stay bare', () => {
  const files = contents(generateRankVpk({ medal: 'rank5', baseRank: 'all', stars: 3, heroTier: null }));
  const pip3 = asset('pip3_psd.vtex_c');
  for (let n = 1; n <= 7; n++) {
    assert.ok(files[`${ICONS}/pip${n}_psd.vtex_c`].equals(pip3), `pip${n} shows the three chosen stars`);
  }
  assert.ok(files[`${ICONS}/rank1_psd.vtex_c`].equals(asset('rank5_psd.vtex_c')), 'the game stacks the pips itself, so baking them in would draw them twice');
  assert.deepEqual(Object.keys(files).filter((p) => /custom_profile/.test(p)), []);

  // Immortal over every slot hides the pips everyone would otherwise see on it
  const imm = contents(generateRankVpk({ medal: 'rank8', baseRank: 'all', immortalRank: null, heroTier: null }));
  const pip = imm[`${ICONS}/pip5_psd.vtex_c`];
  const header = pip.readUInt32LE(0);
  assert.ok(pip.subarray(header).every((b) => b === 0), 'transparent pips');
});

test('plain Immortal with no leaderboard place stays plain Immortal with an empty plate', () => {
  const gen = generateRankVpk({ medal: 'rank8', baseRank: 'rank0', stars: 5, immortalRank: null, heroTier: null });
  assert.equal(gen.medalInfo.id, 'rank8');
  assert.equal(gen.immortalRank, null);
  assert.doesNotMatch(gen.name, /Top|#/, 'the name promises no Top medal and no place');
  const files = contents(gen);
  assert.ok(files[`${ICONS}/rank0_psd.vtex_c`].equals(asset('rank8_psd.vtex_c')), 'the plain medal, no digits drawn');
  assert.ok(files[`${ICONS}/mini/rank0_psd.vtex_c`].equals(asset('rank8_mini_psd.vtex_c')), 'the mini plate is empty too');

  // A number sent with plain Immortal is still read as a place: that is why the customizer
  // sends null for it (renderer/ui/rank-rules.js, rankApplyPayload)
  assert.equal(generateRankVpk({ medal: 'rank8', immortalRank: 10, heroTier: null }).medalInfo.id, 'rank8c');
});

test('the MMR only names the mod: the game shows none, so the VPK does not depend on it', () => {
  const a = generateRankVpk({ medal: 'rank5', stars: 3, mmr: 3390 });
  const b = generateRankVpk({ medal: 'rank5', stars: 3, mmr: 9999 });
  assert.ok(a.buffer.equals(b.buffer));
  assert.match(a.name, /3390 MMR/);
  assert.match(b.name, /9999 MMR/);
});

test('compositing lays straight alpha over the medal and refuses layers that do not line up', () => {
  const base = fakeVtex(2, [100, 50, 0, 255]);

  const opaque = compositeVtexLayer(base, fakeVtex(2, [10, 20, 30, 255]));
  assert.deepEqual([...opaque.subarray(2068, 2072)], [10, 20, 30, 255], 'an opaque star replaces the pixel');

  const half = compositeVtexLayer(base, fakeVtex(2, [200, 150, 100, 128]));
  const a = 128 / 255;
  assert.deepEqual([...half.subarray(2068, 2072)], [
    Math.round(200 * a + 100 * (1 - a)), Math.round(150 * a + 50 * (1 - a)), Math.round(100 * a), 255,
  ], 'a soft edge mixes with the medal under it');

  const overClear = compositeVtexLayer(fakeVtex(2, [0, 0, 0, 0]), fakeVtex(2, [200, 150, 100, 128]));
  assert.deepEqual([...overClear.subarray(2068, 2072)], [200, 150, 100, 128], 'over nothing, the star keeps its own colour and alpha');

  const clear = compositeVtexLayer(base, fakeVtex(2, [255, 255, 255, 0]));
  assert.ok(clear.equals(base), 'a transparent layer changes nothing');
  assert.notEqual(clear, base, 'and the medal passed in is never written to');

  assert.equal(compositeVtexLayer(base, fakeVtex(4, [1, 2, 3, 255])), base, 'a different size is refused');
  assert.equal(compositeVtexLayer(null, base), null);
  assert.equal(compositeVtexLayer(base, null), base);

  const png = Buffer.concat([base.subarray(0, 2068), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
  assert.equal(compositeVtexLayer(png, png), png, 'a PNG-wrapped texture is not raw pixels');
  const empty = base.subarray(0, 2068);
  assert.equal(compositeVtexLayer(empty, empty), empty, 'nothing to draw on');
});

// renderer/ui/rank-rules.js is a browser ES module with no imports. Imported by its path, node
// has to guess the module type of a .js file in a package with no "type" and prints a warning
// into the suite's output; from a data: URL the same source is plainly a module.
const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'ui', 'rank-rules.js'), 'utf8');
const load = () => import(`data:text/javascript;base64,${Buffer.from(SOURCE).toString('base64')}`);

const STATE = { medal: 'rank8', baseRank: 'rank0', stars: 5, mmr: 5620, immortalRank: 10, heroTier: 5, heroLevel: 30 };

test('plain Immortal is sent without a leaderboard place, whatever an earlier pick left behind', async () => {
  const { rankApplyPayload } = await load();
  for (const left of [10, 50, 1000]) {
    const payload = rankApplyPayload({ ...STATE, immortalRank: left });
    assert.equal(payload.immortalRank, null, `a stale ${left} would pick a Top medal`);
    const gen = generateRankVpk(payload);
    assert.equal(gen.medalInfo.id, 'rank8', 'the medal installed is the one the preview showed');
    assert.equal(gen.immortalRank, null);
  }
});

test('a Top medal is sent with its place, and the rest of the state goes through as it is', async () => {
  const { rankApplyPayload } = await load();
  for (const [medal, place] of [['rank8c', 7], ['rank8b', 42], ['rank8a', 900]]) {
    const payload = rankApplyPayload({ ...STATE, medal, immortalRank: place });
    assert.deepEqual(payload, { ...STATE, medal, immortalRank: place });
    const gen = generateRankVpk(payload);
    assert.equal(gen.medalInfo.id, medal);
    assert.equal(gen.immortalRank, place);
  }
  const ranked = rankApplyPayload({ ...STATE, medal: 'rank5', baseRank: '', stars: 3 });
  assert.equal(ranked.immortalRank, null);
  assert.equal(ranked.baseRank, 'rank0', 'an empty base falls back to the profile slot');
  assert.equal(ranked.stars, 3);
});

test('only the Top medals have a leaderboard plate, and a place stays inside its medal\'s range', async () => {
  const { hasLeaderboard, clampImmortalRank } = await load();
  assert.deepEqual(['rank8', 'rank8a', 'rank8b', 'rank8c', 'rank5'].map(hasLeaderboard), [false, true, true, true, false]);
  assert.equal(clampImmortalRank(25, 'rank8c'), 10);
  assert.equal(clampImmortalRank(5, 'rank8b'), 11);
  assert.equal(clampImmortalRank(9999, 'rank8a'), 6000);
  assert.equal(clampImmortalRank('abc', 'rank8c'), 1);
  assert.equal(clampImmortalRank(77, 'rank8'), 77);
});

test('the game draws the real stars over a ranked base only', async () => {
  const { realStarsDrawn } = await load();
  for (let n = 1; n <= 7; n++) assert.equal(realStarsDrawn(`rank${n}`), true, `rank${n}`);
  for (const base of ['rank0', 'rank8', 'all', '', undefined]) assert.equal(realStarsDrawn(base), false, String(base));
});

test('Japanese and Chinese get the English medal names, not the Spanish ones', async () => {
  const { localizedName, baseRankLabel } = await load();
  const herald = { nameEs: 'Heraldo', nameEn: 'Herald', nameRu: 'Рекрут' };
  assert.equal(localizedName(herald, 'es'), 'Heraldo');
  assert.equal(localizedName(herald, 'ru'), 'Рекрут');
  assert.equal(localizedName(herald, 'en'), 'Herald');
  assert.equal(localizedName(herald, 'ja'), 'Herald');
  assert.equal(localizedName(herald, 'zh'), 'Herald');
  assert.equal(localizedName({ nameEn: 'Herald' }, 'ru'), 'Herald', 'a missing local name falls back to English');
  assert.equal(localizedName({ nameEn: 'Herald' }, 'es'), 'Herald');
  assert.equal(localizedName(null, 'es'), '');

  assert.equal(baseRankLabel(herald, 'es'), 'Heraldo (Herald)', 'the Spanish option reads as it did');
  assert.equal(baseRankLabel(herald, 'ru'), 'Рекрут (Herald)');
  assert.equal(baseRankLabel(herald, 'en'), 'Herald');
  assert.equal(baseRankLabel(herald, 'zh'), 'Herald');
});
