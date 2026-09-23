/* Every Russian string the app shows must have an English and a Spanish twin.
   Russian is the source language, and a missing key falls back without a sound: to English for
   a Spanish reader, to Russian for an English one. Nothing crashes, so nothing tells anybody.
   Spanish is the language a first run starts in, and 349 of the 583 English entries once had no
   Spanish twin while this script, which then read English only, stayed green.

   Where the keys come from:
     - call sites: L`...`, L('...'), tr('...') in renderer/, t('...') in main.js and src/
     - the data-i18n, -title, -aria and -ph attributes of renderer/index.html
     - the label tables whose values reach tr() through a variable (LABEL_TABLES below), and
       any literal written inside a tr(...) whose argument is not a plain literal
     - plural() calls, whose last form keys EN_PLURAL and ES_PLURAL
   What each key needs:
     - an English twin in EN (renderer/i18n.js, src/i18n.js), keyed by the exact Russian string,
       with {0},{1}... for interpolated values exactly like canonKey() in renderer/i18n.js
     - a Spanish twin in ES (renderer/i18n-locales.js, src/i18n.js), keyed by the Russian string
       or by its English; every key EN has needs one too, which covers tr(var) lookups
     - a key with letters and no Cyrillic is Spanish or English written as the key: with no entry
       it prints the same words in every language, so it fails like a missing twin
   And the dictionaries: no key written twice, and no Russian left in a Spanish value.

   `npm test` runs this through test/i18n.test.js, so a missing twin fails a pull request rather
   than waiting for somebody to notice the wrong language in a window.

   Usage: node tools/check-i18n.js            exit 1 if anything is missing
          node tools/check-i18n.js --unused   also list EN keys no literal call site uses, and
                                              Spanish entries nothing looks up (advisory:
                                              data-driven tr(var) lookups look unused here)
   CHECK_I18N_ROOT=<dir> checks another tree; test/i18n.test.js uses it to make every rule fail. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.env.CHECK_I18N_ROOT || path.join(__dirname, '..'));
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
const sources = new Map();
const read = (file) => {
  if (!sources.has(file)) sources.set(file, fs.readFileSync(path.join(ROOT, file), 'utf8'));
  return sources.get(file);
};
const CYRILLIC = /[А-Яа-яЁё]/;
const LETTER = /\p{L}/u;

// ---- call-site scanner ----------------------------------------------------
// Walks the source once, skipping comments, strings and regex literals, and picks up
// the string that L / tr / t is called with. Keys use {0},{1}… for interpolated values,
// exactly like canonKey() in renderer/i18n.js.
const IDENT = /[A-Za-z_$]/;
const IDENT_REST = /[\w$]/;

// A call whose first argument is not a literal (tr(CAT_RU[id]), plural(n, …)) goes to
// `dynamic` with the text of its arguments, when the caller asks for them.
function scan(src, names, baseLine = 1, dynamic = null) {
  const hits = [];
  const lineAt = (idx) => baseLine + src.slice(0, idx).split('\n').length - 1;
  // Code inside a template's ${…}: the UI builds its markup as one big template, so most
  // L`` calls in the app live in there. Skipping those regions (as this scanner did until
  // 2026-08-06) made the check pass while never looking at the banners at all.
  const nested = [];
  let i = 0;
  let prev = ''; // last significant code char, to tell division from a regex

  const readString = (k) => { // k at the quote; returns { value, end } or null
    const q = src[k];
    const from = k;
    k++;
    while (k < src.length && src[k] !== q) { if (src[k] === '\\') k++; k++; }
    if (k >= src.length) return null;
    try {
      // eslint-disable-next-line no-new-func
      return { value: new Function(`return ${src.slice(from, k + 1)}`)(), end: k + 1 };
    } catch { return null; }
  };

  // Advance past a template literal, nested ones and all, recording nothing. Used while
  // skipping over an interpolation that is going to be scanned properly in its own right.
  const skipTemplate = (k) => {
    k++;
    while (k < src.length) {
      const c = src[k];
      if (c === '\\') { k += 2; continue; }
      if (c === '`') return k + 1;
      if (c === '$' && src[k + 1] === '{') {
        let depth = 1;
        k += 2;
        while (k < src.length && depth) {
          const d = src[k];
          if (d === '{') depth++;
          else if (d === '}') { if (--depth === 0) { k++; break; } }
          else if (d === "'" || d === '"') { const q = d; k++; while (k < src.length && src[k] !== q) { if (src[k] === '\\') k++; k++; } }
          else if (d === '`') { k = skipTemplate(k) - 1; }
          k++;
        }
        continue;
      }
      k++;
    }
    return k;
  };

  const readTemplate = (k) => { // k at the backtick; ${…} becomes {0},{1}…
    let out = '';
    let n = 0;
    k++;
    while (k < src.length) {
      const c = src[k];
      if (c === '\\') {
        const e = src[k + 1];
        out += e === 'n' ? '\n' : e === 't' ? '\t' : e;
        k += 2;
        continue;
      }
      if (c === '`') return { value: out, end: k + 1 };
      if (c === '$' && src[k + 1] === '{') {
        let depth = 1;
        k += 2;
        const from = k;
        while (k < src.length && depth) {
          const d = src[k];
          if (d === '{') depth++;
          else if (d === '}') { if (--depth === 0) { nested.push({ from, to: k }); k++; break; } }
          else if (d === "'" || d === '"') { const q = d; k++; while (k < src.length && src[k] !== q) { if (src[k] === '\\') k++; k++; } }
          // Step over a template nested in this interpolation WITHOUT recording anything:
          // the whole region is scanned recursively below, and letting readTemplate run here
          // too would register its interpolations twice (and four times one level deeper).
          else if (d === '`') { k = skipTemplate(k) - 1; }
          k++;
        }
        out += `{${n++}}`;
        continue;
      }
      out += c;
      k++;
    }
    return null;
  };

  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '/' && !IDENT_REST.test(prev) && prev !== ')' && prev !== ']') { // regex literal
      i++;
      let inClass = false;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '[') inClass = true;
        else if (src[i] === ']') inClass = false;
        else if (src[i] === '/' && !inClass) { i++; break; }
        else if (src[i] === '\n') break;
        i++;
      }
      prev = '0';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const r = c === '`' ? readTemplate(i) : readString(i);
      i = r ? r.end : i + 1;
      prev = '"';
      continue;
    }
    if (IDENT.test(c)) {
      const from = i;
      while (i < src.length && IDENT_REST.test(src[i])) i++;
      const name = src.slice(from, i);
      const isProp = /[.\w$]/.test(src[from - 1] || '');
      let j = i;
      while (j < src.length && /\s/.test(src[j])) j++;
      if (!isProp && names.includes(name)) {
        if (src[j] === '`') {
          const r = readTemplate(j);
          if (r) { hits.push({ line: lineAt(from), key: r.value, call: `${name}\`\``, name }); i = r.end; prev = '"'; continue; }
        } else if (src[j] === '(') {
          let k = j + 1;
          while (k < src.length && /\s/.test(src[k])) k++;
          const r = src[k] === '`' ? readTemplate(k) : (src[k] === "'" || src[k] === '"') ? readString(k) : null;
          if (r) { hits.push({ line: lineAt(from), key: r.value, call: `${name}()`, name }); i = r.end; prev = '"'; continue; }
          if (dynamic) {
            try { dynamic.push({ name, line: lineAt(from), args: src.slice(j + 1, closeOf(src, j)) }); } catch { /* unbalanced: not a call we can read */ }
          }
        }
      }
      prev = name.slice(-1);
      continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  // Every ${…} found above is ordinary code: scan it the same way, with its own line offset
  // so a hit still points at the line the author wrote it on. Templates nested inside those
  // interpolations queue their own regions when this runs, so depth costs nothing extra.
  for (const r of nested) {
    hits.push(...scan(src.slice(r.from, r.to), names, lineAt(r.from), dynamic));
  }
  return hits;
}

