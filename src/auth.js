/* Local accounts: sign-in, the session, and the VIP entitlement the Arsenal checks.
 *
 * Everything lives in two JSON files in userData and nothing here talks to a server, so an
 * account exists on this PC only and an entitlement is exactly as trustworthy as a file the user
 * can edit. Real verification needs a signed claim from a backend (src/beta.js shows how the app
 * checks one). Until then this module has two jobs: be honest, and never lose anybody's account.
 *
 * No password is written in this file. Until September 2026 one was: the login form filled it
 * in, login() accepted it without looking at the stored hash, and every start re-hashed it over
 * whatever the owner had changed it to. The administrator is now simply the account registered
 * under ADMIN_EMAIL, and it signs in through its stored hash like any other. The record those
 * builds seeded is removed on the first start (isLegacySeed), since the old password still opens it.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const { t } = require('./i18n');

/** The InsForge project these accounts are named after. Nothing connects to it yet. */
const INSFORGE_PROJECT_ID = '9457c313-82cc-4773-9d4e-4640d3309e86';

/** The account registered under this address is the administrator. */
const ADMIN_EMAIL = 'dreftian@gmail.com';

const MIN_PASSWORD = 6;

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

// '' for a record with no address, which only a hand-edited file has; every lookup goes through
// here so such a record is skipped instead of throwing on startup.
function emailOf(user) {
  return user && typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
}

function isAdminRecord(user) {
  return !!user && (user.role === 'admin' || emailOf(user) === ADMIN_EMAIL);
}

// Builds up to 1.0.14 wrote this record on every start and hashed the published password over it
// each time, so on an upgraded PC that password still opens an administrator with a made-up
// ten-year subscription. Nothing else ever used the id. Those builds also adopted an existing
// admin-address record and gave it the seed's subscription, hence the reference as a second sign.
const LEGACY_SEED_ID = 'usr_admin_dreftian';
const LEGACY_SEED_REF = 'admin_lifetime_sub';

function isLegacySeed(user) {
  if (!user) return false;
  if (user.id === LEGACY_SEED_ID) return true;
  const sub = user.subscription;
  return emailOf(user) === ADMIN_EMAIL && !!sub && sub.reference === LEGACY_SEED_REF;
}

// Constant time, and a plain "no" for a record without a hash rather than a throw.
function passwordMatches(user, password) {
  if (!user || typeof user.salt !== 'string' || typeof user.hash !== 'string') return false;
  const got = Buffer.from(hashPassword(String(password), user.salt), 'hex');
  const want = Buffer.from(user.hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/**
 * Whether a stored account holds VIP right now: the administrator always, anyone else while a
 * premium subscription is active and its end date is still ahead. A subscription with no end
 * date counts as running.
 * @param {object|null} user a record from auth-users.json
 * @param {number} [now]
 * @returns {boolean}
 */
function hasVip(user, now = Date.now()) {
  if (!user) return false;
  if (isAdminRecord(user)) return true;
  const sub = user.subscription;
  if (user.plan !== 'premium' || !sub || sub.status !== 'active') return false;
  return !sub.expiresAt || Date.parse(sub.expiresAt) > now;
}

// A premium plan past its end date used to stay premium forever, with the profile showing a date
// in the past next to it. Returns whether anything changed, so the caller knows to write.
function lapse(user, now = Date.now()) {
  const sub = user && user.subscription;
  if (!sub || user.plan !== 'premium' || sub.status !== 'active' || !sub.expiresAt) return false;
  if (Date.parse(sub.expiresAt) > now) return false;
  user.plan = 'free';
  sub.status = 'expired';
  user.updatedAt = new Date(now).toISOString();
  return true;
}

// Through a temp file and a rename: a crash or a full disk mid-write used to leave half a JSON
// file, and the next start read that as "no accounts" and saved the empty list over it.
function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    const fd = fs.openSync(tmp, 'w');
    try {
      fs.writeSync(fd, text);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, file);
  } catch (err) {
    try { fs.rmSync(tmp, { force: true }); } catch { /* nothing left to clean */ }
    throw err;
  }
}

/**
 * Accounts on this PC and the session of whoever is signed in.
 * Emits 'change' with the signed-in account (or null) after login, register, logout, subscribe
 * and changePassword, so whatever depends on the entitlement can rebuild.
 */
class AuthManager extends EventEmitter {
  constructor(userDataDir) {
    super();
    this.dir = userDataDir;
    this.usersFile = path.join(userDataDir, 'auth-users.json');
    this.sessionFile = path.join(userDataDir, 'auth-session.json');
    this.projectId = INSFORGE_PROJECT_ID;
    /** The users file, while it is damaged and could not be moved aside: nothing writes over it. */
    this.damaged = null;
    this._initStore();
  }

