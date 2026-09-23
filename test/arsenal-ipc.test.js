/* The Arsenal's channels, and the three older channels it changed, run against a stub of
 * Electron with fakes behind them.
 *
 * What matters here is the boundary: a pick refused for the right reason and in the order a
 * person can act on (VIP, then the remote switch, then safe mode, then the running game), a look
 * taken off past VIP and the remote switch, a failed rebuild reported instead of swallowed, and a
 * received preset that asks for Arsenal picks on an account that cannot have them applying the
 * rest and saying how many it left out.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('path');

const { t } = require('../src/i18n.js');

/** Register one ipc module against a stubbed ipcMain and hand back its handlers by channel. */
function register(file, ctx) {
  const handlers = new Map();
  const electron = {
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn), on: (ch, fn) => handlers.set(ch, fn) },
    app: { getVersion: () => '0.0.0', getPath: () => __dirname },
    dialog: {},
  };
  const load = Module._load;
  const abs = path.join(__dirname, '..', 'src', file);
  Module._load = function stubbed(request, ...rest) {
    return request === 'electron' ? electron : load.call(this, request, ...rest);
  };
  try {
    delete require.cache[require.resolve(abs)];
    const mod = require(abs);
    Object.values(mod).find((v) => typeof v === 'function')(ctx);
  } finally {
    Module._load = load;
    delete require.cache[require.resolve(abs)];
  }
  const call = (ch, ...args) => handlers.get(ch)({ sender: { send: () => {} } }, ...args);
  return { handlers, call };
}

// ---------- src/ipc-arsenal.js ----------

function arsenal({ vip = true, blocked = null, schemaPatch = true, running = false, service = {} } = {}) {
  const calls = [];
  const schemaService = {
    arsenalHeroes: () => ({ heroes: ['listed'] }),
    arsenalHero: (hero) => ({ hero }),
    pickHero: (...args) => { calls.push(['pick', ...args]); return { id: 'rec' }; },
    clearHero: (...args) => { calls.push(['clear', ...args]); return { ok: true, cleared: true }; },
    equipSet: (...args) => { calls.push(['set', ...args]); return { ok: true, picked: 2, skipped: [] }; },
    ...service,
  };
  const ctx = {
    auth: { isVip: typeof vip === 'function' ? vip : () => vip },
    blocked: () => blocked,
    dotaIsRunning: async () => running,
    schemaService,
    settings: { get: (k) => (k === 'schemaPatch' ? schemaPatch : null) },
  };
  return { ...register('ipc-arsenal.js', ctx), calls };
}

test('the Arsenal registers its five channels', () => {
  const { handlers } = arsenal();
  assert.deepEqual([...handlers.keys()].sort(), ['arsenal:clear', 'arsenal:hero', 'arsenal:heroes', 'arsenal:pick', 'arsenal:set']);
});

test('anybody can look; nobody but a VIP can put a look on', async () => {
  const { call, calls } = arsenal({ vip: false });
  assert.deepEqual(await call('arsenal:heroes'), { heroes: ['listed'] });
  assert.deepEqual(await call('arsenal:hero', 'npc_dota_hero_axe'), { hero: 'npc_dota_hero_axe' });
  const refused = { error: t('Арсенал доступен только VIP') };
  assert.deepEqual(await call('arsenal:pick', 'h', 's', '1', null), refused);
  assert.deepEqual(await call('arsenal:set', 'h', '2'), refused);
  assert.deepEqual(calls, [], 'nothing reached the service');
});

test('taking a look off gives nothing away: no VIP, no remote switch, but safe mode and the game still count', async () => {
  const lapsed = arsenal({ vip: false, blocked: { error: 'switched off remotely' } });
  assert.deepEqual(await lapsed.call('arsenal:clear', 'npc_dota_hero_axe', 'head'), { ok: true, cleared: true });
  assert.deepEqual(lapsed.calls, [['clear', 'npc_dota_hero_axe', 'head']]);
  assert.deepEqual(await arsenal({ vip: false, schemaPatch: false }).call('arsenal:clear', 'h', 's'),
    { error: t('Сначала выключи безопасный режим: без него игра не читает косметику') });
  assert.deepEqual(await arsenal({ vip: false, running: true }).call('arsenal:clear', 'h', 's'),
    { error: t('Закрой Dota 2 перед изменением файлов игры') });
});

