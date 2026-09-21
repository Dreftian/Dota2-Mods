// Interactive Dota 2 Rank Medal, Stars, MMR, and Hero Tier Customizer
// Matches the visual layout and feature set from Dota2Changer with authentic Dota 2 graphics.

import { $ } from '../core/dom.js';
import { state } from '../core/store.js';
import { toast } from './toast.js';
import { confirmDialog } from './dialog.js';
import { refreshInstalledIndex } from '../core/installed.js';
import { showCheckoutModal } from './checkout-modal.js';

export const RANK_DATA = [
  { id: 'rank0', nameEs: 'Sin calibrar', nameEn: 'Not Calibrated', nameRu: 'Без калибровки', badge: 'FREE', badgeType: 'free', defaultMmr: 0 },
  { id: 'rank1', nameEs: 'Heraldo', nameEn: 'Herald', nameRu: 'Рекрут', badge: 'FREE', badgeType: 'free', stars: [0, 150, 300, 460, 610], defaultMmr: 300 },
  { id: 'rank2', nameEs: 'Guardián', nameEn: 'Guardian', nameRu: 'Страж', badge: 'FREE', badgeType: 'free', stars: [770, 920, 1080, 1230, 1400], defaultMmr: 1080 },
  { id: 'rank3', nameEs: 'Cruzado', nameEn: 'Crusader', nameRu: 'Рыцарь', badge: 'FREE', badgeType: 'free', stars: [1540, 1700, 1850, 2000, 2150], defaultMmr: 1850 },
  { id: 'rank4', nameEs: 'Arconte', nameEn: 'Archon', nameRu: 'Герой', badge: 'FREE', badgeType: 'free', locked: false, stars: [2310, 2450, 2610, 2770, 2930], defaultMmr: 2610 },
  { id: 'rank5', nameEs: 'Leyenda', nameEn: 'Legend', nameRu: 'Легенда', badge: 'FREE', badgeType: 'free', locked: false, stars: [3080, 3230, 3390, 3540, 3700], defaultMmr: 3390 },
  { id: 'rank6', nameEs: 'Ancestral', nameEn: 'Ancient', nameRu: 'Властелин', badge: 'FREE', badgeType: 'free', locked: false, stars: [3850, 4000, 4150, 4300, 4460], defaultMmr: 4150 },
  { id: 'rank7', nameEs: 'Divino', nameEn: 'Divine', nameRu: 'Божество', badge: 'FREE', badgeType: 'free', locked: false, stars: [4620, 4820, 5020, 5220, 5420], defaultMmr: 5020 },
  { id: 'rank8', nameEs: 'Inmortal', nameEn: 'Immortal', nameRu: 'Титан', badge: 'VIP', badgeType: 'vip', locked: true, defaultMmr: 5620 },
  { id: 'rank8a', nameEs: 'Inmortal, Top 1000', nameEn: 'Immortal Top 1000', nameRu: 'Титан Топ 1000', badge: 'VIP', badgeType: 'vip', locked: true, defaultMmr: 8620 },
  { id: 'rank8b', nameEs: 'Inmortal, Top 100', nameEn: 'Immortal Top 100', nameRu: 'Титан Топ 100', badge: 'VIP', badgeType: 'vip', locked: true, defaultMmr: 10620 },
  { id: 'rank8c', nameEs: 'Inmortal, Top 10', nameEn: 'Immortal Top 10', nameRu: 'Титан Топ 10', badge: 'VIP', badgeType: 'vip', locked: true, defaultMmr: 12620 },
];

export const HERO_TIER_DATA = [
  { id: 0, nameEs: 'Bronze', nameEn: 'Bronze', nameRu: 'Бронза', badge: 'FREE', badgeType: 'free', levels: '1-5', defaultLevel: 5 },
  { id: 1, nameEs: 'Silver', nameEn: 'Silver', nameRu: 'Серебро', badge: 'FREE', badgeType: 'free', levels: '6-11', defaultLevel: 11 },
  { id: 2, nameEs: 'Gold', nameEn: 'Gold', nameRu: 'Золото', badge: 'FREE', badgeType: 'free', locked: false, levels: '12-17', defaultLevel: 17 },
  { id: 3, nameEs: 'Platinum', nameEn: 'Platinum', nameRu: 'Платина', badge: 'FREE', badgeType: 'free', locked: false, levels: '18-24', defaultLevel: 24 },
  { id: 4, nameEs: 'Master', nameEn: 'Master', nameRu: 'Мастер', badge: 'VIP', badgeType: 'vip', locked: true, levels: '25-29', defaultLevel: 29 },
  { id: 5, nameEs: 'Grandmaster', nameEn: 'Grandmaster', nameRu: 'Грандмастер', badge: 'VIP', badgeType: 'vip', locked: true, levels: '30', defaultLevel: 30 },
];

let customState = {
  medal: 'rank8c',
  stars: 5,
  mmr: 12620,
  immortalRank: 10,
  heroTier: 5,
  heroLevel: 30,
  activeInstalled: null,
};

