/* The Arsenal: any look a hero can wear, put on the items every account already owns.
 *
 * Each hero has a default item per slot (prefab "default_item", which is what gives it
 * baseitem 1), and the client draws whatever that item's block says. Rewrite the block to carry
 * another wearable's model and visuals and the hero wears that wearable with nobody owning it:
 * the trick baseItemPatch plays on Default Weather, one hero slot at a time.
 *
 * Measured on the real table (research, 2026-09-23), and the reason for each rule below:
 *   - 127 heroes, one default per hero and slot, and every immortal and arcana wearable of a
 *     hero lands on one of them. Taunts are the exception: their only default is 8632, shared by
 *     every hero, and a taunt plays through an owned tool anyway, so they are left out.
 *   - A few defaults serve several heroes (8366 "All Heroes' Default Pet" is the summon of ten).
 *     Dressing it dresses all of them, so a slot says who else it reaches, and a pick there
 *     switches the other heroes' picks on it off: the table holds one block per item.
 *   - A default item is never an owned copy, so nothing stores a style for it and it runs style
 *     0 (assumed, not seen in the game). A chosen style is moved into slot 0.
 *   - The *_persona_N slots only show while the persona is on, so a pick there switches the
 *     hero's persona selector on too, unless the user picked a persona of their own.
 *
 * Everything here reads the game's own table and returns text; the library, the rebuild and
 * who may use it are src/schema-service.js's business.
 */
const schema = require('./schema');
const { heroDisplayName } = require('./vpk');
const { t } = require('./i18n');

const { blockBounds, eachChild, listItems, itemIndex, prefabSlots, sectionOf, toUtf8 } = schema;

const HERO_PREFIX = 'npc_dota_hero_';
const SLOT_PREFIX = 'hero:';

// The schema's own words, best first: the order options and sets are listed in.
const RARITIES = ['arcana', 'immortal', 'legendary', 'mythical', 'rare', 'uncommon', 'common', 'seasonal', 'ancient'];
const rarityRank = (r) => { const i = RARITIES.indexOf(r); return i === -1 ? RARITIES.length : i; };

// Where a person looks first: the whole-hero looks, then top to bottom, then the rest.
const SLOT_ORDER = ['hero_base', 'persona_selector', 'weapon', 'offhand_weapon', 'head', 'shoulder', 'back',
  'arms', 'armor', 'belt', 'legs', 'neck', 'gloves', 'misc', 'mount', 'ambient_effects', 'summon'];

function slotRank(slot) {
  const i = SLOT_ORDER.indexOf(slot);
  if (i !== -1) return i;
  const ability = /^ability(\d+)$/.exec(slot);
  if (ability) return 100 + Number(ability[1]);
  if (slot === 'ability_ultimate') return 200;
  if (slot === 'voice') return 201;
  return 1000;
}

/** Slot order for the Arsenal: SLOT_ORDER, abilities, the ultimate, voice, then A-Z. */
const compareSlots = (a, b) => slotRank(a) - slotRank(b) || a.localeCompare(b);

// ---------- keys a pick is stored under ----------

/** 'hero:npc_dota_hero_juggernaut:hero_base' - the slot of a library record. */
const slotKey = (hero, slot) => `${SLOT_PREFIX}${hero}:${slot}`;
const isHeroSlot = (slot) => typeof slot === 'string' && slot.startsWith(SLOT_PREFIX);

/** @returns {{hero: string, slot: string}|null} */
function parseSlotKey(key) {
  if (!isHeroSlot(key)) return null;
  const m = /^hero:([^:]+):(.+)$/.exec(key);
  return m ? { hero: m[1], slot: m[2] } : null;
}

/** '9059' or '9059#1' when a style other than the first was chosen. */
const itemKey = (id, style) => (style == null ? String(id) : `${id}#${style}`);

/** @returns {{itemId: string, style: string|null}} */
function parseItemKey(key) {
  const [itemId, style] = String(key == null ? '' : key).split('#');
  return { itemId, style: style ? style : null };
}

