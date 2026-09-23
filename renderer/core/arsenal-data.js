/* The Arsenal's answers, read for the screen: what to call a slot, a rarity and a style, which
 * looks a filter keeps, and what is live on the hero right now.
 *
 * Nothing here touches the page and nothing is imported, so node:test can load the file as it
 * is (test/arsenal-data.test.js). `L` and `tr` are the page's globals, as everywhere else in
 * the renderer. What the answers look like is the contract in src/ipc-arsenal.js.
 */

// Dota's own order, rarest first. Sets and filters lead with the first two because those are
// what the Arsenal is for; the rest are there for a hero with none.
export const RARITIES = ['arcana', 'immortal', 'legendary', 'mythical', 'rare', 'uncommon', 'common', 'seasonal', 'ancient'];

// Russian source strings, looked up with tr(). 'Обыкновенный' rather than 'Обычный' for
// common: that one is already the dictionary's word for a default setting.
const RARITY_RU = {
  arcana: 'Аркана', immortal: 'Бессмертный', legendary: 'Легендарный', mythical: 'Мифический',
  rare: 'Редкий', uncommon: 'Необычный', common: 'Обыкновенный', seasonal: 'Сезонный', ancient: 'Древний',
};

export const RARITY_FILTERS = [
  { key: 'top', label: 'Арканы и бессмертные', keep: ['arcana', 'immortal'] },
  { key: 'arcana', label: 'Арканы', keep: ['arcana'] },
  { key: 'immortal', label: 'Бессмертные', keep: ['immortal'] },
  // what the store never sold: treasures, battle passes, events, retired drops
  { key: 'exclusive', label: 'Эксклюзивы (нет в магазине)', keep: null, exclusive: true },
  { key: 'all', label: 'Все', keep: null },
];

const SLOT_RU = {
  hero_base: 'Облик героя', persona_selector: 'Персона', weapon: 'Оружие', offhand_weapon: 'Второе оружие',
  head: 'Голова', shoulder: 'Плечи', back: 'Спина', arms: 'Руки', armor: 'Броня', belt: 'Пояс',
  legs: 'Ноги', neck: 'Шея', gloves: 'Перчатки', misc: 'Разное', mount: 'Верховое животное',
  ambient_effects: 'Эффекты окружения', summon: 'Призыв', ability_ultimate: 'Ультимейт', voice: 'Голос',
  body_head: 'Голова и тело', costume: 'Костюм', tail: 'Хвост', shapeshift: 'Превращение',
};

const SLOT_ICON = {
  hero_base: 'accessibility_new', persona_selector: 'theater_comedy', weapon: 'swords',
  offhand_weapon: 'swords', mount: 'pets', summon: 'pets', ambient_effects: 'auto_awesome',
  voice: 'record_voice_over', ability_ultimate: 'bolt',
};

const own = (table, key) => (Object.hasOwn(table, key) ? table[key] : undefined);