// ---- reading literals out of source -----------------------------------------
// The dictionaries and label tables are cut out of their files and evaluated on their own:
// the files around them touch window and localStorage, which this script has not got.

/* Where the string, template or comment starting at i ends, or i when none starts there. */
function skipNoise(src, i) {
  const c = src[i];
  if (c === '/' && src[i + 1] === '/') { const nl = src.indexOf('\n', i); return nl < 0 ? src.length : nl; }
  if (c === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); return end < 0 ? src.length : end + 2; }
  if (c === "'" || c === '"') {
    let k = i + 1;
    while (k < src.length && src[k] !== c) { if (src[k] === '\\') k++; k++; }
    return k + 1;
  }
  if (c === '`') {
    let k = i + 1;
    while (k < src.length && src[k] !== '`') {
      if (src[k] === '\\') k += 2;
      else if (src[k] === '$' && src[k + 1] === '{') k = closeOf(src, k + 1) + 1;
      else k++;
    }
    return k + 1;
  }
  return i;
}

/* The index of the bracket that closes the one at `open`. A comment holding "Dota's" used to
   be enough to throw the old brace counter off, since it knew about strings and not comments. */
function closeOf(src, open) {
  const want = [];
  const pair = { '{': '}', '[': ']', '(': ')' };
  for (let i = open; i < src.length;) {
    const after = skipNoise(src, i);
    if (after !== i) { i = after; continue; }
    const c = src[i];
    if (pair[c]) want.push(pair[c]);
    else if (c === want[want.length - 1]) { want.pop(); if (!want.length) return i; }
    i++;
  }
  throw new Error(`no closing bracket for the ${src[open]} at offset ${open}`);
}