/** The persona number of a *_persona_N slot, or 0. */
const personaOf = (slot) => { const m = /_persona_(\d+)$/.exec(slot); return m ? Number(m[1]) : 0; };

// ---------- reading one item ----------

function children(text, bounds) {
  const out = [];
  eachChild(text, bounds, (c) => out.push(c));
  return out;
}
const lc = (k) => k.toLowerCase();
const raw = (text, c) => text.slice(c.start, c.end);
const q = (v) => `"${v}"`;
const block = (key, parts) => `${q(key)}\r\n{\r\n${parts.join('\r\n')}\r\n}`;
const isModifier = (k) => /^asset_modifier\d*$/i.test(k);
const MODEL_KEY = /^model_player\d*$/i;

// Variant looks of one design: shown once, with the rest folded under it. Both ends are words
// Valve puts on a re-release - Golden, Tyrian, Crimson, "of the Crimson Witness"...
const VARIANT_HEAD = /^(golden |tyrian |10th anniversary |lucky |crimson )+/i;
const VARIANT_TAIL = /( of the crimson witness| of eminent revival)$/i;
const baseName = (n) => n.replace(VARIANT_HEAD, '').replace(VARIANT_TAIL, '').trim().toLowerCase();
const isVariant = (n) => VARIANT_HEAD.test(n) || VARIANT_TAIL.test(n);

/**
 * The fields of one item block the Arsenal needs, in one walk of its top level.
 * @returns {{heroes: string[], rarity: string, models: string, hasVisuals: boolean, hasStyles: boolean, persona: number, members: string[], sold: boolean}}
 */
function readItem(text, it) {
  const out = { heroes: [], rarity: 'common', models: '', hasVisuals: false, hasStyles: false, persona: 0, members: [], sold: false };
  const models = [];
  let hidden = false;
  for (const c of children(text, blockBounds(text, it.start))) {
    const k = lc(c.key);
    if (!c.isBlock) {
      if (k === 'item_rarity' && c.value) out.rarity = lc(c.value);
      else if (MODEL_KEY.test(k) && c.value) models.push(lc(c.value));
      else if (k === 'hide_in_store' && c.value === '1') hidden = true;
      continue;
    }
    if (k === 'price_info') {
      /* Most items carry a price_info that sells nothing: class "NoPrice" at price 0 is how the
         table files a treasure drop. Only a real price puts an item, or a bundle, in the store. */
      const f = new Map(children(text, c.body).filter((x) => !x.isBlock).map((x) => [lc(x.key), x.value]));
      out.sold = f.get('class') !== 'NoPrice' && Number(f.get('price')) > 0;
    } else if (k === 'used_by_heroes') {
      eachChild(text, c.body, (h) => { if (!h.isBlock && h.value !== '0') out.heroes.push(h.key); });
    } else if (k === 'bundle') {
      eachChild(text, c.body, (m) => { if (!m.isBlock) out.members.push(m.key); });
    } else if (k === 'visuals') {
      out.hasVisuals = true;
      const body = raw(text, c);
      out.hasStyles = body.includes('"styles"');
      if (body.includes('"persona"')) out.persona = personaNumber(text, c);
    }
  }
  out.models = models.sort().join('|');
  if (hidden) out.sold = false;
  return out;
}

// A persona item says which persona it is through an asset_modifier of type "persona".
function personaNumber(text, visuals) {
  for (const m of children(text, visuals.body)) {
    if (!m.isBlock || !isModifier(m.key)) continue;
    const f = new Map(children(text, m.body).filter((x) => !x.isBlock).map((x) => [lc(x.key), x.value]));
    if (lc(f.get('type') || '') === 'persona') return Number(f.get('persona')) || 1;
  }
  return 0;
}

// ---------- the map of heroes, slots and what can go there ----------

/**
 * @typedef {{id: string, name: string, rarity: string, image: string, slot: string, models: string, hasStyles: boolean, persona: number, store: boolean, raw: string}} Wearable
 */

let mapCache = { text: null, map: null };

/**
 * Per hero: slot -> default item, and every wearable that fits it, variants folded under their
 * head. Built once per game table: about a third of a second on the real one.
 * @param {string} text  the game's own items_game.txt (latin1)
 */