function getLocalizedName(item) {
  if (!item) return '';
  const lang = window.I18N_LANG || 'es';
  if (lang === 'es') return item.nameEs || item.nameEn;
  if (lang === 'en') return item.nameEn;
  if (lang === 'ru') return item.nameRu || item.nameEn;
  return item.nameEs || item.nameEn;
}

export async function initRankCustomizer() {
  try {
    const cur = await window.api.ranks.getCustom();
    if (cur && cur.active && cur.settings) {
      customState.activeInstalled = cur.record;
      if (cur.settings.medal) customState.medal = cur.settings.medal;
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

export function rankCustomizerHtml() {
  const currentMedal = RANK_DATA.find((m) => m.id === customState.medal) || RANK_DATA[11];
  const currentTier = HERO_TIER_DATA.find((t) => t.id === customState.heroTier) || HERO_TIER_DATA[5];
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
      <div class="rc-section-header-wrap">
        <div class="rc-section-title">${L`1. Selecciona tu Medalla de Rango`}</div>
        <div class="rc-tier-rules">${L`Sin calibrar a Divino — gratis, Inmortal y Top Clasificatorio — con estado VIP.`}</div>
      </div>
      <div class="rc-medals-grid" id="rcMedalsGrid">
        ${RANK_DATA.map((m) => {
          const active = m.id === customState.medal ? 'active' : '';
          return `
            <div class="rc-medal-card ${active}" data-medal="${m.id}">
              ${m.locked ? '<span class="rc-lock-icon ms">lock</span>' : ''}
              <div class="rc-medal-icon">
                <img src="assets/ranks/${m.id}.png" alt="${m.nameEn}" class="rc-medal-img" draggable="false" />
              </div>
              <div class="rc-medal-name">${getLocalizedName(m)}</div>
              <div class="rc-medal-sub">${m.nameEn}</div>
              <span class="rc-tier-pill rc-pill-${m.badgeType}">${m.badge}</span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Stars and MMR Controls -->
      <!-- Stars, MMR and Immortal Leaderboard Controls -->
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

      <!-- Immortal Rank Leaderboard Digit (Visible when Immortal is selected) -->
      <div class="rc-controls-row ${isImmortal ? '' : 'hidden'}" id="rcImmortalRow" style="margin-top: -6px; margin-bottom: 18px;">
        <div class="rc-control-group rc-immortal-group" style="max-width: 360px;">
          <label class="rc-label" for="rcImmortalRankInput">${L`Posición / Dígito de Clasificación Inmortal`}</label>
          <div class="rc-mmr-input-wrap">
            <input type="number" id="rcImmortalRankInput" class="rc-input" min="1" max="50000" value="${customState.immortalRank || 10}" />
            <span class="rc-input-unit">#RANK</span>
          </div>
          <div class="rc-hint">${L`El número que se mostrará en la placa de tu medalla Inmortal (ej. 1, 10, 100, 1000).`}</div>
        </div>
      </div>

      <!-- Dota Plus Hero Tier Changer -->
      <div class="rc-section-header-wrap">
        <div class="rc-section-title">${L`4. Insignia de Nivel de Héroe (Dota Plus Hero Tier)`}</div>
        <div class="rc-tier-rules">${L`Bronze hasta Platinum son gratis, Master y Grandmaster requieren estado VIP.`}</div>
      </div>
      <div class="rc-hero-tier-grid" id="rcHeroTierGrid">
        ${HERO_TIER_DATA.map((t) => {
          const active = customState.heroTier === t.id ? 'active' : '';
          return `
            <div class="rc-tier-card ${active}" data-tier="${t.id}">
              ${t.locked ? '<span class="rc-lock-icon ms">lock</span>' : ''}
              <div class="rc-tier-icon">
                <img src="assets/herotier/tier${t.id}.png" alt="${t.nameEn}" class="rc-tier-img" draggable="false" />
              </div>
              <div class="rc-tier-name">${getLocalizedName(t)}</div>
              <div class="rc-tier-sub">Nivel ${t.levels}</div>
              <span class="rc-tier-pill rc-pill-${t.badgeType}">${t.badge}</span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Hero Tier Level Digit Picker -->
      <div class="rc-controls-row" style="margin-top: -6px; margin-bottom: 18px;">
        <div class="rc-control-group rc-hero-level-group" style="max-width: 360px;">
          <label class="rc-label" for="rcHeroLevelInput">${L`Dígito de Nivel de Insignia de Héroe (Dota Plus)`}</label>
          <div class="rc-mmr-input-wrap">
            <input type="number" id="rcHeroLevelInput" class="rc-input" min="1" max="99" value="${customState.heroLevel || 30}" />
            <span class="rc-input-unit">LVL</span>
          </div>
          <div class="rc-hint">${L`Nivel del héroe que se mostrará en las insignias de héroes (ej. 30 para Gran Maestro).`}</div>
        </div>
      </div>

      <!-- Live Preview Card -->
      <div class="rc-preview-box" id="rcPreviewBox">
        <div class="rc-preview-badge-col">
          <div class="rc-preview-medal-wrap" id="rcPreviewMedalWrap">
            <img src="assets/ranks/${customState.medal}.png" class="rc-preview-medal-img" id="rcPreviewMedalImg" alt="Medal" draggable="false" />
            <img src="assets/ranks/stars${customState.stars || 1}.png" class="rc-preview-stars-img ${isImmortal ? 'hidden' : ''}" id="rcPreviewStarsImg" alt="Stars" draggable="false" />
            <div class="rc-preview-immortal-rank ${isImmortal ? '' : 'hidden'}" id="rcPreviewImmortalRank">
              <span class="rc-immortal-hash">#</span><span id="rcPreviewImmortalNum">${customState.immortalRank || 10}</span>
            </div>
          </div>
        </div>
        <div class="rc-preview-info-col">
          <div class="rc-preview-title" id="rcPreviewTitle">${getLocalizedName(currentMedal)}</div>
          <div class="rc-preview-mmr" id="rcPreviewMmr">${customState.mmr.toLocaleString()} MMR</div>
          <div class="rc-preview-hero-badge" id="rcPreviewHeroBadge">
            <div class="rc-preview-hero-icon-wrap">
              <img src="assets/herotier/tier${customState.heroTier}.png" class="rc-preview-hero-img" id="rcPreviewHeroImg" alt="Hero Tier" draggable="false" />
              <span class="rc-preview-hero-lvl-badge" id="rcPreviewHeroLvlBadge">${customState.heroLevel || 30}</span>
            </div>
            <div class="rc-preview-hero-text">
              <span class="rc-preview-hero-title" id="rcPreviewHeroTitle">${getLocalizedName(currentTier)}</span>
              <span class="rc-preview-hero-sub">${L`Insignia de Héroe Dota Plus`} (Nivel <span id="rcPreviewHeroSubLvl">${customState.heroLevel || 30}</span>)</span>
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
  if (previewImmortalRank) previewImmortalRank.classList.toggle('hidden', !isImmortal);
  if (previewImmortalNum) previewImmortalNum.textContent = customState.immortalRank || 10;

  const previewTitleEl = $('#rcPreviewTitle');
  if (previewTitleEl) previewTitleEl.textContent = getLocalizedName(currentMedal);

  const previewMmrEl = $('#rcPreviewMmr');
  if (previewMmrEl) previewMmrEl.textContent = `${Number(customState.mmr).toLocaleString()} MMR`;

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

  // 1. Medal Selection
  container.querySelectorAll('.rc-medal-card').forEach((card) => {
    card.addEventListener('click', () => {
      const medalId = card.dataset.medal;
      customState.medal = medalId;

      container.querySelectorAll('.rc-medal-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');

      const meta = RANK_DATA.find((m) => m.id === medalId);
      const isImmortal = medalId.startsWith('rank8');
      const isVipUser = state.currentUser?.isPremium || state.currentUser?.isAdmin;
      if (meta?.locked && !isVipUser) {
        toast(L`La medalla Inmortal requiere suscripción VIP.`, 'warn', 4000);
        showCheckoutModal();
      }

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
      const immortalRow = container.querySelector('#rcImmortalRow');
      if (immortalRow) immortalRow.classList.toggle('hidden', !isImmortal);
      if (isImmortal) {
        if (medalId === 'rank8c') customState.immortalRank = 10;
        else if (medalId === 'rank8b') customState.immortalRank = 100;
        else if (medalId === 'rank8a') customState.immortalRank = 1000;
        else if (medalId === 'rank8') customState.immortalRank = 5000;
        const immInput = container.querySelector('#rcImmortalRankInput');
        if (immInput) immInput.value = customState.immortalRank;
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

  // 3b. Immortal Rank Input
  const immortalInput = container.querySelector('#rcImmortalRankInput');
  if (immortalInput) {
    immortalInput.addEventListener('input', () => {
      customState.immortalRank = Math.max(1, Number(immortalInput.value) || 1);
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

      const isVipUser = state.currentUser?.isPremium || state.currentUser?.isAdmin;
      if (tierInfo?.locked && !isVipUser) {
        toast(L`Las insignias Master y Grandmaster requieren suscripción VIP.`, 'warn', 4000);
        showCheckoutModal();
      }

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
      const medalMeta = RANK_DATA.find((m) => m.id === customState.medal);
      const tierMeta = HERO_TIER_DATA.find((t) => t.id === customState.heroTier);
      const isVipUser = state.currentUser?.isPremium || state.currentUser?.isAdmin;
      if ((medalMeta?.locked || tierMeta?.locked) && !isVipUser) {
        toast(L`El rango Inmortal o insignia Master/Grandmaster requiere suscripción VIP.`, 'warn', 5000);
        showCheckoutModal();
        return;
      }

      applyBtn.disabled = true;
      applyBtn.innerHTML = `<span class="spinner-sm"></span> <span>${L`Instalando...`}</span>`;

      try {
        const res = await window.api.ranks.applyCustom({
          medal: customState.medal,
          stars: customState.stars,
          mmr: customState.mmr,
          immortalRank: customState.immortalRank,
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
