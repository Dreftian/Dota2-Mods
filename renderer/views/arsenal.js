/* The Arsenal: any look a hero has in the game - arcanas and immortals first - worn on that
 * hero's default item, so it shows without owning the item. VIP only, and seen only by the
 * person who picked it.
 *
 * The screen draws what src/ipc-arsenal.js answers and decides nothing itself: which heroes
 * and slots there are, what is live, whether this user may equip at all. A pick is an ordinary
 * 'cosmetic' library record keyed 'hero:<npc>:<slot>', so My mods, presets and the
 * one-look-per-slot rule already know what to do with it.
 *
 * Two levels in one pane. The hero grid is drawn once per answer and filtered by toggling a
 * class, so typing in its search box redraws nothing. A hero's page is drawn from its own
 * answer and redrawn in place after every change, keeping the scroll: equipping is one card
 * turning green, not a new screen.
 */
import { $ } from '../core/dom.js';
import { state } from '../core/store.js';
import { registerView, pane, invalidateViews } from '../core/router.js';
import { refreshInstalledIndex } from '../core/installed.js';
import {
  RARITY_FILTERS, rarityLabel, rarityClass, rarityFilter, keeps, isExclusive, slotLabel, slotIcon, styleLabel,
  normStyle, countOf, picksActive, wornCount, livePick, familyRarities, isLiveOption, lookOf, initialChoice,
  sameChoice, liveName, heroMatches, heroTitle, sortSets, setIsLive,
} from '../core/arsenal-data.js';
import { esc } from '../ui/format.js';
import { toast } from '../ui/toast.js';
import { paint } from '../ui/transitions.js';
import { fallbackThumbHtml } from '../ui/thumb.js';
import { loadCosmeticIcons, paintCosmeticIcons, watchCosmeticIcons, cosmeticIcon, cosmeticIconKnown } from '../ui/cosmetic-icons.js';
import { showCheckoutModal } from '../ui/checkout-modal.js';
import { setSafeMode } from '../ui/safe-mode.js';

const viewRoot = pane('arsenal');

registerView('arsenal', () => renderArsenal());

let list = null;          // the last arsenal:heroes answer
let names = new Map();    // npc id -> the name the grid shows, for "shared with" lines
let listStale = false;    // something moved what the grid shows since that answer came
let openHero = null;      // npc id of the hero on show; null while the grid is
let hero = null;          // the last arsenal:hero answer for that hero
let query = '';
let arcanaOnly = false;
let rarityKey = 'top';
let gridScroll = 0;       // where the grid was left, for the way back to it
let drawnFor = null;      // which page the pane last drew with data: '' the grid, else a hero
let seq = 0;              // the newest draw; one that lands after a newer one paints nothing
let io = null;            // the picture loader watching whatever is drawn now
const busy = new Map();   // action key -> 'pick' | 'clear' | 'set', while the backend works
let item = null;          // { slot, optId, choice } while the Arsenal's item window is open
let mediaShows = null;    // which picture that window shows, so a redraw does not replay it
let closingTimer = null;

// ---------- plumbing ----------

// A channel that throws is answered like one that refused: with something to show the user.
async function ask(call) {
  try {
    return (await call()) || { error: L`Приложение не ответило — попробуй ещё раз` };
  } catch (err) {
    return { error: String(err?.message || err) };
  }
}

// A draw that lands after the user moved to another screen writes straight into the hidden
// pane: going through paint() would spend the transition armed for the screen they went to.
function put(html) {
  const write = () => { viewRoot.innerHTML = html; };
  if (state.view !== 'arsenal') { write(); return Promise.resolve(); }
  return paint(write);
}

// Listeners go on the markup just drawn, never on the pane: the pane outlives every draw and
// would collect one more handler each time.
function bind() {
  const root = viewRoot.querySelector('.ars');
  if (!root) return;
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  root.querySelector('#arsSearch')?.addEventListener('input', (e) => { query = e.target.value; filterGrid(); });
  if (io) io.disconnect();
  paintCosmeticIcons(root);
  io = watchCosmeticIcons(root, null);
}

