// Interactive Dota 2 Rank Medal, Stars and Hero Tier Customizer
// Matches the visual layout and feature set from Dota2Changer with authentic Dota 2 graphics.

import { $ } from '../core/dom.js';
import { toast } from './toast.js';
import { confirmDialog } from './dialog.js';
import { refreshInstalledIndex } from '../core/installed.js';
import {
  baseRankLabel, clampImmortalRank, hasLeaderboard, localizedName, rankApplyPayload, realStarsDrawn,
} from './rank-rules.js';

export const RANK_DATA = [
  { id: 'rank0', nameEs: 'Sin calibrar', nameEn: 'Not Calibrated', nameRu: 'Без калибровки', badge: 'FREE', badgeType: 'free', defaultMmr: 0 },
  { id: 'rank1', nameEs: 'Heraldo', nameEn: 'Herald', nameRu: 'Рекрут', badge: 'FREE', badgeType: 'free', stars: [0, 150, 300, 460, 610], defaultMmr: 300 },
  { id: 'rank2', nameEs: 'Guardián', nameEn: 'Guardian', nameRu: 'Страж', badge: 'FREE', badgeType: 'free', stars: [770, 920, 1080, 1230, 1400], defaultMmr: 1080 },
  { id: 'rank3', nameEs: 'Cruzado', nameEn: 'Crusader', nameRu: 'Рыцарь', badge: 'FREE', badgeType: 'free', stars: [1540, 1700, 1850, 2000, 2150], defaultMmr: 1850 },
  { id: 'rank4', nameEs: 'Arconte', nameEn: 'Archon', nameRu: 'Герой', badge: 'FREE', badgeType: 'free', stars: [2310, 2450, 2610, 2770, 2930], defaultMmr: 2610 },
  { id: 'rank5', nameEs: 'Leyenda', nameEn: 'Legend', nameRu: 'Легенда', badge: 'FREE', badgeType: 'free', stars: [3080, 3230, 3390, 3540, 3700], defaultMmr: 3390 },
  { id: 'rank6', nameEs: 'Ancestral', nameEn: 'Ancient', nameRu: 'Властелин', badge: 'FREE', badgeType: 'free', stars: [3850, 4000, 4150, 4300, 4460], defaultMmr: 4150 },
  { id: 'rank7', nameEs: 'Divino', nameEn: 'Divine', nameRu: 'Божество', badge: 'FREE', badgeType: 'free', stars: [4620, 4820, 5020, 5220, 5420], defaultMmr: 5020 },
  { id: 'rank8', nameEs: 'Inmortal', nameEn: 'Immortal', nameRu: 'Титан', badge: 'FREE', badgeType: 'free', defaultMmr: 5620 },
  { id: 'rank8a', nameEs: 'Inmortal, Top 1000', nameEn: 'Immortal Top 1000', nameRu: 'Титан Топ 1000', badge: 'FREE', badgeType: 'free', defaultMmr: 8620 },
  { id: 'rank8b', nameEs: 'Inmortal, Top 100', nameEn: 'Immortal Top 100', nameRu: 'Титан Топ 100', badge: 'FREE', badgeType: 'free', defaultMmr: 10620 },
  { id: 'rank8c', nameEs: 'Inmortal, Top 10', nameEn: 'Immortal Top 10', nameRu: 'Титан Топ 10', badge: 'FREE', badgeType: 'free', defaultMmr: 12620 },
];

export const HERO_TIER_DATA = [
  { id: 0, nameEs: 'Bronce', nameEn: 'Bronze', nameRu: 'Бронза', badge: 'FREE', badgeType: 'free', levels: '1-5', defaultLevel: 5 },
  { id: 1, nameEs: 'Plata', nameEn: 'Silver', nameRu: 'Серебро', badge: 'FREE', badgeType: 'free', levels: '6-11', defaultLevel: 11 },
  { id: 2, nameEs: 'Oro', nameEn: 'Gold', nameRu: 'Золото', badge: 'FREE', badgeType: 'free', levels: '12-17', defaultLevel: 17 },
  { id: 3, nameEs: 'Platino', nameEn: 'Platinum', nameRu: 'Платина', badge: 'FREE', badgeType: 'free', levels: '18-24', defaultLevel: 24 },
  { id: 4, nameEs: 'Maestro', nameEn: 'Master', nameRu: 'Мастер', badge: 'FREE', badgeType: 'free', levels: '25-29', defaultLevel: 29 },
  { id: 5, nameEs: 'Gran Maestro', nameEn: 'Grandmaster', nameRu: 'Грандмастер', badge: 'FREE', badgeType: 'free', levels: '30', defaultLevel: 30 },
];