function evalString(text) {
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`return ${text}`)();
  } catch { return null; }
}

/* Every quoted string between from and to, with the line it starts on. */
function stringsIn(src, from, to, baseLine) {
  const out = [];
  let line = baseLine;
  for (let i = from; i < to;) {
    const after = skipNoise(src, i);
    if (after !== i) {
      const text = src.slice(i, after);
      if (src[i] === "'" || src[i] === '"') {
        let j = after;
        while (/\s/.test(src[j] || '')) j++;
        out.push({ value: evalString(text), line, isKey: src[j] === ':' });
      }
      line += text.split('\n').length - 1;
      i = after;
      continue;
    }
    if (src[i] === '\n') line++;
    i++;
  }
  return out;
}

/* A literal written as `<marker> {…}` or `<marker> […]` in file, or null when it is not there. */
function literal(file, marker) {
  const src = read(file);
  const at = typeof marker === 'string' ? src.indexOf(marker) : src.search(marker);
  if (at < 0) return null;
  const open = at + src.slice(at).search(/[[{]/);
  const close = closeOf(src, open);
  return { file, src, open, close, line: src.slice(0, open).split('\n').length };
}

function readDict(file, marker) {
  const lit = literal(file, marker);
  if (!lit) throw new Error(`no "${marker}" in ${file}`);
  return { ...lit, value: evalString(lit.src.slice(lit.open, lit.close + 1)) };
}

/* The keys of a dictionary's own level with their lines; nested values (plural pairs) aside. */
function keysOf(lit) {
  const out = [];
  let depth = 0;
  let line = lit.line;
  const { src } = lit;
  for (let i = lit.open; i <= lit.close;) {
    const after = skipNoise(src, i);
    if (after !== i) {
      const text = src.slice(i, after);
      if (depth === 1 && (src[i] === "'" || src[i] === '"')) {
        let j = after;
        while (/\s/.test(src[j] || '')) j++;
        if (src[j] === ':') out.push({ key: evalString(text), line });
      }
      line += text.split('\n').length - 1;
      i = after;
      continue;
    }
    const c = src[i];
    if (c === '\n') line++;
    else if ('{[('.includes(c)) depth++;
    else if ('}])'.includes(c)) depth--;
    i++;
  }
  return out;
}

// ---- what to check --------------------------------------------------------
function jsFiles(dir, skip) {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...jsFiles(p, skip));
    else if (e.name.endsWith('.js') && !skip.includes(p)) out.push(p);
  }
  return out;
}