function equipBlock(r) {
  if (r?.vip === false) return L`Арсенал доступен только VIP`;
  if (r?.schemaPatch === false) return L`Сначала выключи безопасный режим: без него игра не читает косметику`;
  return '';
}

// Slot ids such as 'weapon' are every hero's, so a pick in flight on one must not lock another's.
const slotKey = (npc, slot) => `slot|${npc}|${slot}`;

const slotOf = (id) => (hero?.slots || []).find((s) => s.slot === id) || null;
const optionOf = (s, id) => (s.options || []).find((o) => String(o.id) === String(id)) || null;
const sharedWith = (s) => (s.shared || []).filter((npc) => npc !== openHero).map((npc) => heroTitle(npc, names));

// ---------- drawing ----------

async function renderArsenal() {
  const mine = ++seq;
  if (!viewRoot.childElementCount) {
    drawnFor = null;
    await put(frameHtml(loadingHtml()));
    bind();
  }
  if (openHero) {
    // redrawn from outside (a login, safe mode, the language): the grid's copy is old too
    listStale = true;
    await drawHero(mine);
  } else {
    await drawGrid(mine);
  }
}

async function drawGrid(mine) {
  const r = await ask(() => window.api.arsenal.heroes());
  if (mine !== seq || openHero) return;
  list = r;
  listStale = false;
  names = new Map((r.heroes || []).map((h) => [h.hero, h.name]));
  const calm = drawnFor === '';
  await put(frameHtml(gridHtml(r), r, calm));
  drawnFor = '';
  bind();
  filterGrid();
}

async function drawHero(mine) {
  const npc = openHero;
  const r = await ask(() => window.api.arsenal.hero(npc));
  if (mine !== seq || openHero !== npc) return;
  hero = r;
  const main = $('#main');
  const top = main.scrollTop;
  const calm = drawnFor === npc;
  await put(frameHtml(heroPageHtml(r), r, calm));
  drawnFor = npc;
  main.scrollTop = top;
  bind();
  filterItems();
  drawItem();
}

async function openHeroPage(npc) {
  gridScroll = $('#main').scrollTop;
  openHero = npc;
  hero = null;
  // a hero with neither kind would open on an empty page and a note saying so
  const h = (list?.heroes || []).find((x) => x.hero === npc);
  rarityKey = h && !(Number(h.counts?.arcana) || Number(h.counts?.immortal)) ? 'all' : 'top';
  const mine = ++seq;
  drawnFor = null;
  await put(frameHtml(heroHeadHtml(npc) + loadingHtml(), list));
  bind();
  $('#main').scrollTop = 0;
  await drawHero(mine);
}

async function backToGrid() {
  const mine = ++seq;
  openHero = null;
  hero = null;
  if (list && !listStale) {
    await put(frameHtml(gridHtml(list), list));
    drawnFor = '';
    bind();
    filterGrid();
  } else {
    // the hero page must not stay pressable while the list comes: its set buttons would go out
    // with no hero, and the backend would answer that hero '' is not in the game
    drawnFor = null;
    await put(frameHtml(loadingHtml(), list));
    bind();
    await drawGrid(mine);
  }
  // a newer draw, another screen or another hero owns the scroll by now
  if (mine === seq && state.view === 'arsenal' && !openHero) $('#main').scrollTop = gridScroll;
}

// `calm` is a redraw of the page already on show: the cards must not fly in again for a pick.
function frameHtml(body, r, calm = false) {
  return `
    <div class="ars ${calm ? 'calm' : ''}">
      <div class="view-header">
        <h1 class="view-title"><span class="ms ars-gem" aria-hidden="true">diamond</span>${L`Арсенал VIP: бессмертные и арканы`}</h1>
      </div>
      <p class="ars-lead">${L`Облики берутся из установленной игры и видны только тебе.`}</p>
      ${r ? bannersHtml(r) : ''}
      ${body}
    </div>`;
}

