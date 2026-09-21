/* InsForge authentication, session management, and role-based permissions.
 *
 * Project: 9457c313-82cc-4773-9d4e-4640d3309e86
 * Default Administrator: dreftian@gmail.com / Ehkaiser98
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/** The configured InsForge backend project ID. */
const INSFORGE_PROJECT_ID = '9457c313-82cc-4773-9d4e-4640d3309e86';

/** The default administrator email address. */
const ADMIN_EMAIL = 'dreftian@gmail.com';
const ADMIN_PASS = 'Ehkaiser98';

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

/**
 * Manages user accounts, local authentication persistence, and subscription plans.
 */
class AuthManager {
  constructor(userDataDir) {
    this.dir = userDataDir;
    this.usersFile = path.join(userDataDir, 'auth-users.json');
    this.sessionFile = path.join(userDataDir, 'auth-session.json');
    this.projectId = INSFORGE_PROJECT_ID;
    this._initStore();
  }

  _initStore() {
    let users = [];
    try {
      if (fs.existsSync(this.usersFile)) {
        users = JSON.parse(fs.readFileSync(this.usersFile, 'utf8'));
      }
    } catch {
      users = [];
    }

    // Ensure the default admin exists
    const adminIdx = users.findIndex((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    const adminSalt = crypto.randomBytes(16).toString('hex');
    const adminHash = hashPassword(ADMIN_PASS, adminSalt);

    const adminRecord = {
      id: 'usr_admin_dreftian',
      email: ADMIN_EMAIL,
      name: 'Dreftian Admin',
      salt: adminSalt,
      hash: adminHash,
      role: 'admin',
      plan: 'premium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (adminIdx >= 0) {
      // Preserve subscription or updates but ensure role is admin
      users[adminIdx].role = 'admin';
      users[adminIdx].plan = 'premium';
      users[adminIdx].salt = adminSalt;
      users[adminIdx].hash = adminHash;
    } else {
      users.unshift(adminRecord);
    }

    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2), 'utf8');
    } catch (err) {
      console.error('[auth] Failed to write initial users file:', err);
    }
  }

  _readUsers() {
    try {
      if (fs.existsSync(this.usersFile)) {
        return JSON.parse(fs.readFileSync(this.usersFile, 'utf8'));
      }
    } catch {
      /* ignore */
    }
    return [];
  }

  _saveUsers(users) {
    fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2), 'utf8');
  }

  current() {
    try {
      if (!fs.existsSync(this.sessionFile)) return null;
      const session = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
      if (!session || !session.token) return null;
      const users = this._readUsers();
      const user = users.find((u) => u.id === session.userId);
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        role: user.role || 'user',
        plan: user.plan || 'free',
        token: session.token,
        isAdmin: user.role === 'admin' || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
        isPremium: user.plan === 'premium' || user.role === 'admin',
      };
    } catch {
      return null;
    }
  }

  async login(email, password) {
    if (!email || !password) throw new Error('Email y contraseña requeridos');
    const cleanEmail = email.trim().toLowerCase();

    // Check admin credentials directly
    if (cleanEmail === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASS) {
      const user = {
        id: 'usr_admin_dreftian',
        email: ADMIN_EMAIL,
        name: 'Dreftian Admin',
        role: 'admin',
        plan: 'premium',
        isAdmin: true,
        isPremium: true,
      };
      const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
      fs.writeFileSync(this.sessionFile, JSON.stringify({ userId: user.id, token, loggedAt: new Date().toISOString() }), 'utf8');
      return { ...user, token };
    }

    const users = this._readUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) throw new Error('Usuario no encontrado');

    const testHash = hashPassword(password, user.salt);
    if (testHash !== user.hash) {
      throw new Error('Contraseña incorrecta');
    }

    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    fs.writeFileSync(this.sessionFile, JSON.stringify({ userId: user.id, token, loggedAt: new Date().toISOString() }), 'utf8');

    return {
      id: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      role: user.role || 'user',
      plan: user.plan || 'free',
      token,
      isAdmin: user.role === 'admin' || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
      isPremium: user.plan === 'premium' || user.role === 'admin',
    };
  }

  async register(email, password, name = '') {
    if (!email || !email.includes('@')) throw new Error('Ingresa un correo electrónico válido');
    if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');

    const cleanEmail = email.trim().toLowerCase();
    const users = this._readUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('Ya existe una cuenta con este correo');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const id = `usr_${crypto.randomBytes(12).toString('hex')}`;

    const newUser = {
      id,
      email: cleanEmail,
      name: name.trim() || cleanEmail.split('@')[0],
      salt,
      hash,
      role: 'user',
      plan: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    this._saveUsers(users);

    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    fs.writeFileSync(this.sessionFile, JSON.stringify({ userId: id, token, loggedAt: new Date().toISOString() }), 'utf8');

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      plan: newUser.plan,
      token,
      isAdmin: false,
      isPremium: false,
    };
  }

  async logout() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.unlinkSync(this.sessionFile);
      }
    } catch {
      /* ignore */
    }
    return { ok: true };
  }

  async subscribe({ plan = 'premium', method, reference, details } = {}) {
    const cur = this.current();
    if (!cur) throw new Error('Debes iniciar sesión para suscribirte');

    const users = this._readUsers();
    const idx = users.findIndex((u) => u.id === cur.id);
    if (idx < 0) throw new Error('Usuario no encontrado');

    users[idx].plan = plan;
    users[idx].subscription = {
      plan,
      method: method || 'stripe',
      reference: reference || `ref_${Date.now()}`,
      details: details || {},
      subscribedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    users[idx].updatedAt = new Date().toISOString();

    this._saveUsers(users);

    return {
      success: true,
      plan: users[idx].plan,
      subscription: users[idx].subscription,
      user: {
        id: users[idx].id,
        email: users[idx].email,
        role: users[idx].role,
        plan: users[idx].plan,
        isAdmin: users[idx].role === 'admin',
        isPremium: true,
      },
    };
  }
}

module.exports = {
  AuthManager,
  ADMIN_EMAIL,
  INSFORGE_PROJECT_ID,
};
