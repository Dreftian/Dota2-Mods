// Generates a native Dota 2 VPK mod that overrides rank medals, star pips and hero badges
// without requiring any external download. Uses original compiled .vtex_c assets.
const fs = require('fs');
const path = require('path');
const { buildVpk, crc32 } = require('./vpk');
const { t } = require('./i18n');
const {
  renderRankPlaqueDigits,
  createHeroLevelVtex,
  patchCssResource,
} = require('./rank-drawing');

const ASSETS_ROOT = path.join(__dirname, 'assets', 'ranks');

/** Official Dota 2 rank medals with tier boundaries and star MMR values. */
const RANK_MEDALS = [
  { id: 'rank0', nameRu: 'Без калибровки', nameEn: 'Not Calibrated', nameEs: 'Sin calibrar', tier: 0, defaultMmr: 0 },
  { id: 'rank1', nameRu: 'Рекрут', nameEn: 'Herald', nameEs: 'Heraldo', tier: 1, minMmr: 0, maxMmr: 769, stars: [0, 150, 300, 460, 610], defaultMmr: 300 },
  { id: 'rank2', nameRu: 'Страж', nameEn: 'Guardian', nameEs: 'Guardián', tier: 2, minMmr: 770, maxMmr: 1539, stars: [770, 920, 1080, 1230, 1400], defaultMmr: 1080 },
  { id: 'rank3', nameRu: 'Рыцарь', nameEn: 'Crusader', nameEs: 'Cruzado', tier: 3, minMmr: 1540, maxMmr: 2309, stars: [1540, 1700, 1850, 2000, 2150], defaultMmr: 1850 },
  { id: 'rank4', nameRu: 'Герой', nameEn: 'Archon', nameEs: 'Arconte', tier: 4, minMmr: 2310, maxMmr: 3079, stars: [2310, 2450, 2610, 2770, 2930], defaultMmr: 2610 },
  { id: 'rank5', nameRu: 'Легенда', nameEn: 'Legend', nameEs: 'Leyenda', tier: 5, minMmr: 3080, maxMmr: 3849, stars: [3080, 3230, 3390, 3540, 3700], defaultMmr: 3390 },
  { id: 'rank6', nameRu: 'Властелин', nameEn: 'Ancient', nameEs: 'Ancestral', tier: 6, minMmr: 3850, maxMmr: 4619, stars: [3850, 4000, 4150, 4300, 4460], defaultMmr: 4150 },
  { id: 'rank7', nameRu: 'Божество', nameEn: 'Divine', nameEs: 'Divino', tier: 7, minMmr: 4620, maxMmr: 5499, stars: [4620, 4820, 5020, 5220, 5420], defaultMmr: 5020 },
  { id: 'rank8', nameRu: 'Титан', nameEn: 'Immortal', nameEs: 'Inmortal', tier: 8, minMmr: 5620, maxMmr: 8619, stars: [], defaultMmr: 5620 },
  { id: 'rank8a', nameRu: 'Титан (Топ 1000)', nameEn: 'Immortal Top 1000', nameEs: 'Inmortal Top 1000', tier: 8, minMmr: 8620, maxMmr: 10619, stars: [], defaultMmr: 8620 },
  { id: 'rank8b', nameRu: 'Титан (Топ 100)', nameEn: 'Immortal Top 100', nameEs: 'Inmortal Top 100', tier: 8, minMmr: 10620, maxMmr: 12619, stars: [], defaultMmr: 10620 },
  { id: 'rank8c', nameRu: 'Титан (Топ 10)', nameEn: 'Immortal Top 10', nameEs: 'Inmortal Top 10', tier: 8, minMmr: 12620, maxMmr: 16000, stars: [], defaultMmr: 12620 },
];

