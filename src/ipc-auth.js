/* IPC channels for InsForge authentication and subscription management.
 */
const { ipcMain } = require('electron');

function registerAuthIpc({ auth }) {
  ipcMain.handle('auth:status', async () => {
    const user = auth.current();
    return { authenticated: !!user, user };
  });

  ipcMain.handle('auth:login', async (event, { email, password }) => {
    try {
      const user = await auth.login(email, password);
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('auth:register', async (event, { email, password, name }) => {
    try {
      const user = await auth.register(email, password, name);
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
