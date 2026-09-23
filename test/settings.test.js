/* The settings store: a JSON file, and the defaults every unset key falls back to.
 *
 * Small enough to look obviously right, and load-bearing enough that being wrong is invisible
 * until somebody's mods are in the wrong folder. The cases that matter are all about the merge
 * on read: a settings file written by an older version is missing keys that were added since,
 * and what the app does with those decides whether an upgrade is quiet or destructive.
 *
 * The defaults themselves are checked one by one because several of them are decisions with a
 * comment above them in src/settings.js explaining what a different value would cost -
 * schemaPatch starting off, langSuffix starting russian, lastSeenVersion starting null. A
 * default that drifts is a decision undone by accident.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { Settings } = require('../src/settings.js');

function store(t, contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd2mm-set-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'settings.json');
  if (contents !== undefined) fs.writeFileSync(file, contents);
  return { s: new Settings(dir), dir, file };
}

test('a fresh install starts on the defaults, and they are the documented ones', (t) => {
  const { s } = store(t);
  assert.equal(s.get('dotaGamePath'), null);
  assert.equal(s.get('langSuffix'), 'russian', 'English has no folder of its own and borrows this one');
  assert.equal(s.get('uiLang'), 'en');
  assert.equal(s.get('uiScale'), 1);
  assert.equal(s.get('theme'), 'ursa');
  assert.equal(s.get('schemaPatch'), false, 'safe until the user agrees to it once');
  assert.equal(s.get('discordPresence'), true);
  assert.equal(s.get('langPromptSeen'), false);
  assert.equal(s.get('toolsPromptSeen'), false);
  assert.equal(s.get('lastSeenVersion'), null, 'so a hand-installed version shows no what-is-new popup');
  assert.deepEqual(s.get('favorites'), []);
  assert.equal(s.get('panels'), null);
  assert.equal(s.get('account'), null);
});

test('nothing is written until something is set', (t) => {
  const { s, file } = store(t);
  assert.equal(fs.existsSync(file), false, 'reading defaults does not create a file');
  s.set('uiLang', 'ru');
  assert.equal(fs.existsSync(file), true);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf-8')).uiLang, 'ru');
});

test('a value survives a second Settings over the same folder', (t) => {
  const { s, dir } = store(t);
  s.set('dotaGamePath', 'C:/games/dota 2 beta/game');
  s.set('uiScale', 1.25);
  s.set('favorites', ['heroes|Crystal Maiden']);

  const again = new Settings(dir);
  assert.equal(again.get('dotaGamePath'), 'C:/games/dota 2 beta/game');
  assert.equal(again.get('uiScale'), 1.25);
  assert.deepEqual(again.get('favorites'), ['heroes|Crystal Maiden']);
});

test('a file from an older version keeps its values and gains the new defaults', (t) => {
  /* This is the upgrade path, and getting it backwards in either direction is expensive: drop
   * the stored values and somebody's game path and starred mods are gone, drop the defaults and
   * every key added since is undefined for everybody who did not install fresh. */
  const { s } = store(t, JSON.stringify({ dotaGamePath: 'D:/dota/game', uiLang: 'ru' }));
  assert.equal(s.get('dotaGamePath'), 'D:/dota/game', 'kept');
  assert.equal(s.get('uiLang'), 'ru', 'kept');
  assert.equal(s.get('schemaPatch'), false, 'a key added later comes from the defaults');
  assert.equal(s.get('theme'), 'ursa');
  assert.equal(s.get('langPromptSeen'), false, 'so an upgrading user sees the picker once too');
});

test('a stored false or zero is kept rather than treated as missing', (t) => {
  // the merge is a spread, so anything falsy has to survive it: `discordPresence: false` and
  // `uiScale: 0.7` are choices, not gaps
  const { s } = store(t, JSON.stringify({ discordPresence: false, uiScale: 0.7, langPromptSeen: true }));
  assert.equal(s.get('discordPresence'), false);
  assert.equal(s.get('uiScale'), 0.7);
  assert.equal(s.get('langPromptSeen'), true);
});

test('an unreadable settings file falls back to the defaults instead of throwing', (t) => {
  const { s } = store(t, '{ half a file');
  assert.equal(s.get('uiLang'), 'en');
  assert.equal(s.get('langSuffix'), 'russian');
  assert.equal(s.get('schemaPatch'), false, 'and the safe value is what a broken file lands on');
});

test('a settings file holding something that is not an object does not poison the store', (t) => {
  for (const junk of ['null', '"a string"', '42', '[]']) {
    const { s } = store(t, junk);
    assert.equal(s.get('langSuffix'), 'russian', `on ${junk}`);
    assert.equal(s.get('uiScale'), 1, `on ${junk}`);
  }
});