/** Dota Plus Hero Tier progression badges and level ranges. */
const HERO_TIERS = [
  { id: 0, nameRu: 'Бронза (Ур. 1-5)', nameEn: 'Bronze (Lv 1-5)', nameEs: 'Bronce (Lv 1-5)', minLevel: 1, maxLevel: 5, defaultLevel: 5 },
  { id: 1, nameRu: 'Серебро (Ур. 6-11)', nameEn: 'Silver (Lv 6-11)', nameEs: 'Plata (Lv 6-11)', minLevel: 6, maxLevel: 11, defaultLevel: 11 },
  { id: 2, nameRu: 'Золото (Ур. 12-17)', nameEn: 'Gold (Lv 12-17)', nameEs: 'Oro (Lv 12-17)', minLevel: 12, maxLevel: 17, defaultLevel: 17 },
  { id: 3, nameRu: 'Платина (Ур. 18-24)', nameEn: 'Platinum (Lv 18-24)', nameEs: 'Platino (Lv 18-24)', minLevel: 18, maxLevel: 24, defaultLevel: 24 },
  { id: 4, nameRu: 'Мастер (Ур. 25-29)', nameEn: 'Master (Lv 25-29)', nameEs: 'Maestro (Lv 25-29)', minLevel: 25, maxLevel: 29, defaultLevel: 29 },
  { id: 5, nameRu: 'Грандмастер (Ур. 30)', nameEn: 'Grandmaster (Lv 30)', nameEs: 'Gran Maestro (Lv 30)', minLevel: 30, maxLevel: 30, defaultLevel: 30 },
];

const ALL_RANK_SLOTS = [
  'rank0_psd', 'rank1_psd', 'rank2_psd', 'rank3_psd', 'rank4_psd',
  'rank5_psd', 'rank6_psd', 'rank7_psd', 'rank8_psd', 'rank8a_psd',
  'rank8b_psd', 'rank8c_psd',
];

function readAssetSafe(subfolder, fileName) {
  const p = path.join(ASSETS_ROOT, subfolder, fileName);
  if (fs.existsSync(p)) return fs.readFileSync(p);
  return null;
}

/**
 * Generates a self-contained single-file VPK buffer overriding rank icons,
 * star pips, and Dota Plus hero badges.
 *
 * @param {object} opts
 * @param {string} [opts.medal] e.g. 'rank8c', 'rank3'
 * @param {number} [opts.stars] e.g. 1 to 5 (0 for none)
 * @param {number} [opts.mmr] e.g. 12620
 * @param {number} [opts.heroTier] 0 to 5, or null to keep original
 * @param {number} [opts.heroLevel] 1 to 99
 * @returns {{ buffer: Buffer, name: string, medalInfo: object }}
 */