  // Reads the store once so a damaged file is set aside before anything can write, and drops the
  // old seeded administrator. It seeds nothing, and must not throw: main.js builds this before
  // the window exists.
  _initStore() {
    try {
      this._dropLegacySeed(this._readUsers());
    } catch (err) {
      console.error('[auth]', err.message);
    }
  }

  // Removed, not repaired: every field in it was made up, and a record kept without its hash
  // would still hold the address the owner needs to register again. Nothing writes it any more,
  // so a later start finds nothing and writes nothing. A write that fails is retried on the next
  // start; the session goes either way, so the app never comes up signed in to that record.
  _dropLegacySeed(users) {
    const gone = new Set(users.filter(isLegacySeed).map((u) => u.id));
    if (!gone.size) return;
    try {
      this._saveUsers(users.filter((u) => !isLegacySeed(u)));
      console.error('[auth] removed the administrator record seeded by builds up to 1.0.14');
    } catch (err) {
      console.error('[auth] could not remove the record seeded by builds up to 1.0.14:', err.message);
    }
    try {
      const session = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
      if (session && typeof session.userId === 'string' && gone.has(session.userId)) {
        fs.rmSync(this.sessionFile, { force: true });
      }
    } catch { /* no session, or one that does not parse, and current() reads either as signed out */ }
  }

  _readUsers() {
    let text;
    try {
      text = fs.readFileSync(this.usersFile, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.damaged = null; // somebody removed the damaged file: nothing left to protect
        return [];
      }
      // Answering [] here would let the next sign-up save an empty list over every account.
      throw new Error(t('Не удалось прочитать аккаунты: {0}', err.code || err.message));
    }
    let users = null;
    // Notepad saves with a byte-order mark, and a file somebody fixed by hand is not damaged.
    try { users = JSON.parse(text.replace(/^﻿/, '')); } catch { /* handled below with every other bad shape */ }
    if (Array.isArray(users)) {
      this.damaged = null;
      return users;
    }
    this._setAside();
    return [];
  }

  // A file that does not parse is kept, never saved over: it becomes auth-users.corrupt-<time>.json
  // so its accounts can still be recovered by hand, and the app carries on with an empty list.
  // If even the rename fails, saving stays refused until somebody deals with the file.
  _setAside() {
    let aside;
    let n = 0;
    do {
      aside = path.join(this.dir, `auth-users.corrupt-${Date.now()}${n ? `-${n}` : ''}.json`);
      n++;
    } while (fs.existsSync(aside));
    try {
      fs.renameSync(this.usersFile, aside);
      this.damaged = null;
      console.error(`[auth] ${this.usersFile} did not parse; kept as ${aside}`);
    } catch (err) {
      this.damaged = this.usersFile;
      console.error(`[auth] ${this.usersFile} did not parse and could not be moved aside:`, err.message);
    }
  }