test('all() hands back a copy, so nobody edits the store by holding its object', (t) => {
  /* The renderer caches whatever settings:get returns. If that were the live object, a screen
   * mutating its own copy would silently change what the main process thinks is stored. */
  const { s } = store(t);
  const snapshot = s.all();
  snapshot.uiLang = 'ru';
  snapshot.favorites.push('tampered');
  assert.equal(s.get('uiLang'), 'en', 'the store is unchanged');
  assert.deepEqual(s.all().favorites, ['tampered'], 'arrays are shared, which is worth knowing');
});

test('an unknown key reads as undefined and can be set like any other', (t) => {
  const { s, dir } = store(t);
  assert.equal(s.get('somethingNobodyDefined'), undefined);
  s.set('somethingNobodyDefined', 7);
  assert.equal(new Settings(dir).get('somethingNobodyDefined'), 7);
});

test('the folder is created if it is not there yet', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd2mm-set-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const nested = path.join(dir, 'does', 'not', 'exist');
  const s = new Settings(nested);
  s.set('uiLang', 'ru');
  assert.equal(fs.existsSync(path.join(nested, 'settings.json')), true);
});

/*
 * The channels in front of the store: src/ipc-settings.js, against a stand-in for Electron and a
 * real store in a temporary folder.
 *
 * Several of these switches reach past the store - into the operating system's list of programs
 * that start at login, into the tray, into the file watcher - and a switch that saves the value
 * and forgets the side effect looks right in settings and does nothing. The stand-in stays in place
 * until the test ends rather than only while registering, because the autoStart branch asks for
 * Electron's `app` inside the handler, at the moment the switch is flipped.
 */
const Module = require('module');
const i18n = require('../src/i18n.js');

// kept once, so two stand-ins in one test cannot put each other back instead of the real loader
const LOAD = Module._load;
const BETA = path.join(os.tmpdir(), 'steamapps', 'common', 'dota 2 beta');

function settingsIpc(t, { ctx = {}, electron = {} } = {}) {
  const { s } = store(t);
  const channels = new Map();
  const calls = [];
  const window = {
    destroyed: false,
    visible: true,
    isDestroyed() { return this.destroyed; },
    isVisible() { return this.visible; },
    show: () => calls.push('show'),
    focus: () => calls.push('focus'),
  };
  const fake = {
    ipcMain: { handle: (ch, fn) => channels.set(ch, fn), on: (ch, fn) => channels.set(ch, fn) },
    dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
    app: { setLoginItemSettings: (opts) => calls.push(['login', opts]) },
    ...electron,
  };
  Module._load = function stubbed(request, ...rest) {
    return request === 'electron' ? fake : LOAD.call(this, request, ...rest);
  };
  const file = require.resolve('../src/ipc-settings.js');
  t.after(() => { Module._load = LOAD; delete require.cache[file]; });
  delete require.cache[file];
  require(file).registerSettingsIpc({
    applyPresenceSetting: () => calls.push('presence'),
    discordAuth: { signIn: async () => { throw new Error('closed the Discord window'); } },
    findDotaGamePath: async () => null,
    patchWatcher: () => ({ rearm: () => calls.push('rearm') }),
    settings: s,
    // the view is what the renderer caches, so every answer has to be built after the write
    settingsView: () => ({ view: true, settings: s.all() }),
    setupTray: () => calls.push('setupTray'),
    destroyTray: () => calls.push('destroyTray'),
    validateGamePath: (p) => p === path.join(BETA, 'game'),
    win: () => window,
    ...ctx,
  });
  const call = (ch, ...args) => channels.get(ch)({ sender: { send: () => {} } }, ...args);
  return { s, call, calls, window };
}

test('starting with the system registers the app to open minimized, and switching it off takes that back', async (t) => {
  const { s, call, calls } = settingsIpc(t);

  const on = await call('settings:set', 'autoStart', true);
  assert.equal(s.get('autoStart'), true, 'the switch is saved');
  assert.equal(on.view, true, 'and the answer is the view, not the bare store');
  assert.equal(on.settings.autoStart, true, 'built after the write');
  await call('settings:set', 'autoStart', false);

  assert.deepEqual(calls.filter((c) => c[0] === 'login').map((c) => c[1]), [
    { openAtLogin: true, path: process.execPath, args: ['--minimized'] },
    { openAtLogin: false, path: process.execPath, args: ['--minimized'] },
  ]);
});

test('a build that cannot register a login item still saves the switch', async (t) => {
  // a portable copy or a dev run: Electron refuses, and the setting must not throw at the window
  const { s, call } = settingsIpc(t, {
    electron: { app: { setLoginItemSettings: () => { throw new Error('not supported in this build'); } } },
  });

  const view = await call('settings:set', 'autoStart', true);

  assert.equal(s.get('autoStart'), true);
  assert.equal(view.settings.autoStart, true);
});

