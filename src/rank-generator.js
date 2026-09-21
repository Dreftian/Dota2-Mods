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

  // 1. Rank Medals: Generate custom profile rank texture and patch profile CSS.
  // Crucial: Do NOT clobber ALL_RANK_SLOTS globally, so that other players in matches,
  // scoreboards, and top bars keep their authentic, original rank medals!
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

    // Save as dedicated custom profile rank texture
    entries.push({
      ext: 'vtex_c',
      folder: 'panorama/images/rank_tier_icons',
      name: 'custom_profile_rank_psd',
      crc: medalCrc,
      preload: Buffer.alloc(0),
      data: medalBuf,
    });

    // Also map mini medal icons if present
    let miniAsset = readAssetSafe('ranks', `${medalMeta.id}_mini_psd.vtex_c`)
      || readAssetSafe('mini', `${medalMeta.id}_psd.vtex_c`)
      || medalBuf;
    if (isImmortal && numImmortalRank && miniAsset) {
      miniAsset = renderRankPlaqueDigits(miniAsset, numImmortalRank);
    }
    entries.push({
      ext: 'vtex_c',
      folder: 'panorama/images/rank_tier_icons/mini',
      name: 'custom_profile_rank_mini_psd',
      crc: crc32(miniAsset),
      preload: Buffer.alloc(0),
      data: miniAsset,
    });
  }

  // 2. Star Pips: If stars > 0 and medal tier < 8 (Immortal has no stars)
  const numStars = isImmortal ? 0 : Math.max(0, Math.min(5, Number(stars) || 0));
  if (numStars > 0) {
    const pipAssetFile = `pip${numStars}_psd.vtex_c`;
    const pipBuf = readAssetSafe('ranks', pipAssetFile);
    if (pipBuf) {
      entries.push({
        ext: 'vtex_c',
        folder: 'panorama/images/rank_tier_icons',
        name: 'custom_profile_pips_psd',
        crc: crc32(pipBuf),
        preload: Buffer.alloc(0),
        data: pipBuf,
      });
    }
  }

  // 3. Patch dashboard_page_showcase.vcss_c and mini_showcase.vcss_c for modern profile isolation
  // This guarantees that opponents, allies, and players in the Watch tab keep their authentic medals.
  const showcaseCss = readAssetSafe('styles', 'dashboard_page_showcase.vcss_c');
  if (showcaseCss) {
    let pipsRule = numStars > 0
      ? '.ViewingSelf #HeaderNameContainer #RankPips{visibility: visible !important;background-image: url("s2r://panorama/images/rank_tier_icons/custom_profile_pips_psd.vtex") !important;background-size: contain;background-position: center;background-repeat: no-repeat;}'
      : '.ViewingSelf #HeaderNameContainer #RankPips{visibility: collapse !important;}';
    const heroBadgeProfileRule = (heroTier !== null && heroTier !== undefined)
      ? `.ViewingSelf #HeaderNameContainer DOTAHeroBadge #BadgeImage,.ViewingSelf .ProfileHeroBadge #BadgeImage{background-image: url("s2r://panorama/images/hero_badges/hero_badge_rank_${Math.max(0, Math.min(5, Number(heroTier)))}_png.vtex") !important;}`
      : '';

    const patchedShowcase = patchCssResource(
      showcaseCss,
      '#HeaderNameContainer .RankBadge{width: 100px;height: 100px;margin-top: -10px;z-index: 2;}',
      `#HeaderNameContainer .RankBadge{width: 100px;height: 100px;margin-top: -10px;z-index: 2;}.ViewingSelf #HeaderNameContainer .RankBadge #RankTier,.ViewingSelf #HeaderNameContainer #RankBadge #RankTier,.ViewingSelf #HeaderNameContainer DOTARankBadge #RankTier,.ViewingSelf #HeaderNameContainer #RankTier,.ViewingSelf #HeaderNameContainer .RankTierImage,.ViewingSelf DOTARankBadge #RankTier,.ViewingSelf #RankTier,.ViewingSelf .RankTierImage,.ViewingSelf.RankTier0 #RankTier,.ViewingSelf .RankTier0 .RankTierImage{background-image: url("s2r://panorama/images/rank_tier_icons/custom_profile_rank_psd.vtex") !important;background-size: contain !important;background-position: center !important;background-repeat: no-repeat !important;visibility: visible !important;}.ViewingSelf #HeaderNameContainer #RankLeaderboard,.ViewingSelf #HeaderNameContainer .RankBadge #RankLeaderboard,.ViewingSelf #RankLeaderboard,.ViewingSelf DOTARankBadge #RankLeaderboard{visibility: collapse !important;opacity: 0 !important;font-size: 0px !important;color: transparent !important;}${pipsRule}${heroBadgeProfileRule}`,
    );
    entries.push({
      ext: 'vcss_c',
      folder: 'panorama/styles/showcase',
      name: 'dashboard_page_showcase',
      crc: crc32(patchedShowcase),
      preload: Buffer.alloc(0),
      data: patchedShowcase,
    });
  }

  // Mini showcase (top bar mini profile in main menu dashboard)
  const miniCss = readAssetSafe('styles', 'mini_showcase.vcss_c');
  if (miniCss) {
    let pipsRuleMini = numStars > 0
      ? 'DOTAMiniShowcase:not(.ViewingOther) #RankTierContainer #RankPips,DOTAMiniShowcase:not(.ViewingOther) #RankBadge #RankPips,DOTAMiniShowcase:not(.ViewingOther) #RankPips{visibility: visible !important;background-image: url("s2r://panorama/images/rank_tier_icons/custom_profile_pips_psd.vtex") !important;background-size: contain !important;background-position: center !important;background-repeat: no-repeat !important;}'
      : 'DOTAMiniShowcase:not(.ViewingOther) #RankTierContainer #RankPips,DOTAMiniShowcase:not(.ViewingOther) #RankBadge #RankPips,DOTAMiniShowcase:not(.ViewingOther) #RankPips{visibility: collapse !important;}';

    const patchedMini = patchCssResource(
      miniCss,
      '#RankTierContainer{horizontal-align: right;vertical-align: center;margin-right: 5px;width: 100px;height: 100px;tooltip-position: bottom;tooltip-body-position: 50% 10%;ui-scale: 72%;}',
      `#RankTierContainer{horizontal-align: right;vertical-align: center;margin-right: 5px;width: 100px;height: 100px;tooltip-position: bottom;tooltip-body-position: 50% 10%;ui-scale: 72%;}DOTAMiniShowcase:not(.ViewingOther) #RankTierContainer #RankTier,DOTAMiniShowcase:not(.ViewingOther) #RankBadge #RankTier,DOTAMiniShowcase:not(.ViewingOther) .RankBadge #RankTier,DOTAMiniShowcase:not(.ViewingOther) DOTARankBadge #RankTier,DOTAMiniShowcase:not(.ViewingOther) #RankTier,DOTAMiniShowcase:not(.ViewingOther) .RankTierImage,DOTAMiniShowcase:not(.ViewingOther).RankTier0 #RankTier,DOTAMiniShowcase:not(.ViewingOther) .RankTier0 .RankTierImage{background-image: url("s2r://panorama/images/rank_tier_icons/custom_profile_rank_mini_psd.vtex") !important;background-size: contain !important;background-position: center !important;background-repeat: no-repeat !important;visibility: visible !important;}DOTAMiniShowcase:not(.ViewingOther) #RankTierContainer #RankLeaderboard,DOTAMiniShowcase:not(.ViewingOther) #RankBadge #RankLeaderboard,DOTAMiniShowcase:not(.ViewingOther) #RankLeaderboard,DOTAMiniShowcase:not(.ViewingOther) DOTARankBadge #RankLeaderboard{visibility: collapse !important;opacity: 0 !important;font-size: 0px !important;color: transparent !important;}${pipsRuleMini}`,
    );
    entries.push({
      ext: 'vcss_c',
      folder: 'panorama/styles/showcase',
      name: 'mini_showcase',
      crc: crc32(patchedMini),
      preload: Buffer.alloc(0),
      data: patchedMini,
    });
  }

  // Legacy/fallback profile page - scoped strictly to self header so it never leaks to other players or rank modal
  const profileCss = readAssetSafe('styles', 'dashboard_page_profile.vcss_c');
  if (profileCss) {
    let pipsRule = numStars > 0
      ? '.ViewingSelf #ProfileContainer #Header #RankPips,.ViewingSelf .HeaderNameContainer #RankPips{visibility: visible !important;background-image: url("s2r://panorama/images/rank_tier_icons/custom_profile_pips_psd.vtex") !important;background-size: contain;background-position: center;background-repeat: no-repeat;}'
      : '.ViewingSelf #ProfileContainer #Header #RankPips,.ViewingSelf .HeaderNameContainer #RankPips{visibility: collapse !important;}';
    const heroBadgeProfileRule = (heroTier !== null && heroTier !== undefined)
      ? `.ViewingSelf #ProfileContainer #Header DOTAHeroBadge #BadgeImage,.ViewingSelf .HeaderNameContainer DOTAHeroBadge #BadgeImage{background-image: url("s2r://panorama/images/hero_badges/hero_badge_rank_${Math.max(0, Math.min(5, Number(heroTier)))}_png.vtex") !important;}`
      : '';

    const patchedProfile = patchCssResource(
      profileCss,
      '.RankTier0 #RankTier.RankTierImage{background-size: 150%;}',
      `.RankTier0 #RankTier.RankTierImage{background-size: 150%;}.ViewingSelf #ProfileContainer #Header .RankBadge #RankTier,.ViewingSelf #ProfileContainer #Header #RankBadge #RankTier,.ViewingSelf #ProfileContainer #Header DOTARankBadge #RankTier,.ViewingSelf #ProfileContainer #Header #RankTier,.ViewingSelf #ProfileContainer #Header .RankTierImage,.ViewingSelf .HeaderNameContainer #RankTier,.ViewingSelf .HeaderNameContainer .RankTierImage,.ViewingSelf #RankTier{background-image: url("s2r://panorama/images/rank_tier_icons/custom_profile_rank_psd.vtex") !important;background-size: contain !important;background-position: center !important;background-repeat: no-repeat !important;visibility: visible !important;}.ViewingSelf #ProfileContainer #Header #RankLeaderboard,.ViewingSelf .HeaderNameContainer #RankLeaderboard,.ViewingSelf #RankLeaderboard{visibility: collapse !important;opacity: 0 !important;font-size: 0px !important;color: transparent !important;}${pipsRule}${heroBadgeProfileRule}`,
    );
    entries.push({
      ext: 'vcss_c',
      folder: 'panorama/styles',
      name: 'dashboard_page_profile',
      crc: crc32(patchedProfile),
      preload: Buffer.alloc(0),
      data: patchedProfile,
    });
  }

  // Global DOTARankBadge stylesheet: applies to all avatar rank badges across panorama
  const rankBadgeCss = readAssetSafe('styles', 'ui_rank_badge.vcss_c');
  if (rankBadgeCss) {
    let pipsRuleBadge = numStars > 0
      ? '.ViewingSelf #RankPips,DOTAMiniShowcase:not(.ViewingOther) #RankPips{visibility: visible !important;background-image: url("s2r://panorama/images/rank_tier_icons/custom_profile_pips_psd.vtex") !important;background-size: contain !important;background-position: center !important;background-repeat: no-repeat !important;}'
      : '.ViewingSelf #RankPips,DOTAMiniShowcase:not(.ViewingOther) #RankPips{visibility: collapse !important;}';

    let eliteFxRule = (targetMedalId === 'rank8c' || (isImmortal && numImmortalRank && numImmortalRank <= 10))
      ? '.ViewingSelf #EliteFX,DOTAMiniShowcase:not(.ViewingOther) #EliteFX{visibility: visible !important;}'
      : '';

    const patchedBadge = patchCssResource(
      rankBadgeCss,
      'DOTARankBadge{tooltip-position: bottom;tooltip-body-position: 50% 10%;background-size: 100%;}',
      `DOTARankBadge{tooltip-position: bottom;tooltip-body-position: 50% 10%;background-size: 100%;}.ViewingSelf #RankTier,.ViewingSelf .RankTierImage,.ViewingSelf.RankTier0 #RankTier,.ViewingSelf .RankTier0 .RankTierImage,DOTAMiniShowcase:not(.ViewingOther) #RankTier,DOTAMiniShowcase:not(.ViewingOther) .RankTierImage,DOTAMiniShowcase:not(.ViewingOther).RankTier0 #RankTier,DOTAMiniShowcase:not(.ViewingOther) .RankTier0 .RankTierImage{background-image: url("s2r://panorama/images/rank_tier_icons/custom_profile_rank_psd.vtex") !important;background-size: contain !important;background-position: center !important;background-repeat: no-repeat !important;visibility: visible !important;}DOTAMiniShowcase:not(.ViewingOther) #RankTier.Minimal,DOTAMiniShowcase:not(.ViewingOther) .RankTierImage.Minimal{background-image: url("s2r://panorama/images/rank_tier_icons/mini/custom_profile_rank_mini_psd.vtex") !important;background-size: contain !important;background-position: center !important;background-repeat: no-repeat !important;}.ViewingSelf #RankLeaderboard,DOTAMiniShowcase:not(.ViewingOther) #RankLeaderboard{visibility: collapse !important;opacity: 0 !important;font-size: 0px !important;color: transparent !important;}${pipsRuleBadge}${eliteFxRule}`,
    );
    entries.push({
      ext: 'vcss_c',
      folder: 'panorama/styles',
      name: 'ui_rank_badge',
      crc: crc32(patchedBadge),
      preload: Buffer.alloc(0),
      data: patchedBadge,
    });
  }

  // Showcase item: display hero badge on hero cards in showcase
  const showcaseItemCss = readAssetSafe('styles', 'showcase_item.vcss_c');
  if (showcaseItemCss) {
    const patchedShowcaseItem = patchCssResource(
      showcaseItemCss,
      '#HeroBadge.NoTier{visibility: collapse;}',
      `.ViewingSelf #HeroBadge.NoTier,.ViewingSelf .HeroModel #HeroBadge.NoTier{visibility: visible !important;}#HeroBadge.NoTier{visibility: collapse;}`,
    );
    entries.push({
      ext: 'vcss_c',
      folder: 'panorama/styles/showcase',
      name: 'showcase_item',
      crc: crc32(patchedShowcaseItem),
      preload: Buffer.alloc(0),
      data: patchedShowcaseItem,
    });
  }

  // 4. Dota Plus Hero Badges:
  // Generate custom level digit texture for hero cards, loadout badges, and progress headers
  if (heroTier !== null && heroTier !== undefined) {
    const tierNum = Math.max(0, Math.min(5, Number(heroTier)));
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

      // Provide direct texture replacements for rank 0 and empty badges so un-styled panels display the selected tier
      const tierAssetBuf = readAssetSafe('hero_badges', `hero_badge_rank_${tierNum}_png.vtex_c`);
      if (tierAssetBuf) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: 'hero_badge_rank_0_png',
          crc: crc32(tierAssetBuf),
          preload: Buffer.alloc(0),
          data: tierAssetBuf,
        });
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: 'hero_badge_rank_empty_psd',
          crc: crc32(tierAssetBuf),
          preload: Buffer.alloc(0),
          data: tierAssetBuf,
        });
      }

      const tierAssetSmall = readAssetSafe('hero_badges', `hero_badge_rank_${tierNum}_small_png.vtex_c`);
      if (tierAssetSmall) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: 'hero_badge_rank_0_small_png',
          crc: crc32(tierAssetSmall),
          preload: Buffer.alloc(0),
          data: tierAssetSmall,
        });
      }

      const tierAssetTiny = readAssetSafe('hero_badges', `hero_badge_rank_${tierNum}_tiny_png.vtex_c`);
      if (tierAssetTiny) {
        entries.push({
          ext: 'vtex_c',
          folder: 'panorama/images/hero_badges',
          name: 'hero_badge_rank_0_tiny_png',
          crc: crc32(tierAssetTiny),
          preload: Buffer.alloc(0),
          data: tierAssetTiny,
        });
      }

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

      // Patch hero_badge.vcss_c to render custom badges on hero loadout and inspect screens
      const heroBadgeCss = readAssetSafe('styles', 'hero_badge.vcss_c');
      if (heroBadgeCss) {
        let patchedBadge = patchCssResource(
          heroBadgeCss,
          'DOTAHeroBadge.IconStyle{width: 48px;height: 48px;background-size: contain;background-repeat: no-repeat;background-position: center;}',
          `DOTAHeroBadge.IconStyle{width: 48px;height: 48px;background-size: contain;background-repeat: no-repeat;background-position: center;}DOTAHeroBadge.IconStyle,DOTAHeroBadge.IconStyle.NoTier,DOTAHeroBadge.IconStyle.BronzeTier,DOTAHeroBadge.IconStyle.SilverTier,DOTAHeroBadge.IconStyle.GoldTier,DOTAHeroBadge.IconStyle.PlatinumTier,DOTAHeroBadge.IconStyle.MasterTier{background-image: url("s2r://panorama/images/hero_badges/hero_badge_rank_${tierNum}_png.vtex") !important;}DOTAHeroBadge.LevelStyle,DOTAHeroBadge.LevelStyle.NoTier,DOTAHeroBadge.LevelStyle.BronzeTier,DOTAHeroBadge.LevelStyle.SilverTier,DOTAHeroBadge.LevelStyle.GoldTier,DOTAHeroBadge.LevelStyle.PlatinumTier,DOTAHeroBadge.LevelStyle.MasterTier{background-image: url("s2r://panorama/images/hero_badges/hero_badge_rank_${tierNum}_png.vtex") !important;}#HeroBadgeProgression,#HeroBadgeProgression.NoTier,#HeroBadgeProgression #BadgeImage,.HeroBadge,.PlusHeroBadgeIcon,.PlusHeroBadgeIconSmall,.PlusHeroBadgeIconTiny,.BronzeTier .PlusHeroBadgeIcon,.BronzeTier.PlusHeroBadgeIcon{background-image: url("s2r://panorama/images/hero_badges/hero_badge_rank_${tierNum}_png.vtex") !important;}.NoTier #HeroBadgeProgression{visibility: visible !important;}DOTAHeroBadge.LevelStyle.NoTier > Label{visibility: visible !important;}DOTAHeroBadge.ModelStyle.NoTier > Label{visibility: visible !important;}`,
        );
        patchedBadge = patchCssResource(
          patchedBadge,
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

      // Patch ui_dota_plus_hero_page_v2.vcss_c for the Hero Level Progress badge on hero page
      const plusV2Css = readAssetSafe('styles', 'ui_dota_plus_hero_page_v2.vcss_c');
      if (plusV2Css) {
        let patchedPlusV2 = patchCssResource(
          plusV2Css,
          '#HeroBadgeProgression{margin-top: -224px;margin-left: -210px;margin-bottom: -210px;margin-right: -180px;overflow: noclip;}',
          `#HeroBadgeProgression{margin-top: -224px;margin-left: -210px;margin-bottom: -210px;margin-right: -180px;overflow: noclip;background-image: url("s2r://panorama/images/hero_badges/hero_badge_rank_${tierNum}_png.vtex") !important;visibility: visible !important;}`,
        );
        patchedPlusV2 = patchCssResource(
          patchedPlusV2,
          '.NoTier #HeroBadgeProgression{visibility: collapse;}',
          `.NoTier #HeroBadgeProgression{visibility: visible !important;background-image: url("s2r://panorama/images/hero_badges/hero_badge_rank_${tierNum}_png.vtex") !important;}`,
        );
        entries.push({
          ext: 'vcss_c',
          folder: 'panorama/styles',
          name: 'ui_dota_plus_hero_page_v2',
          crc: crc32(patchedPlusV2),
          preload: Buffer.alloc(0),
          data: patchedPlusV2,
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