function bannersHtml(r) {
  let out = '';
  if (r.vip === false) {
    out += `
      <div class="banner info ars-banner">
        <span class="ms">lock</span>
        <div class="banner-body"><b>${L`Арсенал доступен только VIP`}</b> ${L`Смотреть можно всё, а надевать облики — с Premium.`}</div>
        <button class="btn btn-sm btn-primary" id="arsVipBtn"><span class="ms">auto_awesome</span>${L`Перейти на Premium`}</button>
      </div>`;
  }
  if (r.schemaPatch === false) {
    out += `
      <div class="banner warn ars-banner">
        <span class="ms">shield</span>
        <div class="banner-body"><b>${L`Включён безопасный режим.`}</b> ${L`Пока он включён, игра не читает косметику, и надетое здесь в игре не появится.`}</div>
        <button class="btn btn-sm" id="arsSafeBtn"><span class="ms">shield_moon</span>${L`Выключить безопасный режим`}</button>
      </div>`;
  }
  return out;
}

const loadingHtml = () => `<div class="empty-note">${L`Читаем схему игры…`}</div>`;

const errorHtml = (msg) => `
  <div class="empty-note ars-error">
    <span class="ms">error</span>
    <div>${esc(msg)}</div>
    <button class="btn btn-sm" id="arsRetry"><span class="ms">refresh</span>${L`Повторить`}</button>
  </div>`;

const errorBannerHtml = (msg) => `<div class="banner off"><span class="ms">error</span><div class="banner-body">${esc(msg)}</div></div>`;

const rarityChipHtml = (rarity) => `<span class="ars-rar ${rarityClass(rarity)}">${esc(rarityLabel(rarity))}</span>`;

const exclChipHtml = (o) => (isExclusive(o)
  ? `<span class="ars-excl" title="${esc(L`Не продаётся в магазине: сокровищницы, боевые пропуски и события`)}"><span class="ms">lock_clock</span>${L`Эксклюзив`}</span>`
  : '');
const countChipHtml = (rarity, n) => (Number(n) > 0
  ? `<span class="ars-rar ${rarityClass(rarity)}">${esc(rarityLabel(rarity))} <b>${Number(n)}</b></span>`
  : '');

// Same tile the cosmetics grid draws: the loader fills every .card-thumb[data-name] it sees.
function itemThumbHtml(name, icon) {
  const src = cosmeticIcon(name);
  return `<span class="card-thumb" data-name="${esc(name)}">${src
    ? `<img src="${esc(src)}" alt="" loading="lazy">`
    : `<div class="noimg"><span class="ms">${icon}</span></div>`}</span>`;
}

// ---------- the hero grid ----------

function gridHtml(r) {
  const heroes = r.heroes || [];
  if (!heroes.length) return errorHtml(r.error || L`Схема игры не прочиталась — проверь путь к Dota 2 в настройках.`);
  return `
    <div class="toolbar"><div class="tb-line">
      <div class="tb-search cat-search"><span class="ms">search</span><input type="text" id="arsSearch" placeholder="${esc(L`Найти героя…`)}" value="${esc(query)}" autocomplete="off" spellcheck="false"></div>
      <div class="sep"></div>
      <button class="fchip ${arcanaOnly ? 'active' : ''}" data-only="arcana"><span class="ms">diamond</span>${L`Только с арканой`}</button>
      <button class="fchip ${arcanaOnly ? '' : 'active'}" data-only="all"><span class="ms">groups</span>${L`Все герои`}</button>
      <span class="count" id="arsCount"></span>
    </div></div>
    ${r.error ? errorBannerHtml(r.error) : ''}
    <div class="grid ars-heroes">
      ${heroes.map((h, i) => heroCardHtml(h, i, picksActive(r))).join('')}
      <div class="empty-note hidden" id="arsNone">${L`Ничего не найдено — сбрось фильтры`}</div>
    </div>`;
}