function heroMap(text) {
  if (mapCache.map && mapCache.text === text) {
    // the same table read twice is two strings; keep the caller's, so the next === is a pointer
    // compare and not 50 MB of them (see schema.js cacheHit)
    mapCache.text = text;
    return mapCache.map;
  }
  const map = build(text);
  mapCache = { text, map };
  return map;
}

function build(text) {
  const prefabs = prefabSlots(text);
  // an empty item_slot means what the prefab declares, which is "weapon" for both today
  const defaultSlot = (prefab) => prefabs.get(prefab) || 'weapon';
  const heroes = new Map();
  const wearables = new Map();
  const bundles = new Map();
  /** @type {Array<[Wearable, string[]]>} the wearable, and the heroes it is made for */
  const wearing = [];
  // names of everything a bundle on sale holds, whoever the bundle is for (see below)
  const soldNames = new Set();

  for (const it of listItems(text)) {
    if (it.prefab !== 'default_item' && it.prefab !== 'wearable' && it.prefab !== 'bundle') continue;
    const info = readItem(text, it);
    if (it.prefab === 'bundle' && info.sold) for (const n of info.members) soldNames.add(n);
    const own = info.heroes.filter((h) => h.startsWith(HERO_PREFIX));
    if (!own.length) continue; // "all" (ability effects, the shared taunt) and summoned units
    if (it.prefab === 'bundle') {
      const set = { id: it.id, name: toUtf8(it.name), rarity: info.rarity, members: info.members, sold: info.sold };
      for (const h of own) (bundles.get(h) || bundles.set(h, []).get(h)).push(set);
      continue;
    }
    const slot = lc(it.slot || defaultSlot(it.prefab));
    if (/^taunt/.test(slot)) continue;
    if (it.prefab === 'wearable') {
      // a block with neither a model nor visuals would take the default's look off and put
      // nothing in its place
      if (!it.name || (!info.models && !info.hasVisuals)) continue;
      const w = { id: it.id, name: toUtf8(it.name), rarity: info.rarity, image: it.image, slot, models: info.models, hasStyles: info.hasStyles, persona: info.persona, store: info.sold, raw: it.name };
      wearables.set(it.id, w);
      wearing.push([w, own]);
      continue;
    }
    for (const h of own) {
      let H = heroes.get(h);
      if (!H) {
        const key = h.slice(HERO_PREFIX.length);
        H = { hero: h, key, name: heroDisplayName(key), slots: new Map(), itemSlots: new Map(), personas: [] };
        heroes.set(h, H);
      }
      // one default per hero and slot in the whole table today; the lowest id if that changes
      const prev = H.slots.get(slot);
      if (prev && Number(prev.target) < Number(it.id)) continue;
      H.slots.set(slot, { slot, target: it.id, shared: own.filter((x) => x !== h), persona: personaOf(slot) > 0, options: [], heads: [] });
    }
  }

  for (const [w, own] of wearing) {
    for (const h of own) {
      const H = heroes.get(h);
      const S = H && H.slots.get(w.slot);
      if (!S) continue; // nothing of this hero's to rewrite (gyrocopter ability2 has no default)
      S.options.push(w.id);
      H.itemSlots.set(w.id, w.slot);
      if (w.slot === 'persona_selector') H.personas.push({ id: w.id, persona: w.persona || 1 });
    }
  }
  /* What the store sells is mostly bundles: an arcana or an immortal on its own has no price,
     and is bought as part of a set that has one. So a wearable counts as sold when it has a price
     of its own or sits in a bundle that does; everything else came from treasures, battle passes
     and events - the looks people call exclusive. Measured on the 2026-09-23 table: 2 of 523
     immortals and 16 of 25 arcanas were ever sold. Members are listed by their raw name, and
     a bundle on sale counts whoever it names in used_by_heroes - some name nobody. */
  for (const w of wearables.values()) w.store = w.store || soldNames.has(w.raw);
  for (const H of heroes.values()) for (const S of H.slots.values()) S.heads = fold(S.options, wearables);
  return { heroes, wearables, bundles, byName: null, setOf: null };
}

