/* The Arsenal: hero looks written onto the default items every account owns.
 *
 * What is pinned here is what the research found the hard way on the real table: which fields of
 * a default item must stay its own (the name bundles resolve by, the prefab that makes it owned by
 * everyone), which must come from the donor even when the donor has none (a default model left
 * under an arcana), that a chosen style has to move into slot 0, that a persona slot needs its
 * selector, and that a pick never reaches the table for somebody who is not entitled to it.
 *
 * The fixture is a small items_game built here, shaped like the real one; nothing is read from
 * outside the repository. The real-table run lives with the research, not in the suite.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const schema = require('../src/schema.js');
const heroItems = require('../src/hero-items.js');
const { buildVpk, readVpkEntryFile } = require('../src/vpk.js');
const { Library } = require('../src/library.js');
const { createSchemaService } = require('../src/schema-service.js');
const { createGameIcons } = require('../src/game-icons.js');
const patcher = require('../src/patcher.js');

// ---------- a small items_game, shaped like the real one ----------

/** [key, value] or [key, [children]] into KeyValues, CRLF and tabs like Valve writes it. */
function kv(entries, depth = 0) {
  const pad = '\t'.repeat(depth);
  return entries.map(([k, v]) => (Array.isArray(v)
    ? `${pad}"${k}"\r\n${pad}{\r\n${kv(v, depth + 1)}${pad}}\r\n`
    : `${pad}"${k}"\t\t"${v}"\r\n`)).join('');
}

const J = 'npc_dota_hero_juggernaut';
const AXE = 'npc_dota_hero_axe';
const INV = 'npc_dota_hero_invoker';
const heroes = (...hs) => ['used_by_heroes', hs.map((h) => [h, '1'])];
const latin1 = (s) => Buffer.from(s, 'utf8').toString('latin1');

const PREFABS = [
  ['wearable', [['item_slot', 'weapon']]],
  ['default_item', [['item_slot', 'weapon'], ['baseitem', '1']]],
  ['misc', [['item_slot', 'none']]],
  ['announcer', [['item_slot', 'none']]],
  ['bundle', [['item_slot', 'none']]],
  ['cursor_pack', [['item_slot', 'cursor_pack']]],
  ['loading_screen', [['item_slot', 'loading_screen']]],
];

const ITEMS = [
  // ---- defaults: what gets rewritten ----
  ['6', [['name', "Juggernaut's Mask"], ['prefab', 'default_item'], ['item_slot', 'head'], ['item_rarity', 'common'],
    ['model_player', 'models/heroes/juggernaut/mask.vmdl'], heroes(J), ['portraits', [['icon', [['PortraitFOV', 'mine']]]]],
    ['visuals', [['skip_model_combine', '0']]]]],
  ['7', [['name', "Juggernaut's Sword"], ['prefab', 'default_item'], ['model_player', 'models/heroes/juggernaut/sword.vmdl'], heroes(J)]],
  ['811', [['name', "Juggernaut's Base"], ['prefab', 'default_item'], ['item_slot', 'hero_base'], heroes(J), ['visuals', [['skip_model_combine', '0']]]]],
  ['8366', [['name', "All Heroes' Default Pet"], ['prefab', 'default_item'], ['item_slot', 'summon'], heroes(J, AXE)]],
  ['8632', [['name', "All Heroes' Default Taunt"], ['prefab', 'default_item'], ['item_slot', 'taunt'], heroes(J, AXE)]],
  ['20', [['name', "Axe's Helmet"], ['prefab', 'default_item'], ['item_slot', 'head'], heroes(AXE)]],
  ['683', [['name', "Invoker's Persona"], ['prefab', 'default_item'], ['item_slot', 'persona_selector'], heroes(INV)]],
  ['13046', [['name', "Invoker Kid's Arms"], ['prefab', 'default_item'], ['item_slot', 'arms_persona_1'], ['model_player', 'models/heroes/invoker_kid/arms.vmdl'], heroes(INV)]],
  ['900', [['name', 'Ward Default'], ['prefab', 'default_item'], ['item_slot', 'head'], heroes('npc_dota_ward')]],
  // ---- wearables: what can go there ----
  ['9059', [['name', 'Bladeform Legacy'], ['prefab', 'wearable'], ['item_slot', 'hero_base'], ['item_rarity', 'arcana'],
    ['item_quality', 'unique'], ['price_info', [['price', '3499']]], ['image_inventory', 'econ/items/juggernaut/arcana'],
    ['item_name', '#DOTA_Item_Bladeform_Legacy'], heroes(J), ['portraits', [['icon', [['PortraitFOV', 'donor']]]]],
    ['particle_folder', 'particles/econ/items/juggernaut/arcana'], ['static_attributes', [['can_equip', '1']]],
    ['visuals', [
      ['asset_modifier', [['type', 'entity_model'], ['modifier', 'models/arcana.vmdl']]],
      ['asset_modifier1', [['type', 'particle'], ['style', '0'], ['modifier', 'fx_style_zero.vpcf']]],
      ['asset_modifier2', [['type', 'particle'], ['style', '1'], ['modifier', 'fx_style_one.vpcf']]],
      ['styles', [
        ['0', [['name', '#DOTA_Style_Bladeform_0']]],
        ['1', [['name', '#DOTA_Style_Bladeform_1'], ['skin', '1'], ['unlock', [['item_def', '5000'], ['price', '1']]]]],
      ]],
    ]]]],
  ['7481', [['name', 'Serrakura'], ['prefab', 'wearable'], ['item_rarity', 'immortal'], ['model_player', 'models/items/juggernaut/serrakura.vmdl'],
    ['model_player1', 'models/items/juggernaut/serrakura_night.vmdl'], heroes(J), ['visuals', [['asset_modifier', [['type', 'particle_create'], ['modifier', 'serrakura.vpcf']]]]]]],
  ['9984', [['name', 'Edge of the Lost Order'], ['prefab', 'wearable'], ['item_rarity', 'immortal'], ['model_player', 'models/items/juggernaut/ti8_sword.vmdl'], heroes(J), ['visuals', [['skin', '0']]]]],
  ['12296', [['name', 'Golden Edge of the Lost Order'], ['prefab', 'wearable'], ['item_rarity', 'immortal'], ['model_player', 'models/items/juggernaut/ti8_sword.vmdl'], heroes(J), ['visuals', [['skin', '1']]]]],
  ['4000', [['name', 'Plain Mask'], ['prefab', 'wearable'], ['item_slot', 'head'], ['model_player', 'models/items/juggernaut/plain_mask.vmdl'], heroes(J)]],
  ['4001', [['name', 'Nothing At All'], ['prefab', 'wearable'], ['item_slot', 'head'], heroes(J)]],
  ['4002', [['name', latin1('Café Mask')], ['prefab', 'wearable'], ['item_slot', 'head'], ['image_inventory', 'econ/test/cafe'], ['model_player', 'models/items/juggernaut/cafe.vmdl'], heroes(J)]],
  ['8316', [['name', 'Almond the Frondillo'], ['prefab', 'wearable'], ['item_slot', 'summon'], ['item_rarity', 'immortal'], ['model_player', 'models/items/pets/almond.vmdl'], heroes(J, AXE)]],
  // Axe's own pet, on the default he shares with Juggernaut
  ['32637', [['name', 'Little Red - Wolf Pet'], ['prefab', 'wearable'], ['item_slot', 'summon'], ['item_rarity', 'rare'], ['model_player', 'models/items/pets/wolf.vmdl'], heroes(AXE)]],
  ['7582', [['name', 'A Taunt'], ['prefab', 'wearable'], ['item_slot', 'taunt'], ['item_rarity', 'immortal'], heroes(J), ['visuals', [['skin', '0']]]]],
  ['13042', [['name', 'Acolyte of the Lost Arts'], ['prefab', 'wearable'], ['item_slot', 'persona_selector'], ['item_rarity', 'legendary'], heroes(INV),
    ['visuals', [['asset_modifier', [['type', 'persona'], ['persona', '1']]], ['asset_modifier1', [['type', 'entity_model'], ['modifier', 'models/heroes/invoker_kid/invoker_kid.vmdl']]]]]]],
  ['19016', [['name', 'Dark Artistry Throwback Bracers'], ['prefab', 'wearable'], ['item_slot', 'arms_persona_1'], ['item_rarity', 'immortal'],
    ['model_player', 'models/items/invoker_kid/bracers.vmdl'], heroes(INV), ['visuals', [['skip_model_combine', '1']]]]],
  ['5000', [['name', 'Crucible of Rile'], ['prefab', 'wearable'], ['item_slot', 'head'], ['item_rarity', 'immortal'], ['model_player', 'models/items/axe/crucible.vmdl'], heroes(AXE)]],
  // ---- bundles ----
  ['20000', [['name', 'Bladeform Legacy Bundle'], ['prefab', 'bundle'], ['item_rarity', 'arcana'], heroes(J),
    ['bundle', [['Bladeform Legacy', '1'], ['A Loading Screen', '1'], ['Serrakura', '1']]]]],
  ['20001', [['name', 'Clash Bundle'], ['prefab', 'bundle'], heroes(J),
    ['bundle', [['Serrakura', '1'], ['Edge of the Lost Order', '1'], ['Plain Mask', '1']]]]],
  // ---- free cosmetics, for slotOf ----
  ['202', [['name', 'Default Cursor Pack'], ['prefab', 'cursor_pack'], ['item_slot', 'weapon'], ['baseitem', '1']]],
  ['5100', [['name', 'Cursor of Something'], ['prefab', 'cursor_pack'], ['visuals', [['skin', '1']]]]],
  ['597', [['name', 'Default Loading Screen'], ['prefab', 'loading_screen'], ['baseitem', '1'], ['visuals', [['skin', '0']]]]],
  ['27299', [['name', 'A Loading Screen'], ['prefab', 'loading_screen'], ['item_slot', 'head'], ['visuals', [['skin', '2']]]]],
  ['586', [['name', 'Default Mega-Kill Announcer'], ['prefab', 'announcer'], ['item_slot', 'mega_kills'], ['baseitem', '1']]],
  ['5200', [['name', 'Mega Announcer'], ['prefab', 'announcer'], ['item_slot', 'mega_kills'], ['visuals', [['skin', '1']]]]],
];