// The window's dictionaries are the classic scripts renderer/i18n*.js that index.html loads ahead
// of the app. Each table is found by its marker in whichever of them holds it, so a dictionary
// that outgrows its file can move to a new one without this script being told.
const RENDERER_DICTS = fs.readdirSync(path.join(ROOT, 'renderer'))
  .filter((f) => /^i18n.*\.js$/.test(f)).sort().map((f) => `renderer/${f}`);

const SIDES = [
  {
    name: 'renderer',
    dicts: RENDERER_DICTS,
    en: 'const EN = {',
    es: 'const ES = {',
    others: ['const JA = {', 'const ZH = {', 'window.EN_PLURAL = {', 'window.ES_PLURAL = {'],
    calls: ['L', 'tr'],
    files: jsFiles('renderer', RENDERER_DICTS),
    html: 'renderer/index.html',
  },
  {
    name: 'main',
    dicts: ['src/i18n.js'],
    en: 'const EN = {',
    es: 'const ES = {',
    others: [],
    calls: ['t'],
    files: ['main.js', ...jsFiles('src', ['src/i18n.js'])],
  },
];

const locate = (side, marker) => side.dicts.find((file) => read(file).includes(marker)) || null;
function dictOf(side, marker) {
  const file = locate(side, marker);
  if (!file) throw new Error(`no "${marker}" in ${side.dicts.join(', ')}`);
  return readDict(file, marker);
}

/* Tables whose Russian values reach tr() through a variable, where no call site names them:
 * tr(CAT_RU[id]), tr(s.label) over SORTS, tr(label) over RAIL_SECTIONS, and so on. A table
 * indexed right inside a tr(...) is found without being listed; these are the ones reached
 * one step further away. A name here that no longer exists fails the run, so a rename cannot
 * quietly take its labels out of the check. The Arsenal's three reach tr() through a variable
 * too and went unread until 2026-09-23: a slot label added without its twins passed. */
const LABEL_TABLES = [
  'CAT_RU', 'COSMETIC_SLOTS', 'RAIL_SECTIONS', 'SORTS', 'TAG_WORD', 'GROUP_LABEL', 'LINK_LABEL',
  'SLOT_RU', 'RARITY_RU', 'RARITY_FILTERS',
];

function findTable(files, name) {
  const def = new RegExp(`\\b(?:export\\s+)?const\\s+${name}\\s*=\\s*[[{]`);
  for (const file of files) {
    const lit = literal(file, def);
    if (lit) return lit;
  }
  return null;
}

/* The arguments of a call, split at its own commas. */
function splitArgs(text) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length;) {
    const after = skipNoise(text, i);
    if (after !== i) { i = after; continue; }
    const c = text[i];
    if ('{[('.includes(c)) depth++;
    else if ('}])'.includes(c)) depth--;
    else if (c === ',' && depth === 0) { out.push(text.slice(from, i).trim()); from = i + 1; }
    i++;
  }
  out.push(text.slice(from).trim());
  return out;
}