/* Two options are one look when they share a model set, or share a name once the variant words
 * are off - the name half catches effect-only items with no model (Fortune's Tout and Golden
 * Fortune's Tout). The head is the plain name, then the shortest, then the oldest id. Nothing
 * is hidden by this: every variant stays a pick of its own. */
function fold(ids, wearables) {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (k) => { while (parent.get(k) !== k) k = parent.get(k); return k; };
  const seen = new Map();
  for (const id of ids) {
    const w = wearables.get(id);
    for (const key of [`n:${baseName(w.name)}`, w.models ? `m:${w.models}` : null]) {
      if (!key) continue;
      const other = seen.get(key);
      if (other === undefined) seen.set(key, id);
      else if (find(other) !== find(id)) parent.set(find(id), find(other));
    }
  }
  const groups = new Map();
  for (const id of ids) {
    const root = find(id);
    (groups.get(root) || groups.set(root, []).get(root)).push(wearables.get(id));
  }
  const heads = [];
  for (const list of groups.values()) {
    list.sort((a, b) => (Number(isVariant(a.name)) - Number(isVariant(b.name))) || a.name.length - b.name.length || Number(a.id) - Number(b.id));
    heads.push({ id: list[0].id, variants: list.slice(1).map((w) => w.id) });
  }
  const w = (h) => wearables.get(h.id);
  return heads.sort((a, b) => rarityRank(w(a).rarity) - rarityRank(w(b).rarity) || w(a).name.localeCompare(w(b).name));
}

/** A hero by npc name, or by the short key ('juggernaut') for convenience. */
function findHero(text, hero) {
  const { heroes } = heroMap(text);
  const h = String(hero || '');
  return heroes.get(h) || heroes.get(HERO_PREFIX + h) || null;
}

// ---------- styles ----------

/**
 * How an item's styles behave.
 *  - none:       no styles block
 *  - auto:       some style carries auto_style_rule and the game switches it at run time
 *                (Troll melee/ranged, Lifestealer rage): every style is kept, only unlocks go
 *  - selectable: the owner picks one, so a style other than the first has to move into slot 0
 * @returns {{kind: string, styles: Array<{index: string, name: string, auto: boolean}>}|null}
 */
function stylesOf(text, id) {
  const item = itemIndex(text).get(String(id));
  if (!item) return null;
  const vis = children(text, blockBounds(text, item.start)).find((c) => c.isBlock && lc(c.key) === 'visuals');
  const st = vis && children(text, vis.body).find((c) => c.isBlock && lc(c.key) === 'styles');
  if (!st) return { kind: 'none', styles: [] };
  const styles = children(text, st.body).filter((c) => c.isBlock).map((c) => {
    const fields = children(text, c.body);
    const name = fields.find((x) => !x.isBlock && lc(x.key) === 'name');
    return { index: c.key, name: name ? toUtf8(name.value) : '', auto: fields.some((x) => lc(x.key) === 'auto_style_rule') };
  });
  return { kind: styles.some((x) => x.auto) ? 'auto' : 'selectable', styles };
}

/** Styles a person can choose between: selectable ones, and only when there is a choice. */
function choosableStyles(text, id) {
  const st = stylesOf(text, id);
  return st && st.kind === 'selectable' && st.styles.length > 1 ? st.styles : [];
}

// ---------- the block ----------

// What makes the look. The target loses its own copy of these even when the donor has none:
// a donor without a model_player hangs no model on the hero, and the default one left behind
// would sit on top of an arcana that swaps the whole hero (Faceless Void 18033, SF 6996).
const LOOK_ALWAYS = new Set(['visuals', 'particle_folder', 'match_cycle_to_parent',
  'override_attack_attachments', 'particle_snapshot', 'disable_hero_portrait_override']);
// Taken from the donor only when it has them; otherwise the target keeps its own (portrait
// camera, loadout icon, the name the loadout shows).
const LOOK_IF_DONOR = new Set(['portraits', 'image_inventory', 'item_name', 'item_description']);
// Everything else stays the target's: the id; "name", which bundles and item_sets resolve
// members by and is unique across the table; "prefab" default_item, which is what makes it
// owned by everyone; item_slot, used_by_heroes, static_attributes, capabilities, and its own
// rarity. The donor's rarity, price, event, tags and bundles never come along.