const ITEM_SETS = [
  ['lost_order', [['name', '#DOTA_Set_Lost_Order'], ['items', [['Edge of the Lost Order', '1'], ['Plain Mask', '1']]]]],
  ['serrakura', [['items', [['Serrakura', '1']]]]],
];

/** The table, optionally with enough filler to clear validateSchema's floor of 1000 items. */
function fixture({ filler = 0, items = ITEMS } = {}) {
  const pad = Array.from({ length: filler }, (_, i) => [String(200000 + i), [['name', `Filler ${i}`], ['prefab', 'misc']]]);
  return kv([['items_game', [['prefabs', PREFABS], ['items', [...items, ...pad]], ['item_sets', ITEM_SETS]]]]);
}
const TEXT = fixture();

/** An item block's direct fields, read back out of a built block. */
function fieldsOf(blockText) {
  const table = `"items_game"\r\n{\r\n"items"\r\n{\r\n${blockText}\r\n}\r\n}\r\n`;
  const [item] = schema.listItems(table);
  return { item, table, fields: schema.itemFields(table, item) };
}

// ---------- the map ----------

test('every hero gets its default per slot, and taunts and summoned units are left out', () => {
  const map = heroItems.heroMap(TEXT);
  assert.deepEqual([...map.heroes.keys()].sort(), [AXE, INV, J]);
  const jugg = map.heroes.get(J);
  assert.equal(jugg.name, 'Juggernaut');
  assert.equal(jugg.key, 'juggernaut');
  assert.deepEqual([...jugg.slots.keys()].sort(), ['head', 'hero_base', 'summon', 'weapon']);
  assert.equal(jugg.slots.get('weapon').target, '7', 'an empty item_slot means the prefab default, weapon');
  assert.equal(jugg.slots.has('taunt'), false, 'the shared taunt is never offered');
  assert.equal(heroItems.heroMap(TEXT), map, 'built once per table');
});

test('a default several heroes share says who else it reaches', () => {
  const jugg = heroItems.heroMap(TEXT).heroes.get(J);
  assert.deepEqual(jugg.slots.get('summon').shared, [AXE]);
  assert.deepEqual(jugg.slots.get('head').shared, []);
});

test('the list counts what a hero can wear, and names heroes the way the game does', () => {
  const list = heroItems.heroList(TEXT);
  assert.deepEqual(list.map((h) => h.name), ['Axe', 'Invoker', 'Juggernaut'], 'A-Z by display name');
  const jugg = list.find((h) => h.hero === J);
  // heads only: the Golden sword folds under its plain one; the look with no model and no
  // visuals, and the taunt, are not options at all
  assert.deepEqual(jugg.counts, { arcana: 1, immortal: 3, total: 6 });
});