/** 'lower_back' -> 'Lower Back': a slot Valve adds later still gets a readable name. */
export function titleCase(id) {
  return String(id || '').split(/[_\s]+/).filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

/** A rarity the schema names, as the window shows it. */
export function rarityLabel(rarity) {
  const ru = own(RARITY_RU, String(rarity || 'common'));
  return ru ? tr(ru) : titleCase(rarity);
}

/** The CSS class that paints a rarity; anything the table does not know is drawn as common. */
export function rarityClass(rarity) {
  return RARITIES.includes(rarity) ? `r-${rarity}` : 'r-common';
}

const rarityRank = (r) => { const i = RARITIES.indexOf(r); return i < 0 ? RARITIES.length : i; };

export function rarityFilter(key) {
  return RARITY_FILTERS.find((f) => f.key === key) || RARITY_FILTERS[0];
}

/** Whether a filter keeps a card carrying any of these rarities (and, for the exclusives
 *  filter, only a card with a look the store never sold). */
export function keeps(filter, rarities, exclusive = false) {
  if (filter.exclusive) return exclusive;
  return !filter.keep || rarities.some((r) => filter.keep.includes(r));
}

/** A look the store never sold. The answer says store:false for those; an answer that does
 *  not say is not taken to mean "exclusive". */
export function isExclusive(opt) {
  return [opt, ...(opt?.variants || [])].some((o) => o && o.store === false);
}

/** 'head' -> 'Голова', 'ability2' -> 'Способность 2', 'head_persona_1' -> 'Голова · Персона'. */
export function slotLabel(slot) {
  const s = String(slot || '');
  const persona = /^(.+)_persona_(\d+)$/.exec(s);
  if (persona) return `${slotLabel(persona[1])} · ${tr('Персона')}${persona[2] === '1' ? '' : ` ${persona[2]}`}`;
  const ru = own(SLOT_RU, s);
  if (ru) return tr(ru);
  const ability = /^ability(\d+)$/.exec(s);
  if (ability) return L`Способность ${ability[1]}`;
  return titleCase(s);
}

export function slotIcon(slot) {
  const s = String(slot || '').replace(/_persona_\d+$/, '');
  return own(SLOT_ICON, s) || (/^ability\d+$/.test(s) ? 'bolt' : 'checkroom');
}

/** A style as the select shows it. The schema names most of them with a token such as
 *  '#DOTA_Style_Default' and some not at all; those are numbered from one, as people count. */
export function styleLabel(style, i = 0) {
  const name = String(style?.name ?? '').trim();
  if (name && !name.startsWith('#')) return name;
  const n = Number(style?.index);
  return L`Стиль ${Number.isFinite(n) ? n + 1 : i + 1}`;
}

/** Style 0 is what the item wears when nobody chose, so "0" and no choice are the same look. */
export function normStyle(style) {
  return style == null || style === '' || String(style) === '0' ? null : String(style);
}

/** A count the answer may give as a number or as the list itself. */
export function countOf(v) {
  return Array.isArray(v) ? v.length : Number(v) || 0;
}

/** Whether the picks an answer lists are in the game. They stay in the library while VIP is
 *  gone or safe mode is on, but the build leaves them out, and the screen once kept calling them
 *  worn. An answer that does not say is from before the flag, when a pick on record was worn. */
export function picksActive(r) {
  return r?.active !== false;
}

/** How many picks a hero card counts as worn: none while they are not in the game. */
export function wornCount(h, active) {
  return active ? countOf(h?.picked) : 0;
}

/** What is live in a slot, with the id and the style apart even when the record's id carries
 *  the style ('<donor>#<style>'). */
export function livePick(slot) {
  const p = slot?.picked;
  if (!p || p.itemId == null) return null;
  const [id, fromId] = String(p.itemId).split('#');
  return { recordId: p.recordId, itemId: id, style: normStyle(p.style ?? fromId) };
}

/** The head of a family of looks and every variant folded under it. */
export function familyIds(opt) {
  return [String(opt.id), ...(opt.variants || []).map((v) => String(v.id))];
}

export function familyRarities(opt) {
  return [...new Set([opt.rarity, ...(opt.variants || []).map((v) => v.rarity)].filter(Boolean))];
}

export function isLiveOption(opt, live) {
  return !!live && familyIds(opt).includes(live.itemId);
}

/** The head or the variant with this id, so a window can name and picture what was chosen. */
export function lookOf(opt, itemId) {
  if (String(opt.id) === String(itemId)) return opt;
  return (opt.variants || []).find((v) => String(v.id) === String(itemId)) || opt;
}

/** What the item window opens on: the live look when it belongs to this card, else its head. */
export function initialChoice(opt, live) {
  if (isLiveOption(opt, live)) return { itemId: live.itemId, style: live.itemId === String(opt.id) ? live.style : null };
  return { itemId: String(opt.id), style: null };
}

export function sameChoice(a, b) {
  return !!a && !!b && String(a.itemId) === String(b.itemId) && normStyle(a.style) === normStyle(b.style);
}

/** The name of whatever is live in a slot, for "this replaces X". */
export function liveName(slot, live) {
  if (!live) return '';
  for (const o of slot.options || []) if (familyIds(o).includes(live.itemId)) return lookOf(o, live.itemId).name;
  return live.itemId;
}

export function heroMatches(h, query, arcanaOnly) {
  if (arcanaOnly && !(Number(h?.counts?.arcana) > 0)) return false;
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return [h?.name, h?.key, h?.hero].some((s) => String(s || '').toLowerCase().includes(q));
}

/** A hero's name from the list the grid was drawn from, or a readable one made from the id. */
export function heroTitle(npc, names) {
  return names?.get(npc) || titleCase(String(npc || '').replace(/^npc_dota_hero_/, ''));
}

/** Arcana sets first, then immortal, then the rest; by name inside each. */
export function sortSets(sets) {
  return [...(sets || [])].sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity)
    || String(a.name).localeCompare(String(b.name)));
}

/** A set is on the hero when every member that has a slot on this page is its live pick. */
export function setIsLive(set, slots) {
  const live = new Map((slots || []).map((s) => [s.slot, livePick(s)]));
  const members = (set.members || []).filter((m) => live.has(m.slot));
  return members.length > 0 && members.every((m) => live.get(m.slot)?.itemId === String(m.itemId));
}