let customState = {
  medal: 'rank8c',
  baseRank: 'rank0',
  stars: 5,
  mmr: 12620,
  immortalRank: 10,
  heroTier: 5,
  heroLevel: 30,
  activeInstalled: null,
};

function getLocalizedName(item) {
  return localizedName(item, window.I18N_LANG || 'es');
}

export async function initRankCustomizer() {
  try {
    const cur = await window.api.ranks.getCustom();
    if (cur && cur.active && cur.settings) {
      customState.activeInstalled = cur.record;
      if (cur.settings.medal) customState.medal = cur.settings.medal;
      if (cur.settings.baseRank) customState.baseRank = cur.settings.baseRank;
      if (cur.settings.stars !== undefined) customState.stars = cur.settings.stars;
      if (cur.settings.mmr !== undefined) customState.mmr = cur.settings.mmr;
      if (cur.settings.immortalRank !== undefined) customState.immortalRank = cur.settings.immortalRank;
      if (cur.settings.heroTier !== undefined) customState.heroTier = cur.settings.heroTier;
      if (cur.settings.heroLevel !== undefined) customState.heroLevel = cur.settings.heroLevel;
    }
  } catch {
    /* fallback to defaults */
  }
}

/** The input range, default and hint for a Top medal's leaderboard place. */
function leaderboardRange(medalId) {
  if (medalId === 'rank8b') {
    return { min: 11, max: 100, def: 50, hint: L`Топ 100: число от 11 до 100 на табличке рейтинга.` };
  }
  if (medalId === 'rank8a') {
    return { min: 101, max: 6000, def: 1000, hint: L`Топ 1000: число от 101 до 6000 на табличке рейтинга.` };
  }
  return { min: 1, max: 10, def: 10, hint: L`Топ 10: число от 1 до 10 на табличке рейтинга.` };
}

/** Why the stars picker will not show exactly what was picked, or '' when it will. */
function starsHint(isImmortal, baseRank) {
  if (isImmortal) return L`У медалей Титана вместо звёзд место в рейтинге.`;
  if (realStarsDrawn(baseRank)) {
    return L`С этим базовым рангом игра рисует поверх медали твои настоящие звёзды: выбери столько же, сколько у тебя сейчас, или базу «Без калибровки».`;
  }
  return '';
}

function activeBadgeHtml() {
  return `
    <div class="rc-active-badge">
      <span class="ms ms-sm">verified</span>
      <span>${L`Мод ранга установлен в игре`}</span>
    </div>
  `;
}

// The header is drawn once per visit and the router does not redraw the view the user is on,
// so Apply and Reset have to put the badge in or take it out themselves.
function syncActiveBadge(container) {
  const header = container.querySelector('.rc-header');
  if (!header) return;
  const badge = header.querySelector('.rc-active-badge');
  if (customState.activeInstalled && !badge) header.insertAdjacentHTML('beforeend', activeBadgeHtml());
  else if (!customState.activeInstalled && badge) badge.remove();
}

function syncStarsHint(container) {
  const hintEl = container.querySelector('#rcStarsHint');
  if (!hintEl) return;
  const hint = starsHint(customState.medal.startsWith('rank8'), customState.baseRank);
  hintEl.textContent = hint;
  hintEl.classList.toggle('hidden', !hint);
}

