/* Authentication modal for Mod Assistant (InsForge backend).
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
          <svg viewBox="0 0 24 24" width="32" height="32" fill="#e33d26" aria-hidden="true"><path d="M19.43 6.97c.18-.96.32-1.78.32-1.82s-.25-.25-.68-.55l-.73-.51c-.05-.03-3.9.98-3.9 1.05s4.64 3.6 4.66 3.58c.01-.01.15-.8.33-1.75zM7.28 19.92c1.01-.38 1.84-.7 1.84-.7s-3.93-3.82-4.44-4.31l-.29-.23c-.01.01-.33.86-.71 1.89-.42 1.14-.68 1.9-.66 1.93.03.04 2.4 2.09 2.42 2.1.01 0 .83-.31 1.84-.68zm13.52-2.09c.52-1.27.93-2.31.92-2.33-.02-.02-9.83-6.64-16.7-11.27l-.55-.37-.9.41c-.5.22-.9.42-.89.45.01.03 3.33 3.51 7.38 7.74l7.37 7.69h2.41l.96-2.32z"/></svg>
          <h2>Mod Assistant</h2>
        </div>
        ${!mandatory ? '<button class="auth-close-btn" id="authCloseBtn"><span class="ms">close</span></button>' : ''}
      </div>

      <div class="auth-tabs">
        <button class="auth-tab active" id="tabSignInBtn">${L`Iniciar sesión`}</button>
        <button class="auth-tab" id="tabSignUpBtn">${L`Crear cuenta`}</button>
      </div>

      <!-- Sign In Form -->
      <form class="auth-form" id="signInForm">
        <div class="auth-field">
          <label for="loginEmail">${L`Correo electrónico`}</label>
          <div class="auth-input-wrap">
            <span class="ms">mail</span>
            <input type="email" id="loginEmail" placeholder="ejemplo@correo.com" required value="dreftian@gmail.com" autocomplete="email">
          </div>
        </div>
        <div class="auth-field">
          <label for="loginPassword">${L`Contraseña`}</label>
          <div class="auth-input-wrap">
            <span class="ms">lock</span>
            <input type="password" id="loginPassword" placeholder="••••••••" required value="Ehkaiser98" autocomplete="current-password">
            <button type="button" class="auth-toggle-pwd" id="toggleLoginPwd"><span class="ms">visibility</span></button>
          </div>
        </div>
        <div class="auth-hint">
          <span>${L`Admin por defecto: dreftian@gmail.com / Ehkaiser98`}</span>
        </div>
        <button type="submit" class="btn btn-primary btn-auth-submit" id="submitLoginBtn">
          <span class="ms">login</span>
          <span>${L`Iniciar sesión`}</span>
        </button>
      </form>

      <!-- Sign Up Form -->
      <form class="auth-form hidden" id="signUpForm">
        <div class="auth-field">
          <label for="regName">${L`Nombre completo`}</label>
          <div class="auth-input-wrap">
            <span class="ms">badge</span>
            <input type="text" id="regName" placeholder="${L`Nombres y Apellidos`}" required autocomplete="name">
          </div>
        </div>
        <div class="auth-field">
          <label for="regEmail">${L`Correo electrónico`}</label>
          <div class="auth-input-wrap">
            <span class="ms">mail</span>
            <input type="email" id="regEmail" placeholder="tu@correo.com" required autocomplete="email">
          </div>
        </div>
        <div class="auth-field">
          <label for="regPassword">${L`Contraseña`}</label>
          <div class="auth-input-wrap">
            <span class="ms">lock</span>
            <input type="password" id="regPassword" placeholder="${L`Mínimo 6 caracteres`}" required autocomplete="new-password">
            <button type="button" class="auth-toggle-pwd" id="toggleRegPwd"><span class="ms">visibility</span></button>
          </div>
        </div>
        <div class="auth-row-two">
          <div class="auth-field">
            <label for="regAge">${L`Edad`}</label>
            <div class="auth-input-wrap">
              <span class="ms">cake</span>
              <input type="number" id="regAge" placeholder="24" min="10" max="120">
            </div>
          </div>
          <div class="auth-field">
            <label for="regBirthDate">${L`Fecha de nacimiento`}</label>
            <div class="auth-input-wrap">
              <input type="date" id="regBirthDate" style="padding-left: 12px;">
            </div>
          </div>
        </div>
        <div class="auth-field">
          <label for="regAddress">${L`Dirección de residencia`}</label>
          <div class="auth-input-wrap">
            <span class="ms">home</span>
            <input type="text" id="regAddress" placeholder="${L`Av. / Calle, Ciudad`}" autocomplete="street-address">
          </div>
        </div>
        <div class="auth-row-two">
          <div class="auth-field">
            <label for="regCountry">${L`País`}</label>
            <div class="auth-input-wrap">
              <span class="ms">public</span>
              <input type="text" id="regCountry" placeholder="${L`Ej: Perú, España, México`}" autocomplete="country-name">
            </div>
          </div>
          <div class="auth-field">
            <label for="regPostalCode">${L`Código postal`}</label>
            <div class="auth-input-wrap">
              <span class="ms">markunread_mailbox</span>
              <input type="text" id="regPostalCode" placeholder="15001" autocomplete="postal-code">
            </div>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-auth-submit" id="submitRegBtn">
          <span class="ms">person_add</span>
          <span>${L`Crear cuenta`}</span>
        </button>
      </form>

      <div class="auth-footer">
        <span>Backend InsForge · ID: 9457c313-82cc-4773-9d4e-4640d3309e86</span>
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
    submitBtn.innerHTML = `<span class="spinner"></span><span>${L`Verificando…`}</span>`;

    try {
      const res = await window.api.auth.login(email, password);
      if (!res.ok) {
        toast(res.error || L`Error al iniciar sesión`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span class="ms">login</span><span>${L`Iniciar sesión`}</span>`;
        return;
      }
      state.currentUser = res.user;
      toast(L`Bienvenido, ${res.user.name || res.user.email}`);
      close();
      if (onLogin) onLogin(res.user);
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: res.user }));
    } catch (err) {
      toast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span class="ms">login</span><span>${L`Iniciar sesión`}</span>`;
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
    submitBtn.innerHTML = `<span class="spinner"></span><span>${L`Creando cuenta…`}</span>`;

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
        toast(res.error || L`Error al crear la cuenta`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span class="ms">person_add</span><span>${L`Crear cuenta`}</span>`;
        return;
      }
      state.currentUser = res.user;
      toast(L`Cuenta creada con éxito. Bienvenido, ${res.user.name}!`);
      close();
      if (onLogin) onLogin(res.user);
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: res.user }));
    } catch (err) {
      toast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span class="ms">person_add</span><span>${L`Crear cuenta`}</span>`;
    }
  });
}