// The donor's visuals, rebuilt: unlock gates off, and a chosen style moved into style 0.
function donorVisuals(text, vis, style, kind, donorName) {
  const pick = kind === 'selectable' && style != null ? String(style) : null;
  const out = [];
  let found = false;
  for (const c of children(text, vis.body)) {
    const k = lc(c.key);
    if (c.isBlock && k === 'styles') {
      const entries = [];
      for (const e of children(text, c.body)) {
        if (!e.isBlock) { entries.push(raw(text, e)); continue; }
        if (pick !== null && e.key !== pick) continue;
        if (pick !== null) found = true;
        const body = children(text, e.body).filter((x) => lc(x.key) !== 'unlock').map((x) => raw(text, x));
        entries.push(block(pick !== null ? '0' : e.key, body));
      }
      out.push(block(c.key, entries));
      continue;
    }
    if (c.isBlock && isModifier(c.key) && pick !== null) {
      const mod = children(text, c.body);
      const st = mod.find((x) => !x.isBlock && lc(x.key) === 'style');
      if (st && st.value !== pick) continue; // another style's modifier
      if (st) { out.push(block(c.key, mod.map((x) => (x === st ? `${q('style')}\t\t${q('0')}` : raw(text, x))))); continue; }
    }
    out.push(raw(text, c));
  }
  if (pick !== null && !found) throw new Error(t('У предмета {0} нет стиля {1}', donorName, pick));
  return block(vis.key, out);
}

/**
 * The block that turns default item `targetId` into a copy of `donorId`'s look.
 * @param {string} text      the game's own items_game.txt (latin1)
 * @param {string} targetId  the hero's default item for the slot
 * @param {string} donorId   the wearable to show
 * @param {{style?: string|null}} [opts]  a style index of a donor with selectable styles
 * @returns {string}  a block for mergeSchema ({ id: targetId, block })
 */
function heroItemPatch(text, targetId, donorId, opts = {}) {
  const index = itemIndex(text);
  const target = index.get(String(targetId));
  if (!target) throw new Error(t('items_game: предмет {0} не найден', targetId));
  const donor = index.get(String(donorId));
  if (!donor) throw new Error(t('items_game: предмет {0} не найден', donorId));
  if (target.prefab !== 'default_item') throw new Error(t('items_game: {0} не является предметом героя по умолчанию', targetId));
  const tTop = children(text, blockBounds(text, target.start));
  const dTop = children(text, blockBounds(text, donor.start));

  const donorKeys = new Set(dTop.map((c) => lc(c.key)));
  const takes = (k) => MODEL_KEY.test(k) || LOOK_ALWAYS.has(k) || (LOOK_IF_DONOR.has(k) && donorKeys.has(k));
  const kept = tTop.filter((c) => !takes(lc(c.key))).map((c) => raw(text, c));
  const kind = stylesOf(text, donorId).kind;
  const carried = [];
  for (const c of dTop) {
    const k = lc(c.key);
    if (!takes(k)) continue;
    carried.push(c.isBlock && k === 'visuals' ? donorVisuals(text, c, opts.style, kind, toUtf8(donor.name)) : raw(text, c));
  }
  return block(target.id, kept.concat(carried));
}

// A block, or null when the donor, the target or the style has gone: a pick Valve took away
// drops out of the build the way a cosmetic does. A style that went keeps the look itself.
function patchOrNull(text, target, donor, style) {
  try { return heroItemPatch(text, target, donor, { style }); } catch { /* retried plain below */ }
  if (style == null) return null;
  try { return heroItemPatch(text, target, donor, {}); } catch { return null; }
}

// ---------- what the Arsenal screen gets ----------

/**
 * Every hero with something to wear, A-Z.
 * @returns {Array<{hero: string, key: string, name: string, counts: {arcana: number, immortal: number, total: number}}>}
 */