test('the tray goes up with its switch, and comes down only while the window is on screen', async (t) => {
  const { s, call, calls, window } = settingsIpc(t);

  await call('settings:set', 'minimizeToTray', true);
  assert.deepEqual(calls, ['setupTray']);

  await call('settings:set', 'minimizeToTray', false);
  assert.deepEqual(calls, ['setupTray', 'destroyTray'], 'switched off with the window open: the tray goes');

  /* Hidden in the tray, the tray icon is the only way back to the window. Taking it away then
     leaves the app running with nothing to click, so the setting is saved and the tray stays. */
  calls.length = 0;
  window.visible = false;
  await call('settings:set', 'minimizeToTray', false);
  window.visible = true;
  window.destroyed = true;
  await call('settings:set', 'minimizeToTray', false);
  assert.deepEqual(calls, [], 'no tray was taken away from a hidden or closed window');
  assert.equal(s.get('minimizeToTray'), false, 'though the switch itself is saved');
});

test('the tray switch is still saved when the main process has no tray to hand over', async (t) => {
  const { s, call } = settingsIpc(t, { ctx: { setupTray: undefined, destroyTray: undefined } });
  await call('settings:set', 'minimizeToTray', true);
  await call('settings:set', 'minimizeToTray', false);
  assert.equal(s.get('minimizeToTray'), false);
});

test('signing in with Discord keeps the account and brings the window back to the front', async (t) => {
  // the sign-in happens in the browser, so the app is behind it when Discord answers
  const account = { id: '4815162342', username: 'crystal.maiden' };
  const { s, call, calls, window } = settingsIpc(t, { ctx: { discordAuth: { signIn: async () => account } } });

  assert.deepEqual(await call('account:signIn'), { ok: true, account });
  assert.deepEqual(s.get('account'), account);
  assert.deepEqual(calls, ['show', 'focus']);

  calls.length = 0;
  window.destroyed = true;
  assert.deepEqual(await call('account:signIn'), { ok: true, account }, 'a window closed meanwhile is not an error');
  assert.deepEqual(calls, [], 'and nothing is asked of it');
});

test('a sign-in that fails says why and leaves nobody signed in', async (t) => {
  const { s, call, calls } = settingsIpc(t);
  assert.deepEqual(await call('account:signIn'), { error: 'closed the Discord window' });
  assert.equal(s.get('account'), null);
  assert.deepEqual(calls, [], 'the window is not pulled forward for a failure');
});

test('finding Dota saves the path and re-arms the watcher on the new folder', async (t) => {
  const found = path.join(BETA, 'game');
  const { s, call, calls } = settingsIpc(t, { ctx: { findDotaGamePath: async () => found } });

  assert.equal(await call('settings:detectDota'), found);
  assert.equal(s.get('dotaGamePath'), found);
  assert.deepEqual(calls, ['rearm'], 'the watcher was holding handles on the folder that was current before');
});

test('finding nothing keeps the path that was there, and a watcher not started yet is not an error', async (t) => {
  const { s, call, calls } = settingsIpc(t);
  s.set('dotaGamePath', 'D:/dota/game');
  assert.equal(await call('settings:detectDota'), null);
  assert.equal(s.get('dotaGamePath'), 'D:/dota/game');
  assert.deepEqual(calls, []);

  const early = settingsIpc(t, { ctx: { findDotaGamePath: async () => 'E:/dota/game', patchWatcher: () => null } });
  assert.equal(await early.call('settings:detectDota'), 'E:/dota/game');
  assert.equal(early.s.get('dotaGamePath'), 'E:/dota/game');
});

test('browsing takes the game folder, or the dota 2 beta folder above it, and refuses anything else', async (t) => {
  const asked = [];
  let pick = null;
  const { s, call, calls, window } = settingsIpc(t, {
    electron: { dialog: { showOpenDialog: async (parent, opts) => { asked.push([parent, opts]); return pick; } } },
  });
  const game = path.join(BETA, 'game');

  pick = { canceled: false, filePaths: [game] };
  assert.deepEqual(await call('settings:browseDota'), { path: game });
  assert.equal(asked[0][0], window, 'the dialog belongs to the app window');
  assert.deepEqual(asked[0][1].properties, ['openDirectory']);

  s.set('dotaGamePath', null);
  pick = { canceled: false, filePaths: [BETA] };
  assert.deepEqual(await call('settings:browseDota'), { path: game }, 'the folder above is corrected to the game folder in it');
  assert.equal(s.get('dotaGamePath'), game);
  assert.deepEqual(calls, ['rearm', 'rearm']);

  pick = { canceled: false, filePaths: [path.join(os.tmpdir(), 'Downloads')] };
  assert.deepEqual(await call('settings:browseDota'),
    { error: i18n.t('В этой папке нет файлов Dota 2 — нужна папка game внутри dota 2 beta') });
  assert.equal(s.get('dotaGamePath'), game, 'a folder with no Dota in it does not replace a good path');
  assert.deepEqual(calls, ['rearm', 'rearm'], 'and the watcher is left alone');

  for (const nothing of [{ canceled: true, filePaths: [] }, { canceled: false, filePaths: [] }]) {
    pick = nothing;
    assert.equal(await call('settings:browseDota'), null);
  }
  assert.equal(s.get('dotaGamePath'), game);
});
