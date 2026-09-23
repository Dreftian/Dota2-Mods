/* Mod Assistant — promotional site script.
 *
 * Plain JavaScript, no dependencies. The page is complete without it: every download link is
 * a real link in the HTML. This file only adds what needs a browser:
 *   - the Spanish/English switch (Spanish is the source text in index.html),
 *   - the mobile menu,
 *   - the medal and hero-badge demo,
 *   - the latest release number from GitHub, which fails silently when offline or when the
 *     releases repository has no release yet,
 *   - a note for visitors who are not on Windows.
 */
(function () {
  'use strict';

  var RELEASES_API = 'https://api.github.com/repos/Dreftian/Dota2-Mods-Releases/releases/latest';
  var LANG_KEY = 'ma-site-lang';
  var RELEASE_KEY = 'ma-site-release';

  /* ------------------------------------------------------------------------------------------
     English copy, keyed by the data-i18n attribute. Values are HTML, like the Spanish source.
     ------------------------------------------------------------------------------------------ */
  var EN = {
    'skip': 'Skip to content',
    'brand.home': 'Mod Assistant, back to top',
    'nav.label': 'Main',
    'nav.mods': 'Mods',
    'nav.free': 'Free',
    'nav.safety': 'Safety',
    'nav.pricing': 'Pricing',
    'nav.download': 'Download free',

    'hero.eyebrow': 'For Dota 2 · Windows 10/11 · Free',
    'hero.title': 'Dota 2 your way: <span class="gradient-text">mods, cosmetics and arcanas</span> in one click',
    'hero.lead': 'Over 1,300 community mods, free cosmetics pulled from your own game, and Arsenal VIP to equip the arcanas and immortals of each of the 125 heroes without owning them. Everything is local: only you see it.',
    'hero.shotAlt': 'Mod Assistant Arsenal VIP: the sets, arcana and immortals of Juggernaut, with rarity and exclusives filters',
    'hero.caption': 'Real screenshot of the app: Arsenal VIP with Juggernaut (Spanish interface).',
    'ars.shotAlt': 'Arsenal VIP: the hero list with how many immortals and arcanas each one has',
    'ars.caption': 'Real screenshot: every hero in the game, with their immortals and arcanas.',

    'cta.installer': 'Download free (installer)',
    'cta.portable': 'Portable version',
    'cta.meta': 'Always the latest version · Updates itself',
    'cta.notes': 'Release notes',

    'platform.text': '<strong>Mod Assistant is for Windows 10/11 PCs (64-bit).</strong> Copy the download link and open it on your PC.',
    'platform.copy': 'Copy link',

    'stats.label': 'Mod Assistant in numbers',
    'stats.modsNum': '1,300+',
    'stats.mods': 'community mods',
    'stats.heroes': 'heroes in the Arsenal',
    'stats.arcanas': 'wearable arcanas',
    'stats.immortals': 'immortals',
    'stats.loadingNum': '2,000+',
    'stats.loading': 'loading screens',
    'stats.langs': 'app languages',
    'stats.gpl': 'open source',

    'cat.kicker': 'Catalog',
    'cat.title': 'Over 1,300 community mods, one click away',
    'cat.lead': 'Heroes, effects, terrains, HUDs, announcers, music and much more. Every mod comes with its preview and its author\'s name.',
    'cat.list': '<li>Install, switch on or remove any mod in one click</li><li>Detects conflicts by file content and lets you pick the load order</li><li>Combine several mods into a single pack</li><li>Presets you share as a link or a file</li><li>Import your own .vpk and .zip files</li><li>Works offline with whatever you already downloaded</li>',
    'cat.cats': 'Catalog categories',
    'cat.chips': '<li>Heroes</li><li>Hero items</li><li>Effects</li><li>Terrains</li><li>Trees</li><li>River</li><li>Creeps</li><li>Towers</li><li>Roshan</li><li>Wards</li><li>Couriers</li><li>HUD</li><li>Emblems</li><li>Versus screens</li><li>Item icons</li><li>Cursors</li><li>Fonts</li><li>Announcers</li><li>Mega-kill</li><li>Music</li><li>Sounds</li><li>Packs</li><li>Optimization</li>',
    'cat.credit': 'Mods are the work of their authors, credited on every catalog card.',

    'free.kicker': 'Free',
    'free.title': 'Free cosmetics, pulled from your own game',
    'free.lead': 'Turn safe mode off and the app reads your Dota item table: put any loading screen, courier, ward, weather or terrain from the game in place of the default one. Only you see them.',
    'free.s1': '<strong>2,000+</strong><span>loading screens</span>',
    'free.s2': '<strong>200+</strong><span>couriers</span>',
    'free.s3': '<strong>80+</strong><span>wards</span>',
    'free.alsoTitle': 'And also',
    'free.chips': '<li>Weather</li><li>Terrains</li><li>HUD</li><li>Versus screens</li><li>Radiant and Dire creeps</li><li>Siege creeps</li><li>Towers</li><li>Music</li><li>Announcers</li><li>Mega-kill announcers</li><li>Kill-streak effects</li><li>Cursors</li><li>Roshan</li>',
    'free.noteTitle': 'What safe mode does',
    'free.note': 'Turning it off writes two Dota files: a line with the mods folder, and the signature the game checks for that file. The app backs up the originals before the first edit: turn it back on and both return byte for byte.',

    'ars.title': 'Every arcana and immortal, for every hero',
    'ars.lead': 'Equip the looks the game already ships with on your heroes, without owning them: slot by slot, with styles, variants and full sets.',
    'ars.list': '<li><strong>25 arcanas</strong> you can wear, persona selectors included</li><li><strong>500+ immortals</strong>, plus legendary, mythical, rare and more</li><li>For each of the <strong>125 heroes</strong>, with its own items, slot by slot, with <strong>styles</strong>, <strong>variants</strong> (Golden, Crimson…) and <strong>full sets</strong></li><li><strong>Exclusives</strong> filter: what the store never sold (treasures, battle passes, events)</li><li>Read from your installed game: new items show up without an app update</li>',
    'ars.cta': 'Explore Arsenal VIP',
    'ars.cta2': 'See pricing',
    'ars.fine': 'Browse everything for free; equipping needs Premium ($5.00 USD/month) and safe mode off. Only you see them.',
    'ars.rarities': 'What is in the Arsenal',
    'ars.rarityList': '<li class="r-arcana"><span class="r-name">Arcanas</span><span class="r-count">25</span></li><li class="r-immortal"><span class="r-name">Immortals</span><span class="r-count">500+</span></li><li class="r-legendary"><span class="r-name">Legendary</span><span class="r-count r-soft">included</span></li><li class="r-mythical"><span class="r-name">Mythical</span><span class="r-count r-soft">included</span></li><li class="r-rare"><span class="r-name">Rare and more</span><span class="r-count r-soft">included</span></li>',
    'ars.exTitle': 'Exclusives: never in the store',
    'ars.exNote': 'Items from treasures, battle passes and events that the store never sold.',
    'ars.variants': 'Variants',

    'demo.kicker': 'Medal and badges · free',
    'demo.title': 'Your medal and hero badges, on your screen only',
    'demo.lead': 'Pick a medal (up to Immortal and Top), stars and hero badge level. It is a local visual change: your rank, your MMR and your matches stay the same.',
    'demo.tabsLabel': 'What to customize',
    'demo.tabMedal': 'Rank medal',
    'demo.tabBadge': 'Hero badge',
    'demo.pickMedal': 'Medal',
    'demo.stars': 'Stars',
    'demo.starsHint': 'Stars are built into the medal. If your real rank is Herald to Divine, the game also draws your real stars.',
    'demo.topLabel': 'Leaderboard place',
    'demo.pickTier': 'Badge level',
    'demo.level': 'Hero level',
    'demo.you': 'Your profile',
    'demo.onlyYou': 'Visible on your screen only',
    'demo.tierSub': 'Hero badge in the picker and on your profile',
    'demo.foot': 'Other players see your real medal. Your rank and MMR do not change.',
    'demo.cta': 'Download and customize my medal',
    'demo.fine': 'Approximate preview. Included free on every plan.',

    'safe.kicker': 'Safety',
    'safe.title': 'How it works and what the risk is',
    'safe.lead': 'Mod Assistant uses files Dota already knows how to read. Here is what it does and what it does not.',
    'safe.list': '<li>Only changes files the game loads on your PC; it never touches game memory or what other players see</li><li>Every write to the game folder is a transaction: if a step fails, everything rolls back</li><li>Writes nothing while Dota is running</li><li>Backs up the originals before the first edit</li><li>Collects no data: no telemetry, analytics or ads</li>',
    'safe.riskTitle': 'Use it at your own risk',
    'safe.risk1': 'Dota modders consider editing game files unsafe. In more than 8 years we know of no ban for it, but we make no guarantees: Valve can change its rules at any time.',
    'safe.risk2': 'With safe mode on, the app only puts its .vpk files in a folder Dota already reads and leaves the game\'s own files untouched.',

    'price.kicker': 'Pricing',
    'price.title': 'Free forever. Premium if you want more.',
    'price.lead': 'The Free plan never expires and has no ads. Premium removes the 100-mod limit and unlocks Arsenal VIP.',
    'price.forever': 'forever',
    'price.f1': 'Up to <strong>100 mods</strong> installed',
    'price.f2': 'The whole community catalog',
    'price.f3': 'Free cosmetics from the game itself',
    'price.f4': 'Rank medal and hero badges',
    'price.f5': 'Presets, packs and .vpk/.zip import',
    'price.f6': 'Automatic updates',
    'price.f7': '<span class="sr-only">Not included: </span>Equipping in Arsenal VIP (browsing is free)',
    'price.freeCta': 'Download free',
    'price.month': 'USD / month',
    'price.v1': '<strong>No 100-mod limit</strong>',
    'price.v2': '<strong>Arsenal VIP</strong>: every hero\'s arcanas, immortals and exclusives',
    'price.v3': 'Styles, variants and full sets',
    'price.v4': 'Everything in Free',
    'price.vipCta': 'Download and get Premium',
    'price.vipNote': 'Premium is activated inside the app, with the Premium button in the top bar.',
    'price.fine': 'On every plan the game loads at most 95 pak files per language folder; combined packs group several mods into one. Each Premium payment covers 30 days and does not renew by itself. <a href="#terminos">Premium terms</a>.',

    'inst.kicker': 'How to install',
    'inst.title': 'Ready in three steps',
    'inst.s1t': 'Download',
    'inst.s1': 'Pick the installer or the portable version. The links always point to the latest release.',
    'inst.s2t': 'If Windows warns you',
    'inst.s2': 'If you see "Windows protected your PC", click <strong>More info</strong> and then <strong>Run anyway</strong>. It appears because the installer is not code-signed yet; the source code of every version is on the <a href="https://github.com/Dreftian/Dota2-Mods-Releases/releases/latest">releases page</a>.',
    'inst.s3t': 'Open and pick',
    'inst.s3': 'Open the app with Dota 2 closed. The first time it asks for a language and a local account, which stays on your PC. Then install whatever you like.',

    'faq.kicker': 'FAQ',
    'faq.title': 'Worth knowing before you install',
    'faq.q1': 'Can I get banned?',
    'faq.a1': 'Nobody can promise you will not. Mod Assistant only changes files the game loads on your PC: it injects no code and touches neither game memory nor what others see. Dota modders consider editing game files unsafe; in more than 8 years we know of no ban for it, but Valve can change its rules. Use it at your own risk.',
    'faq.q2': 'Do other players see my mods?',
    'faq.a2': 'No. Everything only changes what your own game draws. Your allies and enemies see their own, unchanged files.',
    'faq.q3': 'Does it change my rank or MMR?',
    'faq.a3': 'No. The medal and badges are only a picture on your screen. Your rank, MMR and matchmaking stay exactly the same.',
    'faq.q4': 'What happens when Dota updates?',
    'faq.a4': 'Every Dota update removes the line that registers the mods folder. While safe mode is off, the app writes it back by itself. The app also updates itself.',
    'faq.q5': 'How do I go back to the original game?',
    'faq.a5': 'Turn safe mode on and the game files return byte for byte to their original state. To play without mods without uninstalling anything, turn off the master mods switch in the bottom bar.',
    'faq.q6': 'Why 100 mods? And what is the 95 limit?',
    'faq.a6': 'The Free plan allows up to 100 mods; Premium removes that limit. Separately, the game itself loads at most 95 pak files per language folder, on every plan. Combined packs put several mods into one file so they do not use up slots.',
    'faq.q7': 'What does Premium include?',
    'faq.a7': 'It removes the 100-mod limit and lets you equip in Arsenal VIP: arcanas, immortals and exclusives, with styles, variants and full sets, for every hero. It costs $5.00 USD a month and is activated inside the app. Everything else is free.',
    'faq.q8': 'Installer or portable?',
    'faq.a8': 'The installer creates shortcuts and updates itself. The portable version is a single .exe that installs nothing: when a new version comes out, it downloads it next to the current .exe and tells you.',
    'faq.q9': 'Windows says "Windows protected your PC". What do I do?',
    'faq.a9': 'Click <strong>More info</strong> and then <strong>Run anyway</strong>. SmartScreen shows that warning for programs that are not yet signed with a code-signing certificate. If you would rather check first, the source code of every version is on the <a href="https://github.com/Dreftian/Dota2-Mods-Releases/releases/latest">releases page</a>.',
    'faq.q10': 'Does it work on Mac or Linux?',
    'faq.a10': 'No. For now Mod Assistant is for 64-bit Windows 10 and Windows 11 only, with Dota 2 installed through Steam.',
    'faq.q11': 'Which languages is the app in?',
    'faq.a11': 'Spanish, English and Russian, with partial Japanese and Chinese.',
    'faq.q12': 'Is it open source?',
    'faq.a12': 'Yes. Mod Assistant is free software under GPL-3.0-or-later, a modified version of <a href="https://github.com/TheFleece/dota2-mod-manager">Dota 2 Mod Manager</a> by TheFleece. The source code of every version is published with it on the <a href="https://github.com/Dreftian/Dota2-Mods-Releases/releases/latest">releases page</a>.',
    'faq.q13': 'What data does it collect?',
    'faq.a13': 'None. It has no telemetry, analytics or ads. The account it asks for on first launch stays on your PC, and the app only goes online to download public content, such as the catalog, the mods, their pictures and updates. <a href="#privacidad">More details</a>.',

    'dl.title': 'Download Mod Assistant for free',
    'dl.lead': 'Mods, free cosmetics and your medal in one program. Premium whenever you want, from inside the app.',
    'dl.req': 'Windows 10/11 64-bit · Dota 2 installed through Steam',
    'dl.smartscreen': 'SmartScreen warning? Click <strong>More info</strong> → <strong>Run anyway</strong>. <a href="#instalar">Why it appears</a>.',

    'legal.title': 'Privacy and terms',
    'legal.privTitle': 'Privacy',
    'legal.privList': '<li>The app collects no data: no telemetry, analytics, ads or trackers.</li><li>The account it asks for on first launch (email and password) is stored on your PC only; the password as a hash, never in plain text. It is not sent to any server.</li><li>It only goes online to download public content, such as the catalog, the mods, their pictures, game icons and updates.</li><li>If Discord is open, the app shows in your Discord status that you are using it. You can turn this off in Settings.</li><li>This site uses no cookies or analytics; it only remembers in your browser the language you pick. It loads fonts from Google Fonts and asks GitHub\'s public API for the latest version.</li>',
    'legal.termsTitle': 'Premium terms',
    'legal.termsList': '<li>Price: $5.00 USD for 30 days, paid inside the app.</li><li>No recurring charge: each payment covers 30 days and does not renew by itself, so there is nothing to cancel.</li><li>Premium is tied to the Mod Assistant account on your PC.</li><li>It removes the 100-mod limit and lets you equip in Arsenal VIP. It does not change the game\'s 95 pak file limit.</li><li>Everything else (catalog, free cosmetics, medal and badges, presets and updates) is free on every plan.</li>',

    'foot.tagline': 'Mod and cosmetics manager for Dota 2, made by Dreftian Devs for the community.',
    'foot.navLabel': 'Footer',
    'foot.product': 'Product',
    'foot.catalog': 'Catalog',
    'foot.free': 'Free cosmetics',
    'foot.medal': 'Medal and badges',
    'foot.downloads': 'Downloads',
    'foot.installer': 'Windows installer',
    'foot.portable': 'Portable version',
    'foot.project': 'Project',
    'foot.source': 'Source code',
    'foot.license': 'GPL-3.0 license',
    'foot.upstream': 'Original project',
    'foot.gpl': 'Mod Assistant is free software under the <a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0-or-later</a> license. It is a version of <a href="https://github.com/TheFleece/dota2-mod-manager">Dota 2 Mod Manager</a> (Copyright © 2026 TheFleece) modified by Dreftian Devs since 20 September 2026. The source code of every version is on the <a href="https://github.com/Dreftian/Dota2-Mods-Releases/releases/latest">releases page</a>. The mod catalog comes from <a href="https://github.com/h6rd/Dota2PornFxWeb">h6rd</a> and the authors credited on each mod.',
    'foot.privacy': 'Collects no data: no telemetry, analytics or ads.',
    'foot.valve': 'Not affiliated with or endorsed by Valve Corporation. Dota 2 and Dota Plus are trademarks of Valve Corporation; the medal and badge images belong to Valve.'
  };

  /* Strings built by the script itself, in both languages. */
  var UI = {
    es: {
      title: 'Mod Assistant — Mods y cosméticos para Dota 2 | Gratis para Windows',
      description: 'Instala más de 1.300 mods de Dota 2 en un clic, activa cosméticos gratis del propio juego y equipa arcanas e inmortales con Arsenal VIP. Solo tú los ves.',
      langButton: 'EN', langButtonLang: 'en', langButtonLabel: 'EN: read this page in English',
      menuOpen: 'Abrir menú', menuClose: 'Cerrar menú',
      latest: 'Última:',
      copied: 'Enlace copiado',
      copyFailed: 'Copia este enlace: ',
      star: 'estrella', stars: 'estrellas',
      immortal: 'Inmortal', place: 'puesto',
      level: 'nivel', levels: 'Niveles', levelOne: 'Nivel',
      topHint: function (name, min, max) { return name + ': del ' + fmt(min) + ' al ' + fmt(max) + ', como en la app.'; },
      locale: 'es-ES'
    },
    en: {
      title: 'Mod Assistant — Mods and Cosmetics for Dota 2 | Free for Windows',
      description: 'Install over 1,300 Dota 2 mods in one click, unlock free in-game cosmetics and equip every hero\'s arcanas and immortals with Arsenal VIP. Only you see them.',
      langButton: 'ES', langButtonLang: 'es', langButtonLabel: 'ES: ver esta página en español',
      menuOpen: 'Open menu', menuClose: 'Close menu',
      latest: 'Latest:',
      copied: 'Link copied',
      copyFailed: 'Copy this link: ',
      star: 'star', stars: 'stars',
      immortal: 'Immortal', place: 'rank',
      level: 'level', levels: 'Levels', levelOne: 'Level',
      topHint: function (name, min, max) { return name + ': from ' + fmt(min) + ' to ' + fmt(max) + ', as in the app.'; },
      locale: 'en-US'
    }
  };

  var lang = 'es';
  var originals = new Map();
  var originalAttrs = new Map();
  var langListeners = [];

  function ui() { return UI[lang]; }
  function fmt(n) { return Number(n).toLocaleString(ui().locale); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function storageGet(store, key) {
    try { return window[store].getItem(key); } catch (e) { return null; }
  }
  function storageSet(store, key, value) {
    try { window[store].setItem(key, value); } catch (e) { /* private mode or blocked storage */ }
  }

  function isBot() {
    return /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|lighthouse/i.test(navigator.userAgent || '');
  }

  /* ---------------------------------------- Language ---------------------------------------- */
  function initialLang() {
    var fromQuery = null;
    try { fromQuery = new URLSearchParams(window.location.search).get('lang'); } catch (e) { /* old browser */ }
    if (fromQuery === 'es' || fromQuery === 'en') return fromQuery;
    var saved = storageGet('localStorage', LANG_KEY);
    if (saved === 'es' || saved === 'en') return saved;
    // Crawlers index the Spanish source text, which is what lang="es" declares.
    if (isBot()) return 'es';
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'es'];
    return prefs.some(function (l) { return /^es\b/i.test(l); }) ? 'es' : 'en';
  }

  function captureOriginals() {
    $all('[data-i18n]').forEach(function (el) { originals.set(el, el.innerHTML); });
    $all('[data-i18n-attr]').forEach(function (el) {
      var saved = {};
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var attr = pair.split(':')[0].trim();
        if (attr) saved[attr] = el.getAttribute(attr);
      });
      originalAttrs.set(el, saved);
    });
  }

  function applyLang(next) {
    lang = next === 'en' ? 'en' : 'es';
    document.documentElement.lang = lang;
    document.title = ui().title;
    var desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', ui().description);

    originals.forEach(function (html, el) {
      var key = el.getAttribute('data-i18n');
      el.innerHTML = lang === 'en' && Object.prototype.hasOwnProperty.call(EN, key) ? EN[key] : html;
    });
    originalAttrs.forEach(function (saved, el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var parts = pair.split(':');
        var attr = (parts[0] || '').trim();
        var key = (parts[1] || '').trim();
        if (!attr) return;
        var value = lang === 'en' && Object.prototype.hasOwnProperty.call(EN, key) ? EN[key] : saved[attr];
        if (value != null) el.setAttribute(attr, value);
      });
    });

    var toggle = $('[data-lang-toggle]');
    if (toggle) {
      toggle.textContent = ui().langButton;
      toggle.setAttribute('lang', ui().langButtonLang);
      toggle.setAttribute('aria-label', ui().langButtonLabel);
    }
    langListeners.forEach(function (fn) { fn(); });
  }

  function initLang() {
    captureOriginals();
    var first = initialLang();
    if (first !== 'es') applyLang(first);
    else langListeners.forEach(function (fn) { fn(); });
    var toggle = $('[data-lang-toggle]');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var next = lang === 'es' ? 'en' : 'es';
        storageSet('localStorage', LANG_KEY, next);
        applyLang(next);
      });
    }
  }

  /* ---------------------------------------- Mobile menu ---------------------------------------- */
  function initMenu() {
    var header = $('[data-header]');
    var button = $('[data-menu-toggle]');
    var nav = $('#site-nav');
    if (!header || !button || !nav) return;

    function setOpen(open, returnFocus) {
      header.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? ui().menuClose : ui().menuOpen);
      if (!open && returnFocus) button.focus();
    }
    langListeners.push(function () { setOpen(header.classList.contains('is-open'), false); });

    button.addEventListener('click', function () { setOpen(!header.classList.contains('is-open'), false); });
    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setOpen(false, false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) setOpen(false, true);
    });
    document.addEventListener('click', function (e) {
      if (header.classList.contains('is-open') && !header.contains(e.target)) setOpen(false, false);
    });
    var wide = window.matchMedia('(min-width: 961px)');
    var onWide = function () { if (wide.matches) setOpen(false, false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* ---------------------------------------- Latest release ---------------------------------------- */
  var release = null;

  function renderRelease() {
    if (!release) return;
    var text = ui().latest + ' ' + release.tag;
    if (release.date) {
      var d = new Date(release.date);
      if (!isNaN(d.getTime())) {
        try {
          text += ' (' + new Intl.DateTimeFormat(ui().locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d) + ')';
        } catch (e) { /* no Intl */ }
      }
    }
    $all('[data-release-info]').forEach(function (el) {
      el.textContent = text;
      el.hidden = false;
    });
  }

  function loadRelease() {
    var cached = storageGet('sessionStorage', RELEASE_KEY);
    if (cached) {
      try { release = JSON.parse(cached); } catch (e) { release = null; }
      if (release && typeof release.tag === 'string') { renderRelease(); return; }
    }
    if (!window.fetch) return;
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 6000) : null;
    fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || typeof data.tag_name !== 'string' || !data.tag_name) return;
        release = {
          tag: data.tag_name.slice(0, 40),
          date: typeof data.published_at === 'string' ? data.published_at : null
        };
        storageSet('sessionStorage', RELEASE_KEY, JSON.stringify(release));
        renderRelease();
      })
      .catch(function () { /* offline, rate-limited or no release yet: keep the plain links */ })
      .then(function () { if (timer) clearTimeout(timer); });
  }

  /* ---------------------------------------- Platform note ---------------------------------------- */
  function isWindows() {
    var data = navigator.userAgentData;
    if (data && typeof data.platform === 'string' && data.platform) return /windows/i.test(data.platform);
    return /Windows NT/i.test(navigator.userAgent || '');
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(area);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  function initPlatformNote() {
    if (isWindows() || isBot()) return;
    var installer = $('a[data-download="installer"]');
    var url = installer ? installer.href : '';
    $all('[data-platform-note]').forEach(function (note) {
      note.hidden = false;
      var button = $('[data-copy-link]', note);
      var status = $('[data-copy-status]', note);
      if (!button || !url) return;
      button.addEventListener('click', function () {
        copyText(url).then(function () {
          if (status) status.textContent = ui().copied;
        }, function () {
          if (status) status.textContent = ui().copyFailed + url;
        });
      });
    });
  }

  /* ---------------------------------------- Medal and badge demo ---------------------------------------- */
  // Same medals, names and Top ranges as the app (renderer/ui/rank-rules.js): Top 10 is 1-10,
  // Top 100 is 11-100 and Top 1000 is 101-6000. Plain Immortal has an empty plate.
  var MEDALS = [
    { id: 'rank0', es: 'Sin calibrar', en: 'Uncalibrated' },
    { id: 'rank1', es: 'Heraldo', en: 'Herald', stars: true },
    { id: 'rank2', es: 'Guardián', en: 'Guardian', stars: true },
    { id: 'rank3', es: 'Cruzado', en: 'Crusader', stars: true },
    { id: 'rank4', es: 'Arconte', en: 'Archon', stars: true },
    { id: 'rank5', es: 'Leyenda', en: 'Legend', stars: true },
    { id: 'rank6', es: 'Ancestral', en: 'Ancient', stars: true },
    { id: 'rank7', es: 'Divino', en: 'Divine', stars: true },
    { id: 'rank8', es: 'Inmortal', en: 'Immortal' },
    { id: 'rank8a', es: 'Top 1000', en: 'Top 1000', top: [101, 6000] },
    { id: 'rank8b', es: 'Top 100', en: 'Top 100', top: [11, 100] },
    { id: 'rank8c', es: 'Top 10', en: 'Top 10', top: [1, 10] }
  ];

  var TIERS = [
    { id: 0, es: 'Bronce', en: 'Bronze', min: 1, max: 5 },
    { id: 1, es: 'Plata', en: 'Silver', min: 6, max: 11 },
    { id: 2, es: 'Oro', en: 'Gold', min: 12, max: 17 },
    { id: 3, es: 'Platino', en: 'Platinum', min: 18, max: 24 },
    { id: 4, es: 'Maestro', en: 'Master', min: 25, max: 29 },
    { id: 5, es: 'Gran Maestro', en: 'Grandmaster', min: 30, max: 30 }
  ];

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function initDemo() {
    var root = $('[data-demo]');
    if (!root) return;

    var state = {
      medal: 'rank8b',
      stars: 5,
      place: { rank8a: 350, rank8b: 42, rank8c: 1 },
      level: 30
    };

    var medalGrid = $('[data-medal-grid]', root);
    var tierGrid = $('[data-tier-grid]', root);
    var starRow = $('[data-star-row]', root);
    var starsField = $('[data-stars-field]', root);
    var topField = $('[data-top-field]', root);
    var topInput = $('[data-top-input]', root);
    var topHint = $('[data-top-hint]', root);
    var levelInput = $('[data-level-input]', root);
    var levelOut = $('[data-level-out]', root);

    var pMedal = $('[data-preview-medal]', root);
    var pStars = $('[data-preview-stars]', root);
    var pPlaque = $('[data-preview-plaque]', root);
    var pRank = $('[data-preview-rank]', root);
    var pTier = $('[data-preview-tier]', root);
    var pLevel = $('[data-preview-level]', root);
    var pTierTitle = $('[data-preview-tier-title]', root);

    function medalById(id) {
      for (var i = 0; i < MEDALS.length; i++) if (MEDALS[i].id === id) return MEDALS[i];
      return MEDALS[0];
    }
    function tierForLevel(level) {
      for (var i = 0; i < TIERS.length; i++) if (level >= TIERS[i].min && level <= TIERS[i].max) return TIERS[i];
      return TIERS[TIERS.length - 1];
    }

    // Build the buttons once; their text is rewritten on every language change.
    MEDALS.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn';
      b.setAttribute('data-medal', m.id);
      b.innerHTML = '<img src="assets/ranks/' + m.id + '.webp" width="128" height="128" alt="" loading="lazy"><span data-name></span>';
      b.addEventListener('click', function () { state.medal = m.id; update(); });
      medalGrid.appendChild(b);
    });

    for (var s = 1; s <= 5; s++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'star-btn';
        b.setAttribute('data-star', String(n));
        b.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-star"/></svg><span aria-hidden="true">' + n + '</span>';
        b.addEventListener('click', function () { state.stars = n; update(); });
        starRow.appendChild(b);
      })(s);
    }

    TIERS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip-btn';
      b.setAttribute('data-tier', String(t.id));
      b.innerHTML = '<img src="assets/herotier/tier' + t.id + '.webp" width="128" height="128" alt="" loading="lazy"><span data-name></span><span class="chip-sub" data-sub></span>';
      b.addEventListener('click', function () {
        state.level = t.max;
        levelInput.value = String(t.max);
        update();
      });
      tierGrid.appendChild(b);
    });

    topInput.addEventListener('input', function () {
      var m = medalById(state.medal);
      var n = parseInt(String(topInput.value).replace(/\D/g, ''), 10);
      if (!m.top || isNaN(n)) return;
      state.place[m.id] = clamp(n, m.top[0], m.top[1]);
      update(true);
    });
    topInput.addEventListener('change', function () {
      var m = medalById(state.medal);
      if (m.top) topInput.value = String(state.place[m.id]);
    });

    levelInput.addEventListener('input', function () {
      state.level = clamp(parseInt(levelInput.value, 10) || 1, 1, 30);
      update();
    });

    function update(keepInput) {
      var u = ui();
      var m = medalById(state.medal);
      var name = m[lang];

      $all('[data-medal]', medalGrid).forEach(function (b) {
        var md = medalById(b.getAttribute('data-medal'));
        b.setAttribute('aria-pressed', String(md.id === m.id));
        var label = md.top ? u.immortal + ' ' + md[lang] : md[lang];
        $('[data-name]', b).textContent = md[lang];
        b.setAttribute('aria-label', label);
      });

      starsField.hidden = !m.stars;
      $all('[data-star]', starRow).forEach(function (b) {
        var n = parseInt(b.getAttribute('data-star'), 10);
        b.setAttribute('aria-pressed', String(n === state.stars));
        b.setAttribute('aria-label', n + ' ' + (n === 1 ? u.star : u.stars));
      });

      topField.hidden = !m.top;
      if (m.top) {
        topInput.min = String(m.top[0]);
        topInput.max = String(m.top[1]);
        if (!keepInput) topInput.value = String(state.place[m.id]);
        topHint.textContent = u.topHint(u.immortal + ' ' + name, m.top[0], m.top[1]);
      }

      pMedal.src = 'assets/ranks/' + m.id + '.webp';
      pStars.hidden = !m.stars;
      if (m.stars) pStars.src = 'assets/ranks/stars' + state.stars + '.webp';
      pPlaque.hidden = !m.top;
      if (m.top) pPlaque.textContent = String(state.place[m.id]);

      var rankText = name;
      if (m.stars) rankText = name + ' · ' + state.stars + ' ' + (state.stars === 1 ? u.star : u.stars);
      else if (m.top) rankText = u.immortal + ' ' + name + ' · ' + u.place + ' ' + fmt(state.place[m.id]);
      pRank.textContent = rankText;

      var tier = tierForLevel(state.level);
      $all('[data-tier]', tierGrid).forEach(function (b) {
        var t = TIERS[parseInt(b.getAttribute('data-tier'), 10)];
        b.setAttribute('aria-pressed', String(t.id === tier.id));
        $('[data-name]', b).textContent = t[lang];
        $('[data-sub]', b).textContent = t.min === t.max ? u.levelOne + ' ' + t.min : u.levels + ' ' + t.min + '–' + t.max;
      });
      levelOut.textContent = String(state.level);
      levelInput.setAttribute('aria-valuetext', u.levelOne + ' ' + state.level + ', ' + tier[lang]);
      pTier.src = 'assets/herotier/tier' + tier.id + '.webp';
      pLevel.textContent = String(state.level);
      pTierTitle.textContent = tier[lang] + ' · ' + u.level + ' ' + state.level;
    }

    // Tabs: arrow keys move between them (WAI-ARIA tabs pattern, automatic activation).
    var tabs = $all('[role="tab"]', root);
    function selectTab(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectTab(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); selectTab(next, true); }
      });
    });

    langListeners.push(function () { update(); });
    update();
  }

  /* ---------------------------------------- Start ---------------------------------------- */
  function start() {
    initDemo();
    initMenu();
    initLang();
    initPlatformNote();
    loadRelease();
    langListeners.push(renderRelease);
    // Read by tools and tests only; nothing on the page depends on it.
    window.__maSite = { EN: EN, lang: function () { return lang; } };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