const decodeHtml = (s) => s.replace(/&(amp|quot|#39|lt|gt);/g, (_, e) => ({ amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' }[e]));

const failures = [];
const fail = (heading, lines) => { if (lines.length) failures.push({ heading, lines }); };
const show = (s) => JSON.stringify(s);
const unused = process.argv.includes('--unused');

for (const side of SIDES) {
  const enLit = dictOf(side, side.en);
  const esLit = dictOf(side, side.es);
  const EN = enLit.value;
  const ES = esLit.value;

  // A key written twice in one dictionary.
  //
  // The table is a plain object literal, so the later entry wins and the earlier one is dead -
  // silently, because both halves look right when you read them. Found by CodeQL first:
  // 'Звук' meant the Audio category filter in one place and the player's sound control in
  // another, and English users got "Sound" on the category because it came second.
  //
  // Repeats where both sides say the same thing are only clutter, but they are how the harmful
  // kind hides, so they fail too. One Russian word that has to mean two English things needs two
  // source strings, not two rows.
  for (const marker of [side.en, side.es, ...side.others]) {
    const file = locate(side, marker);
    const lit = file && literal(file, marker);
    if (!lit) continue;
    const at = new Map();
    for (const { key, line } of keysOf(lit)) at.set(key, [...(at.get(key) || []), line]);
    const dupes = [...at].filter(([, lines]) => lines.length > 1);
    fail(`${dupes.length} key(s) written more than once in ${file} (${marker.replace(/^(const |window\.)| = \{$/g, '')}):`,
      dupes.map(([key, lines]) => `${show(key)}  lines ${lines.join(', ')}`));
  }

  // Every key the side uses, and where.
  const sites = [];
  const dynamic = [];
  const names = side.html ? [...side.calls, 'plural'] : side.calls;
  for (const file of side.files) {
    const calls = [];
    for (const h of scan(read(file), names, 1, calls)) {
      if (h.name !== 'plural') sites.push({ key: h.key, where: `${file}:${h.line}`, call: h.call, literal: true });
    }
    for (const d of calls) dynamic.push({ ...d, file });
  }
  if (side.html) {
    const html = read(side.html);
    for (const m of html.matchAll(/data-i18n(-ph|-title|-aria)?="([^"]*)"/g)) {
      const line = html.slice(0, m.index).split('\n').length;
      sites.push({ key: decodeHtml(m[2]), where: `${side.html}:${line}`, call: `data-i18n${m[1] || ''}`, literal: true });
    }
    // A dictionary this script reads but the window never loads passes here and is missing
    // there: the words would all be checked and none of them shown.
    const loaded = new Set([...html.matchAll(/<script\s[^>]*src="([^"]+)"/g)].map((m) => `renderer/${m[1]}`));
    const unloaded = side.dicts.filter((f) => !loaded.has(f));
    fail(`${unloaded.length} dictionary file(s) that ${side.html} does not load:`,
      unloaded.map((f) => `${f}  (add <script src="${f.slice('renderer/'.length)}"></script> ahead of app.js)`));
  }

  // Labels that reach tr() through a variable.
  if (side.name === 'renderer') {
    const tables = new Set(LABEL_TABLES);
    const gone = [];
    for (const d of dynamic.filter((x) => side.calls.includes(x.name))) {
      // literals written in the call itself: tr(GROUP_LABEL[id] || 'Все группы')
      for (const s of stringsIn(d.args, 0, d.args.length, d.line)) {
        if (s.value != null && CYRILLIC.test(s.value)) sites.push({ key: s.value, where: `${d.file}:${s.line}`, call: `${d.name}(…)` });
      }
      const code = d.args.replace(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, '');
      for (const m of code.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)) if (findTable(side.files, m[0])) tables.add(m[0]);
    }
    for (const name of tables) {
      const lit = findTable(side.files, name);
      if (!lit) { gone.push(`${name}: listed in LABEL_TABLES, defined nowhere under renderer/`); continue; }
      for (const s of stringsIn(lit.src, lit.open, lit.close + 1, lit.line)) {
        if (s.value != null && !s.isKey && CYRILLIC.test(s.value)) sites.push({ key: s.value, where: `${lit.file}:${s.line}`, call: name });
      }
    }
    fail(`${gone.length} label table(s) the check was told to read are gone (update LABEL_TABLES in tools/check-i18n.js):`, gone);

    // plural(n, one, few, many) looks its words up by the "many" form
    const EN_PLURAL = dictOf(side, 'window.EN_PLURAL = {').value;
    const ES_PLURAL = dictOf(side, 'window.ES_PLURAL = {').value;
    const forms = [];
    for (const d of dynamic.filter((x) => x.name === 'plural')) {
      const args = splitArgs(d.args);
      const many = args.length === 4 ? evalString(args[3]) : null;
      if (typeof many !== 'string') continue;
      const lacking = [!EN_PLURAL[many] && 'EN_PLURAL', !ES_PLURAL[many] && 'ES_PLURAL'].filter(Boolean);
      if (lacking.length) forms.push(`${d.file}:${d.line}  ${show(many)}  not in ${lacking.join(' or ')}`);
    }
    fail(`${forms.length} plural form(s) with no word to print outside Russian:`, forms);
  }

  const noEn = [];
  const notRussian = [];
  const firstSite = new Map();
  for (const s of sites) {
    if (!firstSite.has(s.key)) firstSite.set(s.key, s);
    if (EN[s.key] != null) continue;
    if (CYRILLIC.test(s.key)) noEn.push(`${s.where}  ${s.call}  ${show(s.key)}`);
    else if (s.literal && LETTER.test(s.key)) notRussian.push(`${s.where}  ${s.call}  ${show(s.key)}`);
  }
  fail(`${noEn.length} string(s) with no English twin in ${enLit.file}:`, noEn);
  fail(`${notRussian.length} key(s) that are not Russian and that no dictionary knows, so they read the same in every language (write the Russian in the call, with its twins):`, notRussian);

  const enLine = new Map(keysOf(enLit).map(({ key, line }) => [key, line]));
  const wanted = new Set([...Object.keys(EN), ...sites.filter((s) => CYRILLIC.test(s.key)).map((s) => s.key)]);
  const noEs = [];
  for (const key of wanted) {
    if ((ES[key] ?? ES[EN[key]]) != null) continue;
    const s = firstSite.get(key);
    noEs.push(`${s ? `${s.where}  ${s.call}` : `${enLit.file}:${enLine.get(key)}  EN`}  ${show(key)}`);
  }
  fail(`${noEs.length} string(s) with no Spanish twin in ${esLit.file}:`, noEs);

  const russianEs = Object.entries(ES).filter(([, v]) => CYRILLIC.test(String(v))).map(([k, v]) => `${show(k)}: ${show(v)}`);
  fail(`${russianEs.length} Spanish value(s) in ${esLit.file} that are still Russian:`, russianEs);

  if (unused) {
    const used = new Set(sites.map((s) => s.key));
    const dead = Object.keys(EN).filter((k) => !used.has(k));
    if (dead.length) console.log(`\n${dead.length} key(s) in ${enLit.file} that no literal call site uses (data-driven lookups land here too):\n  ${dead.map(show).join('\n  ')}`);
    const english = new Set(Object.values(EN));
    const orphans = Object.keys(ES).filter((k) => EN[k] == null && !english.has(k) && !used.has(k));
    if (orphans.length) console.log(`\n${orphans.length} Spanish entr(y/ies) in ${esLit.file} keyed by neither an EN key nor its English:\n  ${orphans.map(show).join('\n  ')}`);
  }
}

if (failures.length) {
  for (const f of failures) console.log(`\n${f.heading}\n  ${f.lines.join('\n  ')}`);
  console.log('\nAdd the English to EN keyed by the exact Russian string, and the Spanish to ES under the same'
    + '\nkey: renderer/i18n.js and renderer/i18n-locales.js for the window, src/i18n.js for the main process.');
  process.exit(1);
}
console.log(`i18n: every Russian string in ${rel(path.join(ROOT, 'renderer'))}/ and main has an English and a Spanish twin.`);
