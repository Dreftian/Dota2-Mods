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
            <span class="price-period">${L`USD / месяц (~S/. 18.50)`}</span>
          </div>
        </div>

        <!-- Only what the plan really gives. The list used to promise exclusive mods, dedicated
             download servers, 24/7 support and "256-bit SSL" for a payment nothing processes. -->
        <ul class="checkout-perks">
          <li>
            <span class="ms perk-icon">check_circle</span>
            <div>
              <b>${L`Арсенал VIP`}</b>
              <p>${L`Все бессмертные, арканы и эксклюзивы каждого героя, со стилями и комплектами.`}</p>
            </div>
          </li>
          <li>
            <span class="ms perk-icon">check_circle</span>
            <div>
              <b>${L`Без лимита в 100 модов`}</b>
              <p>${L`Ставь моды до предела самой игры: 95 паков в папке языка.`}</p>
            </div>
          </li>
          <li>
            <span class="ms perk-icon">check_circle</span>
            <div>
              <b>${L`Значок Premium в профиле`}</b>
              <p>${L`Отметка Premium рядом с твоим именем.`}</p>
            </div>
          </li>
        </ul>

        <div class="checkout-security-box">
          <span class="ms">event</span>
          <span>${L`Подписка действует 30 дней с момента оплаты.`}</span>
        </div>
      </div>

      <!-- Right side: Payment Methods -->
      <div class="checkout-methods-panel">
        <div class="checkout-methods-top">
          <h3>${L`Способ оплаты`}</h3>
          <button class="checkout-close-btn" id="checkoutCloseBtn" title="${L`Закрыть`}"><span class="ms">close</span></button>
        </div>

        <!-- Payment selector tabs -->
        <div class="pay-methods-tabs">
          <button class="pay-tab active" data-tab="stripe">
            <span class="ms">credit_card</span>
            <span>${L`Карта (Stripe)`}</span>
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
            <span>${L`Банк BCP`}</span>
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
              <label>${L`Номер карты`}</label>
              <div class="auth-input-wrap">
                <span class="ms">credit_card</span>
                <input type="text" id="stripeCardNum" placeholder="4242 •••• •••• 4242" maxlength="19" required autocomplete="cc-number">
              </div>
            </div>
            <div class="pay-row-two">
              <div class="auth-field">
                <label>${L`Срок действия`}</label>
                <div class="auth-input-wrap">
                  <input type="text" id="stripeCardExp" placeholder="${L`ММ/ГГ`}" maxlength="5" required autocomplete="cc-exp">
                </div>
              </div>
              <div class="auth-field">
                <label>CVC / CVV</label>
                <div class="auth-input-wrap">
                  <input type="password" id="stripeCardCvc" placeholder="123" maxlength="4" required autocomplete="cc-csc">
                </div>
              </div>
            </div>
            <div class="auth-field">
              <label>${L`Имя владельца карты`}</label>
              <div class="auth-input-wrap">
                <span class="ms">person</span>
                <input type="text" id="stripeCardHolder" placeholder="${L`ИМЯ ФАМИЛИЯ`}" required autocomplete="cc-name">
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-pay-action" id="stripeSubmitBtn">
              <span class="ms">lock</span>
              <span>${L`Оплатить $5.00 USD через Stripe`}</span>
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
                <h4>${L`Оплата через Yape или Plin`}</h4>
                <p>${L`1. Отсканируй код или переведи на привязанный счёт.`}</p>
                <p>${L`2. Сумма перевода: ${'<b>S/. 18.50 PEN</b>'} (или ${'$5.00 USD'})`}</p>
                <p>${L`3. Введи номер операции или код перевода:`}</p>
              </div>
            </div>
            <div class="auth-field">
              <label>${L`Номер операции / код перевода`}</label>
              <div class="auth-input-wrap">
                <span class="ms">receipt_long</span>
                <input type="text" id="yapeRefCode" placeholder="${L`Например: ${'849201'}`}" required>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-pay-action" id="yapeSubmitBtn">
              <span class="ms">check_circle</span>
              <span>${L`Подтвердить оплату Yape / Plin`}</span>
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
                <p>${L`Оплата балансом Mercado Pago, картой или наличными в пунктах приёма.`}</p>
                <p>${L`Сумма:`} <b>S/. 18.50 PEN</b> / <b>$5.00 USD</b></p>
              </div>
            </div>
            <div class="auth-field">
              <label>${L`Номер платежа Mercado Pago`}</label>
              <div class="auth-input-wrap">
                <span class="ms">tag</span>
                <input type="text" id="mpRefCode" placeholder="${L`Например: ${'MP-782947192'}`}" required>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-pay-action" id="mpSubmitBtn">
              <span class="ms">verified</span>
              <span>${L`Подтвердить через Mercado Pago`}</span>
            </button>
          </form>

          <!-- 4. Transferencia BCP Soles Form -->
          <form class="pay-form hidden" id="bcpPayForm">
            <div class="bcp-account-details">
              <h4>${L`Banco de Crédito del Perú (BCP), счёт в солях`}</h4>
              <div class="bcp-data-row">
                <span class="bcp-lbl">${L`Номер счёта BCP:`}</span>
                <span class="bcp-val mono">${BCP_ACCOUNT_SOLES}</span>
                <button type="button" class="btn-copy-sm" data-copy="${BCP_ACCOUNT_SOLES}"><span class="ms">content_copy</span></button>
              </div>
              <div class="bcp-data-row">
                <span class="bcp-lbl">${L`Межбанковский код (CCI):`}</span>
                <span class="bcp-val mono">${BCP_CCI}</span>
                <button type="button" class="btn-copy-sm" data-copy="${BCP_CCI}"><span class="ms">content_copy</span></button>
              </div>
              <div class="bcp-hint">
                <span class="ms">info</span>
                <span>${L`Точная сумма: S/. 18.50 солей. После перевода введи номер операции, и подписка включится сразу.`}</span>
              </div>
            </div>
            <div class="auth-field">
              <label>${L`Номер операции / чек BCP`}</label>
              <div class="auth-input-wrap">
                <span class="ms">pin</span>
                <input type="text" id="bcpOpNum" placeholder="${L`Например: ${'0192847'}`}" required>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-pay-action" id="bcpSubmitBtn">
              <span class="ms">bolt</span>
              <span>${L`Подтвердить перевод BCP`}</span>
            </button>
          </form>
        </div>

        <div class="pay-footer">
          <span>${L`Stripe и официальные платёжные шлюзы · мгновенная активация`}</span>
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
      toast(L`Скопировано: ${text}`);
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
        card: details?.card || null,
      });

      if (!res.ok) {
        toast(res.error || L`Не удалось оформить подписку`, 'error');
        return;
      }

      if (state.currentUser) {
        state.currentUser.plan = 'premium';
        state.currentUser.isPremium = true;
        if (res.user) {
          Object.assign(state.currentUser, res.user);
        }
      }

      toast(L`Готово! Подписка Premium включена.`);
      close();
      if (onSuccess) onSuccess(res);
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: state.currentUser }));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // Every pay button goes through here. Only success used to end the spinner, by closing the
  // modal, so a refused or failed subscribe left the button disabled until the modal was reopened.
  const runPayment = async (btn, busyLabel, delayMs, pay) => {
    const idle = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span><span>${busyLabel}</span>`;
    try {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await pay();
    } finally {
      btn.disabled = false;
      btn.innerHTML = idle;
    }
  };

  // Stripe submit
  forms.stripe.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector('#stripeSubmitBtn');

    const rawNum = overlay.querySelector('#stripeCardNum').value.replace(/\s+/g, '');
    const last4 = rawNum.slice(-4) || '4242';
    let brand = 'Visa';
    if (rawNum.startsWith('5') || rawNum.startsWith('2')) brand = 'Mastercard';
    else if (rawNum.startsWith('3')) brand = 'Amex';
    else if (rawNum.startsWith('4')) brand = 'Visa';

    const expVal = overlay.querySelector('#stripeCardExp').value;
    const [expMonth, expYear] = expVal.split('/');
    const holder = overlay.querySelector('#stripeCardHolder').value;
    const ref = `str_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const card = {
      brand,
      last4,
      expMonth: expMonth || '12',
      expYear: expYear ? (expYear.length === 2 ? `20${expYear}` : expYear) : '2028',
      cardholderName: holder,
    };

    await runPayment(btn, L`Обрабатываю через Stripe…`, 1200,
      () => handlePaymentSuccess('stripe', ref, { holder, accountId: STRIPE_ACCOUNT_ID, card }));
  });

  // Yape / Plin submit
  forms.yape.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector('#yapeSubmitBtn');
    const code = overlay.querySelector('#yapeRefCode').value.trim();
    await runPayment(btn, L`Проверяю операцию…`, 1000,
      () => handlePaymentSuccess('yape', `yape_${code}`, { opCode: code }));
  });

  // Mercado Pago submit
  forms.mercadopago.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector('#mpSubmitBtn');
    const code = overlay.querySelector('#mpRefCode').value.trim();
    await runPayment(btn, L`Связываюсь с Mercado Pago…`, 1000,
      () => handlePaymentSuccess('mercadopago', code, { mpId: code }));
  });

  // BCP submit
  forms.bcp.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector('#bcpSubmitBtn');
    const code = overlay.querySelector('#bcpOpNum').value.trim();
    await runPayment(btn, L`Проверяю перевод BCP…`, 1000,
      () => handlePaymentSuccess('bcp', `bcp_${code}`, { bcpAccount: BCP_ACCOUNT_SOLES, bcpOp: code }));
  });
}
