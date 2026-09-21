// Interactive Dota 2 Rank Medal, Stars, MMR, and Hero Tier Customizer
// Matches the visual layout and feature set from Dota2Changer with local VPK generation.

import { $ } from '../core/dom.js';
import { toast } from './toast.js';
import { confirmDialog } from './dialog.js';
import { refreshInstalledIndex } from '../core/installed.js';

const RANK_DATA = [
  { id: 'rank0', nameEs: 'Sin calibrar', nameEn: 'Not Calibrated', nameRu: 'Без калибровки', color: '#888', defaultMmr: 0 },
  { id: 'rank1', nameEs: 'Heraldo', nameEn: 'Herald', nameRu: 'Рекрут', color: '#9e7149', stars: [0, 150, 300, 460, 610], defaultMmr: 300 },
  { id: 'rank2', nameEs: 'Guardián', nameEn: 'Guardian', nameRu: 'Страж', color: '#567c52', stars: [770, 920, 1080, 1230, 1400], defaultMmr: 1080 },
  { id: 'rank3', nameEs: 'Cruzado', nameEn: 'Crusader', nameRu: 'Рыцарь', color: '#4d889e', stars: [1540, 1700, 1850, 2000, 2150], defaultMmr: 1850 },
  { id: 'rank4', nameEs: 'Arconte', nameEn: 'Archon', nameRu: 'Герой', color: '#38a379', stars: [2310, 2450, 2610, 2770, 2930], defaultMmr: 2610 },
  { id: 'rank5', nameEs: 'Leyenda', nameEn: 'Legend', nameRu: 'Легенда', color: '#c9933b', stars: [3080, 3230, 3390, 3540, 3700], defaultMmr: 3390 },
  { id: 'rank6', nameEs: 'Ancestral', nameEn: 'Ancient', nameRu: 'Властелин', color: '#8f4bb5', stars: [3850, 4000, 4150, 4300, 4460], defaultMmr: 4150 },
  { id: 'rank7', nameEs: 'Divino', nameEn: 'Divine', nameRu: 'Божество', color: '#5894e0', stars: [4620, 4820, 5020, 5220, 5420], defaultMmr: 5020 },
  { id: 'rank8', nameEs: 'Inmortal', nameEn: 'Immortal', nameRu: 'Титан', color: '#e69830', defaultMmr: 5620 },
  { id: 'rank8a', nameEs: 'Inmortal, Top 1000', nameEn: 'Immortal Top 1000', nameRu: 'Титан Топ 1000', color: '#f08020', defaultMmr: 8620 },
  { id: 'rank8b', nameEs: 'Inmortal, Top 100', nameEn: 'Immortal Top 100', nameRu: 'Титан Топ 100', color: '#f55010', defaultMmr: 10620 },
  { id: 'rank8c', nameEs: 'Inmortal, Top 10', nameEn: 'Immortal Top 10', nameRu: 'Титан Топ 10', color: '#ff2020', defaultMmr: 12620 },
];

const HERO_TIER_DATA = [
  { id: 0, nameEs: 'Bronce', nameEn: 'Bronze', nameRu: 'Бронза', color: '#cd7f32', levels: '1-5', defaultLevel: 5 },
  { id: 1, nameEs: 'Plata', nameEn: 'Plata', nameRu: 'Серебро', color: '#c0c0c0', levels: '6-11', defaultLevel: 11 },
  { id: 2, nameEs: 'Oro', nameEn: 'Gold', nameRu: 'Золото', color: '#ffd700', levels: '12-17', defaultLevel: 17 },
  { id: 3, nameEs: 'Platino', nameEn: 'Platinum', nameRu: 'Платина', color: '#00e5ff', levels: '18-24', defaultLevel: 24 },
  { id: 4, nameEs: 'Maestro', nameEn: 'Master', nameRu: 'Мастер', color: '#9c27b0', levels: '25-29', defaultLevel: 29 },
  { id: 5, nameEs: 'Gran Maestro', nameEn: 'Grandmaster', nameRu: 'Грандмастер', color: '#f44336', levels: '30', defaultLevel: 30 },
];

