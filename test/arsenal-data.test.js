/* How the Arsenal reads the backend's answers: slot and style names, what a filter keeps, and
 * what counts as the look a hero is wearing.
 *
 * renderer/core/arsenal-data.js is an ES module for the page and imports nothing, so it is
 * loaded here from its own source as a data: URL - a data: module is ESM by definition, where
 * loading the .js path would make Node guess the module type and warn about it on every run.
 * `L` and `tr` are the page's globals; the stand-ins below answer in Russian, the source
 * language, which is what the keys are.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

globalThis.tr = (s) => s;
globalThis.L = (strings, ...values) => strings.reduce((out, s, i) => out + s + (i < values.length ? String(values[i]) : ''), '');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'core', 'arsenal-data.js'), 'utf8');
const load = () => import(`data:text/javascript;charset=utf-8,${encodeURIComponent(SRC)}`);

test('slots are named in the source language, and a slot nobody listed still reads', async () => {
  const { slotLabel } = await load();
  assert.equal(slotLabel('head'), 'Голова');
  assert.equal(slotLabel('ability_ultimate'), 'Ультимейт');
  assert.equal(slotLabel('ability2'), 'Способность 2');
  assert.equal(slotLabel('head_persona_1'), 'Голова · Персона');
  assert.equal(slotLabel('voice_persona_2'), 'Голос · Персона 2');
  // the four slots the first table missed, which 44 hero pages showed in English in every language
  assert.equal(slotLabel('body_head'), 'Голова и тело');
  assert.equal(slotLabel('costume'), 'Костюм');
  assert.equal(slotLabel('tail'), 'Хвост');
  assert.equal(slotLabel('shapeshift'), 'Превращение');
  assert.equal(slotLabel('costume_persona_1'), 'Костюм · Персона');
  assert.equal(slotLabel('lower_back'), 'Lower Back');
  // a slot named like an Object method is a slot, not the method
  assert.equal(slotLabel('constructor'), 'Constructor');
});

test('a rarity the table does not know is drawn as common and titled from its id', async () => {
  const { rarityLabel, rarityClass } = await load();
  assert.equal(rarityLabel('arcana'), 'Аркана');
  assert.equal(rarityLabel('common'), 'Обыкновенный');
  assert.equal(rarityClass('immortal'), 'r-immortal');
  assert.equal(rarityClass('frozen'), 'r-common');
  assert.equal(rarityClass('toString'), 'r-common');
  assert.equal(rarityLabel('frozen'), 'Frozen');
});

test('styles named by a token or not at all are numbered from one', async () => {
  const { styleLabel } = await load();
  assert.equal(styleLabel({ index: '0', name: '#DOTA_Style_Default' }), 'Стиль 1');
  assert.equal(styleLabel({ index: '2', name: '' }), 'Стиль 3');
  assert.equal(styleLabel({ index: '1', name: 'Crimson' }), 'Crimson');
  assert.equal(styleLabel({ index: 'x' }, 4), 'Стиль 5');
});

test('style 0 and no style are the same look', async () => {
  const { normStyle, sameChoice } = await load();
  assert.equal(normStyle(null), null);
  assert.equal(normStyle('0'), null);
  assert.equal(normStyle(0), null);
  assert.equal(normStyle('2'), '2');
  assert.ok(sameChoice({ itemId: '9059', style: null }, { itemId: 9059, style: '0' }));
  assert.ok(!sameChoice({ itemId: '9059', style: '1' }, { itemId: '9059', style: null }));
  assert.ok(!sameChoice(null, { itemId: '1' }));
});

test('the live pick is read with the style apart, whether the record carries it or its id does', async () => {
  const { livePick } = await load();
  assert.deepEqual(livePick({ picked: { recordId: 'r1', itemId: '9059#1' } }), { recordId: 'r1', itemId: '9059', style: '1' });
  assert.deepEqual(livePick({ picked: { recordId: 'r2', itemId: 7385, style: '0' } }), { recordId: 'r2', itemId: '7385', style: null });
  assert.equal(livePick({ picked: null }), null);
  assert.equal(livePick({}), null);
});

test('picks the build leaves out are not worn, and an answer from before the flag still means worn', async () => {
  const { picksActive, wornCount } = await load();
  // VIP gone or safe mode on: the picks stay in the library, the game has the default items
  assert.equal(picksActive({ vip: false, active: false }), false);
  assert.equal(picksActive({ active: true }), true);
  assert.equal(picksActive({ vip: true }), true);
  assert.equal(picksActive(null), true);
  const jugg = { hero: 'npc_dota_hero_juggernaut', picked: 2 };
  assert.equal(wornCount(jugg, picksActive({ active: false })), 0);
  assert.equal(wornCount(jugg, picksActive({ active: true })), 2);
  assert.equal(wornCount({ picked: [{}, {}, {}] }, true), 3);
  assert.equal(wornCount(undefined, true), 0);
});

test('a variant on the hero lights up its family, and the window opens on it', async () => {
  const { isLiveOption, initialChoice, lookOf, liveName, familyRarities } = await load();
  const opt = { id: '100', name: 'Blade', rarity: 'immortal', variants: [{ id: '101', name: 'Golden Blade', rarity: 'immortal' }, { id: '102', name: 'Crimson Blade', rarity: 'legendary' }] };
  const live = { recordId: 'r', itemId: '101', style: null };
  assert.ok(isLiveOption(opt, live));
  assert.ok(!isLiveOption(opt, { itemId: '999' }));
  assert.ok(!isLiveOption(opt, null));
  assert.deepEqual(initialChoice(opt, live), { itemId: '101', style: null });
  assert.deepEqual(initialChoice(opt, { itemId: '100', style: '2' }), { itemId: '100', style: '2' });
  assert.deepEqual(initialChoice(opt, null), { itemId: '100', style: null });
  assert.equal(lookOf(opt, '102').name, 'Crimson Blade');
  assert.equal(lookOf(opt, 'gone').name, 'Blade');
  assert.equal(liveName({ options: [opt] }, live), 'Golden Blade');
  assert.equal(liveName({ options: [] }, live), '101');
  assert.deepEqual(familyRarities(opt), ['immortal', 'legendary']);
});

test('the rarity filters keep what they say, and an unknown one falls back to the default', async () => {
  const { rarityFilter, keeps, RARITY_FILTERS } = await load();
  assert.equal(RARITY_FILTERS[0].key, 'top');
  assert.ok(keeps(rarityFilter('top'), ['arcana']));
  assert.ok(keeps(rarityFilter('top'), ['legendary', 'immortal']));
  assert.ok(!keeps(rarityFilter('top'), ['rare']));
  assert.ok(!keeps(rarityFilter('arcana'), ['immortal']));
  assert.ok(keeps(rarityFilter('all'), ['common']));
  assert.equal(rarityFilter('nonsense').key, 'top');
});

test('the hero search matches the name or the id, and "only with arcana" means at least one', async () => {
  const { heroMatches, heroTitle } = await load();
  const jugg = { hero: 'npc_dota_hero_juggernaut', key: 'juggernaut', name: 'Juggernaut', counts: { arcana: 1, immortal: 14 } };
  const chen = { hero: 'npc_dota_hero_chen', key: 'chen', name: 'Chen', counts: { arcana: 0, immortal: 0 } };
  assert.ok(heroMatches(jugg, '', false));
  assert.ok(heroMatches(jugg, '  JUGG ', false));
  assert.ok(heroMatches(jugg, 'hero_jugg', true));
  assert.ok(!heroMatches(chen, '', true));
  assert.ok(!heroMatches(undefined, 'x', false));
  assert.equal(heroTitle('npc_dota_hero_legion_commander', new Map()), 'Legion Commander');
  assert.equal(heroTitle('npc_dota_hero_chen', new Map([['npc_dota_hero_chen', 'Chen']])), 'Chen');
});

test('sets lead with arcanas, and a set is on the hero only when every member on the page is', async () => {
  const { sortSets, setIsLive, countOf } = await load();
  const sorted = sortSets([
    { id: '3', name: 'B', rarity: 'legendary' },
    { id: '2', name: 'Z', rarity: 'immortal' },
    { id: '1', name: 'A', rarity: 'immortal' },
    { id: '4', name: 'C', rarity: 'arcana' },
  ]);
  assert.deepEqual(sorted.map((s) => s.id), ['4', '1', '2', '3']);

  const slots = [
    { slot: 'head', picked: { itemId: '10' } },
    { slot: 'back', picked: { itemId: '11#2' } },
    { slot: 'arms', picked: null },
  ];
  const set = { members: [{ slot: 'head', itemId: '10' }, { slot: 'back', itemId: 11 }, { slot: 'loading_screen', itemId: '99' }] };
  assert.ok(setIsLive(set, slots), 'a member with no slot on the page (a loading screen) does not count against it');
  assert.ok(!setIsLive({ members: [...set.members, { slot: 'arms', itemId: '12' }] }, slots));
  assert.ok(!setIsLive({ members: [{ slot: 'taunt', itemId: '1' }] }, slots));

  assert.equal(countOf([1, 2]), 2);
  assert.equal(countOf(3), 3);
  assert.equal(countOf(undefined), 0);
});

test('the exclusives filter keeps only looks the store never sold, whatever their rarity', async () => {
  const { rarityFilter, keeps, isExclusive } = await load();
  const f = rarityFilter('exclusive');
  assert.equal(f.key, 'exclusive');
  // Dragonclaw Hook is an immortal from a treasure; Manifold Paradox was sold in a bundle
  const hook = { id: '4007', rarity: 'immortal', store: false };
  const paradox = { id: '7247', rarity: 'arcana', store: true };
  assert.equal(isExclusive(hook), true);
  assert.equal(isExclusive(paradox), false);
  // a family is exclusive when any of its looks is: the Golden one is the treasure's rare
  assert.equal(isExclusive({ id: '1', store: true, variants: [{ id: '2', store: false }] }), true);
  // an answer that does not say is not a claim that the store never sold it
  assert.equal(isExclusive({ id: '3', rarity: 'rare' }), false);
  assert.equal(keeps(f, ['immortal'], true), true);
  assert.equal(keeps(f, ['arcana'], false), false);
  // and the other filters ignore the flag entirely
  assert.equal(keeps(rarityFilter('arcana'), ['arcana'], false), true);
  assert.equal(keeps(rarityFilter('all'), ['common'], true), true);
});
