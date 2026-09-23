/* Sign-in and sign-up for the local Mod Assistant account (src/auth.js).
 *
 * The fields start empty on purpose. Until September 2026 the sign-in form arrived filled in
 * with the administrator's address and password, so pressing Enter made anybody the admin.
 */
import { state } from '../core/store.js';
import { toast } from './toast.js';

let activeOverlay = null;

export function showAuthModal({ mandatory = false, onLogin = null } = {}) {
  if (activeOverlay) activeOverlay.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay auth-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content auth-modal-box">
      <div class="auth-header">
        <div class="auth-brand">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="#29cfe6" aria-hidden="true"><path d="M19.43 6.97c.18-.96.32-1.78.32-1.82s-.25-.25-.68-.55l-.73-.51c-.05-.03-3.9.98-3.9 1.05s4.64 3.6 4.66 3.58c.01-.01.15-.8.33-1.75zM7.28 19.92c1.01-.38 1.84-.7 1.84-.7s-3.93-3.82-4.44-4.31l-.29-.23c-.01.01-.33.86-.71 1.89-.42 1.14-.68 1.9-.66 1.93.03.04 2.4 2.09 2.42 2.1.01 0 .83-.31 1.84-.68zm13.52-2.09c.52-1.27.93-2.31.92-2.33-.02-.02-9.83-6.64-16.7-11.27l-.55-.37-.9.41c-.5.22-.9.42-.89.45.01.03 3.33 3.51 7.38 7.74l7.37 7.69h2.41l.96-2.32z"/></svg>
          <h2>Mod Assistant</h2>
        </div>
        ${!mandatory ? `<button class="auth-close-btn" id="authCloseBtn" title="${L`Закрыть`}"><span class="ms">close</span></button>` : ''}
      </div>

      <div class="auth-tabs">
        <button class="auth-tab active" id="tabSignInBtn">${L`Войти`}</button>
        <button class="auth-tab" id="tabSignUpBtn">${L`Создать аккаунт`}</button>
      </div>

      <!-- Sign In Form -->
      <form class="auth-form" id="signInForm">
        <div class="auth-field">
          <label for="loginEmail">${L`Почта`}</label>
          <div class="auth-input-wrap">
            <span class="ms">mail</span>
            <input type="email" id="loginEmail" placeholder="name@example.com" required autocomplete="email">
          </div>
        </div>
        <div class="auth-field">
          <label for="loginPassword">${L`Пароль`}</label>
          <div class="auth-input-wrap">
            <span class="ms">lock</span>
            <input type="password" id="loginPassword" placeholder="••••••••" required autocomplete="current-password">
            <button type="button" class="auth-toggle-pwd" id="toggleLoginPwd"><span class="ms">visibility</span></button>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-auth-submit" id="submitLoginBtn">
          <span class="ms">login</span>
          <span>${L`Войти`}</span>
        </button>
      </form>

      <!-- Sign Up Form -->
      <form class="auth-form hidden" id="signUpForm">
        <div class="auth-field">
          <label for="regName">${L`Полное имя`}</label>
          <div class="auth-input-wrap">
            <span class="ms">badge</span>
            <input type="text" id="regName" placeholder="${L`Имя и фамилия`}" required autocomplete="name">
          </div>
        </div>
        <div class="auth-field">
          <label for="regEmail">${L`Почта`}</label>
          <div class="auth-input-wrap">
            <span class="ms">mail</span>
            <input type="email" id="regEmail" placeholder="name@example.com" required autocomplete="email">
          </div>
        </div>
        <div class="auth-field">
          <label for="regPassword">${L`Пароль`}</label>
          <div class="auth-input-wrap">
            <span class="ms">lock</span>
            <input type="password" id="regPassword" placeholder="${L`Минимум 6 символов`}" required autocomplete="new-password">
            <button type="button" class="auth-toggle-pwd" id="toggleRegPwd"><span class="ms">visibility</span></button>
          </div>
        </div>
        <div class="auth-row-two">
          <div class="auth-field">
            <label for="regAge">${L`Возраст`}</label>
            <div class="auth-input-wrap">
              <span class="ms">cake</span>
              <input type="number" id="regAge" placeholder="24" min="10" max="120">
            </div>
          </div>
          <div class="auth-field">
            <label for="regBirthDate">${L`Дата рождения`}</label>
            <div class="auth-input-wrap">
              <input type="date" id="regBirthDate" style="padding-left: 12px;">
            </div>
          </div>
        </div>
        <div class="auth-field">
          <label for="regAddress">${L`Адрес проживания`}</label>
          <div class="auth-input-wrap">
            <span class="ms">home</span>
            <input type="text" id="regAddress" placeholder="${L`Улица, дом, город`}" autocomplete="street-address">
          </div>
        </div>
        <div class="auth-row-two">
          <div class="auth-field">
            <label for="regCountry">${L`Страна`}</label>
            <div class="auth-input-wrap">
              <span class="ms">public</span>
              <input type="text" id="regCountry" placeholder="${L`Например: Перу, Испания, Мексика`}" autocomplete="country-name">
            </div>
          </div>
          <div class="auth-field">
            <label for="regPostalCode">${L`Почтовый индекс`}</label>
            <div class="auth-input-wrap">
              <span class="ms">markunread_mailbox</span>
              <input type="text" id="regPostalCode" placeholder="15001" autocomplete="postal-code">
            </div>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-auth-submit" id="submitRegBtn">
          <span class="ms">person_add</span>
          <span>${L`Создать аккаунт`}</span>
        </button>
      </form>

      <div class="auth-footer">
        <span>${L`Аккаунт хранится только на этом ПК`}</span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  activeOverlay = overlay;

  const close = () => {
    overlay.remove();
    activeOverlay = null;
  };

  if (!mandatory) {
    overlay.querySelector('#authCloseBtn')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  // Tabs toggle
  const tabSignIn = overlay.querySelector('#tabSignInBtn');
  const tabSignUp = overlay.querySelector('#tabSignUpBtn');
  const signInForm = overlay.querySelector('#signInForm');
  const signUpForm = overlay.querySelector('#signUpForm');

  tabSignIn.addEventListener('click', () => {
    tabSignIn.classList.add('active');
    tabSignUp.classList.remove('active');
    signInForm.classList.remove('hidden');
    signUpForm.classList.add('hidden');
  });

  tabSignUp.addEventListener('click', () => {
    tabSignUp.classList.add('active');
    tabSignIn.classList.remove('active');
    signUpForm.classList.remove('hidden');
    signInForm.classList.add('hidden');
  });

  // Password visibility toggles
  const togglePwd = (btnId, inputId) => {
    const btn = overlay.querySelector(btnId);
    const inp = overlay.querySelector(inputId);
    btn?.addEventListener('click', () => {
      const isPwd = inp.type === 'password';
      inp.type = isPwd ? 'text' : 'password';
      btn.querySelector('.ms').textContent = isPwd ? 'visibility_off' : 'visibility';
    });
  };
  togglePwd('#toggleLoginPwd', '#loginPassword');
  togglePwd('#toggleRegPwd', '#regPassword');

  // Submit Login
  signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = overlay.querySelector('#loginEmail').value.trim();
    const password = overlay.querySelector('#loginPassword').value;
    const submitBtn = overlay.querySelector('#submitLoginBtn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span><span>${L`Проверяю…`}</span>`;

    try {
      const res = await window.api.auth.login(email, password);
      if (!res.ok) {
        toast(res.error || L`Не удалось войти`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span class="ms">login</span><span>${L`Войти`}</span>`;
        return;
      }
      state.currentUser = res.user;
      toast(L`С возвращением, ${res.user.name || res.user.email}`);
      close();
      if (onLogin) onLogin(res.user);
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: res.user }));
    } catch (err) {
      toast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span class="ms">login</span><span>${L`Войти`}</span>`;
    }
  });

  // Submit Register
  signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = overlay.querySelector('#regName').value.trim();
    const email = overlay.querySelector('#regEmail').value.trim();
    const password = overlay.querySelector('#regPassword').value;
    const age = overlay.querySelector('#regAge').value;
    const birthDate = overlay.querySelector('#regBirthDate').value;
    const address = overlay.querySelector('#regAddress').value.trim();
    const country = overlay.querySelector('#regCountry').value.trim();
    const postalCode = overlay.querySelector('#regPostalCode').value.trim();
    const submitBtn = overlay.querySelector('#submitRegBtn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner"></span><span>${L`Создаю аккаунт…`}</span>`;

    try {
      const res = await window.api.auth.register({
        email,
        password,
        name,
        age,
        birthDate,
        address,
        country,
        postalCode,
      });
      if (!res.ok) {
        toast(res.error || L`Не удалось создать аккаунт`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span class="ms">person_add</span><span>${L`Создать аккаунт`}</span>`;
        return;
      }
      state.currentUser = res.user;
      toast(L`Аккаунт создан. Добро пожаловать, ${res.user.name}!`);
      close();
      if (onLogin) onLogin(res.user);
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: res.user }));
    } catch (err) {
      toast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span class="ms">person_add</span><span>${L`Создать аккаунт`}</span>`;
    }
  });
}
