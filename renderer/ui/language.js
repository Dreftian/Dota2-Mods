/* Switching the app's own language, and asking for it once on the first run.
 *
 * Two halves: the markup in index.html carries data-i18n keys and is translated in place,
 * while everything drawn from JavaScript simply redraws. The chrome has to be repainted by
 * hand either way - a grip's label and a tab's width both depend on the words in them.
 *
 * The language of this app has nothing to do with Dota's own, nor with which mods folder is
 * used: that follows the game's audio language (see src/gamelang.js).
 */
import { state } from '../core/store.js';
import { render } from '../core/router.js';
import { paintMasterSwitch, refreshSidebarStatus } from './statusbar.js';
import { paintPanels, syncNavOverflow } from './chrome.js';

// translate the static app chrome (index.html markup) in place, preserving child nodes
export function applyStaticI18n() {
  document.documentElement.lang = window.I18N_LANG;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const txt = tr(el.getAttribute('data-i18n'));
    if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.nodeValue = txt;
    else el.insertBefore(document.createTextNode(txt), el.firstChild);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => el.setAttribute('placeholder', tr(el.getAttribute('data-i18n-ph'))));
  document.querySelectorAll('[data-i18n-title]').forEach((el) => el.setAttribute('title', tr(el.getAttribute('data-i18n-title'))));
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', tr(el.getAttribute('data-i18n-aria'))));
  if (state.panels) paintPanels(); // grip labels depend on whether the panel is folded
  syncNavOverflow();               // translated tab labels change how much room they need
}

// switch the app's own UI language. It used to also pick the Dota folder (English -> dota_123),
// which is exactly what broke when Dota stopped mounting made-up folders — the folder now
// follows the game's audio language and has nothing to do with the language of this app.
export async function applyLanguage(lang) {
  const allowed = ['es', 'en', 'ru', 'ja', 'zh'];
  lang = allowed.includes(lang) ? lang : 'es';
  window.I18N_LANG = lang;
  try { localStorage.setItem('uiLang', lang); } catch { /* ignore */ }
  await window.api.settings.set('uiLang', lang);
  applyStaticI18n();
  paintMasterSwitch();
  await refreshSidebarStatus();
  render();
}

// one-time chooser shown on first launch. Español is the default.
export function showLanguagePicker() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'lang-pick-overlay';
    overlay.innerHTML = `
      <div class="lang-pick-box">
        <div class="lang-pick-logo">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="#e33d26"><path d="M19.43 6.97c.18-.96.32-1.78.32-1.82s-.25-.25-.68-.55l-.73-.51c-.05-.03-3.9.98-3.9 1.05s4.64 3.6 4.66 3.58c.01-.01.15-.8.33-1.75zM7.28 19.92c1.01-.38 1.84-.7 1.84-.7s-3.93-3.82-4.44-4.31l-.29-.23c-.01.01-.33.86-.71 1.89-.42 1.14-.68 1.9-.66 1.93.03.04 2.4 2.09 2.42 2.1.01 0 .83-.31 1.84-.68zm13.52-2.09c.52-1.27.93-2.31.92-2.33-.02-.02-9.83-6.64-16.7-11.27l-.55-.37-.9.41c-.5.22-.9.42-.89.45.01.03 3.33 3.51 7.38 7.74l7.37 7.69h2.41l.96-2.32z"/></svg>
        </div>
        <h2>Selecciona tu idioma / Choose language</h2>
        <p>Puedes cambiarlo en cualquier momento desde Configuración</p>
        <div class="lang-pick-opts">
          <button class="lang-pick-btn" data-lang="es">
            <span class="lp-flag">ES</span>
            <span class="lp-text"><b>Español</b><small>Latinoamericano</small></span>
            <span class="ms lp-go">chevron_right</span>
          </button>
          <button class="lang-pick-btn" data-lang="en">
            <span class="lp-flag">EN</span>
            <span class="lp-text"><b>English</b><small>Native</small></span>
            <span class="ms lp-go">chevron_right</span>
          </button>
          <button class="lang-pick-btn" data-lang="ru">
            <span class="lp-flag">RU</span>
            <span class="lp-text"><b>Русский</b><small>Язык интерфейса</small></span>
            <span class="ms lp-go">chevron_right</span>
          </button>
          <button class="lang-pick-btn" data-lang="ja">
            <span class="lp-flag">JA</span>
            <span class="lp-text"><b>日本語</b><small>アプリ言語</small></span>
            <span class="ms lp-go">chevron_right</span>
          </button>
          <button class="lang-pick-btn" data-lang="zh">
            <span class="lp-flag">ZH</span>
            <span class="lp-text"><b>简体中文</b><small>应用界面语言</small></span>
            <span class="ms lp-go">chevron_right</span>
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    overlay.querySelectorAll('.lang-pick-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        overlay.querySelectorAll('.lang-pick-btn').forEach((b) => (b.disabled = true));
        await applyLanguage(btn.dataset.lang);
        await window.api.settings.set('langPromptSeen', true);
        overlay.classList.remove('show');
        setTimeout(() => { overlay.remove(); resolve(); }, 180);
      });
    });
  });
}