function generateRankVpk({
  medal = 'rank8c',
  stars = 5,
  mmr = 12620,
  immortalRank = 10,
  heroTier = 5,
  heroLevel = 30,
} = {}) {
  let targetMedalId = medal;
  const isImmortal = targetMedalId.startsWith('rank8');
  const numImmortalRank = isImmortal ? Math.max(1, Number(immortalRank) || 10) : null;

  // If Immortal and an immortalRank is specified, select the best matching medal tier
  if (isImmortal && numImmortalRank !== null) {
    if (numImmortalRank <= 10) targetMedalId = 'rank8c';
    else if (numImmortalRank <= 100) targetMedalId = 'rank8b';
    else if (numImmortalRank <= 1000) targetMedalId = 'rank8a';
    else targetMedalId = 'rank8a';
  }

  const medalMeta = RANK_MEDALS.find((m) => m.id === targetMedalId) || RANK_MEDALS[RANK_MEDALS.length - 1];
  const entries = [];

  // 1. Rank Medals: Map every rank slot to the selected medal's .vtex_c data
  const medalAssetFile = `${medalMeta.id}_psd.vtex_c`;
  let medalBuf = readAssetSafe('ranks', medalAssetFile);
  if (!medalBuf) {
    // fallback to highest available immortal if missing
    medalBuf = readAssetSafe('ranks', 'rank8c_psd.vtex_c') || readAssetSafe('ranks', 'rank0_psd.vtex_c');
  }

  if (medalBuf) {
    if (isImmortal && numImmortalRank) {
      medalBuf = renderRankPlaqueDigits(medalBuf, numImmortalRank);
    }
    const medalCrc = crc32(medalBuf);
    for (const slot of ALL_RANK_SLOTS) {
      entries.push({
        ext: 'vtex_c',
        folder: 'panorama/images/rank_tier_icons',
        name: slot,
        crc: medalCrc,
        preload: Buffer.alloc(0),
        data: medalBuf,
      });
    }

    // Also map mini medal icons if present
    let miniAsset = readAssetSafe('ranks', `${medalMeta.id}_mini_psd.vtex_c`)
      || readAssetSafe('mini', `${medalMeta.id}_psd.vtex_c`)
      || medalBuf;
    if (isImmortal && numImmortalRank && miniAsset) {
      miniAsset = renderRankPlaqueDigits(miniAsset, numImmortalRank);
    }
    const miniCrc = crc32(miniAsset);
    for (const slot of ALL_RANK_SLOTS) {
      entries.push({
        ext: 'vtex_c',
        folder: 'panorama/images/rank_tier_icons/mini',
        name: slot,
        crc: miniCrc,
        preload: Buffer.alloc(0),
        data: miniAsset,
      });
    }

    // For immortal ranks, patch ui_rank_badge.vcss_c so empty server text does not cover plaque
    if (isImmortal) {
      const uiRankCss = readAssetSafe('styles', 'ui_rank_badge.vcss_c');
      if (uiRankCss) {
        const patchedUiRank = patchCssResource(
          uiRankCss,
          '#RankLeaderboard{color: #F7E5c3;letter-spacing: 1px;font-size: 14px;',
          '#RankLeaderboard{visibility: collapse !important;font-size: 0px !important;color: transparent !important;',
        );
        entries.push({
          ext: 'vcss_c',
          folder: 'panorama/styles',
          name: 'ui_rank_badge',
          crc: crc32(patchedUiRank),
          preload: Buffer.alloc(0),
          data: patchedUiRank,
        });
      }
    }
  }

  // 2. Star Pips: If stars > 0 and medal tier < 8 (Immortal has no stars), map all pips to the chosen count
  const numStars = isImmortal ? 0 : Math.max(0, Math.min(5, Number(stars) || 0));

  if (numStars > 0) {
    const pipAssetFile = `pip${numStars}_psd.vtex_c`;
    const pipBuf = readAssetSafe('ranks', pipAssetFile);
    if (pipBuf) {
      const pipCrc = crc32(pipBuf);
      for (let i = 1; i <= 7; i++) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/rank_tier_icons',
          name: `pip${i}_psd`,
          crc: pipCrc,
          preload: Buffer.alloc(0),
          data: pipBuf,
        });
      }
    }
  }

  // 3. Dota Plus Hero Badges: Map tier 0..5 to the chosen heroTier
  if (heroTier !== null && heroTier !== undefined) {
    const tierNum = Math.max(0, Math.min(5, Number(heroTier)));
    const badgeNormal = readAssetSafe('hero_badges', `hero_badge_rank_${tierNum}_png.vtex_c`);
    const badgeSmall = readAssetSafe('hero_badges', `hero_badge_rank_${tierNum}_small_png.vtex_c`) || badgeNormal;
    const badgeTiny = readAssetSafe('hero_badges', `hero_badge_rank_${tierNum}_tiny_png.vtex_c`) || badgeSmall;

    if (badgeNormal) {
      const bCrc = crc32(badgeNormal);
      const sCrc = crc32(badgeSmall);
      const tCrc = crc32(badgeTiny);

      for (let i = 0; i <= 5; i++) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: `hero_badge_rank_${i}_png`,
          crc: bCrc,
          preload: Buffer.alloc(0),
          data: badgeNormal,
        });
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: `hero_badge_rank_${i}_small_png`,
          crc: sCrc,
          preload: Buffer.alloc(0),
          data: badgeSmall,
        });
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: `hero_badge_rank_${i}_tiny_png`,
          crc: tCrc,
          preload: Buffer.alloc(0),
          data: badgeTiny,
        });
      }

      // Also override empty/unranked badges so unleveled heroes show the selected tier
      for (const slotName of ['hero_badge_rank_empty_psd', 'hero_badge_rank_empty_png']) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: slotName,
          crc: bCrc,
          preload: Buffer.alloc(0),
          data: badgeNormal,
        });
      }
      for (const slotName of ['hero_badge_rank_empty_small_psd', 'hero_badge_rank_empty_small_png']) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: slotName,
          crc: sCrc,
          preload: Buffer.alloc(0),
          data: badgeSmall,
        });
      }
      for (const slotName of ['hero_badge_rank_empty_tiny_psd', 'hero_badge_rank_empty_tiny_png']) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: slotName,
          crc: tCrc,
          preload: Buffer.alloc(0),
          data: badgeTiny,
        });
      }

      // Generate custom level digit texture for hero cards and badge views
      const baseTinyPath = path.join(ASSETS_ROOT, 'hero_badges', 'hero_badge_rank_0_tiny_png.vtex_c');
      if (fs.existsSync(baseTinyPath)) {
        const levelVtex = createHeroLevelVtex(heroLevel, baseTinyPath);
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: 'custom_hero_level_png',
          crc: crc32(levelVtex),
          preload: Buffer.alloc(0),
          data: levelVtex,
        });

        // Patch hero_grid_new.vcss_c to render the custom level texture in hero picker grid
        const heroGridCss = readAssetSafe('styles', 'hero_grid_new.vcss_c');
        if (heroGridCss) {
          let patchedGrid = patchCssResource(
            heroGridCss,
            '#HeroBadgeLevel{font-size: 12px;color: white;font-weight: bold;text-align: center;text-shadow: 0px 0px 4px 2.0 black;',
            '#HeroBadgeLevel{color: transparent !important;text-shadow: none !important;background-image: url("s2r://panorama/images/hero_badges/custom_hero_level_png.vtex");background-size: contain;background-position: center;background-repeat: no-repeat;',
          );
          patchedGrid = patchCssResource(
            patchedGrid,
            '.NoTier #HeroBadgeStatus{visibility: collapse;}',
            '.NoTier #HeroBadgeStatus{visibility: visible;}',
          );
          entries.push({
            ext: 'vcss_c',
            folder: 'panorama/styles',
            name: 'hero_grid_new',
            crc: crc32(patchedGrid),
            preload: Buffer.alloc(0),
            data: patchedGrid,
          });
        }

        // Patch hero_badge.vcss_c to render the custom level texture on hero profile and loadout
        const heroBadgeCss = readAssetSafe('styles', 'hero_badge.vcss_c');
        if (heroBadgeCss) {
          let patchedBadge = patchCssResource(
            heroBadgeCss,
            'DOTAHeroBadge.LevelStyle > Label{vertical-align: middle;horizontal-align: center;font-size: 29px;color: white;font-weight: bold;text-shadow: 0px 0px 6px 6.0 black;',
            'DOTAHeroBadge.LevelStyle > Label{color: transparent !important;text-shadow: none !important;background-image: url("s2r://panorama/images/hero_badges/custom_hero_level_png.vtex");background-size: contain;background-position: center;background-repeat: no-repeat;',
          );
          patchedBadge = patchCssResource(
            patchedBadge,
            'DOTAHeroBadge.ModelStyle > Label{vertical-align: middle;horizontal-align: center;font-size: 29px;color: white;font-weight: bold;',
            'DOTAHeroBadge.ModelStyle > Label{color: transparent !important;text-shadow: none !important;background-image: url("s2r://panorama/images/hero_badges/custom_hero_level_png.vtex");background-size: contain;background-position: center;background-repeat: no-repeat;',
          );
          entries.push({
            ext: 'vcss_c',
            folder: 'panorama/styles',
            name: 'hero_badge',
            crc: crc32(patchedBadge),
            preload: Buffer.alloc(0),
            data: patchedBadge,
          });
        }
      }
    }
  }

  if (entries.length === 0) {
    throw new Error(t('Не удалось сформировать VPK рангов: отсутствуют файлы ресурсов'));
  }

  const buffer = buildVpk(entries);
  const starsLabel = numStars > 0
    ? `${numStars}★`
    : (isImmortal ? `#${numImmortalRank || 10}` : '');
  const tierInfo = HERO_TIERS.find((t) => t.id === heroTier);
  const tierLabel = tierInfo ? `${tierInfo.nameEn} Lv ${heroLevel}` : '';
  const modTitle = `Rank Changer (${medalMeta.nameEn} ${starsLabel} · ${mmr} MMR · ${tierLabel})`;

  return {
    buffer,
    name: modTitle,
    medalInfo: medalMeta,
    stars: numStars,
    mmr: Number(mmr) || medalMeta.defaultMmr,
    immortalRank: numImmortalRank,
    heroTier,
    heroLevel: Number(heroLevel) || 30,
  };
}

module.exports = {
  RANK_MEDALS,
  HERO_TIERS,
  generateRankVpk,
};
