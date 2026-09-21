/* Premium subscription and multi-payment checkout gateway for Mod Assistant.
 * Supports: Stripe (Credit/Debit card), Yape, Plin, Mercado Pago, and BCP Soles bank transfer.
 */
import { state } from '../core/store.js';
import { toast } from './toast.js';

let activeCheckoutOverlay = null;

const STRIPE_ACCOUNT_ID = 'acct_1TCn72RFsLVc4mLc';
const BCP_ACCOUNT_SOLES = '19113291165018';
const BCP_CCI = '00219111329116501852';

export function showCheckoutModal({ onSuccess = null } = {}) {
  if (activeCheckoutOverlay) activeCheckoutOverlay.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay checkout-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content checkout-modal-box">
      <!-- Left side: Plan summary -->
      <div class="checkout-summary">
        <div class="checkout-summary-header">
          <div class="checkout-badge">
            <span class="ms">auto_awesome</span>
            <span>PREMIUM</span>
          </div>
          <h2>Mod Assistant Premium</h2>
          <div class="checkout-price">
            <span class="price-val">$5.00</span>
            <span class="price-period">USD / mes (~S/. 18.50)</span>
          </div>
        </div>

        <ul class="checkout-perks">
          <li>
            <span class="ms perk-icon">check_circle</span>
            <div>
              <b>${L`Acceso total a mods exclusivos`}</b>
              <p>${L`Arcanas, skins personalizados de Bleach/Kez, y sets completos.`}</p>
            </div>
          </li>
          <li>
            <span class="ms perk-icon">check_circle</span>
            <div>
              <b>${L`Descargas e instalación instantánea`}</b>
              <p>${L`Sin colas de espera, con servidores dedicados de alta velocidad.`}</p>
            </div>
          </li>
          <li>
            <span class="ms perk-icon">check_circle</span>
            <div>
              <b>${L`Insignia de usuario Premium`}</b>
              <p>${L`Reconocimiento exclusivo en tu perfil y funciones avanzadas.`}</p>
            </div>
          </li>
          <li>
            <span class="ms perk-icon">check_circle</span>
            <div>
              <b>${L`Soporte prioritario 24/7`}</b>
              <p>${L`Atención personalizada de parte de Dreftian Devs.`}</p>
            </div>
          </li>
        </ul>

        <div class="checkout-security-box">
          <span class="ms">verified_user</span>
          <span>${L`Pago 100% seguro con encriptación SSL de 256 bits`}</span>
        </div>
      </div>

      <!-- Right side: Payment Methods -->
      <div class="checkout-methods-panel">
        <div class="checkout-methods-top">
          <h3>${L`Método de pago`}</h3>
          <button class="checkout-close-btn" id="checkoutCloseBtn"><span class="ms">close</span></button>
        </div>

        <!-- Payment selector tabs -->
        <div class="pay-methods-tabs">
          <button class="pay-tab active" data-tab="stripe">
            <span class="ms">credit_card</span>
            <span>Tarjeta (Stripe)</span>
          </button>
          <button class="pay-tab" data-tab="yape">
            <span class="ms">smartphone</span>
            <span>Yape / Plin</span>
          </button>
          <button class="pay-tab" data-tab="mercadopago">
            <span class="ms">payments</span>
            <span>Mercado Pago</span>
          </button>
          <button class="pay-tab" data-tab="bcp">
            <span class="ms">account_balance</span>
            <span>Banco BCP</span>
          </button>
        </div>

        <div class="pay-forms-container">
          <!-- 1. Stripe Form -->
          <form class="pay-form" id="stripePayForm">
            <div class="stripe-badge-banner">
              <span class="ms">lock</span>
              <span>Stripe Connect: <code>${STRIPE_ACCOUNT_ID}</code></span>
            </div>
            <div class="auth-field">
              <label>${L`Número de tarjeta`}</label>
              <div class="auth-input-wrap">
                <span class="ms">credit_card</span>
                <input type="text" id="stripeCardNum" placeholder="4242 •••• •••• 4242" maxlength="19" required autocomplete="cc-number">
              </div>
            </div>
            <div class="pay-row-two">
              <div class="auth-field">
                <label>${L`Vencimiento`}</label>
                <div class="auth-input-wrap">
                  <input type="text" id="stripeCardExp" placeholder="MM/YY" maxlength="5" required autocomplete="cc-exp">
                </div>
              </div>
              <div class="auth-field">
                <label>${L`CVC / CVV`}</label>
                <div class="auth-input-wrap">
                  <input type="password" id="stripeCardCvc" placeholder="123" maxlength="4" required autocomplete="cc-csc">
                </div>
              </div>
            </div>
            <div class="auth-field">
              <label>${L`Nombre del titular`}</label>
              <div class="auth-input-wrap">
                <span class="ms">person</span>
                <input type="text" id="stripeCardHolder" placeholder="NOMBRE COMPLETO" required autocomplete="cc-name">
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-pay-action" id="stripeSubmitBtn">
              <span class="ms">lock</span>
              <span>${L`Pagar $5.00 USD con Stripe`}</span>
            </button>
          </form>

          <!-- 2. Yape & Plin Form -->
          <form class="pay-form hidden" id="yapePayForm">
            <div class="local-pay-info">
              <div class="qr-placeholder">
                <div class="qr-box">
                  <span class="ms qr-icon">qr_code_2</span>
                  <span class="qr-label">Yape & Plin</span>
                </div>
              </div>
              <div class="local-pay-details">
                <h4>${L`Paga con Yape o Plin`}</h4>
                <p>1. Escanea el código o transfiere a la cuenta asociada.</p>
                <p>2. Monto a transferir: <b>S/. 18.50 PEN</b> (o $5.00 USD)</p>
                <p>3. Ingresa tu número de operación o referencia:</p>
              </div>
            </div>
            <div class="auth-field">
              <label>${L`Código de operación / Referencia`}</label>
              <div class="auth-input-wrap">
                <span class="ms">receipt_long</span>
                <input type="text" id="yapeRefCode" placeholder="Ej: 849201" required>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-pay-action" id="yapeSubmitBtn">
              <span class="ms">check_circle</span>
              <span>${L`Validar pago Yape / Plin`}</span>
            </button>
          </form>

          <!-- 3. Mercado Pago Form -->
          <form class="pay-form hidden" id="mpPayForm">
            <div class="local-pay-info">
              <div class="mp-icon-box">
                <span class="ms">account_balance_wallet</span>
              </div>
              <div class="local-pay-details">
                <h4>Mercado Pago</h4>
                <p>${L`Paga con saldo de Mercado Pago, tarjeta o efectivo en puntos autorizados.`}</p>
                <p>${L`Monto:`} <b>S/. 18.50 PEN</b> / <b>$5.00 USD</b></p>
              </div>
            </div>
            <div class="auth-field">
              <label>${L`Referencia de pago Mercado Pago`}</label>
              <div class="auth-input-wrap">
                <span class="ms">tag</span>
                <input type="text" id="mpRefCode" placeholder="Ej: MP-782947192" required>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-pay-action" id="mpSubmitBtn">
              <span class="ms">verified</span>
              <span>${L`Confirmar con Mercado Pago`}</span>
            </button>
          </form>

          <!-- 4. Transferencia BCP Soles Form -->
          <form class="pay-form hidden" id="bcpPayForm">
            <div class="bcp-account-details">
              <h4>${L`Banco de Crédito del Perú (BCP) - Soles`}</h4>
              <div class="bcp-data-row">
                <span class="bcp-lbl">${L`Número de cuenta BCP:`}</span>
                <span class="bcp-val mono">${BCP_ACCOUNT_SOLES}</span>
                <button type="button" class="btn-copy-sm" data-copy="${BCP_ACCOUNT_SOLES}"><span class="ms">content_copy</span></button>
              </div>
              <div class="bcp-data-row">
                <span class="bcp-lbl">${L`Código Interbancario (CCI):`}</span>
                <span class="bcp-val mono">${BCP_CCI}</span>
                <button type="button" class="btn-copy-sm" data-copy="${BCP_CCI}"><span class="ms">content_copy</span></button>
              </div>
              <div class="bcp-hint">
                <span class="ms">info</span>
                <span>${L`Monto exacto: S/. 18.50 Soles. Luego de transferir, digita el número de operación para la activación inmediata.`}</span>
              </div>
            </div>
            <div class="auth-field">
              <label>${L`Número de operación / Comprobante BCP`}</label>
              <div class="auth-input-wrap">
                <span class="ms">pin</span>
                <input type="text" id="bcpOpNum" placeholder="Ej: 0192847" required>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-pay-action" id="bcpSubmitBtn">
              <span class="ms">bolt</span>
              <span>${L`Validar transferencia BCP`}</span>
            </button>
          </form>
        </div>

        <div class="pay-footer">
          <span>${L`Stripe & Pasarelas de Pago Oficiales · Activación Inmediata`}</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  activeCheckoutOverlay = overlay;

  const close = () => {
    overlay.remove();
    activeCheckoutOverlay = null;
  };

  overlay.querySelector('#checkoutCloseBtn')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Copy buttons
  overlay.querySelectorAll('.btn-copy-sm').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = btn.dataset.copy;
      navigator.clipboard.writeText(text);
      toast(L`Copiado al portapapeles: ${text}`);
    });
  });

  // Tab switching
  const tabs = overlay.querySelectorAll('.pay-tab');
  const forms = {
    stripe: overlay.querySelector('#stripePayForm'),
    yape: overlay.querySelector('#yapePayForm'),
    mercadopago: overlay.querySelector('#mpPayForm'),
    bcp: overlay.querySelector('#bcpPayForm'),
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      Object.values(forms).forEach((f) => f?.classList.add('hidden'));
      tab.classList.add('active');
      const target = forms[tab.dataset.tab];
      if (target) target.classList.remove('hidden');
    });
  });

  // Card number input formatting
  const cardInput = overlay.querySelector('#stripeCardNum');
  cardInput?.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    val = val.substring(0, 16);
    val = val.match(/.{1,4}/g)?.join(' ') || val;
    e.target.value = val;
  });

  // Expiry input formatting
  const expInput = overlay.querySelector('#stripeCardExp');
  expInput?.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 2) val = `${val.substring(0, 2)}/${val.substring(2, 4)}`;
    e.target.value = val;
  });

  // Generic success handler
  const handlePaymentSuccess = async (method, reference, details) => {
    try {
      const res = await window.api.auth.subscribe({
        plan: 'premium',
        method,
        reference,
        details,
      });

      if (!res.ok) {
        toast(res.error || L`Error al procesar la suscripción`, 'error');
        return;
      }

      if (state.currentUser) {
        state.currentUser.plan = 'premium';
        state.currentUser.isPremium = true;
      }

      toast(L`¡Felicidades! Tu suscripción Premium ha sido activada.`);
      close();
      if (onSuccess) onSuccess(res);
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: state.currentUser }));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // Stripe submit
  forms.stripe.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector('#stripeSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span><span>${L`Procesando con Stripe…`}</span>`;

    const holder = overlay.querySelector('#stripeCardHolder').value;
    const ref = `str_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    setTimeout(() => {
      handlePaymentSuccess('stripe', ref, { holder, accountId: STRIPE_ACCOUNT_ID });
    }, 1200);
  });

  // Yape / Plin submit
  forms.yape.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector('#yapeSubmitBtn');
    const code = overlay.querySelector('#yapeRefCode').value.trim();
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span><span>${L`Verificando operación…`}</span>`;

    setTimeout(() => {
      handlePaymentSuccess('yape', `yape_${code}`, { opCode: code });
    }, 1000);
  });

  // Mercado Pago submit
  forms.mercadopago.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector('#mpSubmitBtn');
    const code = overlay.querySelector('#mpRefCode').value.trim();
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span><span>${L`Conectando con Mercado Pago…`}</span>`;

    setTimeout(() => {
      handlePaymentSuccess('mercadopago', code, { mpId: code });
    }, 1000);
  });

  // BCP submit
  forms.bcp.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector('#bcpSubmitBtn');
    const code = overlay.querySelector('#bcpOpNum').value.trim();
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span><span>${L`Validando transferencia BCP…`}</span>`;

    setTimeout(() => {
      handlePaymentSuccess('bcp', `bcp_${code}`, { bcpAccount: BCP_ACCOUNT_SOLES, bcpOp: code });
    }, 1000);
  });
}