function heroCardHtml(h, i, active) {
  const live = wornCount(h, active);
  const c = h.counts || {};
  return `
    <div class="card ars-hero ${live ? 'installed' : ''}" data-hero="${esc(h.hero)}" role="button" tabindex="0" style="--i:${Math.min(i, 28)}">
      <div class="card-media">
        ${fallbackThumbHtml(`hero:${h.name}`, 'person', 'card-thumb')}
        ${live ? `<span class="ars-live" title="${esc(L`Надето: ${live}`)}"><span class="ms">check</span>${live}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-name">${esc(h.name)}</div>
        <div class="card-meta">${countChipHtml('arcana', c.arcana)}${countChipHtml('immortal', c.immortal)}</div>
      </div>
    </div>`;
}

function filterGrid() {
  const cards = viewRoot.querySelectorAll('.ars-hero');
  if (!cards.length) return;
  const byNpc = new Map((list?.heroes || []).map((h) => [h.hero, h]));
  let shown = 0;
  for (const card of cards) {
    const ok = heroMatches(byNpc.get(card.dataset.hero), query, arcanaOnly);
    card.classList.toggle('hidden', !ok);
    if (ok) shown++;
  }
  viewRoot.querySelector('#arsNone')?.classList.toggle('hidden', shown > 0);
  // a number only once the grid in front of you is a subset, as the catalog does
  const count = viewRoot.querySelector('#arsCount');
  if (count) count.textContent = query.trim() || arcanaOnly ? `${shown} / ${cards.length}` : '';
}

// ---------- a hero's page ----------

function heroHeadHtml(npc, name) {
  const title = name || heroTitle(npc, names);
  return `
    <div class="ars-hero-head">
      <button class="btn btn-sm btn-ghost" id="arsBack"><span class="ms">arrow_back</span>${L`Все герои`}</button>
      <div class="ars-hero-pic">${fallbackThumbHtml(`hero:${title}`, 'person', 'card-thumb')}</div>
      <h2 class="ars-hero-name">${esc(title)}</h2>
    </div>`;
}

function heroPageHtml(r) {
  const head = heroHeadHtml(openHero, r.name);
  const slots = r.slots || [];
  if (!slots.length) return head + errorHtml(r.error || L`В схеме игры у этого героя нет предметов, которые можно надеть.`);
  const sets = sortSets(r.sets);
  return `${head}
    <div class="toolbar"><div class="tb-line">
      ${RARITY_FILTERS.map((f) => `<button class="fchip ${f.key === rarityKey ? 'active' : ''}" data-rarity="${f.key}">${esc(tr(f.label))}</button>`).join('')}
    </div></div>
    ${r.error ? errorBannerHtml(r.error) : ''}
    ${sets.length ? `
      <section class="ars-section">
        <h3 class="section-h"><span class="ms">inventory_2</span>${L`Комплекты`}</h3>
        <div class="ars-set-row">${sets.map((set) => setCardHtml(set, slots, r)).join('')}</div>
      </section>` : ''}
    ${slots.map((s) => slotHtml(s, picksActive(r))).join('')}
    <div class="empty-note hidden" id="arsEmpty">${L`Таких предметов у героя нет — выбери «Все».`}</div>`;
}

function setButtonHtml(id) {
  const working = busy.has(`set|${id}`);
  return `<span class="ms">checkroom</span>${working ? L`Надеваю…` : L`Надеть комплект`}`;
}

function setCardHtml(set, slots, r) {
  const why = equipBlock(r);
  const on = picksActive(r) && setIsLive(set, slots);
  const working = busy.has(`set|${set.id}`);
  return `
    <div class="card ars-set ${on ? 'installed' : ''}" data-rars="${esc(set.rarity || 'common')}" data-excl="${isExclusive(set) ? 1 : 0}">
      <div class="card-media">${itemThumbHtml(set.name, 'inventory_2')}</div>
      <div class="card-body">
        <div class="card-name">${esc(set.name)}</div>
        <div class="card-meta">${rarityChipHtml(set.rarity)}${exclChipHtml(set)}</div>
        <div class="ars-set-members">${(set.members || []).map((m) => esc(m.name)).join(' · ')}</div>
        <button class="btn btn-sm ${on ? '' : 'btn-primary'}" data-equip-set="${esc(set.id)}" ${why || working ? 'disabled' : ''} ${why ? `title="${esc(why)}"` : ''}>${setButtonHtml(set.id)}</button>
      </div>
    </div>`;
}

// A pick the game is not wearing lights no card: it is still there to take off, in the window.
function slotHtml(s, active) {
  const live = active ? livePick(s) : null;
  const others = sharedWith(s);
  return `
    <section class="ars-section" data-slot="${esc(s.slot)}">
      <h3 class="section-h"><span class="ms">${slotIcon(s.slot)}</span>${esc(slotLabel(s.slot))}</h3>
      ${s.persona ? `<div class="ars-note"><span class="ms">theater_comedy</span>${L`Этот вид виден, только пока у героя выбрана персона.`}</div>` : ''}
      ${others.length ? `<div class="ars-note warn"><span class="ms">group</span>${esc(L`Предмет этого слота у героев общий: вид сменится и у ${others.join(', ')}.`)}</div>` : ''}
      <div class="grid ars-items">${(s.options || []).map((o, i) => optionCardHtml(s, o, live, i)).join('')}</div>
    </section>`;
}

function optionCardHtml(s, o, live, i) {
  const on = isLiveOption(o, live);
  // a variant on the hero is named under its family's head, which is what the card shows
  const worn = on && live.itemId !== String(o.id) ? lookOf(o, live.itemId).name : '';
  const looks = (o.variants || []).length;
  const styles = (o.styles || []).length;
  return `
    <div class="card ars-item ${on ? 'installed' : ''}" data-slot="${esc(s.slot)}" data-opt="${esc(o.id)}" data-rars="${esc(familyRarities(o).join(' ') || 'common')}" data-excl="${isExclusive(o) ? 1 : 0}" role="button" tabindex="0" style="--i:${Math.min(i, 28)}">
      <div class="card-media">
        ${itemThumbHtml(o.name, slotIcon(s.slot))}
        ${looks ? `<span class="ars-looks" title="${esc(L`Вариантов: ${looks + 1}`)}"><span class="ms">layers</span>${looks + 1}</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-name">${esc(o.name)}</div>
        ${worn ? `<div class="ars-worn">${esc(worn)}</div>` : ''}
        <div class="card-meta">${rarityChipHtml(o.rarity)}${exclChipHtml(o)}${styles > 1 ? `<span class="ars-styles" title="${esc(L`Стилей: ${styles}`)}"><span class="ms">palette</span>${styles}</span>` : ''}</div>
      </div>
    </div>`;
}

function filterItems() {
  const f = rarityFilter(rarityKey);
  let any = false;
  for (const sec of viewRoot.querySelectorAll('.ars-section')) {
    let shown = 0;
    for (const card of sec.querySelectorAll('.card[data-rars]')) {
      // what the hero wears stays in sight whatever the filter: it is what the user came back for
      const ok = card.classList.contains('installed') || keeps(f, card.dataset.rars.split(' '), card.dataset.excl === '1');
      card.classList.toggle('hidden', !ok);
      if (ok) shown++;
    }
    sec.classList.toggle('hidden', !shown);
    if (shown && sec.dataset.slot) any = true;
  }
  viewRoot.querySelector('#arsEmpty')?.classList.toggle('hidden', any);
}

// ---------- what the buttons do ----------

function onClick(e) {
  const el = e.target.closest('button, [role="button"]');
  if (!el || el.disabled) return;
  const d = el.dataset;
  if (el.id === 'arsBack') backToGrid();
  else if (el.id === 'arsRetry') renderArsenal();
  else if (el.id === 'arsVipBtn') goVip();
  else if (el.id === 'arsSafeBtn') leaveSafeMode(el);
  else if (d.only) {
    arcanaOnly = d.only === 'arcana';
    viewRoot.querySelectorAll('[data-only]').forEach((b) => b.classList.toggle('active', b === el));
    filterGrid();
  } else if (d.rarity) {
    rarityKey = d.rarity;
    viewRoot.querySelectorAll('[data-rarity]').forEach((b) => b.classList.toggle('active', b === el));
    filterItems();
  } else if (d.equipSet) equipSet(d.equipSet);
  else if (d.hero) openHeroPage(d.hero);
  else if (d.opt) openItem(d.slot, d.opt, el);
}

// the cards are divs with a button's role, so they take the keys a button would
function onKey(e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.card[role="button"]')) {
    e.preventDefault();
    e.target.click();
  }
}

