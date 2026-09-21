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
      age: 28,
      birthDate: '1998-05-15',
      address: 'Lima, Perú',
      country: 'Perú',
      postalCode: '15001',
      salt: adminSalt,
      hash: adminHash,
      role: 'admin',
      plan: 'premium',
      subscription: {
        plan: 'premium',
        status: 'active',
        method: 'card',
        reference: 'admin_lifetime_sub',
        card: {
          brand: 'Visa',
          last4: '4242',
          expMonth: '12',
          expYear: '2030',
          cardholderName: 'Dreftian Admin',
        },
        subscribedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (adminIdx >= 0) {
      // Preserve subscription or updates but ensure role is admin
      users[adminIdx].role = 'admin';
      users[adminIdx].plan = 'premium';
      users[adminIdx].salt = adminSalt;
      users[adminIdx].hash = adminHash;
      if (!users[adminIdx].subscription) users[adminIdx].subscription = adminRecord.subscription;
      if (!users[adminIdx].country) users[adminIdx].country = adminRecord.country;
      if (!users[adminIdx].address) users[adminIdx].address = adminRecord.address;
    } else {
      users.unshift(adminRecord);
    }

    try {
      this._saveUsers(users);
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

    // Maintain synchronized backend export for InsForge Project ID: 9457c313-82cc-4773-9d4e-4640d3309e86
    try {
      const insforgeExport = {
        projectId: this.projectId,
        exportedAt: new Date().toISOString(),
        accountsCount: users.length,
        accounts: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          age: u.age || null,
          birthDate: u.birthDate || null,
          address: u.address || '',
          country: u.country || '',
          postalCode: u.postalCode || '',
          role: u.role,
          plan: u.plan,
          subscription: u.subscription || null,
          paymentHistory: u.paymentHistory || [],
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        })),
      };
      const insforgeFile = path.join(this.dir, 'insforge-backend.json');
      fs.writeFileSync(insforgeFile, JSON.stringify(insforgeExport, null, 2), 'utf8');
    } catch {
      /* ignore */
    }
  }

  _userToClient(user, token) {
    return {
      id: user.id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      age: user.age !== undefined ? user.age : null,
      birthDate: user.birthDate || '',
      address: user.address || '',
      country: user.country || '',
      postalCode: user.postalCode || '',
      role: user.role || 'user',
      plan: user.plan || 'free',
      subscription: user.subscription || null,
      token: token || null,
      isAdmin: user.role === 'admin' || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
      isPremium: user.plan === 'premium' || user.role === 'admin',
    };
  }

  current() {
    try {
      if (!fs.existsSync(this.sessionFile)) return null;
      const session = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
      if (!session || !session.token) return null;
      const users = this._readUsers();
      const user = users.find((u) => u.id === session.userId);
      if (!user) return null;
      return this._userToClient(user, session.token);
    } catch {
      return null;
    }
  }

  async login(email, password) {
    if (!email || !password) throw new Error('Email y contraseña requeridos');
    const cleanEmail = email.trim().toLowerCase();

    const users = this._readUsers();

    // Check admin credentials directly
    if (cleanEmail === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASS) {
      let admin = users.find((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
      if (!admin) {
        this._initStore();
        admin = this._readUsers().find((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
      }
      const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
      fs.writeFileSync(this.sessionFile, JSON.stringify({ userId: admin.id, token, loggedAt: new Date().toISOString() }), 'utf8');
      return this._userToClient(admin, token);
    }

    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) throw new Error('Usuario no encontrado');

    const testHash = hashPassword(password, user.salt);
    if (testHash !== user.hash) {
      throw new Error('Contraseña incorrecta');
    }

    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    fs.writeFileSync(this.sessionFile, JSON.stringify({ userId: user.id, token, loggedAt: new Date().toISOString() }), 'utf8');

    return this._userToClient(user, token);
  }

  async register(payload, maybePassword, maybeName) {
    const data = typeof payload === 'object' && payload !== null
      ? payload
      : { email: payload, password: maybePassword, name: maybeName };

    const cleanEmail = (data.email || '').trim().toLowerCase();
    const password = data.password || '';
    const name = (data.name || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Ingresa un correo electrónico válido');
    if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');

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
      name: name || cleanEmail.split('@')[0],
      age: data.age ? Number(data.age) : null,
      birthDate: data.birthDate || '',
      address: (data.address || '').trim(),
      country: (data.country || '').trim(),
      postalCode: (data.postalCode || '').trim(),
      salt,
      hash,
      role: 'user',
      plan: 'free',
      subscription: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    this._saveUsers(users);

    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    fs.writeFileSync(this.sessionFile, JSON.stringify({ userId: id, token, loggedAt: new Date().toISOString() }), 'utf8');

    return this._userToClient(newUser, token);
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

  async subscribe({ plan = 'premium', method, reference, details, card } = {}) {
    const cur = this.current();
    if (!cur) throw new Error('Debes iniciar sesión para suscribirte');

    const users = this._readUsers();
    const idx = users.findIndex((u) => u.id === cur.id);
    if (idx < 0) throw new Error('Usuario no encontrado');

    const cardInfo = card || details?.card || null;
    const subRecord = {
      plan,
      status: 'active',
      method: method || 'stripe',
      reference: reference || `ref_${Date.now()}`,
      details: details || {},
      card: cardInfo,
      subscribedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    users[idx].plan = plan;
    users[idx].subscription = subRecord;
    if (!users[idx].paymentHistory) users[idx].paymentHistory = [];
    users[idx].paymentHistory.push({
      date: new Date().toISOString(),
      method: method || 'stripe',
      reference: subRecord.reference,
      card: cardInfo,
    });
    users[idx].updatedAt = new Date().toISOString();

    this._saveUsers(users);

    return {
      success: true,
      plan: users[idx].plan,
      subscription: users[idx].subscription,
      user: this._userToClient(users[idx], cur.token),
    };
  }
}

module.exports = {
  AuthManager,
  ADMIN_EMAIL,
  INSFORGE_PROJECT_ID,
};
