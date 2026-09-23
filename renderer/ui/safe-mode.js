/* Safe mode, switched from wherever the user asks for it.
 *
 * The status bar's switch is the main door but no longer the only one: the Arsenal shows
 * nothing in the game while the game ignores cosmetics, so its banner offers the same switch.
 * Both come through here, so the warning, the call and everything that has to be re-read
 * afterwards happen the same way whichever button was pressed.
 */
import { state } from '../core/store.js';
import { $ } from '../core/dom.js';
import { COSMETIC_PREFIX } from '../core/constants.js';
import { render } from '../core/router.js';
import { refreshCosmeticSlots } from '../core/installed.js';
import { refreshPatchState } from './statusbar.js';
import { safeModeDialog } from './dialog.js';
import { toast } from './toast.js';

/**
 * Turn safe mode on or off, asking first when it is about to go off.
 * @param {boolean} safe  true leaves the game's files alone; false lets it read cosmetics and effects
 * @returns {Promise<boolean>} whether safe mode is now what was asked for
 */
export async function setSafeMode(safe) {
  const unsafe = !safe;
  if (unsafe === !!state.settings?.schemaPatch) return true;
  if (unsafe && !await safeModeDialog()) return false;
  const btn = $('#safeModeBtn');
  if (btn) btn.disabled = true;
  let r;
  try {
    r = await window.api.patch.setEnabled(unsafe);
  } catch (err) {
    r = { error: String(err?.message || err) };
  } finally {
    // a call that throws must not leave the status bar's switch dead until a restart
    if (btn) btn.disabled = false;
  }
  if (r?.error) { toast(r.error, 'error'); return false; }
  state.settings = { ...state.settings, schemaPatch: unsafe };
  toast(unsafe ? L`Безопасный режим выключен — эффекты и косметика доступны` : L`Безопасный режим включён, файлы игры восстановлены. Эффекты и косметика ждут, пока не выключишь его снова.`);
  await Promise.all([refreshCosmeticSlots(), refreshPatchState()]);
  // the cosmetics rail section just disappeared: a kept catalog must not come back showing a
  // category that no longer exists, whichever screen the switch was pressed on
  if (!unsafe && state.activeCategory.startsWith(COSMETIC_PREFIX)) state.activeCategory = 'all';
  // every screen but this one was marked stale by refreshCosmeticSlots; this one redraws now
  render();
  return true;
}