function heroList(text) {
  const { heroes, wearables } = heroMap(text);
  const out = [];
  for (const H of heroes.values()) {
    const counts = { arcana: 0, immortal: 0, total: 0 };
    for (const S of H.slots.values()) {
      for (const head of S.heads) {
        counts.total++;
        const r = wearables.get(head.id).rarity;
        if (r === 'arcana' || r === 'immortal') counts[r]++;
      }
    }
    if (counts.total) out.push({ hero: H.hero, key: H.key, name: H.name, counts });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * One hero, slot by slot, with its sets.
 * @param {string} text
 * @param {string} hero
 * @param {object} [opts]
 * @param {Map<string, {recordId: string, itemId: string, style: string|null}>} [opts.picks]  live picks by slot
 * @param {(name: string) => string} [opts.styleName]  turns a style's "#token" into words
 */
function heroView(text, hero, { picks = new Map(), styleName = (s) => s } = {}) {
  const H = findHero(text, hero);
  if (!H) return null;
  const { wearables } = heroMap(text);
  const brief = (id) => { const w = wearables.get(id); return { id, name: w.name, rarity: w.rarity, store: w.store }; };
  const slots = [...H.slots.values()]
    .filter((S) => S.heads.length || picks.has(S.slot))
    .sort((a, b) => compareSlots(a.slot, b.slot))
    .map((S) => ({
      slot: S.slot,
      target: S.target,
      shared: S.shared.slice(),
      persona: S.persona,
      picked: picks.get(S.slot) || null,
      options: S.heads.map((head) => {
        const w = wearables.get(head.id);
        const styles = w.hasStyles ? choosableStyles(text, w.id) : [];
        return {
          id: w.id, name: w.name, rarity: w.rarity, image: w.image, store: w.store,
          styles: styles.map((s) => ({ index: s.index, name: styleName(s.name) })),
          variants: head.variants.map(brief),
        };
      }),
    }));
  return { hero: H.hero, key: H.key, name: H.name, slots, sets: heroSets(text, H.hero) };
}

// ---------- sets, from the game's bundles ----------

// name -> id over the whole table: bundles and item_sets list their members by name, and names
// are unique across all 26 000 numbered items
function byName(text) {
  const map = heroMap(text);
  if (!map.byName) {
    map.byName = new Map();
    for (const it of listItems(text)) if (it.name && !map.byName.has(it.name)) map.byName.set(it.name, it.id);
  }
  return map.byName;
}

// member name -> the item_set it belongs to, to split a bundle that puts two items in one slot
function setOf(text) {
  const map = heroMap(text);
  if (!map.setOf) {
    map.setOf = new Map();
    const section = sectionOf(text, 'item_sets');
    if (section) {
      eachChild(text, section, (set) => {
        if (!set.isBlock) return;
        eachChild(text, set.body, (f) => {
          if (!f.isBlock || lc(f.key) !== 'items') return;
          eachChild(text, f.body, (m) => { if (!map.setOf.has(m.key)) map.setOf.set(m.key, set.key); });
        });
      });
    }
  }
  return map.setOf;
}

/* A bundle's members that can go on this hero, one per slot. Four immortal bundles combine a new
 * set with the arcana's own and so put two items in one slot; the one from the set most of the
 * bundle belongs to wins. Loading screens, taunts and tools are not wearables and are named in
 * `skipped`, as is the item that lost its slot. */
function bundleMembers(text, H, bundle) {
  const { wearables } = heroMap(text);
  const names = byName(text);
  const picked = new Map();
  const skipped = [];
  const clashes = [];
  for (const name of bundle.members) {
    const id = names.get(name);
    const slot = id && H.itemSlots.get(id);
    if (!slot) { skipped.push(toUtf8(name)); continue; }
    const member = { slot, itemId: id, name: wearables.get(id).name, raw: name };
    if (picked.has(slot)) clashes.push(member); else picked.set(slot, member);
  }
  if (clashes.length) {
    const sets = setOf(text);
    const votes = new Map();
    for (const name of bundle.members) { const s = sets.get(name); if (s) votes.set(s, (votes.get(s) || 0) + 1); }
    const major = [...votes].sort((a, b) => b[1] - a[1])[0];
    for (const m of clashes) {
      const held = picked.get(m.slot);
      if (major && sets.get(m.raw) === major[0] && sets.get(held.raw) !== major[0]) {
        picked.set(m.slot, m);
        skipped.push(held.name);
      } else {
        skipped.push(m.name);
      }
    }
  }
  const members = [...picked.values()].sort((a, b) => compareSlots(a.slot, b.slot))
    .map(({ slot, itemId, name }) => ({ slot, itemId, name }));
  return { members, skipped };
}

/** @returns {Array<{id: string, name: string, rarity: string, store: boolean, members: Array<{slot: string, itemId: string, name: string}>}>} */
function heroSets(text, hero) {
  const H = findHero(text, hero);
  if (!H) return [];
  const out = [];
  for (const b of heroMap(text).bundles.get(H.hero) || []) {
    const { members } = bundleMembers(text, H, b);
    if (members.length) out.push({ id: b.id, name: b.name, rarity: b.rarity, store: b.sold, members });
  }
  return out.sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity) || a.name.localeCompare(b.name));
}

