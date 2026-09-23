/* The rank customizer's decisions that need no page: what Apply sends, which base ranks still
 * show the account's own stars, which name a language gets. Kept apart from the markup so
 * node:test can load them without a DOM (test/rank.test.js). */

/** The medals with a leaderboard plate. Plain Immortal (rank8) has an empty one. */
export const LEADERBOARD_MEDALS = ['rank8a', 'rank8b', 'rank8c'];

/** @param {string} medalId */
export function hasLeaderboard(medalId) {
  return LEADERBOARD_MEDALS.includes(medalId);
}

/**
 * A leaderboard place kept inside the range its medal stands for. The Top 1000 range runs to
 * 6000 on purpose (4cc4c89).
 * @param {unknown} val
 * @param {string} medalId
 */
export function clampImmortalRank(val, medalId) {
  const n = Math.round(Number(val)) || 1;
  if (medalId === 'rank8c') return Math.max(1, Math.min(10, n));
  if (medalId === 'rank8b') return Math.max(11, Math.min(100, n));
  if (medalId === 'rank8a') return Math.max(101, Math.min(6000, n));
  return n;
}

/**
 * Whether the game still draws the account's real stars over the medal. A ranked tier (Herald
 * to Divine) always gets its pip image stacked on top; uncalibrated and Immortal get none. The
 * pip slots belong to every player, so the mod cannot hide the real ones for a single profile.
 * @param {string} baseRank
 */
export function realStarsDrawn(baseRank) {
  return /^rank[1-7]$/.test(String(baseRank));
}

/**
 * What Apply sends to ranks:applyCustom.
 *
 * The leaderboard place goes only with a Top medal. The generator reads a number that comes
 * with plain Immortal as a place and swaps in the Top 10, 100 or 1000 medal it belongs to, so
 * the stale default (10, or whatever an earlier Top pick left behind) installed a medal and a
 * number the preview never showed.
 * @param {{ medal: string, baseRank?: string, stars: number, mmr: number, immortalRank?: number|null, heroTier: number, heroLevel: number }} state
 */
export function rankApplyPayload(state) {
  return {
    medal: state.medal,
    baseRank: state.baseRank || 'rank0',
    stars: state.stars,
    mmr: state.mmr,
    immortalRank: hasLeaderboard(state.medal) ? state.immortalRank : null,
    heroTier: state.heroTier,
    heroLevel: state.heroLevel,
  };
}

/**
 * A medal's or tier's name in the UI language. Only Spanish and Russian have names of their
 * own here; Japanese and Chinese read the English one, as the rest of the UI falls back to
 * English for them, rather than Spanish.
 * @param {{ nameEs?: string, nameEn: string, nameRu?: string } | null | undefined} item
 * @param {string} [lang]
 */
export function localizedName(item, lang) {
  if (!item) return '';
  if (lang === 'es') return item.nameEs || item.nameEn;
  if (lang === 'ru') return item.nameRu || item.nameEn;
  return item.nameEn;
}

/**
 * A base-rank option: the local name with the English one beside it, because players look up
 * ranks by the English names whatever language their client is in ("Heraldo (Herald)").
 * @param {{ nameEs?: string, nameEn: string, nameRu?: string }} item
 * @param {string} [lang]
 */
export function baseRankLabel(item, lang) {
  const local = localizedName(item, lang);
  return local === item.nameEn ? local : `${local} (${item.nameEn})`;
}