test('an account check that throws is a no, not a crash', async () => {
  const { call } = arsenal({ vip: () => { throw new Error('auth file unreadable'); } });
  assert.deepEqual(await call('arsenal:pick', 'h', 's', '1', null), { error: t('Арсенал доступен только VIP') });
});

test('the refusals come in the order a person can do something about them', async () => {
  const off = { error: 'switched off remotely' };
  assert.deepEqual(await arsenal({ blocked: off, schemaPatch: false, running: true }).call('arsenal:pick', 'h', 's', '1'), off);
  assert.deepEqual(await arsenal({ schemaPatch: false, running: true }).call('arsenal:pick', 'h', 's', '1'),
    { error: t('Сначала выключи безопасный режим: без него игра не читает косметику') });
  assert.deepEqual(await arsenal({ running: true }).call('arsenal:set', 'h', '2'),
    { error: t('Закрой Dota 2 перед изменением файлов игры') });
});

test('past the refusals, a change reaches the service and its answer comes back', async () => {
  const { call, calls } = arsenal();
  assert.deepEqual(await call('arsenal:pick', 'npc_dota_hero_axe', 'head', 5000, 1), { ok: true, record: { id: 'rec' } });
  assert.deepEqual(await call('arsenal:pick', 'npc_dota_hero_axe', 'head', '5000', null), { ok: true, record: { id: 'rec' } });
  assert.deepEqual(await call('arsenal:clear', 'npc_dota_hero_axe', 'head'), { ok: true, cleared: true });
  assert.deepEqual(await call('arsenal:set', 'npc_dota_hero_axe', 20000), { ok: true, picked: 2, skipped: [] });
  assert.deepEqual(calls, [
    ['pick', 'npc_dota_hero_axe', 'head', '5000', '1'],
    ['pick', 'npc_dota_hero_axe', 'head', '5000', null],
    ['clear', 'npc_dota_hero_axe', 'head'],
    ['set', 'npc_dota_hero_axe', '20000'],
  ], 'what crosses the wire arrives as strings, and no style stays null');
});

test('a service that throws answers with its reason', async () => {
  const { call } = arsenal({ service: { pickHero: () => { throw new Error('the build failed: EISDIR'); } } });
  assert.deepEqual(await call('arsenal:pick', 'h', 's', '1'), { error: 'the build failed: EISDIR' });
});

// ---------- src/ipc-game.js: cosmetics:pick waits for the game to close ----------

function game({ running }) {
  const picked = [];
  const ctx = new Proxy({
    blocked: () => null,
    dotaIsRunning: async () => running,
    schemaService: { pickCosmetic: (...a) => { picked.push(a); return { id: 'r' }; } },
    settings: { get: () => null },
  }, { get: (o, k) => (k in o ? o[k] : () => undefined) });
  return { ...register('ipc-game.js', ctx), picked };
}

test('a free cosmetic is not picked while the game holds its files open', async () => {
  const busy = game({ running: true });
  assert.deepEqual(await busy.call('cosmetics:pick', 'weather', '4000', 'Snow'), { error: t('Закрой Dota 2 перед изменением файлов игры') });
  assert.deepEqual(busy.picked, []);
  const free = game({ running: false });
  assert.deepEqual(await free.call('cosmetics:pick', 'weather', '4000', 'Snow'), { ok: true, record: { id: 'r' } });
});

// ---------- src/ipc-library.js: a rebuild that fails is said, not swallowed ----------

function library({ refresh }) {
  const recs = new Map([
    ['pick', { id: 'pick', name: 'Snow', categoryId: 'cosmetic', slot: 'weather', itemId: '4000', files: [], enabled: false }],
    ['mod', { id: 'mod', name: 'A mod', categoryId: 'imported', files: [], enabled: true, schema: [{ id: '1', block: 'x' }] }],
  ]);
  const ctx = {
    applyMasterToCursors: () => {}, catalog: {}, disableOtherCosmetics: () => [], disableOtherCursors: () => [],
    fingerprints: {}, isCursorRecord: () => false, refreshPresence: () => {}, settings: { get: () => null, set: () => {} },
    installer: { setEnabled: () => {}, remove: () => {}, removePackFully: () => {} },
    library: {
      find: (id) => recs.get(id) || null,
      setEnabled: (id, on) => { recs.get(id).enabled = on; },
      removeRecord: (id) => { recs.delete(id); },
    },
    schemaService: { refresh },
  };
  return { ...register('ipc-library.js', ctx), recs };
}