/**
 * One bundle of one hero, ready to equip.
 * @returns {{hero: string, name: string, members: Array<{slot: string, itemId: string, name: string}>, skipped: string[]}}
 */
function setFor(text, hero, bundleId) {
  const H = findHero(text, hero);
  if (!H) throw new Error(t('Героя {0} нет в таблице предметов игры', hero));
  const b = (heroMap(text).bundles.get(H.hero) || []).find((x) => x.id === String(bundleId));
  if (!b) throw new Error(t('Набор {0} не найден у героя {1}', bundleId, H.name));
  return { hero: H.hero, name: b.name, ...bundleMembers(text, H, b) };
}

// ---------- picks ----------

/** The default item a hero's slot dresses, or null. Several heroes' slots can name the same one. */
function targetOf(text, hero, slot) {
  const H = heroMap(text).heroes.get(hero);
  const S = H && H.slots.get(slot);
  return S ? S.target : null;
}

/**
 * Check a pick against the game's table and say how it is stored. `target` is the default item
 * it dresses, which a pick for another hero may dress too (see targetClashes).
 * @returns {{key: string, itemId: string, name: string, itemName: string, hero: string, slot: string, style: string|null, target: string}}
 */
function resolvePick(text, hero, slot, itemId, style) {
  const H = findHero(text, hero);
  if (!H) throw new Error(t('Героя {0} нет в таблице предметов игры', hero));
  const S = H.slots.get(String(slot || ''));
  if (!S) throw new Error(t('У героя {0} нет слота {1}', H.name, slot));
  const id = String(itemId == null ? '' : itemId);
  const w = heroMap(text).wearables.get(id);
  if (!w || H.itemSlots.get(id) !== S.slot) throw new Error(t('Предмет {0} не надевается на {1} в слот {2}', w ? w.name : id, H.name, S.slot));
  // the first style is what the item looks like anyway, so it is stored as no style at all
  const chosen = style == null || style === '' || String(style) === '0' ? null : String(style);
  if (chosen !== null && !choosableStyles(text, id).some((s) => s.index === chosen)) {
    throw new Error(t('У предмета {0} нет стиля {1}', w.name, chosen));
  }
  return {
    key: slotKey(H.hero, S.slot), itemId: itemKey(id, chosen), name: `${H.name} · ${w.name}`, itemName: w.name,
    hero: H.hero, slot: S.slot, style: chosen, target: S.target,
  };
}

// A live record's hero slot and donor, or null when the table no longer has them: the one test
// both the build and the clash report go by, so they cannot disagree about what lands.
function landing(heroes, rec) {
  const at = parseSlotKey(rec.slot);
  if (!at) return null;
  const { itemId, style } = parseItemKey(rec.itemId);
  const H = heroes.get(at.hero);
  const S = H && H.slots.get(at.slot);
  if (!S || H.itemSlots.get(itemId) !== at.slot) return null; // a donor or a default Valve removed
  return { at, S, itemId, style };
}

