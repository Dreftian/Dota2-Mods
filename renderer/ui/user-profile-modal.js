/* User profile modal for Mod Assistant.
 * Displays the account, its subscription tier, an upgrade button, a password change and logout.
 *
 * The account lives in userData on this PC and nothing syncs it anywhere (src/auth.js), so the
 * status pill says exactly that. It used to say "synced to the cloud (InsForge)", and the account
 * and any paid plan were gone the first time somebody moved to another PC.
 */
import { esc } from './format.js';
import { toast } from './toast.js';

let activeProfileOverlay = null;

const SECTION_TITLE = 'margin: 0 0 6px; font-size: 13px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;';

function expiryText(user, isAdm) {
  if (isAdm) return L`Бессрочно (админ)`;
  const when = new Date(user.subscription.expiresAt).toLocaleDateString(window.i18nLocale(), { year: 'numeric', month: 'long', day: 'numeric' });
  return user.subscription.status === 'expired' ? L`Закончилась ${when}` : when;
}

export function showUserProfileModal({ user, onLogout = null, onUpgrade = null } = {}) {
  if (activeProfileOverlay) {
    activeProfileOverlay.remove();
    activeProfileOverlay = null;
  }

  if (!user) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay profile-modal-overlay';

  const isAdm = !!user.isAdmin;
  const isPrem = !!user.isPremium;
  const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();

  const roleTitle = isAdm
    ? L`Администратор (полный доступ)`
    : (isPrem ? L`Подписка Premium ($5.00 USD/мес.)` : L`Стандартный план (бесплатный)`);

  const badgeClass = isAdm ? 'badge-admin' : (isPrem ? 'badge-premium' : 'badge-free');
  const badgeLabel = isAdm ? 'ADMIN' : (isPrem ? 'PREMIUM' : L`БЕСПЛАТНО`);

  overlay.innerHTML = `
    <div class="modal-content profile-modal-box" role="dialog" aria-modal="true">
      <div class="profile-header">
        <div class="profile-avatar">
          <div class="profile-avatar-inner">${esc(initial)}</div>
          <span class="profile-avatar-badge ms">${isAdm ? 'shield' : (isPrem ? 'auto_awesome' : 'person')}</span>
        </div>
        <div class="profile-user-info">
          <div class="profile-name-row">
            <h2 class="profile-display-name">${esc(user.name || user.email.split('@')[0])}</h2>
            <span class="tb-user-badge ${badgeClass}">${esc(badgeLabel)}</span>
          </div>
          <span class="profile-email">${esc(user.email)}</span>
        </div>
        <button class="profile-close-btn" id="profCloseBtn" title="${esc(L`Закрыть`)}"><span class="ms">close</span></button>
      </div>

      <div class="profile-body">
        <div class="profile-section">
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Состояние аккаунта`}</span>
            <span class="profile-stat-pill ok"><span class="ms" style="font-size: 13px;">computer</span> ${L`Локальная учётная запись (только этот ПК)`}</span>
          </div>
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Уровень аккаунта`}</span>
            <span class="profile-stat-val"><b>${esc(roleTitle)}</b></span>
          </div>
          ${user.subscription?.expiresAt || isAdm ? `
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Подписка действует до`}</span>
            <span class="profile-stat-val" style="color: #60a5fa; font-weight: 600;">
              ${esc(expiryText(user, isAdm))}
            </span>
          </div>
          ` : ''}
        </div>

        <!-- Personal & Residency Details -->
        <div class="profile-section">
          <h4 style="${SECTION_TITLE}">${L`Личные данные и адрес`}</h4>
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Возраст и дата рождения`}</span>
            <span class="profile-stat-val">${user.age ? esc(user.age) : '—'} ${user.birthDate ? `(${esc(user.birthDate)})` : ''}</span>
          </div>
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Адрес`}</span>
            <span class="profile-stat-val">${user.address ? esc(user.address) : '—'}</span>
          </div>
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Страна и индекс`}</span>
            <span class="profile-stat-val">${user.country ? esc(user.country) : '—'} ${user.postalCode ? `(${esc(user.postalCode)})` : ''}</span>
          </div>
        </div>

        <!-- Payment Method Details -->
        <div class="profile-section">
          <h4 style="${SECTION_TITLE}">${L`Способ оплаты и счета`}</h4>
          ${user.subscription?.card ? `
            <div class="profile-stat-row">
              <span class="profile-stat-label">${L`Привязанная карта`}</span>
              <span class="profile-stat-val" style="display: flex; align-items: center; gap: 6px;">
                <span class="ms" style="font-size: 16px; color: #a5b4fc;">credit_card</span>
                <b>${esc(user.subscription.card.brand || L`Карта`)}</b>
                <span class="mono">•••• ${esc(user.subscription.card.last4 || '4242')}</span>
              </span>
            </div>
            <div class="profile-stat-row">
              <span class="profile-stat-label">${L`Владелец и срок действия`}</span>
              <span class="profile-stat-val">${esc(user.subscription.card.cardholderName || user.name)} (${esc(user.subscription.card.expMonth)}/${esc(user.subscription.card.expYear)})</span>
            </div>
          ` : (user.subscription?.method ? `
            <div class="profile-stat-row">
              <span class="profile-stat-label">${L`Способ`}</span>
              <span class="profile-stat-val">${esc(user.subscription.method.toUpperCase())} (Ref: ${esc(user.subscription.reference || '—')})</span>
            </div>
          ` : `
            <div class="profile-stat-row">
              <span class="profile-stat-label">${L`Способ`}</span>
              <span class="profile-stat-val" style="color: var(--text-faint);">${L`Нет привязанных карт и способов оплаты`}</span>
            </div>
          `)}
        </div>

        <!-- Password change -->
        <div class="profile-section">
          <div class="profile-stat-row">
            <h4 style="${SECTION_TITLE} margin: 0;">${L`Пароль`}</h4>
            <button type="button" class="btn btn-secondary btn-sm" id="profPwdToggle">
              <span class="ms">key</span> ${L`Сменить пароль`}
            </button>
          </div>
          <form class="hidden" id="profPwdForm" style="display: flex; flex-direction: column; gap: 10px;">
            <div class="auth-field">
              <label for="profPwdOld">${L`Текущий пароль`}</label>
              <div class="auth-input-wrap">
                <span class="ms">lock</span>
                <input type="password" id="profPwdOld" required autocomplete="current-password">
              </div>
            </div>
            <div class="auth-field">
              <label for="profPwdNew">${L`Новый пароль`}</label>
              <div class="auth-input-wrap">
                <span class="ms">key</span>
                <input type="password" id="profPwdNew" placeholder="${L`Минимум 6 символов`}" minlength="6" required autocomplete="new-password">
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-sm" id="profPwdSubmit">${L`Сменить пароль`}</button>
          </form>
        </div>

        ${!isPrem && !isAdm ? `
          <div class="profile-promo-box">
            <div class="profile-promo-text">
              <h4>${L`Перейди на Mod Assistant Premium`}</h4>
              <p>${L`Эксклюзивные моды, быстрые загрузки и поддержка всего за $5.00 USD/мес.`}</p>
            </div>
            <button class="btn btn-primary profile-upgrade-btn" id="profUpgradeBtn">
              <span class="ms">auto_awesome</span> ${L`Оформить сейчас`}
            </button>
          </div>
        ` : ''}
      </div>

      <div class="profile-footer">
        <button class="btn btn-danger profile-logout-btn" id="profLogoutBtn">
          <span class="ms">logout</span> ${L`Выйти из аккаунта`}
        </button>
        <button class="btn btn-secondary" id="profDoneBtn">${L`Закрыть`}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  activeProfileOverlay = overlay;

  const close = () => {
    overlay.remove();
    activeProfileOverlay = null;
    document.removeEventListener('keydown', onKey);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };

  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#profCloseBtn')?.addEventListener('click', close);
  overlay.querySelector('#profDoneBtn')?.addEventListener('click', close);

  overlay.querySelector('#profUpgradeBtn')?.addEventListener('click', () => {
    close();
    if (onUpgrade) onUpgrade();
  });

  const pwdForm = overlay.querySelector('#profPwdForm');
  overlay.querySelector('#profPwdToggle')?.addEventListener('click', () => {
    pwdForm.classList.toggle('hidden');
    if (!pwdForm.classList.contains('hidden')) overlay.querySelector('#profPwdOld')?.focus();
  });

  pwdForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector('#profPwdSubmit');
    const oldInput = overlay.querySelector('#profPwdOld');
    const newInput = overlay.querySelector('#profPwdNew');
    btn.disabled = true;
    try {
      const res = await window.api.auth.changePassword(oldInput.value, newInput.value);
      if (!res?.ok) {
        toast(res?.error || L`Не удалось сменить пароль`, 'error');
        return;
      }
      oldInput.value = '';
      newInput.value = '';
      pwdForm.classList.add('hidden');
      toast(L`Пароль изменён`);
    } catch (err) {
      toast(err.message || L`Не удалось сменить пароль`, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  overlay.querySelector('#profLogoutBtn')?.addEventListener('click', async () => {
    close();
    if (onLogout) onLogout();
  });
}