test('switching or removing a pick reports a rebuild that failed, and the switch still stands', async () => {
  const failing = () => ({ ok: false, error: 'EPERM: the pak is held open' });
  const lib = library({ refresh: failing });
  const on = await lib.call('mods:setEnabled', 'pick', true);
  assert.equal(on.ok, undefined);
  assert.ok(on.error.includes('EPERM: the pak is held open'), 'the reason reaches the person');
  assert.equal(lib.recs.get('pick').enabled, true, 'what they asked for happened; the build is retried by heal');
  const gone = await lib.call('mods:remove', 'mod');
  assert.ok(gone.error.includes('EPERM'));
  assert.equal(lib.recs.has('mod'), false);
});

test('the batch channels add a failed rebuild to their errors', async () => {
  const lib = library({ refresh: () => ({ ok: false, error: 'EPERM' }) });
  const many = await lib.call('mods:setEnabledMany', ['mod'], false);
  assert.equal(many.changed, 1);
  assert.equal(many.errors.length, 1);
  assert.ok(many.errors[0].includes('EPERM'));
  const removed = await lib.call('mods:removeMany', ['mod', 'pick']);
  assert.equal(removed.removed, 2);
  assert.ok(removed.errors[0].includes('EPERM'));
});

test('a rebuild that works, or one with no game to build into, answers as before', async () => {
  assert.deepEqual(await library({ refresh: () => ({ ok: true }) }).call('mods:setEnabled', 'pick', true), { ok: true, replaced: [] });
  assert.deepEqual(await library({ refresh: () => ({ ok: false, reason: 'no-game-path' }) }).call('mods:remove', 'mod'), { ok: true });
});

// ---------- src/ipc-presets.js: Arsenal picks in a received preset ----------

function presets({ vip }) {
  const picked = [];
  const preset = {
    id: 'p1', name: 'Shared build',
    wanted: [
      { kind: 'cosmetic', slot: 'hero:npc_dota_hero_juggernaut:hero_base', itemId: '9059#1', name: 'Juggernaut · Bladeform Legacy' },
      { kind: 'cosmetic', slot: 'hero:npc_dota_hero_axe:head', itemId: '5000', name: 'Axe · Crucible of Rile' },
      { kind: 'cosmetic', slot: 'weather', itemId: '4000', name: 'Snow' },
    ],
  };
  const ctx = {
    win: () => null, settings: { get: () => null }, catalog: {}, installer: {},
    library: { getPreset: () => preset, find: () => null, save: () => {} },
    schemaService: { pickCosmetic: (...a) => { picked.push(a); return { id: `r${picked.length}` }; }, refresh: () => ({ ok: true }) },
    presets: { catalogIndex: async () => new Map(), installedFpIndex: () => new Map(), applyPreset: () => [] },
    adoptImportedFiles: () => ({ records: [] }), afterDeployMaster: () => {}, disableOtherCursors: () => {},
    sendProgress: () => {}, auth: { isVip: () => vip },
  };
  return { ...register('ipc-presets.js', ctx), picked };
}

test('without VIP a received preset applies everything but its Arsenal picks, and counts them', async () => {
  const { call, picked } = presets({ vip: false });
  const res = await call('presets:resolve', 'p1');
  assert.equal(res.ok, true);
  assert.equal(res.vipSkipped, 2);
  assert.deepEqual(res.errors, [], 'a pick the account cannot have is not an error in the preset');
  assert.deepEqual(picked, [['weather', '4000', 'Snow']]);
});

test('with VIP the Arsenal picks go through the same pick as everything else', async () => {
  const { call, picked } = presets({ vip: true });
  const res = await call('presets:resolve', 'p1');
  assert.equal(res.vipSkipped, 0);
  assert.deepEqual(picked.map((p) => p[0]), ['hero:npc_dota_hero_juggernaut:hero_base', 'hero:npc_dota_hero_axe:head', 'weather']);
});
