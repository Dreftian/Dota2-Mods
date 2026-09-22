// Generates a native Dota 2 VPK mod that overrides rank medals, star pips and hero badges
// without requiring any external download. Uses original compiled .vtex_c assets.
const fs = require('fs');
const path = require('path');
const { buildVpk, crc32 } = require('./vpk');
const { t } = require('./i18n');
const {
  renderRankPlaqueDigits,
  renderHeroBadgeDigits,
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
 * @param {string} [opts.baseRank] Target account base slot ('rank0' default, or 'rank1'..'rank8', or 'all')
 * @param {number} [opts.stars] e.g. 1 to 5 (0 for none)
 * @param {number} [opts.mmr] e.g. 12620
 * @param {number} [opts.immortalRank] Leaderboard rank number (1-50000)
 * @param {number} [opts.heroTier] 0 to 5, or null to keep original
 * @param {number} [opts.heroLevel] 1 to 99
 * @returns {{ buffer: Buffer, name: string, medalInfo: object, baseRank?: string, stars?: number, mmr?: number, immortalRank?: number|null, heroTier?: number|null, heroLevel?: number }}
 */
function generateRankVpk({
  medal = 'rank8c',
  baseRank = 'rank0',
  stars = 5,
  mmr = 12620,
  immortalRank = 10,
  heroTier = 5,
  heroLevel = 30,
} = {}) {
  let targetMedalId = medal;
  const isImmortal = targetMedalId.startsWith('rank8');
  let numImmortalRank = isImmortal && immortalRank !== null && immortalRank !== undefined
    ? Math.max(1, Math.round(Number(immortalRank)) || 10)
    : null;

  // If Immortal and an immortalRank is specified, map or clamp according to tier
  if (isImmortal && numImmortalRank !== null) {
    if (medal === 'rank8') {
      if (numImmortalRank <= 10) targetMedalId = 'rank8c';
      else if (numImmortalRank <= 100) targetMedalId = 'rank8b';
      else if (numImmortalRank <= 1000) targetMedalId = 'rank8a';
      else targetMedalId = 'rank8';
    } else if (medal === 'rank8c') {
      numImmortalRank = Math.max(1, Math.min(10, numImmortalRank));
    } else if (medal === 'rank8b') {
      numImmortalRank = Math.max(11, Math.min(100, numImmortalRank));
    } else if (medal === 'rank8a') {
      numImmortalRank = Math.max(101, Math.min(6000, numImmortalRank));
    }
  }

  const medalMeta = RANK_MEDALS.find((m) => m.id === targetMedalId) || RANK_MEDALS[RANK_MEDALS.length - 1];
  const entries = [];

  const ALL_RANK_SLOTS = [
    'rank0_psd',
    'rank1_psd',
    'rank2_psd',
    'rank3_psd',
    'rank4_psd',
    'rank5_psd',
    'rank6_psd',
    'rank7_psd',
    'rank8_psd',
    'rank8a_psd',
    'rank8b_psd',
    'rank8c_psd',
    'rank8inactive_psd',
  ];

  const ALL_MINI_RANK_SLOTS = [
    'rank0_psd',
    'rank1_psd',
    'rank2_psd',
    'rank3_psd',
    'rank4_psd',
    'rank5_psd',
    'rank6_psd',
    'rank7_psd',
    'rank8_psd',
    'rank8a_psd',
    'rank8b_psd',
    'rank8c_psd',
    'rank8inactive_psd',
  ];

  const ALL_PIP_SLOTS = [
    'pip1_psd',
    'pip2_psd',
    'pip3_psd',
    'pip4_psd',
    'pip5_psd',
    'pip6_psd',
    'pip7_psd',
  ];

  // 1. Rank Medals: Generate full-size rank textures with baked plaque digits
  const medalAssetFile = `${targetMedalId}_psd.vtex_c`;
  let medalBuf = readAssetSafe('ranks', medalAssetFile);
  if (!medalBuf) {
    medalBuf = readAssetSafe('ranks', 'rank8c_psd.vtex_c') || readAssetSafe('ranks', 'rank0_psd.vtex_c');
  }

  if (medalBuf) {
    if (isImmortal && numImmortalRank) {
      medalBuf = renderRankPlaqueDigits(medalBuf, numImmortalRank);
    }
    const medalCrc = crc32(medalBuf);

    // Determine target rank slots to replace:
    // If baseRank === 'all', replace everything. Otherwise, replace user's account rank slot.
    // In Dota 2, uncalibrated/inactive accounts display rank0_psd or rank8inactive_psd.
    let targetRankSlots;
    if (baseRank === 'all') {
      targetRankSlots = ALL_RANK_SLOTS;
    } else if (baseRank === 'rank0') {
      targetRankSlots = ['rank0_psd', 'rank8inactive_psd'];
    } else if (baseRank.startsWith('rank8')) {
      targetRankSlots = [`${baseRank}_psd`, 'rank8inactive_psd'];
    } else if (ALL_RANK_SLOTS.includes(`${baseRank}_psd`)) {
      targetRankSlots = [`${baseRank}_psd`];
    } else {
      targetRankSlots = ['rank0_psd', 'rank8inactive_psd'];
    }

    for (const slot of targetRankSlots) {
      entries.push({
        ext: 'vtex_c',
        folder: 'panorama/images/rank_tier_icons',
        name: slot,
        crc: medalCrc,
        preload: Buffer.alloc(0),
        data: medalBuf,
      });
    }

    entries.push({
      ext: 'vtex_c',
      folder: 'panorama/images/rank_tier_icons',
      name: 'custom_profile_rank_psd',
      crc: medalCrc,
      preload: Buffer.alloc(0),
      data: medalBuf,
    });

    // Mini medal icons
    let miniAsset = null;
    if (isImmortal) {
      miniAsset = readAssetSafe('ranks', `${targetMedalId}_mini_psd.vtex_c`)
        || readAssetSafe('mini', `${targetMedalId}_psd.vtex_c`)
        || readAssetSafe('ranks', 'rank8_mini_psd.vtex_c')
        || medalBuf;
      if (numImmortalRank && miniAsset) {
        miniAsset = renderRankPlaqueDigits(miniAsset, numImmortalRank);
      }
    } else {
      miniAsset = readAssetSafe('mini', `${targetMedalId}_psd.vtex_c`)
        || readAssetSafe('ranks', `${targetMedalId}_mini_psd.vtex_c`)
        || medalBuf;
    }

    if (miniAsset) {
      const miniCrc = crc32(miniAsset);
      let targetMiniSlots;
      if (baseRank === 'all') {
        targetMiniSlots = ALL_MINI_RANK_SLOTS;
      } else if (baseRank === 'rank0') {
        targetMiniSlots = ['rank0_psd', 'rank8inactive_psd'];
      } else if (baseRank.startsWith('rank8')) {
        targetMiniSlots = [`${baseRank}_psd`, 'rank8inactive_psd'];
      } else if (ALL_MINI_RANK_SLOTS.includes(`${baseRank}_psd`)) {
        targetMiniSlots = [`${baseRank}_psd`];
      } else {
        targetMiniSlots = ['rank0_psd', 'rank8inactive_psd'];
      }

      for (const slot of targetMiniSlots) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/rank_tier_icons/mini',
          name: slot,
          crc: miniCrc,
          preload: Buffer.alloc(0),
          data: miniAsset,
        });
      }

      if (baseRank === 'all') {
        for (const suffix of ['8', '8a', '8b', '8c']) {
          entries.push({
            ext: 'vtex_c',
            folder: 'panorama/images/rank_tier_icons',
            name: `rank${suffix}_mini_psd`,
            crc: miniCrc,
            preload: Buffer.alloc(0),
            data: miniAsset,
          });
        }
      }

      if (baseRank === 'all' || baseRank === 'rank0' || baseRank.startsWith('rank8')) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/rank_tier_icons',
          name: 'rank8inactive_mini_psd',
          crc: miniCrc,
          preload: Buffer.alloc(0),
          data: miniAsset,
        });
      }

      entries.push({
        ext: 'vtex_c',
        folder: 'panorama/images/rank_tier_icons/mini',
        name: 'custom_profile_rank_mini_psd',
        crc: miniCrc,
        preload: Buffer.alloc(0),
        data: miniAsset,
      });
    }
  }

  // 2. Star Pips: If stars > 0 render matching pips; if Immortal or 0 stars, render transparent pips
  const numStars = isImmortal ? 0 : Math.max(0, Math.min(5, Number(stars) || 0));
  let pipBuf = null;
  if (numStars > 0) {
    pipBuf = readAssetSafe('ranks', `pip${numStars}_psd.vtex_c`);
  }
  if (!pipBuf) {
    const basePip = readAssetSafe('ranks', 'pip1_psd.vtex_c');
    if (basePip) {
      const headerSize = basePip.readUInt32LE(0);
      pipBuf = Buffer.concat([basePip.subarray(0, headerSize), Buffer.alloc(262144, 0)]);
    }
  }

  if (pipBuf) {
    const pipCrc = crc32(pipBuf);
    if (baseRank === 'all') {
      for (const slot of ALL_PIP_SLOTS) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/rank_tier_icons',
          name: slot,
          crc: pipCrc,
          preload: Buffer.alloc(0),
          data: pipBuf,
        });
      }
    }
    entries.push({
      ext: 'vtex_c',
      folder: 'panorama/images/rank_tier_icons',
      name: 'custom_profile_pips_psd',
      crc: pipCrc,
      preload: Buffer.alloc(0),
      data: pipBuf,
    });
  }

  // 3. Dota Plus Hero Badges: Render level digits directly onto badge textures with authentic Radiance typography
  if (heroTier !== null && heroTier !== undefined) {
    const tierNum = Math.max(0, Math.min(5, Number(heroTier)));
    const heroLvl = Math.max(1, Math.min(99, Number(heroLevel) || 30));

    const tierAssetBuf = readAssetSafe('hero_badges', `hero_badge_rank_${tierNum}_png.vtex_c`);
    const tierAssetSmall = readAssetSafe('hero_badges', `hero_badge_rank_${tierNum}_small_png.vtex_c`);
    const tierAssetTiny = readAssetSafe('hero_badges', `hero_badge_rank_${tierNum}_tiny_png.vtex_c`);
    const emptyBuf = readAssetSafe('hero_badges', 'hero_badge_rank_empty_psd.vtex_c');

    const bakedBuf = tierAssetBuf ? renderHeroBadgeDigits(tierAssetBuf, heroLvl) : null;
    const bakedSmall = tierAssetSmall ? renderHeroBadgeDigits(tierAssetSmall, heroLvl) : null;
    const bakedTiny = tierAssetTiny ? renderHeroBadgeDigits(tierAssetTiny, heroLvl) : null;
    const bakedEmpty = emptyBuf ? renderHeroBadgeDigits(emptyBuf, heroLvl) : null;

    const ALL_HERO_TIERS = [0, 1, 2, 3, 4, 5];

    if (bakedBuf) {
      const bufCrc = crc32(bakedBuf);
      for (const t of ALL_HERO_TIERS) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: `hero_badge_rank_${t}_png`,
          crc: bufCrc,
          preload: Buffer.alloc(0),
          data: bakedBuf,
        });
      }

      const emptyData = bakedEmpty || bakedBuf;
      entries.push({
        ext: 'vtex_c',
        folder: 'panorama/images/hero_badges',
        name: 'hero_badge_rank_empty_psd',
        crc: crc32(emptyData),
        preload: Buffer.alloc(0),
        data: emptyData,
      });
    }

    if (bakedSmall) {
      const smallCrc = crc32(bakedSmall);
      for (const t of ALL_HERO_TIERS) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: `hero_badge_rank_${t}_small_png`,
          crc: smallCrc,
          preload: Buffer.alloc(0),
          data: bakedSmall,
        });
      }
    }

    if (bakedTiny) {
      const tinyCrc = crc32(bakedTiny);
      for (const t of ALL_HERO_TIERS) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: `hero_badge_rank_${t}_tiny_png`,
          crc: tinyCrc,
          preload: Buffer.alloc(0),
          data: bakedTiny,
        });
      }
    }
  }

  if (entries.length === 0) {
    throw new Error(t('Не удалось сформировать VPK рангов: отсутствуют файлы ресурсов'));
  }

  const buffer = buildVpk(entries);
  const starsLabel = numStars > 0
    ? `${numStars}★`
    : (isImmortal ? (numImmortalRank ? `#${numImmortalRank}` : '') : '');
  const tierInfo = HERO_TIERS.find((t) => t.id === heroTier);
  const tierLabel = tierInfo ? `${tierInfo.nameEn} Lv ${heroLevel}` : '';
  const modTitle = `Rank Changer (${medalMeta.nameEn} ${starsLabel} · ${mmr} MMR · ${tierLabel})`;

  return {
    buffer,
    name: modTitle,
    medalInfo: medalMeta,
    baseRank,
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