export function rankCustomizerHtml() {
  const lang = window.I18N_LANG || 'es';
  const currentMedal = RANK_DATA.find((m) => m.id === customState.medal) || RANK_DATA[11];
  const currentTier = HERO_TIER_DATA.find((t) => t.id === customState.heroTier) || HERO_TIER_DATA[5];
  const isImmortal = currentMedal.id.startsWith('rank8');
  const showLeaderboard = hasLeaderboard(currentMedal.id);
  const imm = leaderboardRange(currentMedal.id);
  const hintForStars = starsHint(isImmortal, customState.baseRank);
  const heroLevel = customState.heroLevel || 30;
  const heroSubLevel = `<span id="rcPreviewHeroSubLvl">${heroLevel}</span>`;

  return `
    <section class="rank-customizer-container" id="rankCustomizerSection">
      <div class="rc-header">
        <div class="rc-title-group">
          <h2 class="rc-title">${L`Медаль ранга и значок героя`}</h2>
          <p class="rc-subtitle">${L`Меняет медаль ранга, звёзды и значок героя Dota Plus только у тебя в клиенте: матчи и настоящий рейтинг не затрагиваются.`}</p>
        </div>
        ${customState.activeInstalled ? activeBadgeHtml() : ''}
      </div>

      <!-- Base Rank Target Selector -->
      <div class="rc-controls-row" style="margin-bottom: 20px;">
        <div class="rc-control-group" style="max-width: 480px;">
          <label class="rc-label" for="rcBaseRankSelect">${L`Базовый ранг аккаунта (мод только для твоего профиля)`}</label>
          <div class="rc-mmr-input-wrap">
            <select id="rcBaseRankSelect" class="rc-input" style="width: 100%; cursor: pointer;">
              <option value="rank0" ${customState.baseRank === 'rank0' ? 'selected' : ''}>${L`Без калибровки — мой профиль (рекомендуется)`}</option>
              ${RANK_DATA.slice(1, 9).map((m) => `
              <option value="${m.id}" ${customState.baseRank === m.id ? 'selected' : ''}>${baseRankLabel(m, lang)}</option>`).join('')}
              <option value="all" ${customState.baseRank === 'all' ? 'selected' : ''}>${L`Все медали (глобально)`}</option>
            </select>
          </div>
          <div class="rc-hint">${L`Заменяет только медаль твоего профиля. Остальные игроки в матче сохранят свои настоящие медали.`}</div>
        </div>
      </div>

      <!-- Medals Grid -->
      <div class="rc-section-header-wrap">
        <div class="rc-section-title">${L`1. Выбери медаль ранга`}</div>
        <div class="rc-tier-rules">${L`Медаль, которую ты хочешь видеть в своём профиле.`}</div>
      </div>
      <div class="rc-medals-grid" id="rcMedalsGrid">
        ${RANK_DATA.map((m) => {
          const active = m.id === customState.medal ? 'active' : '';
          return `
            <div class="rc-medal-card ${active}" data-medal="${m.id}">
              <div class="rc-medal-icon">
                <img src="assets/ranks/${m.id}.png" alt="${m.nameEn}" class="rc-medal-img" draggable="false" />
              </div>
              <div class="rc-medal-name">${getLocalizedName(m)}</div>
              <div class="rc-medal-sub">${m.defaultMmr ? `${m.defaultMmr.toLocaleString()} MMR` : (m.id === 'rank0' ? L`Без калибровки` : '')}</div>
              <span class="rc-tier-pill rc-pill-${m.badgeType}">${m.badge}</span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Stars and MMR Controls -->
      <div class="rc-controls-row">
        <!-- Stars Picker -->
        <div class="rc-control-group rc-stars-group ${isImmortal ? 'disabled' : ''}">
          <label class="rc-label">${L`2. Звёзды ранга`}</label>
          <div class="rc-stars-selector" id="rcStarsSelector">
            ${[1, 2, 3, 4, 5].map((s) => {
              const active = (!isImmortal && customState.stars === s) ? 'active' : '';
              return `
                <button type="button" class="rc-star-btn ${active}" data-star="${s}" ${isImmortal ? 'disabled' : ''}>
                  <span class="ms">star</span>
                  <span>${s}</span>
                </button>
              `;
            }).join('')}
          </div>
          <div class="rc-hint ${hintForStars ? '' : 'hidden'}" id="rcStarsHint">${hintForStars}</div>
        </div>

        <!-- MMR Input: a label for the library name only, the game has no MMR on screen to replace -->
        <div class="rc-control-group rc-mmr-group">
          <label class="rc-label" for="rcMmrInput">${L`3. MMR в названии мода (до 15 000)`}</label>
          <div class="rc-mmr-input-wrap">
            <input type="number" id="rcMmrInput" class="rc-input" min="0" max="15000" step="10" value="${customState.mmr}" />
            <span class="rc-input-unit">MMR</span>
          </div>
          <div class="rc-hint">${L`Игра не показывает MMR, так что в ней это число ничего не меняет: оно попадает только в название мода в библиотеке. Подставляется по медали, но можно вписать любое.`}</div>
        </div>
      </div>

      <!-- Immortal Rank Leaderboard Digit (Visible when Top 10, Top 100, or Top 1000 is selected) -->
      <div class="rc-controls-row ${showLeaderboard ? '' : 'hidden'}" id="rcImmortalRow" style="margin-top: -6px; margin-bottom: 18px;">
        <div class="rc-control-group rc-immortal-group" style="max-width: 360px;">
          <label class="rc-label" for="rcImmortalRankInput">${L`Место в рейтинге Титана`}</label>
          <div class="rc-mmr-input-wrap">
            <input type="number" id="rcImmortalRankInput" class="rc-input" min="${imm.min}" max="${imm.max}" value="${customState.immortalRank || 10}" />
            <span class="rc-input-unit">RANK</span>
          </div>
          <div class="rc-hint" id="rcImmortalHint">${imm.hint}</div>
        </div>
      </div>

      <!-- Dota Plus Hero Tier Changer -->
      <div class="rc-section-header-wrap">
        <div class="rc-section-title">${L`4. Значок уровня героя (Dota Plus Hero Tier)`}</div>
        <div class="rc-tier-rules">${L`Значок и уровень, которые ты хочешь видеть на своих героях.`}</div>
      </div>
      <div class="rc-hero-tier-grid" id="rcHeroTierGrid">
        ${HERO_TIER_DATA.map((t) => {
          const active = customState.heroTier === t.id ? 'active' : '';
          return `
            <div class="rc-tier-card ${active}" data-tier="${t.id}">
              <div class="rc-tier-icon-wrap">
                <img src="assets/herotier/tier${t.id}.png" class="rc-tier-img" alt="${t.nameEn}" draggable="false" />
              </div>
              <div class="rc-tier-name">${getLocalizedName(t)}</div>
              <div class="rc-tier-sub">${L`Уровень ${t.levels}`}</div>
              <span class="rc-tier-pill rc-pill-${t.badgeType}">${t.badge}</span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Hero Tier Level Digit Picker -->
      <div class="rc-controls-row" style="margin-top: -6px; margin-bottom: 18px;">
        <div class="rc-control-group rc-hero-level-group" style="max-width: 360px;">
          <label class="rc-label" for="rcHeroLevelInput">${L`Число уровня на значке героя (Dota Plus)`}</label>
          <div class="rc-mmr-input-wrap">
            <input type="number" id="rcHeroLevelInput" class="rc-input" min="1" max="99" value="${heroLevel}" />
            <span class="rc-input-unit">LVL</span>
          </div>
          <div class="rc-hint">${L`Уровень, который будет нарисован на значках героев (например, 30 для Грандмастера).`}</div>
        </div>
      </div>

      <!-- Live Preview Card: only what the game will draw, so no MMR -->
      <div class="rc-preview-box" id="rcPreviewBox">
        <div class="rc-preview-badge-col">
          <div class="rc-preview-medal-wrap" id="rcPreviewMedalWrap">
            <img src="assets/ranks/${customState.medal}.png" class="rc-preview-medal-img" id="rcPreviewMedalImg" alt="Medal" draggable="false" />
            <img src="assets/ranks/stars${customState.stars || 1}.png" class="rc-preview-stars-img ${isImmortal ? 'hidden' : ''}" id="rcPreviewStarsImg" alt="Stars" draggable="false" />
            <div class="rc-preview-immortal-rank ${showLeaderboard ? '' : 'hidden'}" id="rcPreviewImmortalRank">
              <span id="rcPreviewImmortalNum">${customState.immortalRank || 10}</span>
            </div>
          </div>
        </div>
        <div class="rc-preview-info-col">
          <div class="rc-preview-title" id="rcPreviewTitle">${getLocalizedName(currentMedal)}</div>
          <div class="rc-preview-hero-badge" id="rcPreviewHeroBadge">
            <div class="rc-preview-hero-icon-wrap">
              <img src="assets/herotier/tier${customState.heroTier}.png" class="rc-preview-hero-img" id="rcPreviewHeroImg" alt="Hero Tier" draggable="false" />
              <span class="rc-preview-hero-lvl-badge" id="rcPreviewHeroLvlBadge">${heroLevel}</span>
            </div>
            <div class="rc-preview-hero-text">
              <span class="rc-preview-hero-title" id="rcPreviewHeroTitle">${getLocalizedName(currentTier)}</span>
              <span class="rc-preview-hero-sub">${L`Значок героя Dota Plus`} (${L`Уровень ${heroSubLevel}`})</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="rc-actions-bar">
        <button type="button" class="btn btn-primary rc-apply-btn" id="rcApplyBtn">
          <span class="ms">save</span>
          <span>${L`Применить и установить ранг`}</span>
        </button>
        <button type="button" class="btn btn-outline rc-reset-btn" id="rcResetBtn">
          <span class="ms">restore</span>
          <span>${L`Вернуть настоящую медаль`}</span>
        </button>
      </div>

      <!-- FAQ Section -->
      <div class="rc-faq-container">
        <h3 class="rc-faq-title">${L`Частые вопросы`}</h3>
        <div class="rc-faq-list">
          <details class="rc-faq-item">
            <summary>${L`Можно ли поменять медаль ранга в Dota 2?`}</summary>
            <p>${L`Да. Mod Assistant подменяет текстуры медали у тебя в клиенте. Настоящий ранг и подбор игроков на серверах Valve не меняются.`}</p>
          </details>
          <details class="rc-faq-item">
            <summary>${L`Это безопасно? Могут ли забанить за смену медали?`}</summary>
            <p>${L`Медаль заменяется пакетом модов (VPK), точно так же как облики героев. В память ничего не внедряется, и сама игра не меняется.`}</p>
          </details>
          <details class="rc-faq-item">
            <summary>${L`Увидят ли другие игроки мою медаль или уровень героя?`}</summary>
            <p>${L`Нет. Это видно только на твоём экране: в профиле, таблице счёта и на экране загрузки.`}</p>
          </details>
          <details class="rc-faq-item">
            <summary>${L`Как вернуть настоящую медаль?`}</summary>
            <p>${L`Нажми «${L`Вернуть настоящую медаль`}» или удали мод в библиотеке в любой момент.`}</p>
          </details>
        </div>
      </div>
    </section>
  `;
}

function updatePreview() {
  const currentMedal = RANK_DATA.find((m) => m.id === customState.medal) || RANK_DATA[0];
  const isImmortal = currentMedal.id.startsWith('rank8');

  const previewMedalImg = $('#rcPreviewMedalImg');
  if (previewMedalImg) previewMedalImg.src = `assets/ranks/${customState.medal}.png`;

  const previewStarsImg = $('#rcPreviewStarsImg');
  if (previewStarsImg) {
    if (isImmortal) {
      previewStarsImg.classList.add('hidden');
    } else {
      previewStarsImg.src = `assets/ranks/stars${customState.stars || 1}.png`;
      previewStarsImg.classList.remove('hidden');
    }
  }

  const previewImmortalRank = $('#rcPreviewImmortalRank');
  const previewImmortalNum = $('#rcPreviewImmortalNum');
  if (previewImmortalRank) previewImmortalRank.classList.toggle('hidden', !hasLeaderboard(currentMedal.id));
  if (previewImmortalNum) previewImmortalNum.textContent = customState.immortalRank || 10;

  const previewTitleEl = $('#rcPreviewTitle');
  if (previewTitleEl) previewTitleEl.textContent = getLocalizedName(currentMedal);

  const tier = HERO_TIER_DATA[customState.heroTier] || HERO_TIER_DATA[5];
  const previewHeroImg = $('#rcPreviewHeroImg');
  if (previewHeroImg) previewHeroImg.src = `assets/herotier/tier${tier.id}.png`;

  const previewHeroLvlBadge = $('#rcPreviewHeroLvlBadge');
  if (previewHeroLvlBadge) previewHeroLvlBadge.textContent = customState.heroLevel || 30;

  const previewHeroSubLvl = $('#rcPreviewHeroSubLvl');
  if (previewHeroSubLvl) previewHeroSubLvl.textContent = customState.heroLevel || 30;

  const previewHeroTitle = $('#rcPreviewHeroTitle');
  if (previewHeroTitle) previewHeroTitle.textContent = getLocalizedName(tier);
}

export function bindRankCustomizer(container) {
  if (!container) return;

  // 0. Base Rank Selection
  const baseRankSelect = container.querySelector('#rcBaseRankSelect');
  if (baseRankSelect) {
    baseRankSelect.addEventListener('change', () => {
      customState.baseRank = baseRankSelect.value || 'rank0';
      syncStarsHint(container);
    });
  }

  // 1. Medal Selection
  container.querySelectorAll('.rc-medal-card').forEach((card) => {
    card.addEventListener('click', () => {
      const medalId = card.dataset.medal;
      customState.medal = medalId;

      container.querySelectorAll('.rc-medal-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');

      const meta = RANK_DATA.find((m) => m.id === medalId);
      const isImmortal = medalId.startsWith('rank8');

      // Update MMR and default immortal rank
      if (meta) {
        if (!isImmortal && meta.stars && meta.stars[customState.stars - 1] !== undefined) {
          customState.mmr = meta.stars[customState.stars - 1];
        } else {
          customState.mmr = meta.defaultMmr;
        }
        const mmrInput = $('#rcMmrInput');
        if (mmrInput) mmrInput.value = customState.mmr;
      }

      // Toggle immortal rank input row
      const showLeaderboard = hasLeaderboard(medalId);
      const immortalRow = container.querySelector('#rcImmortalRow');
      if (immortalRow) immortalRow.classList.toggle('hidden', !showLeaderboard);

      const immInput = container.querySelector('#rcImmortalRankInput');
      const immHint = container.querySelector('#rcImmortalHint');
      if (showLeaderboard && immInput) {
        const range = leaderboardRange(medalId);
        immInput.min = range.min;
        immInput.max = range.max;
        if (immHint) immHint.textContent = range.hint;

        const curVal = Number(immInput.value);
        if (!curVal || curVal < range.min || curVal > range.max) {
          customState.immortalRank = range.def;
          immInput.value = range.def;
        } else {
          customState.immortalRank = curVal;
        }
      }

      // Toggle stars group disabled state
      const starsGroup = container.querySelector('.rc-stars-group');
      if (starsGroup) {
        starsGroup.classList.toggle('disabled', isImmortal);
        starsGroup.querySelectorAll('button').forEach((b) => { b.disabled = isImmortal; });
      }
      syncStarsHint(container);

      updatePreview();
    });
  });

  // 2. Stars Selection
  container.querySelectorAll('.rc-star-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const starNum = Number(btn.dataset.star);
      customState.stars = starNum;

      container.querySelectorAll('.rc-star-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const meta = RANK_DATA.find((m) => m.id === customState.medal);
      if (meta && meta.stars && meta.stars[starNum - 1] !== undefined) {
        customState.mmr = meta.stars[starNum - 1];
        const mmrInput = $('#rcMmrInput');
        if (mmrInput) mmrInput.value = customState.mmr;
      }

      updatePreview();
    });
  });

  // 3. MMR Input
  const mmrInput = container.querySelector('#rcMmrInput');
  if (mmrInput) {
    mmrInput.addEventListener('input', () => {
      customState.mmr = Number(mmrInput.value) || 0;
      updatePreview();
    });
  }

  // 3b. Immortal Rank Input
  const immortalInput = container.querySelector('#rcImmortalRankInput');
  if (immortalInput) {
    immortalInput.addEventListener('input', () => {
      const val = Number(immortalInput.value);
      if (val) {
        customState.immortalRank = clampImmortalRank(val, customState.medal);
      }
      updatePreview();
    });
    immortalInput.addEventListener('change', () => {
      customState.immortalRank = clampImmortalRank(immortalInput.value, customState.medal);
      immortalInput.value = customState.immortalRank;
      updatePreview();
    });
  }

  // 4. Hero Tier Selection
  container.querySelectorAll('.rc-tier-card').forEach((card) => {
    card.addEventListener('click', () => {
      const tierId = Number(card.dataset.tier);
      customState.heroTier = tierId;
      const tierInfo = HERO_TIER_DATA.find((t) => t.id === tierId);
      if (tierInfo) customState.heroLevel = tierInfo.defaultLevel;

      const heroLvlInput = container.querySelector('#rcHeroLevelInput');
      if (heroLvlInput) heroLvlInput.value = customState.heroLevel;

      container.querySelectorAll('.rc-tier-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');

      updatePreview();
    });
  });

  // 4b. Hero Level Input
  const heroLevelInput = container.querySelector('#rcHeroLevelInput');
  if (heroLevelInput) {
    heroLevelInput.addEventListener('input', () => {
      customState.heroLevel = Math.max(1, Math.min(99, Number(heroLevelInput.value) || 1));
      updatePreview();
    });
  }

  // 5. Apply Button
  const applyBtn = container.querySelector('#rcApplyBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      // Read current values directly from DOM inputs to ensure live typed values are used
      const liveBaseRank = container.querySelector('#rcBaseRankSelect');
      if (liveBaseRank && liveBaseRank.value) {
        customState.baseRank = liveBaseRank.value;
      }
      const liveImmortal = container.querySelector('#rcImmortalRankInput');
      if (liveImmortal && liveImmortal.value && hasLeaderboard(customState.medal)) {
        customState.immortalRank = clampImmortalRank(liveImmortal.value, customState.medal);
      }
      const liveMmr = container.querySelector('#rcMmrInput');
      if (liveMmr && liveMmr.value) {
        customState.mmr = Number(liveMmr.value) || customState.mmr;
      }
      const liveHeroLevel = container.querySelector('#rcHeroLevelInput');
      if (liveHeroLevel && liveHeroLevel.value) {
        customState.heroLevel = Math.max(1, Math.min(99, Number(liveHeroLevel.value) || 1));
      }

      applyBtn.disabled = true;
      applyBtn.innerHTML = `<span class="spinner-sm"></span> <span>${L`Установка…`}</span>`;

      try {
        const res = await window.api.ranks.applyCustom(rankApplyPayload(customState));

        if (res.error) {
          toast(res.error, 'error', 6000);
        } else {
          customState.activeInstalled = res.record;
          syncActiveBadge(container);
          toast(L`Ранг и уровень героя установлены`, 'ok');
          await refreshInstalledIndex();
        }
      } catch (err) {
        toast(String(err?.message || err), 'error', 6000);
      } finally {
        applyBtn.disabled = false;
        applyBtn.innerHTML = `<span class="ms">save</span> <span>${L`Применить и установить ранг`}</span>`;
      }
    });
  }

  // 6. Reset Button
  const resetBtn = container.querySelector('#rcResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const ok = await confirmDialog(L`Вернуть настоящий ранг Dota 2?`, { okLabel: L`Сбросить` });
      if (!ok) return;

      resetBtn.disabled = true;
      try {
        const res = await window.api.ranks.removeCustom();
        // A pak the game still holds open cannot be removed; saying so beats a toast that
        // claims the real medal is back while the mod is still in the folder.
        if (res && res.error) {
          toast(res.error, 'error', 6000);
          return;
        }
        customState.activeInstalled = null;
        syncActiveBadge(container);
        toast(L`Ранг возвращён к значениям игры`, 'ok');
        await refreshInstalledIndex();
        updatePreview();
      } catch (err) {
        toast(String(err?.message || err), 'error');
      } finally {
        resetBtn.disabled = false;
      }
    });
  }
}