let customState = {
  medal: 'rank8c',
  stars: 5,
  mmr: 12620,
  heroTier: 5,
  heroLevel: 30,
  activeInstalled: null,
};

function getRankBadgeSvg(medalId) {
  const meta = RANK_DATA.find((m) => m.id === medalId) || RANK_DATA[0];
  const color = meta.color || '#e69830';
  const isTop = medalId.startsWith('rank8');
  let topText = '';
  if (medalId === 'rank8a') topText = 'TOP 1000';
  if (medalId === 'rank8b') topText = 'TOP 100';
  if (medalId === 'rank8c') topText = 'TOP 10';

  return `
    <svg viewBox="0 0 100 100" class="rank-badge-svg" width="68" height="68">
      <defs>
        <radialGradient id="bg-${medalId}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#12141a" stop-opacity="0.95"/>
        </radialGradient>
        <linearGradient id="glow-${medalId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.6"/>
          <stop offset="50%" stop-color="${color}" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#111" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <!-- Shield Base -->
      <polygon points="50,6 88,24 82,72 50,94 18,72 12,24" fill="url(#bg-${medalId})" stroke="${color}" stroke-width="2.5" />
      <!-- Wings or Embellishments -->
      ${isTop ? `
        <path d="M 12 40 Q 2 20 26 14 Q 30 30 18 50 Z" fill="${color}" opacity="0.85"/>
        <path d="M 88 40 Q 98 20 74 14 Q 70 30 82 50 Z" fill="${color}" opacity="0.85"/>
        <path d="M 50 14 L 62 30 L 50 36 L 38 30 Z" fill="#ffd700"/>
      ` : `
        <polygon points="50,18 76,32 72,66 50,82 28,66 24,32" fill="none" stroke="url(#glow-${medalId})" stroke-width="1.8"/>
      `}
      <!-- Center Emblem -->
      <circle cx="50" cy="50" r="15" fill="#1b1e26" stroke="${color}" stroke-width="2"/>
      <polygon points="50,38 58,50 50,62 42,50" fill="${color}"/>
      ${topText ? `
        <rect x="18" y="76" width="64" height="15" rx="3" fill="#1b120c" stroke="#ffd700" stroke-width="1.2"/>
        <text x="50" y="87" fill="#ffd700" font-size="8.5" font-weight="900" text-anchor="middle" font-family="sans-serif">${topText}</text>
      ` : ''}
    </svg>
  `;
}

function getHeroBadgeSvg(tierId, level) {
  const tier = HERO_TIER_DATA.find((t) => t.id === tierId) || HERO_TIER_DATA[0];
  const color = tier.color || '#ffd700';
  return `
    <svg viewBox="0 0 80 80" class="hero-tier-svg" width="54" height="54">
      <defs>
        <linearGradient id="tier-grad-${tierId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="#181a20"/>
        </linearGradient>
      </defs>
      <polygon points="40,4 72,20 66,62 40,76 14,62 8,20" fill="url(#tier-grad-${tierId})" stroke="${color}" stroke-width="2"/>
      <circle cx="40" cy="40" r="18" fill="#101216" stroke="${color}" stroke-width="1.5"/>
      <text x="40" y="46" fill="${color}" font-size="16" font-weight="900" text-anchor="middle" font-family="sans-serif">${level || tier.defaultLevel}</text>
    </svg>
  `;
}

