/* The Arsenal channels: every look a hero can wear, put on that hero's default items (VIP).
 *
 * Reading is open to everybody, so the screen can show what the Arsenal holds and why it is
 * locked. Putting a look on is refused here, in the main process, for the three reasons a person
 * can do something about - no VIP, safe mode on, the game running - and for the remote switch
 * that already stops free cosmetics, since a hero pick is the same kind of edit to the same
 * table. The build itself checks VIP again (schema-service's entitled), so a record that got
 * past this some other way still never reaches the game.
 *
 * Taking a look off asks for neither VIP nor the remote switch: it gives nothing away, and a plan
 * that ran out must not leave a pick on that the screen cannot switch off (patch:setEnabled lets
 * the patch off past the switch on the same grounds). It still waits for safe mode and the game.
 */
const { ipcMain } = require('electron');

const { t } = require('./i18n');

/** @param {object} ctx  the services and main-process callbacks these channels use */
function registerArsenalIpc({ auth, blocked, dotaIsRunning, schemaService, settings }) {
  // an account check that throws is a no
  const vip = () => { try { return !!auth.isVip(); } catch { return false; } };

  /* In the order they can be fixed: a subscription first, then the switch in the status bar,
   * then closing the game, which holds the paks open and would leave a half-written build.
   * `off` is a look being taken off: no VIP and no remote switch asked (see the top). */
  async function refusal(off) {
    if (!off) {
      if (!vip()) return { error: t('Арсенал доступен только VIP') };
      const stop = blocked('cosmetics');
      if (stop) return stop;
    }
    if (!settings.get('schemaPatch')) return { error: t('Сначала выключи безопасный режим: без него игра не читает косметику') };
    if (await dotaIsRunning()) return { error: t('Закрой Dota 2 перед изменением файлов игры') };
    return null;
  }

  // run a change behind the refusals, and turn what it throws into an answer for the screen
  const guarded = (fn, { off = false } = {}) => async (e, ...args) => {
    const stop = await refusal(off);
    if (stop) return stop;
    try {
      return fn(...args);
    } catch (err) {
      return { error: String(err.message || err) };
    }
  };

  ipcMain.handle('arsenal:heroes', () => schemaService.arsenalHeroes());
  ipcMain.handle('arsenal:hero', (e, hero) => schemaService.arsenalHero(String(hero || '')));

  ipcMain.handle('arsenal:pick', guarded((hero, slot, itemId, style) => ({
    ok: true,
    record: schemaService.pickHero(String(hero || ''), String(slot || ''), String(itemId || ''), style == null ? null : String(style)),
  })));

  // off, not deleted: the pick stays in My mods, dormant, the way switching a mod off does
  ipcMain.handle('arsenal:clear', guarded((hero, slot) => schemaService.clearHero(String(hero || ''), String(slot || '')), { off: true }));

  ipcMain.handle('arsenal:set', guarded((hero, bundleId) => schemaService.equipSet(String(hero || ''), String(bundleId || ''))));
}

module.exports = { registerArsenalIpc };