function goVip() {
  showCheckoutModal({ onSuccess: () => renderArsenal() });
}

async function leaveSafeMode(btn) {
  btn.disabled = true;
  try {
    // the switch may already be off and this banner from an older answer: ask again then
    if (state.settings?.schemaPatch) await renderArsenal();
    else await setSafeMode(false);
  } finally {
    btn.disabled = false;
  }
}

/**
 * One change through the backend, then everything it moved redrawn in place.
 * @param {string} key   what is busy meanwhile, so a second press does nothing
 * @param {'pick'|'clear'|'set'} kind  which label the busy button wears
 * @param {() => Promise<object>} call
 * @param {(r: object) => void} done  says what happened, once it has
 */
async function act(key, kind, call, done) {
  if (busy.has(key)) return;
  busy.set(key, kind);
  paintBusy();
  let r;
  try {
    r = await ask(call);
  } finally {
    busy.delete(key);
  }
  if (r.error) { toast(r.error, 'error', 7000); paintBusy(); return; }
  done(r);
  listStale = true;
  try {
    await refreshInstalledIndex();
    invalidateViews();
    if (state.view === 'arsenal') await (openHero ? drawHero(++seq) : drawGrid(++seq));
  } finally {
    paintBusy();
  }
}

// the buttons of whatever is in flight, without redrawing the page under the pointer
function paintBusy() {
  drawItem();
  const why = equipBlock(hero);
  for (const b of viewRoot.querySelectorAll('[data-equip-set]')) {
    b.disabled = !!why || busy.has(`set|${b.dataset.equipSet}`);
    b.innerHTML = setButtonHtml(b.dataset.equipSet);
  }
}

