// Nobody may meet a Russian string, or an English one in a Spanish window.
//
// Russian is the source language here: the text in the code is the key, and English and Spanish
// are looked up from it. A key with no entry falls back and nothing crashes, which is exactly
// why it survives review - the app works, it just speaks the wrong language in one dialog.
// tools/check-i18n.js reads every call site and every dictionary and finds those, and this test
// is what makes it run on a pull request instead of on somebody's memory.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, '..', 'tools', 'check-i18n.js');
const check = (root, ...args) => spawnSync(process.execPath, [script, ...args], {
  encoding: 'utf8',
  env: root ? { ...process.env, CHECK_I18N_ROOT: root } : process.env,
});

test('every Russian string has an English and a Spanish twin', () => {
  const run = check(null);
  // The checker prints the file, the line and the string for each gap, so its own output is
  // the failure message. Repeating it here in a nicer shape would only lose the line numbers.
  assert.equal(run.status, 0, `\n${run.stdout}${run.stderr}`);
});

// ---- the checker against trees made to fail it --------------------------------
// A rule that never fires looks exactly like a rule that works, so each one is shown a tree
// that breaks it, next to a tree that breaks nothing.

function tree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-i18n-'));
  for (const [rel, text] of Object.entries(files)) {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  return dir;
}

const CLEAN = {
  'renderer/i18n.js': [
    "window.EN_PLURAL = { 'модов': ['mod', 'mods'] };",
    "const EN = { 'Герои': 'Heroes', 'Привет': 'Hello', 'Кнопка': 'Button', 'Запасной': 'Fallback', 'Пусто': 'Empty' };",
  ].join('\n'),
  'renderer/i18n-locales.js': [
    // an apostrophe in a comment once threw the brace counter off: keep one here
    "// Dota's own words",
    'const ES = {',
    "  'Герои': 'Héroes', 'Привет': 'Hola', 'Запасной': 'Reserva', 'Пусто': 'Vacío',",
    "  'Button': 'Botón',", // keyed by the English, which L() and tr() accept
    '};',
    "window.ES_PLURAL = { 'модов': ['mod', 'mods'] };",
    'const JA = {};',
    'const ZH = {};',
  ].join('\n'),
  'renderer/index.html': [
    '<button data-i18n-title="Кнопка"></button>',
    '<script src="i18n-locales.js"></script>',
    '<script src="i18n.js"></script>',
  ].join('\n'),
  'renderer/core/constants.js': [
    "export const CAT_RU = { heroes: 'Герои' };",
    'export const COSMETIC_SLOTS = {};',
    'export const RAIL_SECTIONS = [];',
    "export const SORTS = [{ key: 'default', label: 'Пусто' }];",
  ].join('\n'),
  'renderer/views/catalog.js': 'const TAG_WORD = {};\nconst GROUP_LABEL = {};\nconst LINK_LABEL = {};\n',
  'renderer/core/arsenal-data.js': 'const SLOT_RU = {};\nconst RARITY_RU = {};\nexport const RARITY_FILTERS = [];\n',
  'renderer/app.js': [
    'L`Привет`;',
    "tr(GROUP_LABEL[x] || 'Запасной');",
    "plural(n, 'мод', 'мода', 'модов');",
  ].join('\n'),
  'src/i18n.js': "const EN = { 'Ошибка': 'Error' };\nconst ES = { 'Ошибка': 'Fallo' };\n",
  'src/x.js': "t('Ошибка');\n",
  'main.js': '',
};