/**
 * Live picks that put different looks on one default item. The table holds one block per item,
 * the last one written, so of a default several heroes share (8366, the pet of ten) only one
 * pick is drawn. A new pick switches its rivals off (schema-service); this names what an older
 * library, a preset or My mods left on together.
 * @param {string} text  the game's own table
 * @param {Array<{slot: string, itemId: string, name: string}>} records  live 'hero:' records
 * @returns {Array<{id: string, name: string, mods: string[]}>}  shaped like the mods' own clashes
 */
function targetClashes(text, records) {
  const { heroes } = heroMap(text);
  const byTarget = new Map();
  for (const rec of records) {
    const hit = landing(heroes, rec);
    if (!hit) continue;
    const entry = byTarget.get(hit.S.target) || byTarget.set(hit.S.target, { mods: [], looks: new Set() }).get(hit.S.target);
    entry.mods.push(rec.name);
    entry.looks.add(String(rec.itemId));
  }
  const index = itemIndex(text);
  return [...byTarget]
    .filter(([, e]) => e.looks.size > 1) // the same look twice draws the same thing
    .map(([id, e]) => ({ id, name: toUtf8((index.get(id) || {}).name || id), mods: e.mods }));
}

/**
 * The blocks the live hero picks put into the table, plus the persona selector a *_persona_N
 * pick needs to be seen at all.
 * @param {string} text  the game's own table
 * @param {Array<{slot: string, itemId: string, name: string}>} records  live 'hero:' records
 * @returns {Array<{id: string, block: string, source: string}>}
 */
function heroPatches(text, records) {
  const { heroes } = heroMap(text);
  const out = [];
  const personaWanted = new Map();
  const selectorPicked = new Set();
  for (const rec of records) {
    const hit = landing(heroes, rec);
    if (!hit) continue;
    const { at, S, itemId, style } = hit;
    const patch = patchOrNull(text, S.target, itemId, style);
    if (!patch) continue;
    out.push({ id: S.target, block: patch, source: rec.name });
    if (at.slot === 'persona_selector') selectorPicked.add(at.hero);
    const n = personaOf(at.slot);
    if (n && !personaWanted.has(at.hero)) personaWanted.set(at.hero, { n, source: rec.name });
  }
  for (const [hero, want] of personaWanted) {
    if (selectorPicked.has(hero)) continue;
    const H = heroes.get(hero);
    const S = H.slots.get('persona_selector');
    const persona = H.personas.find((p) => p.persona === want.n) || H.personas[0];
    const patch = S && persona ? patchOrNull(text, S.target, persona.id, null) : null;
    if (patch) out.push({ id: S.target, block: patch, source: want.source });
  }
  return out;
}

// ---------- style names ----------

/** Every "#token" a hero wearable's style is named with, lower case and without the '#'. */
function styleTokens(text) {
  const { wearables } = heroMap(text);
  const out = new Set();
  for (const w of wearables.values()) {
    if (!w.hasStyles) continue;
    for (const s of (stylesOf(text, w.id) || { styles: [] }).styles) {
      if (s.name.startsWith('#')) out.add(s.name.slice(1).toLowerCase());
    }
  }
  return out;
}

/**
 * The wanted tokens out of a localization file ("Tokens" { "Key" "Text" }).
 * @param {string} locText
 * @param {Set<string>} wanted  lower-case keys
 * @returns {Map<string, string>}  lower-case key -> text
 */
function readTokens(locText, wanted) {
  const out = new Map();
  const re = /"([^"\r\n]+)"[ \t]+"((?:[^"\\\r\n]|\\.)*)"/g;
  let m;
  while ((m = re.exec(locText))) {
    const key = m[1].toLowerCase();
    if (wanted.has(key) && !out.has(key)) out.set(key, m[2].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim());
  }
  return out;
}

module.exports = {
  slotKey, isHeroSlot, parseSlotKey, itemKey, parseItemKey, compareSlots,
  heroMap, findHero, heroList, heroView, heroSets, setFor,
  stylesOf, heroItemPatch, targetOf, resolvePick, heroPatches, targetClashes,
  styleTokens, readTokens,
};