// Each of these starts from a hero page, and a press that lands after the page was left has no
// hero to send: the backend would only answer that hero '' is not in the game.
function equip(slot, choice, name) {
  const npc = openHero;
  if (!npc) return;
  act(slotKey(npc, slot), 'pick',
    () => window.api.arsenal.pick(npc, slot, choice.itemId, normStyle(choice.style)),
    () => toast(L`Надето: ${name}`));
}

function clear(slot) {
  const npc = openHero;
  if (!npc) return;
  act(slotKey(npc, slot), 'clear',
    () => window.api.arsenal.clear(npc, slot),
    () => toast(L`Снято — у героя снова стандартный вид`));
}

function equipSet(id) {
  const npc = openHero;
  if (!npc) return;
  const set = (hero?.sets || []).find((s) => String(s.id) === String(id));
  const name = set?.name || id;
  act(`set|${id}`, 'set', () => window.api.arsenal.equipSet(npc, id), (r) => {
    const skipped = r.skipped || [];
    if (!skipped.length) { toast(L`Комплект «${name}» надет`); return; }
    toast(L`Комплект «${name}»: надето ${countOf(r.picked)}, пропущено ${skipped.length}`, 'warn', 6000);
    toast(L`Не надето: ${skipped.join(', ')}`, 'warn', 9000);
  });
}

// ---------- the item window ----------
//
// It is the catalog's window - the same overlay, markup and classes - opened from here. The
// catalog keeps its open and close to itself, so the two are repeated below; Escape and a
// click outside still close this one through the catalog's own handlers, which is why every
// redraw first checks the window is still open and still showing this file's markup.