test('the checker passes a tree where every key has both twins', () => {
  const run = check(tree(CLEAN));
  assert.equal(run.status, 0, `\n${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /English and a Spanish twin/);
});

test('the checker fails each kind of gap, and says where', () => {
  const run = check(tree({
    ...CLEAN,
    'renderer/i18n.js': [
      "window.EN_PLURAL = { 'модов': ['mod', 'mods'] };",
      "const EN = { 'Герои': 'Heroes', 'Привет': 'Hello', 'Привет': 'Hi', 'Кнопка': 'Button', 'Запасной': 'Fallback', 'Пусто': 'Empty', 'Только английский': 'English only' };",
    ].join('\n'),
    'renderer/i18n-locales.js': [
      "const ES = { 'Герои': 'Héroes', 'Привет': 'Привет', 'Запасной': 'Reserva', 'Пусто': 'Vacío', 'Button': 'Botón' };",
      "window.ES_PLURAL = { 'модов': ['mod', 'mods'] };",
      'const JA = {};',
      'const ZH = {};',
    ].join('\n'),
    'renderer/index.html': `${CLEAN['renderer/index.html']}\n<span data-i18n="Играть"></span>`,
    // a dictionary split into a file of its own and never given a <script> tag
    'renderer/i18n-more.js': '// more words, one day\n',
    'renderer/core/constants.js': [
      "export const CAT_RU = { heroes: 'Герои', fresh: 'Новая категория' };",
      'export const COSMETIC_SLOTS = {};',
      'export const RAIL_SECTIONS = [];',
      "export const SORTS = [{ key: 'default', label: 'Пусто' }];",
    ].join('\n'),
    'renderer/views/catalog.js': 'const TAG_WORD = {};\nconst GROUP_LABEL = {};\n',
    'renderer/app.js': [
      'L`Привет`;',
      'L`Нет перевода ${n}`;',
      'L`Hola amigo`;',
      "tr(GROUP_LABEL[x] || 'Без английского');",
      "plural(n, 'файл', 'файла', 'файлов');",
    ].join('\n'),
    'src/i18n.js': "const EN = { 'Ошибка': 'Error', 'Сбой': 'Failure' };\nconst ES = { 'Ошибка': 'Fallo' };\n",
    'src/x.js': "t('Ошибка');\nt('Неизвестно');\n",
  }));
  assert.equal(run.status, 1, run.stdout);
  const out = run.stdout;
  for (const expected of [
    // a key written twice, with both lines
    /key\(s\) written more than once in renderer\/i18n\.js \(EN\):\n {2}"Привет" {2}lines 2, 2/,
    // no English: a call site with a value, an index.html attribute, a label table, a literal inside tr(…)
    /renderer\/app\.js:2 {2}L`` {2}"Нет перевода \{0\}"/,
    /renderer\/index\.html:4 {2}data-i18n {2}"Играть"/,
    /dictionary file\(s\) that renderer\/index\.html does not load:\n {2}renderer\/i18n-more\.js/,
    /renderer\/core\/constants\.js:1 {2}CAT_RU {2}"Новая категория"/,
    /renderer\/app\.js:4 {2}tr\(…\) {2}"Без английского"/,
    // text in another language used as the key
    /not Russian[^\n]*\n {2}renderer\/app\.js:3 {2}L`` {2}"Hola amigo"/,
    // no Spanish, for a key only the dictionary names and for one only a call site names
    /renderer\/i18n\.js:2 {2}EN {2}"Только английский"/,
    /no Spanish twin in renderer\/i18n-locales\.js:[^]*"Нет перевода \{0\}"/,
    /Spanish value\(s\) in renderer\/i18n-locales\.js that are still Russian:\n {2}"Привет": "Привет"/,
    /renderer\/app\.js:5 {2}"файлов" {2}not in EN_PLURAL or ES_PLURAL/,
    /LINK_LABEL: listed in LABEL_TABLES, defined nowhere/,
    // the main process
    /src\/x\.js:2 {2}t\(\) {2}"Неизвестно"/,
    /no Spanish twin in src\/i18n\.js:\n {2}src\/i18n\.js:1 {2}EN {2}"Сбой"/,
  ]) assert.match(out, expected);
});

test('--unused lists what nothing looks up, without failing a clean tree', () => {
  const run = check(tree({
    ...CLEAN,
    'renderer/i18n.js': CLEAN['renderer/i18n.js'].replace("'Пусто': 'Empty'", "'Пусто': 'Empty', 'Лишнее': 'Spare'"),
    'renderer/i18n-locales.js': CLEAN['renderer/i18n-locales.js'].replace("'Button': 'Botón',", "'Button': 'Botón', 'Лишнее': 'Sobrante', 'Stale English': 'Viejo',"),
  }), '--unused');
  assert.equal(run.status, 0, run.stdout);
  assert.match(run.stdout, /no literal call site uses[^\n]*\n {2}"Лишнее"/);
  assert.match(run.stdout, /keyed by neither an EN key nor its English:\n {2}"Stale English"/);
});

// ---- the main process ---------------------------------------------------------

test('src/i18n supports en, es and ru translations', () => {
  const { setLang, getLang, t } = require('../src/i18n');
  const original = getLang();

  try {
    setLang('es');
    assert.equal(getLang(), 'es');
    assert.equal(t('Открыть Mod Assistant'), 'Abrir Mod Assistant');
    assert.equal(t('HTTP {0} — не удалось скачать {1}', 404, 'x.zip'), 'HTTP 404 — no se pudo descargar x.zip');
    // a key no dictionary knows stays readable rather than empty
    assert.equal(t('Такого ключа нет'), 'Такого ключа нет');

    setLang('ru');
    assert.equal(getLang(), 'ru');
    assert.equal(t('Открыть Mod Assistant'), 'Открыть Mod Assistant');

    setLang('en');
    assert.equal(getLang(), 'en');
    assert.equal(t('Открыть Mod Assistant'), 'Open Mod Assistant');

    // the window offers Japanese and Chinese; the main process has English for them
    setLang('ja');
    assert.equal(getLang(), 'en');
  } finally {
    setLang(original);
  }
});

// ---- the window's plural words ------------------------------------------------

/* renderer/ui/format.js is a browser module with no imports, so its functions can run here
   once the `export` keywords are gone. Only plural() is wanted; the tables are the real ones,
   loaded the way index.html loads them. */
function rendererPlural(lang) {
  const win = { I18N_LANG: lang };
  const ctx = vm.createContext({ window: win, localStorage: { getItem: () => lang, setItem() {} } });
  const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  for (const m of read('renderer/index.html').matchAll(/<script src="(i18n[^"]*\.js)">/g)) {
    vm.runInContext(read(`renderer/${m[1]}`), ctx);
  }
  win.I18N_LANG = lang;
  vm.runInContext(`${read('renderer/ui/format.js').replace(/^export /gm, '')}\nwindow.plural = plural;`, ctx);
  return win.plural;
}

test('plural() gives every language but Russian a one-or-many word of its own or the English', () => {
  const words = (lang) => [1, 3, 5].map((n) => rendererPlural(lang)(n, 'мод', 'мода', 'модов'));
  assert.deepEqual(words('ru'), ['мод', 'мода', 'модов']);
  assert.deepEqual(words('en'), ['mod', 'mods', 'mods']);
  assert.equal(rendererPlural('es')(2, 'файл', 'файла', 'файлов'), 'archivos');
  // Japanese and Chinese have no table: they used to get the Russian rule and print Cyrillic
  assert.deepEqual(words('ja'), ['mod', 'mods', 'mods']);
  assert.deepEqual(words('zh'), ['mod', 'mods', 'mods']);
});