  _saveUsers(users) {
    if (this.damaged) {
      throw new Error(t('Файл аккаунтов повреждён, а отложить его не вышло, поэтому он не перезаписывается: {0}', this.damaged));
    }
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      writeAtomic(this.usersFile, JSON.stringify(users, null, 2));
    } catch (err) {
      throw new Error(t('Не удалось сохранить аккаунты: {0}', err.code || err.message));
    }
    this._exportSnapshot(users);
  }

  // A lapsed plan is reported as lapsed whether or not this write lands; the next read retries.
  _trySave(users) {
    try {
      this._saveUsers(users);
    } catch (err) {
      console.error('[auth]', err.message);
    }
  }

  // insforge-backend.json: the accounts without their password hashes, named after the InsForge
  // project. Nothing in the app reads or uploads it, so it never gets to fail an account change.
  _exportSnapshot(users) {
    try {
      const snapshot = {
        projectId: this.projectId,
        exportedAt: new Date().toISOString(),
        accountsCount: users.length,
        accounts: users.filter(Boolean).map((u) => ({
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
      writeAtomic(path.join(this.dir, 'insforge-backend.json'), JSON.stringify(snapshot, null, 2));
    } catch { /* a copy nobody reads is not worth an error */ }
  }

  _openSession(userId) {
    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    try {
      writeAtomic(this.sessionFile, JSON.stringify({ userId, token, loggedAt: new Date().toISOString() }));
    } catch (err) {
      throw new Error(t('Не удалось запомнить вход: {0}', err.code || err.message));
    }
    return token;
  }

  // Listeners (main.js rebuilding the item schema) run inside login and the rest; one that throws
  // must not turn a sign-in that already happened into an error on screen.
  _changed(user) {
    try {
      this.emit('change', user);
    } catch (err) {
      console.error('[auth] a change listener failed:', err);
    }
  }

  _userToClient(user, token) {
    const email = typeof user.email === 'string' ? user.email : '';
    return {
      id: user.id,
      email,
      name: user.name || email.split('@')[0],
      age: user.age !== undefined ? user.age : null,
      birthDate: user.birthDate || '',
      address: user.address || '',
      country: user.country || '',
      postalCode: user.postalCode || '',
      role: user.role || 'user',
      plan: user.plan || 'free',
      subscription: user.subscription || null,
      token: token || null,
      isAdmin: isAdminRecord(user),
      isPremium: hasVip(user),
    };
  }

  current() {
    try {
      const session = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
      if (!session || !session.token) return null;
      const users = this._readUsers();
      const user = users.find((u) => u && u.id === session.userId);
      if (!user) return null;
      if (lapse(user)) this._trySave(users);
      return this._userToClient(user, session.token);
    } catch {
      return null;
    }
  }

  /**
   * Whether the signed-in account holds VIP now. The Arsenal's hero picks reach the game only
   * while this is true.
   * @returns {boolean}
   */
  isVip() {
    const user = this.current();
    return !!(user && user.isPremium);
  }

  async login(email, password) {
    if (!email || !password) throw new Error(t('Введи почту и пароль'));
    const cleanEmail = String(email).trim().toLowerCase();
    const users = this._readUsers();
    const user = users.find((u) => emailOf(u) === cleanEmail);
    if (!user) throw new Error(t('Аккаунт не найден'));
    if (!passwordMatches(user, password)) throw new Error(t('Неверный пароль'));
    if (lapse(user)) this._trySave(users);
    const client = this._userToClient(user, this._openSession(user.id));
    this._changed(client);
    return client;
  }

  async register(payload, maybePassword, maybeName) {
    const data = typeof payload === 'object' && payload !== null
      ? payload
      : { email: payload, password: maybePassword, name: maybeName };

    const cleanEmail = String(data.email || '').trim().toLowerCase();
    const password = typeof data.password === 'string' ? data.password : '';
    const name = String(data.name || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) throw new Error(t('Введи настоящий адрес почты'));
    if (password.length < MIN_PASSWORD) throw new Error(t('Пароль должен быть не короче 6 символов'));

    const users = this._readUsers();
    if (users.some((u) => emailOf(u) === cleanEmail)) {
      throw new Error(t('Аккаунт с этой почтой уже есть'));
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const newUser = {
      id: `usr_${crypto.randomBytes(12).toString('hex')}`,
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      age: data.age ? Number(data.age) : null,
      birthDate: data.birthDate || '',
      address: String(data.address || '').trim(),
      country: String(data.country || '').trim(),
      postalCode: String(data.postalCode || '').trim(),
      salt,
      hash: hashPassword(password, salt),
      role: cleanEmail === ADMIN_EMAIL ? 'admin' : 'user',
      plan: 'free',
      subscription: null,
      createdAt: now,
      updatedAt: now,
    };

    users.push(newUser);
    this._saveUsers(users);

    const client = this._userToClient(newUser, this._openSession(newUser.id));
    this._changed(client);
    return client;
  }

  async logout() {
    try {
      fs.rmSync(this.sessionFile, { force: true });
    } catch {
      /* a session file that will not go away is read as signed in once more, nothing worse */
    }
    this._changed(null);
    return { ok: true };
  }

  /**
   * Replaces the signed-in account's password after checking the current one.
   * @param {string} oldPassword
   * @param {string} newPassword at least 6 characters
   * @returns {Promise<boolean>}
   */
  async changePassword(oldPassword, newPassword) {
    const cur = this.current();
    if (!cur) throw new Error(t('Сначала войди в аккаунт'));
    const users = this._readUsers();
    const user = users.find((u) => u && u.id === cur.id);
    if (!user) throw new Error(t('Аккаунт не найден'));
    if (!passwordMatches(user, oldPassword || '')) throw new Error(t('Текущий пароль не подходит'));
    const next = typeof newPassword === 'string' ? newPassword : '';
    if (next.length < MIN_PASSWORD) throw new Error(t('Пароль должен быть не короче 6 символов'));
    if (passwordMatches(user, next)) throw new Error(t('Новый пароль совпадает с текущим'));

    user.salt = crypto.randomBytes(16).toString('hex');
    user.hash = hashPassword(next, user.salt);
    user.updatedAt = new Date().toISOString();
    this._saveUsers(users);
    this._changed(this._userToClient(user, cur.token));
    return true;
  }

  async subscribe({ plan = 'premium', method, reference, details, card } = {}) {
    const cur = this.current();
    if (!cur) throw new Error(t('Сначала войди в аккаунт'));

    const users = this._readUsers();
    const idx = users.findIndex((u) => u && u.id === cur.id);
    if (idx < 0) throw new Error(t('Аккаунт не найден'));

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

    const client = this._userToClient(users[idx], cur.token);
    this._changed(client);
    return {
      success: true,
      plan: users[idx].plan,
      subscription: users[idx].subscription,
      user: client,
    };
  }
}

module.exports = {
  AuthManager,
  ADMIN_EMAIL,
  INSFORGE_PROJECT_ID,
  hasVip,
};