function exitMs() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--dur-base');
  return parseFloat(v) || 0;
}

function openItem(slotId, optId, from) {
  const s = slotOf(slotId);
  const o = s && optionOf(s, optId);
  if (!o) return;
  item = { slot: slotId, optId: String(optId), choice: initialChoice(o, livePick(s)) };
  const overlay = $('#modalOverlay');
  const panel = $('#modalContent');
  clearTimeout(closingTimer);
  overlay.classList.remove('closing');
  panel.innerHTML = '<div class="modal-media cos" id="arsMedia"></div><div class="modal-body ars-modal" id="arsModal"></div>';
  mediaShows = null;
  // grows out of the card that was pressed, as the catalog's window does
  const r = from?.getBoundingClientRect();
  panel.style.setProperty('--from-x', `${r ? Math.round(r.left + r.width / 2 - window.innerWidth / 2) : 0}px`);
  panel.style.setProperty('--from-y', `${r ? Math.round(r.top + r.height / 2 - window.innerHeight / 2) : 0}px`);
  overlay.classList.remove('hidden');
  drawItem();
  // a card that never scrolled into view has not had its picture fetched, nor have variants
  const want = [o.name, ...(o.variants || []).map((v) => v.name)].filter((n) => n && !cosmeticIconKnown(n));
  if (want.length) loadCosmeticIcons(want, () => drawItem());
}

function closeItem() {
  item = null;
  const overlay = $('#modalOverlay');
  if (overlay.classList.contains('hidden')) return;
  overlay.classList.add('closing');
  clearTimeout(closingTimer);
  closingTimer = setTimeout(() => {
    // reopened while it was falling: that window owns the overlay now
    if (!overlay.classList.contains('closing')) return;
    overlay.classList.add('hidden');
    overlay.classList.remove('closing');
    $('#modalContent').innerHTML = '';
  }, exitMs());
}

function itemWindowOpen() {
  const overlay = $('#modalOverlay');
  return !!item && !overlay.classList.contains('hidden') && !overlay.classList.contains('closing') && !!$('#arsModal');
}

