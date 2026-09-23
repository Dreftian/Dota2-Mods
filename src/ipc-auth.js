/* IPC channels for the local accounts and the subscription record (src/auth.js).
 */
const { ipcMain } = require('electron');

function registerAuthIpc({ auth }) {
  ipcMain.handle('auth:status', async () => {
    const user = auth.current();
    return { authenticated: !!user, user };
  });

  ipcMain.handle('auth:login', async (event, { email, password } = {}) => {
    try {
      const user = await auth.login(email, password);
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('auth:register', async (event, payload) => {
    try {
      const user = await auth.register(payload);
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    try {
      await auth.logout();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Takes { oldPassword, newPassword } like auth:login takes its pair, and also the two as
  // separate arguments, so the preload side can pass them either way.
  ipcMain.handle('auth:changePassword', async (event, first, second) => {
    const { oldPassword, newPassword } = first && typeof first === 'object'
      ? first
      : { oldPassword: first, newPassword: second };
    try {
      await auth.changePassword(oldPassword, newPassword);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('auth:subscribe', async (event, payload) => {
    try {
      const result = await auth.subscribe(payload);
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { registerAuthIpc };