test('one hero, slot by slot: order, variants folded under their head, styles, sets', () => {
  const view = heroItems.heroView(TEXT, J);
  assert.deepEqual(view.slots.map((s) => s.slot), ['hero_base', 'weapon', 'head', 'summon']);
  const weapon = view.slots.find((s) => s.slot === 'weapon');
  const edge = weapon.options.find((o) => o.id === '9984');
  assert.deepEqual(edge.variants, [{ id: '12296', name: 'Golden Edge of the Lost Order', rarity: 'immortal', store: false }]);
  assert.equal(weapon.options.some((o) => o.id === '12296'), false, 'a variant is not a head of its own');
  const base = view.slots.find((s) => s.slot === 'hero_base');
  assert.deepEqual(base.options[0].styles, [{ index: '0', name: '#DOTA_Style_Bladeform_0' }, { index: '1', name: '#DOTA_Style_Bladeform_1' }]);
  assert.equal(base.options[0].rarity, 'arcana');
  const head = view.slots.find((s) => s.slot === 'head');
  assert.ok(head.options.some((o) => o.name === 'Café Mask'), 'names are shown as UTF-8');
  assert.equal(head.options.some((o) => o.id === '4001'), false, 'nothing to show is not an option');

  const named = heroItems.heroView(TEXT, 'juggernaut', { styleName: (s) => s.replace('#DOTA_Style_Bladeform_', 'Style ') });
  assert.equal(named.hero, J, 'the short key finds the hero too');
  assert.deepEqual(named.slots[0].options[0].styles.map((s) => s.name), ['Style 0', 'Style 1']);
  assert.equal(heroItems.heroView(TEXT, 'npc_dota_hero_nobody'), null);
});

test('sets come from bundles: wearables only, one per slot, the majority set winning a clash', () => {
  const sets = heroItems.heroSets(TEXT, J);
  assert.deepEqual(sets.map((s) => s.name), ['Bladeform Legacy Bundle', 'Clash Bundle'], 'arcana first');
  assert.deepEqual(sets[0].members, [
    { slot: 'hero_base', itemId: '9059', name: 'Bladeform Legacy' },
    { slot: 'weapon', itemId: '7481', name: 'Serrakura' },
  ]);
  const clash = heroItems.setFor(TEXT, J, '20001');
  assert.deepEqual(clash.members.map((m) => m.itemId), ['9984', '4000'], 'the Lost Order set holds two of the three');
  assert.deepEqual(clash.skipped, ['Serrakura']);
  assert.deepEqual(heroItems.setFor(TEXT, J, '20000').skipped, ['A Loading Screen']);
  assert.throws(() => heroItems.setFor(TEXT, J, '424242'), /424242/);
});

// ---------- the block ----------

test('the default keeps what makes it the default; the donor brings the look', () => {
  const block = heroItems.heroItemPatch(TEXT, '6', '4000');
  const { fields, table, item } = fieldsOf(block);
  assert.equal(item.id, '6');
  assert.equal(fields.get('name'), "Juggernaut's Mask", 'bundles and item_sets find members by name');
  assert.equal(fields.get('prefab'), 'default_item', 'the prefab is what makes it owned by everyone');
  assert.equal(fields.get('item_slot'), 'head');
  assert.equal(fields.get('item_rarity'), 'common', 'its own rarity, not the donor\'s');
  assert.equal(fields.get('model_player'), 'models/items/juggernaut/plain_mask.vmdl');
  assert.ok(table.includes(J), 'used_by_heroes stays');
  assert.ok(table.includes('"mine"'), 'the donor has no portraits, so the default keeps its own');
  assert.equal(table.includes('skip_model_combine'), false, 'the default\'s visuals go even when the donor has none');
});

test('an arcana carries its models, visuals, particles and portraits, and nothing it was sold with', () => {
  const block = heroItems.heroItemPatch(TEXT, '811', '9059');
  const { fields, table } = fieldsOf(block);
  assert.equal(fields.get('name'), "Juggernaut's Base");
  assert.equal(fields.get('prefab'), 'default_item');
  assert.equal(fields.get('particle_folder'), 'particles/econ/items/juggernaut/arcana');
  assert.equal(fields.get('image_inventory'), 'econ/items/juggernaut/arcana');
  assert.ok(table.includes('"donor"'), 'portraits come from the donor when it has them');
  assert.ok(table.includes('entity_model'));
  for (const gone of ['item_rarity', 'item_quality', 'price_info', 'static_attributes', 'unlock', '"arcana"']) {
    assert.equal(table.includes(gone), false, `${gone} must not come along`);
  }
  // no style chosen: both styles stay, only the gate comes off
  assert.ok(table.includes('fx_style_zero') && table.includes('fx_style_one'));

  const night = fieldsOf(heroItems.heroItemPatch(TEXT, '7', '7481'));
  assert.equal(night.fields.get('model_player'), 'models/items/juggernaut/serrakura.vmdl');
  assert.equal(night.fields.get('model_player1'), 'models/items/juggernaut/serrakura_night.vmdl', 'every model_player* comes');
});