function selectHtml(id, icon, label, options) {
  return `
    <label class="ars-field"><span class="ars-field-label">${esc(label)}</span>
      <span class="select-wrap"><span class="ms">${icon}</span><select id="${id}">
        ${options.map((x) => `<option value="${esc(x.value)}" ${x.on ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}
      </select></span>
    </label>`;
}

function paintMedia(look, s) {
  const media = $('#arsMedia');
  if (!media) return;
  const src = cosmeticIcon(look.name) || null;
  const shows = src || `glyph:${slotIcon(s.slot)}`;
  if (mediaShows === shows) return;
  mediaShows = shows;
  media.innerHTML = `${src ? `<img src="${esc(src)}" alt="">` : `<div class="noimg"><span class="ms">${slotIcon(s.slot)}</span></div>`}
    <button class="modal-close" id="arsClose" aria-label="${esc(L`Закрыть`)}"><span class="ms">close</span></button>`;
  media.querySelector('#arsClose').addEventListener('click', closeItem);
}

function itemNote(s, live, worn, dormant) {
  // with no VIP the pick waits in the library; anything else (safe mode) is named in the lock above
  if (dormant) {
    return hero?.vip === false
      ? L`Не действует без VIP: вид вернётся, когда подписка снова станет активной`
      : L`Сейчас этот вид в игре не действует, но выбор сохранён`;
  }
  if (worn) return L`Этот вид сейчас на герое. «Снять» вернёт стандартный предмет, а выбор останется в «Моих модах» выключенным.`;
  if (live) return L`На один слот — только один вид: этот заменит «${esc(liveName(s, live))}». Прошлый выбор останется в «Моих модах» выключенным.`;
  return L`Стандартный предмет героя станет выглядеть как этот. Файлы модов это не трогает, и видно это только тебе.`;
}

function drawItem() {
  if (!itemWindowOpen()) { item = null; return; }
  const s = slotOf(item.slot);
  const o = s && optionOf(s, item.optId);
  if (!o) { closeItem(); return; }
  // the slot's pick even when the game is not wearing it: that one can still be taken off
  const live = livePick(s);
  const on = isLiveOption(o, live);
  const active = picksActive(hero);
  const c = item.choice;
  const look = lookOf(o, c.itemId);
  const styles = look === o ? (o.styles || []) : [];
  // a style list without a "0" still has to name the style that will actually be sent
  if (styles.length > 1 && !styles.some((st) => normStyle(st.index) === normStyle(c.style))) c.style = normStyle(styles[0].index);
  const kind = busy.get(slotKey(openHero, s.slot));
  const why = equipBlock(hero);
  const picked = on && sameChoice(c, live);
  const worn = active && picked;
  const others = sharedWith(s);

  paintMedia(look, s);
  $('#arsModal').innerHTML = `
    <div class="modal-title-row"><div class="modal-title">${esc(look.name)}</div></div>
    <div class="modal-sub">
      ${rarityChipHtml(look.rarity || o.rarity)}
      <span>${esc(hero?.name || heroTitle(openHero, names))}</span>
      <span>· ${esc(slotLabel(s.slot))}</span>
    </div>
    ${(o.variants || []).length ? selectHtml('arsVariant', 'layers', L`Вариант`, [o, ...o.variants].map((v) => ({
      value: v.id,
      label: v.rarity && v.rarity !== o.rarity ? `${v.name} · ${rarityLabel(v.rarity)}` : v.name,
      on: String(v.id) === String(c.itemId),
    }))) : ''}
    ${styles.length > 1 ? selectHtml('arsStyle', 'palette', L`Стиль`, styles.map((st, i) => ({
      value: st.index, label: styleLabel(st, i), on: normStyle(st.index) === normStyle(c.style),
    }))) : ''}
    <div class="modal-actions">
      <button class="btn btn-primary" id="arsEquip" ${why || kind || worn ? 'disabled' : ''}>
        <span class="ms">${worn ? 'check' : 'checkroom'}</span>${kind === 'pick' ? L`Надеваю…` : worn ? L`Надето` : L`Надеть`}</button>
      ${on ? `<button class="btn btn-danger" id="arsClear" ${kind ? 'disabled' : ''}><span class="ms">close</span>${kind === 'clear' ? L`Снимаю…` : L`Снять`}</button>` : ''}
    </div>
    ${why ? `
      <div class="modal-note warn ars-why">
        <span class="ms">lock</span><b>${esc(why)}</b>
        ${hero?.vip === false
          ? `<button class="btn btn-sm" id="arsItemVip"><span class="ms">auto_awesome</span>${L`Перейти на Premium`}</button>`
          : `<button class="btn btn-sm" id="arsItemSafe"><span class="ms">shield_moon</span>${L`Выключить безопасный режим`}</button>`}
      </div>` : ''}
    ${others.length ? `<div class="modal-note warn">${esc(L`Предмет этого слота у героев общий: вид сменится и у ${others.join(', ')}.`)}</div>` : ''}
    <div class="modal-note">${itemNote(s, live, worn, picked && !active)}</div>`;

  const body = $('#arsModal');
  body.querySelector('#arsVariant')?.addEventListener('change', (e) => {
    item.choice = { itemId: e.target.value, style: null };
    drawItem();
  });
  body.querySelector('#arsStyle')?.addEventListener('change', (e) => {
    item.choice = { ...item.choice, style: normStyle(e.target.value) };
    drawItem();
  });
  body.querySelector('#arsEquip')?.addEventListener('click', () => equip(s.slot, { ...c }, look.name));
  body.querySelector('#arsClear')?.addEventListener('click', () => clear(s.slot));
  body.querySelector('#arsItemVip')?.addEventListener('click', goVip);
  body.querySelector('#arsItemSafe')?.addEventListener('click', (e) => leaveSafeMode(e.currentTarget));
}