export async function initRankCustomizer() {
  try {
    const cur = await window.api.ranks.getCustom();
    if (cur && cur.active && cur.settings) {
      customState.activeInstalled = cur.record;
      if (cur.settings.medal) customState.medal = cur.settings.medal;
      if (cur.settings.stars !== undefined) customState.stars = cur.settings.stars;
      if (cur.settings.mmr !== undefined) customState.mmr = cur.settings.mmr;
      if (cur.settings.heroTier !== undefined) customState.heroTier = cur.settings.heroTier;
      if (cur.settings.heroLevel !== undefined) customState.heroLevel = cur.settings.heroLevel;
    }
  } catch {
    /* fallback to defaults */
  }
}

export function rankCustomizerHtml() {
  const currentMedal = RANK_DATA.find((m) => m.id === customState.medal) || RANK_DATA[11];
  const isImmortal = currentMedal.id.startsWith('rank8');

  return `
    <section class="rank-customizer-container" id="rankCustomizerSection">
      <div class="rc-header">
        <div class="rc-title-group">
          <h2 class="rc-title">${L`Elección de Rango y MMR de Dota 2`}</h2>
          <p class="rc-subtitle">${L`Personaliza tu medalla de rango, estrellas, número de MMR e insignia de Dota Plus de forma local sin alterar tus partidas.`}</p>
        </div>
        ${customState.activeInstalled ? `
          <div class="rc-active-badge">
            <span class="ms ms-sm">verified</span>
            <span>${L`Mod de Rango Activo en el Juego`}</span>
          </div>
        ` : ''}
      </div>

      <!-- Medals Grid -->
      <div class="rc-section-title">${L`1. Selecciona tu Medalla de Rango`}</div>
      <div class="rc-medals-grid" id="rcMedalsGrid">
        ${RANK_DATA.map((m) => {
          const active = m.id === customState.medal ? 'active' : '';
          return `
            <div class="rc-medal-card ${active}" data-medal="${m.id}">
              <div class="rc-medal-icon">${getRankBadgeSvg(m.id)}</div>
              <div class="rc-medal-name">${tr(m.nameRu)}</div>
              <div class="rc-medal-sub">${m.defaultMmr > 0 ? `${m.defaultMmr} MMR` : L`Sin clasificar`}</div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Stars and MMR Controls -->
      <div class="rc-controls-row">
        <!-- Stars Picker -->
        <div class="rc-control-group rc-stars-group ${isImmortal ? 'disabled' : ''}">
          <label class="rc-label">${L`2. Estrellas de Rango`}</label>
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
          ${isImmortal ? `<div class="rc-hint">${L`Las medallas Inmortal muestran puesto en el ranking en vez de estrellas.`}</div>` : ''}
        </div>

        <!-- MMR Input -->
        <div class="rc-control-group rc-mmr-group">
          <label class="rc-label" for="rcMmrInput">${L`3. MMR del Perfil (Hasta 15,000)`}</label>
          <div class="rc-mmr-input-wrap">
            <input type="number" id="rcMmrInput" class="rc-input" min="0" max="15000" step="10" value="${customState.mmr}" />
            <span class="rc-input-unit">MMR</span>
          </div>
          <div class="rc-hint">${L`El MMR se autocompleta con el rango pero puedes escribir cualquier número que desees.`}</div>
        </div>
      </div>

      <!-- Dota Plus Hero Tier Changer -->
      <div class="rc-section-title">${L`4. Insignia de Nivel de Héroe (Dota Plus Hero Tier)`}</div>
      <div class="rc-hero-tier-grid" id="rcHeroTierGrid">
        ${HERO_TIER_DATA.map((t) => {
          const active = customState.heroTier === t.id ? 'active' : '';
          return `
            <div class="rc-tier-card ${active}" data-tier="${t.id}">
              <div class="rc-tier-icon">${getHeroBadgeSvg(t.id, t.defaultLevel)}</div>
              <div class="rc-tier-name">${tr(t.nameRu)}</div>
              <div class="rc-tier-sub">Nivel ${t.levels}</div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Live Preview Card -->
      <div class="rc-preview-box" id="rcPreviewBox">
        <div class="rc-preview-badge-col">
          <div id="rcPreviewMedal">${getRankBadgeSvg(customState.medal)}</div>
          <div class="rc-preview-stars" id="rcPreviewStars">
            ${isImmortal ? '' : Array.from({ length: customState.stars || 1 }).map(() => '<span class="ms rc-gold-star">star</span>').join('')}
          </div>
        </div>
        <div class="rc-preview-info-col">
          <div class="rc-preview-title" id="rcPreviewTitle">${tr(currentMedal.nameRu)}</div>
          <div class="rc-preview-mmr" id="rcPreviewMmr">${customState.mmr.toLocaleString()} MMR</div>
          <div class="rc-preview-hero-badge" id="rcPreviewHeroBadge">
            ${getHeroBadgeSvg(customState.heroTier, customState.heroLevel)}
            <div class="rc-preview-hero-text">
              <span class="rc-preview-hero-title">${HERO_TIER_DATA[customState.heroTier]?.nameEs || 'Grandmaster'}</span>
              <span class="rc-preview-hero-sub">Dota Plus Hero Badge</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="rc-actions-bar">
        <button type="button" class="btn btn-primary rc-apply-btn" id="rcApplyBtn">
          <span class="ms">save</span>
          <span>${L`Aplicar e Instalar Rango`}</span>
        </button>
        <button type="button" class="btn btn-outline rc-reset-btn" id="rcResetBtn">
          <span class="ms">restore</span>
          <span>${L`Restablecer Medalla Original`}</span>
        </button>
      </div>

      <!-- FAQ Section -->
      <div class="rc-faq-container">
        <h3 class="rc-faq-title">${L`Preguntas Frecuentes`}</h3>
        <div class="rc-faq-list">
          <details class="rc-faq-item">
            <summary>${L`¿Se puede cambiar la medalla de rango en Dota 2?`}</summary>
            <p>${L`Sí. Mod Assistant sustituye localmente las texturas de la medalla en tu cliente. Tu rango real y emparejamiento no se alteran en los servidores de Valve.`}</p>
          </details>
          <details class="rc-faq-item">
            <summary>${L`¿Es seguro? ¿Pueden banearme por cambiar la medalla?`}</summary>
            <p>${L`La medalla se reemplaza mediante un paquete de mods (VPK) exactamente igual que las apariencias de héroes. No inyecta código en memoria ni altera el juego.`}</p>
          </details>
          <details class="rc-faq-item">
            <summary>${L`¿Verán otros jugadores mi medalla o nivel de héroe?`}</summary>
            <p>${L`No. Solo funciona en tu pantalla: perfil, marcador y pantalla de carga.`}</p>
          </details>
          <details class="rc-faq-item">
            <summary>${L`¿Cómo recupero mi medalla real?`}</summary>
            <p>${L`Pulsa el botón «Restablecer Medalla Original» o desinstala el mod desde tu Biblioteca en cualquier momento.`}</p>
          </details>
        </div>
      </div>
    </section>
  `;
}

function updatePreview() {
  const currentMedal = RANK_DATA.find((m) => m.id === customState.medal) || RANK_DATA[0];
  const isImmortal = currentMedal.id.startsWith('rank8');

  const previewMedalEl = $('#rcPreviewMedal');
  if (previewMedalEl) previewMedalEl.innerHTML = getRankBadgeSvg(customState.medal);

  const previewStarsEl = $('#rcPreviewStars');
  if (previewStarsEl) {
    if (isImmortal) {
      previewStarsEl.innerHTML = '';
    } else {
      previewStarsEl.innerHTML = Array.from({ length: customState.stars || 1 }).map(() => '<span class="ms rc-gold-star">star</span>').join('');
    }
  }

  const previewTitleEl = $('#rcPreviewTitle');
  if (previewTitleEl) previewTitleEl.textContent = tr(currentMedal.nameRu);

  const previewMmrEl = $('#rcPreviewMmr');
  if (previewMmrEl) previewMmrEl.textContent = `${Number(customState.mmr).toLocaleString()} MMR`;

  const previewHeroBadgeEl = $('#rcPreviewHeroBadge');
  if (previewHeroBadgeEl) {
    const tier = HERO_TIER_DATA[customState.heroTier] || HERO_TIER_DATA[5];
    previewHeroBadgeEl.innerHTML = `
      ${getHeroBadgeSvg(customState.heroTier, customState.heroLevel)}
      <div class="rc-preview-hero-text">
        <span class="rc-preview-hero-title">${tier.nameEs}</span>
        <span class="rc-preview-hero-sub">Dota Plus Hero Badge</span>
      </div>
    `;
  }
}

export function bindRankCustomizer(container) {
  if (!container) return;

  // 1. Medal Selection
  container.querySelectorAll('.rc-medal-card').forEach((card) => {
    card.addEventListener('click', () => {
      const medalId = card.dataset.medal;
      customState.medal = medalId;

      container.querySelectorAll('.rc-medal-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');

      const meta = RANK_DATA.find((m) => m.id === medalId);
      const isImmortal = medalId.startsWith('rank8');

      // Update MMR
      if (meta) {
        if (!isImmortal && meta.stars && meta.stars[customState.stars - 1] !== undefined) {
          customState.mmr = meta.stars[customState.stars - 1];
        } else {
          customState.mmr = meta.defaultMmr;
        }
        const mmrInput = $('#rcMmrInput');
        if (mmrInput) mmrInput.value = customState.mmr;
      }

      // Toggle stars group disabled state
      const starsGroup = container.querySelector('.rc-stars-group');
      if (starsGroup) {
        starsGroup.classList.toggle('disabled', isImmortal);
        starsGroup.querySelectorAll('button').forEach((b) => { b.disabled = isImmortal; });
      }

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

  // 4. Hero Tier Selection
  container.querySelectorAll('.rc-tier-card').forEach((card) => {
    card.addEventListener('click', () => {
      const tierId = Number(card.dataset.tier);
      customState.heroTier = tierId;
      const tierInfo = HERO_TIER_DATA.find((t) => t.id === tierId);
      if (tierInfo) customState.heroLevel = tierInfo.defaultLevel;

      container.querySelectorAll('.rc-tier-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');

      updatePreview();
    });
  });

  // 5. Apply Button
  const applyBtn = container.querySelector('#rcApplyBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      applyBtn.disabled = true;
      applyBtn.innerHTML = `<span class="spinner-sm"></span> <span>${L`Instalando...`}</span>`;

      try {
        const res = await window.api.ranks.applyCustom({
          medal: customState.medal,
          stars: customState.stars,
          mmr: customState.mmr,
          heroTier: customState.heroTier,
          heroLevel: customState.heroLevel,
        });

        if (res.error) {
          toast(res.error, 'error', 6000);
        } else {
          customState.activeInstalled = res.record;
          toast(L`¡Rango y nivel de héroe actualizados e instalados con éxito!`, 'ok');
          await refreshInstalledIndex();
        }
      } catch (err) {
        toast(String(err?.message || err), 'error', 6000);
      } finally {
        applyBtn.disabled = false;
        applyBtn.innerHTML = `<span class="ms">save</span> <span>${L`Aplicar e Instalar Rango`}</span>`;
      }
    });
  }

  // 6. Reset Button
  const resetBtn = container.querySelector('#rcResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const ok = await confirmDialog(L`¿Deseas restablecer tu rango al original de Dota 2?`, { okLabel: L`Restablecer` });
      if (!ok) return;

      resetBtn.disabled = true;
      try {
        await window.api.ranks.removeCustom();
        customState.activeInstalled = null;
        toast(L`Rango restablecido a los valores por defecto del juego.`, 'ok');
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