test('a chosen style moves into style 0, and the other styles and their effects go', () => {
  const { table } = fieldsOf(heroItems.heroItemPatch(TEXT, '811', '9059', { style: '1' }));
  assert.ok(table.includes('fx_style_one'));
  assert.equal(table.includes('fx_style_zero'), false, 'style 0 effects belong to the look not chosen');
  assert.equal(table.includes('#DOTA_Style_Bladeform_0'), false);
  assert.ok(/"0"\s*\{\s*"name"\s+"#DOTA_Style_Bladeform_1"/.test(table), 'the chosen entry now sits in slot 0');
  assert.ok(/"style"\s+"0"/.test(table) && !/"style"\s+"1"/.test(table), 'its modifiers point at style 0');
  assert.equal(table.includes('unlock'), false);
  assert.throws(() => heroItems.heroItemPatch(TEXT, '811', '9059', { style: '7' }), /7/);
});

test('the built block merges into the table without losing or adding an item', () => {
  const block = heroItems.heroItemPatch(TEXT, '811', '9059', { style: '1' });
  const merged = schema.mergeSchema(TEXT, [{ id: '811', block }]);
  assert.deepEqual(merged.applied, [{ id: '811', source: '' }]);
  assert.equal(schema.listItems(merged.text).length, schema.listItems(TEXT).length);
  assert.ok(schema.findItem(merged.text, '811').text.includes('fx_style_one'));
});

test('a block is only built onto a default item, from items that exist', () => {
  assert.throws(() => heroItems.heroItemPatch(TEXT, '4000', '9059'), /4000/);
  assert.throws(() => heroItems.heroItemPatch(TEXT, '6', '999999'), /999999/);
  assert.throws(() => heroItems.heroItemPatch(TEXT, '999999', '4000'), /999999/);
});

// ---------- picks ----------

test('a pick is checked against the table and stored under the agreed keys', () => {
  const p = heroItems.resolvePick(TEXT, J, 'hero_base', '9059', '1');
  assert.deepEqual(p, {
    key: 'hero:npc_dota_hero_juggernaut:hero_base', itemId: '9059#1', name: 'Juggernaut · Bladeform Legacy',
    itemName: 'Bladeform Legacy', hero: J, slot: 'hero_base', style: '1', target: '811',
  });
  assert.equal(heroItems.resolvePick(TEXT, J, 'hero_base', '9059', '0').itemId, '9059', 'the first style is no style');
  assert.equal(heroItems.resolvePick(TEXT, J, 'weapon', '12296', null).itemId, '12296', 'a variant is a pick of its own');
  assert.throws(() => heroItems.resolvePick(TEXT, 'npc_dota_hero_nobody', 'head', '4000'), /npc_dota_hero_nobody/);
  assert.throws(() => heroItems.resolvePick(TEXT, J, 'taunt', '7582'), /taunt/);
  assert.throws(() => heroItems.resolvePick(TEXT, J, 'head', '5000'), /Crucible of Rile/, 'Axe\'s helmet does not go on Juggernaut');
  assert.throws(() => heroItems.resolvePick(TEXT, J, 'weapon', '7481', '2'), /Serrakura/, 'no styles, no style');
  assert.deepEqual(heroItems.parseSlotKey(p.key), { hero: J, slot: 'hero_base' });
  assert.deepEqual(heroItems.parseItemKey('9059#1'), { itemId: '9059', style: '1' });
  assert.deepEqual(heroItems.parseItemKey('9059'), { itemId: '9059', style: null });
  assert.equal(heroItems.parseSlotKey('weather'), null);
});

test('a persona slot pick switches the persona on, unless a persona was picked', () => {
  const arms = { slot: heroItems.slotKey(INV, 'arms_persona_1'), itemId: '19016', name: 'Invoker · Bracers' };
  const alone = heroItems.heroPatches(TEXT, [arms]);
  assert.deepEqual(alone.map((p) => p.id), ['13046', '683']);
  assert.ok(alone[1].block.includes('"persona"') && alone[1].block.includes('invoker_kid.vmdl'), 'the selector wears the persona item');

  const withOwn = heroItems.heroPatches(TEXT, [arms, { slot: heroItems.slotKey(INV, 'persona_selector'), itemId: '13042', name: 'own' }]);
  assert.deepEqual(withOwn.map((p) => [p.id, p.source]), [['13046', arms.name], ['683', 'own']], 'the user\'s own pick, not a second one');
});

test('a pick Valve took away drops out; a style that went keeps the look', () => {
  const recs = [
    { slot: heroItems.slotKey(J, 'head'), itemId: '31337', name: 'gone' },
    { slot: heroItems.slotKey(J, 'mount'), itemId: '4000', name: 'no such slot' },
    { slot: heroItems.slotKey(J, 'weapon'), itemId: '7481#5', name: 'style gone' },
  ];
  const out = heroItems.heroPatches(TEXT, recs);
  assert.deepEqual(out.map((p) => [p.id, p.source]), [['7', 'style gone']]);
  assert.ok(out[0].block.includes('serrakura.vmdl'));
});

test('two heroes\' picks on the default they share clash when the looks differ, and the later one is built', () => {
  assert.equal(heroItems.targetOf(TEXT, J, 'summon'), '8366');
  assert.equal(heroItems.targetOf(TEXT, AXE, 'summon'), '8366', 'one pet for both');
  assert.equal(heroItems.targetOf(TEXT, J, 'mount'), null);
  assert.equal(heroItems.resolvePick(TEXT, AXE, 'summon', '32637', null).target, '8366');
  const almond = { slot: heroItems.slotKey(J, 'summon'), itemId: '8316', name: 'Juggernaut · Almond the Frondillo' };
  const wolf = { slot: heroItems.slotKey(AXE, 'summon'), itemId: '32637', name: 'Axe · Little Red - Wolf Pet' };
  const head = { slot: heroItems.slotKey(J, 'head'), itemId: '4000', name: 'Juggernaut · Plain Mask' };
  assert.deepEqual(heroItems.targetClashes(TEXT, [almond, head, wolf]),
    [{ id: '8366', name: "All Heroes' Default Pet", mods: [almond.name, wolf.name] }]);
  assert.deepEqual(heroItems.targetClashes(TEXT, [almond, { ...almond, slot: wolf.slot, name: 'Axe · Almond the Frondillo' }]), [],
    'the same look twice draws the same thing');
  assert.deepEqual(heroItems.targetClashes(TEXT, [almond, { ...wolf, itemId: '31337' }]), [], 'a pick that no longer lands is nobody\'s rival');
  const merged = schema.mergeSchema(TEXT, heroItems.heroPatches(TEXT, [almond, wolf]));
  assert.ok(schema.findItem(merged.text, '8366').text.includes('wolf.vmdl'), 'the block written last is the one the table keeps');
});

test('style names are read out of the game\'s own English text, only the ones styles use', () => {
  const wanted = heroItems.styleTokens(TEXT);
  assert.deepEqual([...wanted].sort(), ['dota_style_bladeform_0', 'dota_style_bladeform_1']);
  const loc = '"lang"\r\n{\r\n\t"Language"\t\t"English"\r\n\t"Tokens"\r\n\t{\r\n'
    + '\t\t"DOTA_Style_Bladeform_0"\t\t"Legacy"\r\n\t\t"dota_style_bladeform_1"\t\t"Bladeform \\"Origins\\""\r\n'
    + '\t\t"DOTA_Item_Unrelated"\t\t"Not wanted"\r\n\t}\r\n}\r\n';
  assert.deepEqual([...heroItems.readTokens(loc, wanted)], [['dota_style_bladeform_0', 'Legacy'], ['dota_style_bladeform_1', 'Bladeform "Origins"']]);
});

test('slots are ordered the way a person reads a hero', () => {
  const slots = ['voice', 'zzz_new', 'ability_ultimate', 'ability2', 'summon', 'head', 'hero_base', 'ability1', 'weapon', 'arms_persona_1'];
  assert.deepEqual(slots.sort(heroItems.compareSlots),
    ['hero_base', 'weapon', 'head', 'summon', 'ability1', 'ability2', 'ability_ultimate', 'voice', 'arms_persona_1', 'zzz_new']);
});

// ---------- through the service: a real game tree, a real library ----------

/** A throwaway game whose pak01 carries this table, and a user-data folder beside it. */
function tree(t, text, { loc = null, gameinfo = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'd2mm-arsenal-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const game = path.join(root, 'game');
  fs.mkdirSync(path.join(game, 'dota'), { recursive: true });
  const entry = (folder, name, data) => ({ ext: 'txt', folder, name, crc: schema.crc32(data), preload: Buffer.alloc(0), data });
  const entries = [entry('scripts/items', 'items_game', Buffer.from(text, 'latin1'))];
  if (loc) entries.push(entry('resource/localization', 'items_english', Buffer.from(loc, 'utf8')));
  fs.writeFileSync(path.join(game, 'dota', 'pak01_dir.vpk'), buildVpk(entries));
  if (gameinfo) {
    fs.writeFileSync(path.join(game, 'dota', 'gameinfo.gi'), '"GameInfo"\n{\n\tFileSystem\n\t{\n\t\tSearchPaths\n\t\t{\n\t\t\tGame_Language\t\tdota_*LANGUAGE*\n\t\t\tGame\t\t\t\tdota\n\t\t\tMod\t\t\t\t\tdota\n\t\t}\n\t}\n}\n');
    fs.writeFileSync(path.join(game, 'dota', 'gameinfo_branchspecific.gi'), Buffer.from('"GameInfo"\r\n{\r\n\tFileSystem\r\n\t{\r\n\t\tSteamAppId\t\t570\r\n\t}\r\n}\r\n', 'latin1'));
  }
  const user = path.join(root, 'user');
  fs.mkdirSync(user);
  return { game, user };
}

function service(t, { vip = true, loc = null, gameinfo = false } = {}) {
  const { game, user } = tree(t, fixture({ filler: 1100 }), { loc, gameinfo });
  const data = { dotaGamePath: game, schemaPatch: true };
  const settings = { get: (k) => data[k], set: (k, v) => { data[k] = v; } };
  const library = new Library(user);
  const entitled = { now: vip };
  const svc = createSchemaService({ settings, library, installer: {}, userDataDir: user, entitled: () => entitled.now });
  const built = () => {
    const pak = path.join(game, patcher.FOLDER, schema.SCHEMA_VPK);
    return fs.existsSync(pak) ? readVpkEntryFile(pak, schema.SCHEMA_REL).data.toString('latin1') : null;
  };
  // make the next write of the built pak fail, the way a file held open by another program does
  const hold = () => {
    const pak = path.join(game, patcher.FOLDER, schema.SCHEMA_VPK);
    fs.rmSync(pak, { force: true });
    fs.mkdirSync(path.join(pak, 'held'), { recursive: true });
    return () => fs.rmSync(pak, { recursive: true, force: true });
  };
  return { svc, library, data, entitled, built, hold, game };
}

const blockOf = (text, id) => schema.findItem(text, id).text;

test('a pick is a cosmetic record, lands in the table, and a second pick for the slot takes over', (t) => {
  const { svc, library, built } = service(t);
  const rec = svc.pickHero(J, 'hero_base', '9059', '1');
  assert.equal(rec.categoryId, 'cosmetic');
  assert.equal(rec.slot, 'hero:npc_dota_hero_juggernaut:hero_base');
  assert.equal(rec.itemId, '9059#1');
  assert.equal(rec.name, 'Juggernaut · Bladeform Legacy');
  assert.equal(rec.itemName, 'Bladeform Legacy', 'the item\'s own name, which its picture is found by');
  assert.ok(blockOf(built(), '811').includes('fx_style_one'));

  assert.equal(svc.pickHero(J, 'hero_base', '9059', '1').id, rec.id, 'the same pick again is the same record');
  const plain = svc.pickHero(J, 'hero_base', '9059', null);
  assert.notEqual(plain.id, rec.id, 'another style is another record');
  assert.equal(library.find(rec.id).enabled, false, 'the old one goes dormant, not away');
  assert.ok(blockOf(built(), '811').includes('fx_style_zero'));

  // switching back reuses the dormant record rather than making a third
  assert.equal(svc.pickHero(J, 'hero_base', '9059', '1').id, rec.id);
  assert.equal(library.list().filter((r) => r.slot === rec.slot).length, 2);
});

test('the Arsenal answers what the screen needs, and only lets a VIP build', (t) => {
  const { svc, entitled, built } = service(t, { vip: false });
  const heroesList = svc.arsenalHeroes();
  assert.equal(heroesList.vip, false);
  assert.equal(heroesList.schemaPatch, true);
  assert.deepEqual(heroesList.heroes.map((h) => [h.key, h.picked]), [['axe', 0], ['invoker', 0], ['juggernaut', 0]]);

  svc.pickHero(J, 'weapon', '7481', null);
  assert.equal(built(), null, 'nothing is built for somebody who is not entitled to it');
  const one = svc.arsenalHero(J);
  assert.equal(one.name, 'Juggernaut');
  assert.deepEqual(one.slots.find((s) => s.slot === 'weapon').picked, { recordId: one.slots.find((s) => s.slot === 'weapon').picked.recordId, itemId: '7481', style: null });
  assert.equal(svc.arsenalHeroes().heroes.find((h) => h.hero === J).picked, 1);

  entitled.now = true;
  svc.entitlementChanged();
  assert.ok(blockOf(built(), '7').includes('serrakura.vmdl'), 'becoming VIP builds the picks already made');
  entitled.now = false;
  svc.entitlementChanged();
  assert.equal(built(), null, 'and losing it takes them out again');
  assert.equal(svc.arsenalHero('npc_dota_hero_nobody').error.includes('npc_dota_hero_nobody'), true);
});

test('an account change rebuilds only when it changes what the table may carry', (t) => {
  const { svc, entitled, data } = service(t);
  svc.pickHero(J, 'weapon', '7481', null);
  assert.equal(data.schemaHeroes, true, 'the build remembers it let the picks in');
  // a password change, a second sign-in: the 'change' event fires, the answer is the same
  assert.equal(svc.entitlementChanged(), null);
  entitled.now = false;
  assert.equal(svc.entitlementChanged().ok, true);
  assert.equal(data.schemaHeroes, false);
  assert.equal(svc.entitlementChanged(), null);
});

test('a subscription that ran out with no event is caught by heal', (t) => {
  const { svc, entitled, built, data } = service(t, { gameinfo: true });
  svc.setEnabled(true);
  svc.pickHero(J, 'weapon', '7481', null);
  assert.ok(built());
  entitled.now = false; // expired while the app was closed: nothing emitted
  const healed = svc.heal();
  assert.ok(healed.healed.includes('schema'), 'owed and built differ, so it is rebuilt');
  assert.equal(built(), null, 'the pick is out of the table');
  assert.equal(data.schemaHeroes, false);
  svc.setEnabled(false);
  assert.equal(data.schemaHeroes, false, 'safe mode builds nothing, heroes included');
});

test('an account change that cannot rebuild is logged, never thrown', (t) => {
  const { svc, entitled, data, hold } = service(t, { vip: false });
  svc.pickHero(J, 'weapon', '7481', null);
  hold();
  entitled.now = true;
  const logs = [];
  const res = svc.entitlementChanged((m) => logs.push(m));
  assert.equal(res.ok, false);
  assert.equal(logs.length, 1);
  assert.ok(logs[0].startsWith('arsenal:'));
  assert.equal(data.schemaDirty, true, 'and the next heal retries it');
});

test('an entitlement check that throws counts as no entitlement', (t) => {
  const { game, user } = tree(t, fixture({ filler: 1100 }));
  const data = { dotaGamePath: game, schemaPatch: true };
  const settings = { get: (k) => data[k], set: (k, v) => { data[k] = v; } };
  const svc = createSchemaService({
    settings, library: new Library(user), installer: {}, userDataDir: user,
    entitled: () => { throw new Error('the account file is unreadable'); },
  });
  assert.equal(svc.arsenalHeroes().vip, false);
  assert.equal(svc.arsenalHero(J).vip, false);
  assert.equal(svc.arsenalHero(J).active, false);
});

test('an Arsenal pick goes in after every other block, so it wins over a mod for the same item', (t) => {
  const { svc, library, built, game } = service(t);
  const mod = library.add({ name: 'A Skinchanger pack', categoryId: 'imported', files: [] });
  library.update(mod.id, { schema: [{ id: '7', name: 'sword', block: '"7"\r\n{\r\n"name"\t\t"Juggernaut\'s Sword"\r\n"prefab"\t\t"default_item"\r\n"model_player"\t\t"models/mod/sword.vmdl"\r\n}' }] });
  svc.pickHero(J, 'weapon', '9984', null);
  const list = svc.patches(schema.readGameSchema(game).text);
  assert.deepEqual(list.map((p) => [p.id, p.source]), [['7', 'A Skinchanger pack'], ['7', 'Juggernaut · Edge of the Lost Order']]);
  assert.ok(blockOf(built(), '7').includes('ti8_sword.vmdl'), 'the later block is the one in the table');
});

test('clearing a slot switches the pick off and keeps it', (t) => {
  const { svc, library, built } = service(t);
  const rec = svc.pickHero(J, 'head', '4000', null);
  assert.deepEqual(svc.clearHero(J, 'head'), { ok: true, cleared: true });
  assert.equal(library.find(rec.id).enabled, false);
  assert.equal(built(), null, 'nothing left to build, so the pak goes');
  assert.deepEqual(svc.clearHero(J, 'head'), { ok: true, cleared: false }, 'clearing an empty slot is not an error');
});

test('a set is equipped in one go, and says what it could not put on', (t) => {
  const { svc, library, built } = service(t);
  const res = svc.equipSet(J, '20000');
  assert.deepEqual(res, { ok: true, picked: 2, skipped: ['A Loading Screen'] });
  const live = library.list().filter((r) => r.enabled !== false).map((r) => r.slot).sort();
  assert.deepEqual(live, ['hero:npc_dota_hero_juggernaut:hero_base', 'hero:npc_dota_hero_juggernaut:weapon']);
  assert.ok(blockOf(built(), '811').includes('entity_model') && blockOf(built(), '7').includes('serrakura.vmdl'));
  assert.throws(() => svc.equipSet(J, '31337'), /31337/);
});

test('a pick whose rebuild fails is undone, says why, and is retried by heal', (t) => {
  const { svc, library, data, built, hold } = service(t, { gameinfo: true });
  svc.setEnabled(true); // patches the tree's gameinfo and builds nothing yet
  const first = svc.pickHero(J, 'weapon', '7481', null);
  const before = JSON.stringify(library.list());

  const release = hold();
  // whatever the language, the answer carries the reason the build failed
  assert.throws(() => svc.pickHero(J, 'weapon', '9984', null), /EISDIR|directory/i);
  assert.equal(JSON.stringify(library.list()), before, 'the library is what the live table was built from');
  assert.equal(library.find(first.id).enabled !== false, true);
  assert.equal(data.schemaDirty, true, 'the failed build is remembered');
  assert.equal(svc.state().stale, true, 'and the status bar hears of it');

  assert.throws(() => svc.clearHero(J, 'weapon'));
  assert.equal(library.find(first.id).enabled !== false, true, 'a failed clear is undone too');
  assert.throws(() => svc.equipSet(J, '20000'));
  assert.equal(JSON.stringify(library.list()), before);

  release();
  const healed = svc.heal();
  assert.equal(healed.ok, true);
  assert.ok(healed.healed.includes('schema'), 'dirty is a reason to rebuild, like a game update');
  assert.equal(data.schemaDirty, false);
  assert.ok(blockOf(built(), '7').includes('serrakura.vmdl'));
});

test('heal reports a rebuild that failed instead of calling it healed', (t) => {
  const { svc, data, hold } = service(t, { gameinfo: true });
  svc.setEnabled(true);
  svc.pickHero(J, 'weapon', '7481', null);
  hold();
  data.schemaDirty = true;
  const res = svc.heal();
  assert.equal(res.ok, false);
  assert.ok(res.error);
  assert.equal(res.healed.includes('schema'), false);
});

test('a received preset naming an Arsenal slot goes through the same checks', (t) => {
  const { svc, library } = service(t);
  const rec = svc.pickCosmetic('hero:npc_dota_hero_juggernaut:hero_base', '9059#1', 'whatever the sender called it');
  assert.equal(rec.itemId, '9059#1');
  assert.equal(rec.name, 'Juggernaut · Bladeform Legacy');
  assert.throws(() => svc.pickCosmetic('hero:npc_dota_hero_juggernaut:head', '5000', 'x'), /Crucible/);
  assert.equal(library.list().length, 1);
});

test('two heroes sharing a default wear one pick on it, the latest, and both screens say whose', (t) => {
  const { svc, library, built } = service(t);
  const summonOf = (hero) => svc.arsenalHero(hero).slots.find((s) => s.slot === 'summon');
  const almond = svc.pickHero(J, 'summon', '8316', null);
  const wolf = svc.pickHero(AXE, 'summon', '32637', null);
  assert.equal(library.find(almond.id).enabled, false, 'the earlier pick on the shared pet goes dormant, not away');
  assert.ok(blockOf(built(), '8366').includes('wolf.vmdl'));
  assert.equal(summonOf(J).picked, null, 'Juggernaut\'s screen no longer calls Almond worn');
  assert.deepEqual(summonOf(J).sharedPick, { hero: AXE, recordId: wolf.id, itemId: '32637', style: null, itemName: 'Little Red - Wolf Pet' });
  assert.equal(summonOf(AXE).picked.itemId, '32637');
  assert.equal(summonOf(AXE).sharedPick, undefined);

  // Almond again is the latest action, and it wins wherever its dormant record sits in the library
  assert.equal(svc.pickHero(J, 'summon', '8316', null).id, almond.id);
  assert.equal(library.find(wolf.id).enabled, false);
  assert.ok(blockOf(built(), '8366').includes('almond.vmdl'));
  assert.equal(summonOf(J).picked.itemId, '8316');
  assert.equal(summonOf(AXE).picked, null);
  assert.equal(summonOf(AXE).sharedPick.hero, J);
  assert.deepEqual(svc.arsenalHeroes().heroes.map((h) => [h.key, h.picked]), [['axe', 0], ['invoker', 0], ['juggernaut', 1]]);
  assert.deepEqual(svc.state().conflicts, []);
});

test('picks left on together over a shared default are named, and the screens follow the build', (t) => {
  const { svc, library, built } = service(t);
  const almond = svc.pickHero(J, 'summon', '8316', null);
  const wolf = svc.pickHero(AXE, 'summon', '32637', null);
  library.setEnabled(almond.id, true); // what My mods, a preset or an older library can do
  svc.refresh();
  assert.ok(blockOf(built(), '8366').includes('wolf.vmdl'), 'the later record is the block the table keeps');
  assert.deepEqual(svc.state().conflicts, [{ id: '8366', name: "All Heroes' Default Pet", mods: [almond.name, wolf.name] }]);
  assert.equal(svc.arsenalHero(J).slots.find((s) => s.slot === 'summon').picked, null, 'a live pick the game does not draw is not worn');
  assert.equal(svc.arsenalHeroes().heroes.find((h) => h.hero === J).picked, 0);

  // Almond is on already; asking for it again settles the clash its way instead of doing nothing
  assert.equal(svc.pickHero(J, 'summon', '8316', null).id, almond.id);
  assert.equal(library.find(wolf.id).enabled, false);
  assert.ok(blockOf(built(), '8366').includes('almond.vmdl'));
  assert.deepEqual(svc.state().conflicts, []);
});

// the manifest refusing some of its writes, the way a lock held by an antivirus or a full disk does
function failSaves(t, library, fails) {
  let writes = 0;
  library.save = function save() {
    if (fails(++writes)) throw Object.assign(new Error('EBUSY: resource busy or locked, open manifest.json'), { code: 'EBUSY' });
    return Library.prototype.save.call(this);
  };
  const unlock = () => { delete library.save; };
  t.after(unlock);
  return unlock;
}

test('a pick whose library write fails half-way is undone, in memory and on disk', (t) => {
  const { svc, library, data, built } = service(t);
  const first = svc.pickHero(J, 'weapon', '7481', null);
  const before = JSON.stringify(library.list());
  const table = built();
  // the second write is the new record's, after the old pick was switched off
  const unlock = failSaves(t, library, (n) => n === 2);
  assert.throws(() => svc.pickHero(J, 'weapon', '9984', null), /EBUSY/);
  unlock();
  assert.equal(JSON.stringify(library.list()), before, 'no switched-off pick and no record without a slot');
  assert.equal(JSON.stringify(JSON.parse(fs.readFileSync(library.file, 'utf8')).installed), before);
  assert.equal(library.find(first.id).enabled, true);
  assert.equal(built(), table, 'the table was never touched');
  assert.notEqual(data.schemaDirty, true, 'library and table agree, so nothing is owed');
});

test('a library that cannot even be put back marks the table behind, and heal builds from it', (t) => {
  const { svc, library, data, built } = service(t, { gameinfo: true });
  svc.setEnabled(true);
  svc.pickHero(J, 'weapon', '7481', null);
  svc.pickHero(J, 'head', '4000', null);
  const before = JSON.stringify(library.list());
  const unlock = failSaves(t, library, (n) => n >= 2);
  assert.throws(() => svc.equipSet(J, '20000'), /EBUSY/);
  assert.equal(JSON.stringify(library.list()), before, 'every write changes memory first, so the list is whole again');
  assert.equal(data.schemaDirty, true, 'but the file is behind it, so the table is owed a rebuild');
  assert.equal(svc.state().stale, true);
  unlock();
  const healed = svc.heal();
  assert.ok(healed.healed.includes('schema'), 'two live picks owe nothing by themselves: only the dirty flag gets this rebuilt');
  assert.equal(data.schemaDirty, false);
  assert.ok(blockOf(built(), '7').includes('serrakura.vmdl') && blockOf(built(), '6').includes('plain_mask.vmdl'));
});

test('without VIP the picks are dormant: the Arsenal says so, and one can still be taken off', (t) => {
  const { svc, library, entitled, built } = service(t);
  const rec = svc.pickHero(J, 'weapon', '7481', null);
  assert.deepEqual([svc.arsenalHeroes().active, svc.arsenalHero(J).active], [true, true]);
  entitled.now = false;
  svc.entitlementChanged();
  assert.equal(built(), null);
  const list = svc.arsenalHeroes();
  const one = svc.arsenalHero(J);
  assert.deepEqual([list.vip, list.active, one.vip, one.active], [false, false, false, false]);
  assert.equal(one.slots.find((s) => s.slot === 'weapon').picked.itemId, '7481', 'still listed: it comes back with the plan');
  assert.deepEqual(svc.clearHero(J, 'weapon'), { ok: true, cleared: true });
  assert.equal(library.find(rec.id).enabled, false);
});

test('free cosmetics now offer cursor packs, keyed the way the base item is found', (t) => {
  const { svc } = service(t);
  const slots = svc.cosmeticSlots().slots;
  const cursor = slots.find((s) => s.slot === 'cursor_pack');
  assert.ok(cursor, 'the stray "weapon" on 202 no longer hides the slot');
  assert.equal(cursor.base, '202');
  assert.deepEqual(cursor.options.map((o) => o.id), ['5100']);
  assert.deepEqual(slots.find((s) => s.slot === 'loading_screen').options.map((o) => o.id), ['27299']);
  assert.ok(slots.find((s) => s.slot === 'mega_kills'), 'a prefab that fixes nothing still lets the item decide');
});

test('style names come out of the game\'s localization when it has them', (t) => {
  const loc = '"lang"\r\n{\r\n"Tokens"\r\n{\r\n"DOTA_Style_Bladeform_1"\t\t"Bladeform Origins"\r\n}\r\n}\r\n';
  const { svc } = service(t, { loc });
  const styles = svc.arsenalHero(J).slots.find((s) => s.slot === 'hero_base').options[0].styles;
  assert.deepEqual(styles, [{ index: '0', name: '#DOTA_Style_Bladeform_0' }, { index: '1', name: 'Bladeform Origins' }],
    'a token the file lacks stays a token, for the screen to call "Style N"');
});

test('without a game there is nothing to show and nothing to pick', (t) => {
  const { svc, data } = service(t);
  data.dotaGamePath = null;
  assert.ok(svc.arsenalHeroes().error);
  assert.deepEqual(svc.arsenalHeroes().heroes, []);
  assert.ok(svc.arsenalHero(J).error);
  assert.throws(() => svc.pickHero(J, 'weapon', '7481', null));
  assert.equal(svc.entitlementChanged(), null, 'no live pick, no rebuild');
});

// ---------- pictures ----------

test('the game\'s picture is found by the UTF-8 name the pickers ask with', async (t) => {
  const { game, user } = tree(t, TEXT);
  // a PNG stored the way Panorama compiles most of its images: a resource header, then the file
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8), Buffer.from('IEND'), Buffer.alloc(4)]);
  const header = Buffer.alloc(16);
  header.writeUInt32LE(16, 0);
  const vtex = Buffer.concat([header, png]);
  const items = Buffer.from(TEXT, 'latin1');
  fs.writeFileSync(path.join(game, 'dota', 'pak01_dir.vpk'), buildVpk([
    { ext: 'txt', folder: 'scripts/items', name: 'items_game', crc: schema.crc32(items), preload: Buffer.alloc(0), data: items },
    { ext: 'vtex_c', folder: 'panorama/images/econ/test', name: 'cafe_png', crc: schema.crc32(vtex), preload: Buffer.alloc(0), data: vtex },
  ]));
  const icons = createGameIcons({ userDataDir: user, toolchain: { pathOf: () => null, ensure: async () => null }, getGamePath: () => game });
  const got = await icons.getMany(['Café Mask']);
  assert.ok(got['Café Mask'] && got['Café Mask'].startsWith('data:image/png;base64,'), 'a hero wearable with an accent in its name has its picture');
});

