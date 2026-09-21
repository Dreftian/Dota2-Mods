/* User profile modal for Mod Assistant.
 * Displays user account information, InsForge Cloud connection status,
 * subscription tier, upgrade button, and secure logout.
 */
import { esc } from './format.js';

let activeProfileOverlay = null;

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
    ? 'Administrador (Acceso Total)'
    : (isPrem ? 'Suscripción Premium ($5.00 USD/mes)' : 'Plan Estándar (Gratuito)');

  const badgeClass = isAdm ? 'badge-admin' : (isPrem ? 'badge-premium' : 'badge-free');
  const badgeLabel = isAdm ? 'ADMIN' : (isPrem ? 'PREMIUM' : 'GRATUITO');

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
            <span class="tb-user-badge ${badgeClass}">${badgeLabel}</span>
          </div>
          <span class="profile-email">${esc(user.email)}</span>
        </div>
        <button class="profile-close-btn" id="profCloseBtn" title="Cerrar"><span class="ms">close</span></button>
      </div>

      <div class="profile-body">
        <div class="profile-section">
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Estado de la cuenta`}</span>
            <span class="profile-stat-pill ok"><span class="pulse-dot"></span> ${L`Sincronizado en la nube`}</span>
          </div>
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Nivel de cuenta`}</span>
            <span class="profile-stat-val"><b>${esc(roleTitle)}</b></span>
          </div>
          ${user.subscription?.expiresAt || isAdm ? `
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Expiración de suscripción`}</span>
            <span class="profile-stat-val" style="color: #60a5fa; font-weight: 600;">
              ${isAdm ? L`Acceso Vitalicio (Admin)` : new Date(user.subscription.expiresAt).toLocaleDateString(window.i18nLocale(), { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          ` : ''}
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Servicio de autenticación`}</span>
            <span class="profile-stat-val mono">InsForge (9457c313-82cc-4773)</span>
          </div>
        </div>

        <!-- Personal & Residency Details -->
        <div class="profile-section">
          <h4 style="margin: 0 0 6px; font-size: 13px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${L`Datos Personales y Residencia`}</h4>
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Edad y Nacimiento`}</span>
            <span class="profile-stat-val">${user.age ? `${esc(user.age)} ${L`años`}` : '—'} ${user.birthDate ? `(${esc(user.birthDate)})` : ''}</span>
          </div>
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`Dirección`}</span>
            <span class="profile-stat-val">${user.address ? esc(user.address) : '—'}</span>
          </div>
          <div class="profile-stat-row">
            <span class="profile-stat-label">${L`País y Código Postal`}</span>
            <span class="profile-stat-val">${user.country ? esc(user.country) : '—'} ${user.postalCode ? `(${esc(user.postalCode)})` : ''}</span>
          </div>
        </div>

        <!-- Payment Method Details -->
        <div class="profile-section">
          <h4 style="margin: 0 0 6px; font-size: 13px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${L`Método de Pago y Facturación`}</h4>
          ${user.subscription?.card ? `
            <div class="profile-stat-row">
              <span class="profile-stat-label">${L`Tarjeta Registrada`}</span>
              <span class="profile-stat-val" style="display: flex; align-items: center; gap: 6px;">
                <span class="ms" style="font-size: 16px; color: #a5b4fc;">credit_card</span>
                <b>${esc(user.subscription.card.brand || 'Tarjeta')}</b>
                <span class="mono">•••• ${esc(user.subscription.card.last4 || '4242')}</span>
              </span>
            </div>
            <div class="profile-stat-row">
              <span class="profile-stat-label">${L`Titular y Vencimiento`}</span>
              <span class="profile-stat-val">${esc(user.subscription.card.cardholderName || user.name)} (${esc(user.subscription.card.expMonth)}/${esc(user.subscription.card.expYear)})</span>
            </div>
          ` : (user.subscription?.method ? `
            <div class="profile-stat-row">
              <span class="profile-stat-label">${L`Método`}</span>
              <span class="profile-stat-val">${esc(user.subscription.method.toUpperCase())} (Ref: ${esc(user.subscription.reference || '—')})</span>
            </div>
          ` : `
            <div class="profile-stat-row">
              <span class="profile-stat-label">${L`Método`}</span>
              <span class="profile-stat-val" style="color: var(--text-faint);">${L`Sin tarjetas o métodos registrados`}</span>
            </div>
          `)}
        </div>

        ${!isPrem && !isAdm ? `
          <div class="profile-promo-box">
            <div class="profile-promo-text">
              <h4>${L`Mejora a Mod Assistant Premium`}</h4>
              <p>${L`Accede a mods exclusivos, descargas ultrarrápidas y soporte por solo $5.00 USD/mes.`}</p>
            </div>
            <button class="btn btn-primary profile-upgrade-btn" id="profUpgradeBtn">
              <span class="ms">auto_awesome</span> ${L`Mejorar ahora`}
            </button>
          </div>
        ` : ''}
      </div>

      <div class="profile-footer">
        <button class="btn btn-danger profile-logout-btn" id="profLogoutBtn">
          <span class="ms">logout</span> ${L`Cerrar sesión`}
        </button>
        <button class="btn btn-secondary" id="profDoneBtn">${L`Cerrar`}</button>
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

  overlay.querySelector('#profLogoutBtn')?.addEventListener('click', async () => {
    close();
    if (onLogout) onLogout();
  });
}