test('a look counts as sold only with a real price of its own or in a bundle on sale', () => {
  /* The exclusives filter rests on this. The table files a treasure drop with a price_info of
     class NoPrice at 0, so the mere block proves nothing; and arcanas are sold as bundles, so an
     arcana with no price of its own is still a store item when its bundle has one. */
  const items = [
    ['7', [['name', "Juggernaut's Sword"], ['prefab', 'default_item'], heroes(J)]],
    ['6', [['name', "Juggernaut's Mask"], ['prefab', 'default_item'], ['item_slot', 'head'], heroes(J)]],
    ['500', [['name', 'Treasure Blade'], ['prefab', 'wearable'], ['item_rarity', 'immortal'], ['model_player', 'a.vmdl'], heroes(J),
      ['price_info', [['class', 'NoPrice'], ['price', '0']]]]],
    ['501', [['name', 'Store Blade'], ['prefab', 'wearable'], ['item_rarity', 'rare'], ['model_player', 'b.vmdl'], heroes(J),
      ['price_info', [['bucket', 'Normal'], ['price', '199']]]]],
    ['502', [['name', 'Hidden Blade'], ['prefab', 'wearable'], ['item_rarity', 'rare'], ['model_player', 'c.vmdl'], heroes(J),
      ['hide_in_store', '1'], ['price_info', [['price', '199']]]]],
    ['503', [['name', 'Bundled Mask'], ['prefab', 'wearable'], ['item_slot', 'head'], ['item_rarity', 'arcana'], ['model_player', 'd.vmdl'], heroes(J)]],
    // a bundle on sale that names no hero still sells what it holds
    ['600', [['name', 'Mask Bundle'], ['prefab', 'bundle'], ['price_info', [['price', '2499']]], ['bundle', [['Bundled Mask', '1']]]]],
    ['601', [['name', 'Treasure Set'], ['prefab', 'bundle'], heroes(J), ['bundle', [['Treasure Blade', '1']]]]],
  ];
  const view = heroItems.heroView(fixture({ items }), J);
  const opt = (name) => view.slots.flatMap((s) => s.options).find((o) => o.name === name);
  assert.equal(opt('Treasure Blade').store, false, 'a NoPrice entry is a drop, not a sale');
  assert.equal(opt('Store Blade').store, true);
  assert.equal(opt('Hidden Blade').store, false, 'hidden from the store is not sold, whatever it costs');
  assert.equal(opt('Bundled Mask').store, true, 'sold through its bundle');
  assert.equal(view.sets.find((s) => s.name === 'Treasure Set').store, false);
});
