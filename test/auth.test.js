/* Local accounts and the VIP entitlement (src/auth.js).
 *
 * Until September 2026 the administrator's password sat in src/auth.js and was filled into the
 * login form, login() compared against it before looking at any hash, and every start re-hashed
 * it over the stored one, so the owner could not even change it. The first tests pin that shut
 * without repeating the value: they look for the shapes that made it possible (a password
 * constant, a comparison against a literal, a prefilled field) rather than for the string.
 * A hash of it would be no better here: it is short enough to brute-force, and the day the
 * history is rewritten a hash in this file would be the last copy of it anywhere.
 *
 * The record those builds seeded on every start carries that password's hash, so upgraded PCs
 * still had it; the tests below build one with a password of their own and check it goes away.
 *
 * The rest covers what the Arsenal and the account screens lean on: VIP that ends when the plan
 * does, a damaged users file that is kept instead of silently replaced by an empty list, writes
 * that cannot leave half a file, the password change, and the 'change' event main.js rebuilds on.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const i18n = require('../src/i18n.js');
const { AuthManager, ADMIN_EMAIL, hasVip } = require('../src/auth.js');

// Russian is the source: whatever the dictionaries hold, the messages below are these strings.
i18n.setLang('ru');

const ROOT = path.resolve(__dirname, '..');
const DAY = 24 * 60 * 60 * 1000;

function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd2mm-auth-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const usersFile = (dir) => path.join(dir, 'auth-users.json');
const readUsers = (dir) => JSON.parse(fs.readFileSync(usersFile(dir), 'utf8'));

/** A stored record the way auth.js writes one, with a password of the test's choosing. */
function record(email, password, extra = {}) {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    id: `usr_${crypto.randomBytes(6).toString('hex')}`,
    email,
    name: email.split('@')[0],
    salt,
    hash: crypto.scryptSync(password, salt, 32).toString('hex'),
    role: 'user',
    plan: 'free',
    subscription: null,
    ...extra,
  };
}

const LEGACY_ID = 'usr_admin_dreftian';
const LEGACY_REF = 'admin_lifetime_sub';

/**
 * The record builds up to 1.0.14 seeded, in its shape: admin role, a ten-year subscription with a
 * card, filled-in personal fields. The values are placeholders and the password is the test's own.
 */
function legacySeed(password, extra = {}) {
  const now = new Date().toISOString();
  return record(ADMIN_EMAIL, password, {
    id: LEGACY_ID,
    name: 'Seeded Admin',
    age: 30,
    birthDate: '2000-01-01',
    address: 'Placeholder',
    country: 'Placeholder',
    postalCode: '00000',
    role: 'admin',
    plan: 'premium',
    subscription: {
      plan: 'premium',
      status: 'active',
      method: 'card',
      reference: LEGACY_REF,
      card: { brand: 'Visa', last4: '0000', expMonth: '01', expYear: '2099', cardholderName: 'Seeded Admin' },
      subscribedAt: now,
      expiresAt: new Date(Date.now() + 3650 * DAY).toISOString(),
    },
    createdAt: now,
    updatedAt: now,
    ...extra,
  });
}

const sessionFile = (dir) => path.join(dir, 'auth-session.json');
const writeSession = (dir, userId) =>
  fs.writeFileSync(sessionFile(dir), JSON.stringify({ userId, token: 'tok_test', loggedAt: new Date().toISOString() }));

/** Source text with comments removed, so a sentence about passwords is not mistaken for code. */
function code(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

// ---- no password in the code ------------------------------------------------------------------

test('src/auth.js holds no password constant and compares no password with a literal', () => {
  // `typeof password === 'string'` is a type check, not a comparison with a password
  const src = code('src/auth.js').replace(/typeof\s+[\w.$]+/g, 'TYPEOF');
  assert.doesNotMatch(src, /\b[A-Z_]*(PASS|PWD)[A-Z_]*\s*=\s*['"\x60]/, 'a string constant named like a password');
  const literal = String.raw`(['"\x60][^'"\x60]*['"\x60]|\b[A-Z][A-Z0-9_]+\b)`;
  const pw = String.raw`\b\w*(pass|pwd)\w*\b`;
  const compared = new RegExp(`${pw}\\s*[!=]==?\\s*${literal}|${literal}\\s*[!=]==?\\s*${pw}`, 'i');
  assert.doesNotMatch(src, compared, 'a password argument compared with something written in the code');
});

test('the sign-in form starts empty and prints no credentials', () => {
  const src = code('renderer/ui/auth-modal.js');
  for (const input of src.match(/<input\b[^>]*>/g) || []) {
    if (/type="(password|email)"/.test(input)) assert.doesNotMatch(input, /\bvalue=/, input);
  }
  assert.ok(!src.includes(ADMIN_EMAIL), 'the administrator address is shown or prefilled');
});

test('every error src/auth.js throws goes through t()', () => {
  assert.doesNotMatch(code('src/auth.js'), /new Error\(\s*['"\x60]/);
});

// ---- the administrator ------------------------------------------------------------------------

test('a fresh store seeds nobody, so the admin address signs in with nothing until registered', async (t) => {
  const dir = tempDir(t);
  const auth = new AuthManager(dir);
  assert.equal(fs.existsSync(usersFile(dir)), false, 'the constructor wrote an account');
  await assert.rejects(auth.login(ADMIN_EMAIL, 'anything-at-all'), { message: 'Аккаунт не найден' });
  assert.equal(auth.current(), null);
  assert.equal(auth.isVip(), false);
});

test('an existing administrator keeps its own hash across restarts, and signs in only with it', async (t) => {
  const dir = tempDir(t);
  const admin = record(ADMIN_EMAIL, 'owner-secret-1', {
    role: 'admin',
    plan: 'premium',
    subscription: { plan: 'premium', status: 'active', expiresAt: new Date(Date.now() + 365 * DAY).toISOString() },
  });
  const other = record('player@example.com', 'player-pass');
  fs.writeFileSync(usersFile(dir), JSON.stringify([admin, other], null, 2));
  const before = fs.readFileSync(usersFile(dir), 'utf8');

  new AuthManager(dir);
  const auth = new AuthManager(dir);
  assert.equal(fs.readFileSync(usersFile(dir), 'utf8'), before, 'a start rewrote the users file');

  await assert.rejects(auth.login(ADMIN_EMAIL, 'not-the-owner'), { message: 'Неверный пароль' });
  const me = await auth.login(` ${ADMIN_EMAIL.toUpperCase()} `, 'owner-secret-1');
  assert.equal(me.isAdmin, true);
  assert.equal(me.isPremium, true);
  assert.equal(auth.isVip(), true);
  const stored = readUsers(dir).find((u) => u.email === ADMIN_EMAIL);
  assert.equal(stored.salt, admin.salt);
  assert.equal(stored.hash, admin.hash);
});

test('registering the admin address creates the administrator, with nothing seeded into it', async (t) => {
  const dir = tempDir(t);
  const auth = new AuthManager(dir);
  const me = await auth.register({ email: ADMIN_EMAIL.toUpperCase(), password: 'fresh-admin-pass', name: 'Owner' });
  assert.equal(me.isAdmin, true);
  assert.equal(me.isPremium, true, 'the administrator holds VIP without a subscription');
  assert.equal(auth.isVip(), true);

  const [stored] = readUsers(dir);
  assert.equal(stored.email, ADMIN_EMAIL);
  assert.equal(stored.role, 'admin');
  assert.equal(stored.subscription, null, 'no made-up lifetime subscription or card');
  assert.equal(stored.age, null);
  assert.equal(stored.birthDate, '');
  assert.equal(stored.address, '');
  assert.equal(stored.postalCode, '');
  assert.equal(stored.paymentHistory, undefined);

  await auth.logout();
  await assert.rejects(new AuthManager(dir).register({ email: ADMIN_EMAIL, password: 'someone-else' }),
    { message: 'Аккаунт с этой почтой уже есть' });
});

test('anybody else registers as an ordinary user without VIP', async (t) => {
  const auth = new AuthManager(tempDir(t));
  const me = await auth.register({ email: 'player@example.com', password: 'player-pass', name: 'P' });
  assert.equal(me.isAdmin, false);
  assert.equal(me.isPremium, false);
  assert.equal(auth.isVip(), false);
  await assert.rejects(auth.register({ email: 'nobody', password: 'long-enough' }), { message: 'Введи настоящий адрес почты' });
  await assert.rejects(auth.register({ email: 'b@example.com', password: '12345' }), { message: 'Пароль должен быть не короче 6 символов' });
  await assert.rejects(auth.login('', ''), { message: 'Введи почту и пароль' });
});

// ---- the record old builds seeded -------------------------------------------------------------

test('the seeded administrator is removed on start, with its session, and nobody else is touched', async (t) => {
  t.mock.method(console, 'error', () => {});
  const dir = tempDir(t);
  const a = record('a@example.com', 'secret-a');
  const b = record('b@example.com', 'secret-b', {
    plan: 'premium',
    subscription: { plan: 'premium', status: 'active', reference: 'yape_1', expiresAt: new Date(Date.now() + 10 * DAY).toISOString() },
  });
  fs.writeFileSync(usersFile(dir), JSON.stringify([a, legacySeed('legacy-seed-pass'), b], null, 2));
  writeSession(dir, LEGACY_ID);

  const auth = new AuthManager(dir);
  assert.deepEqual(readUsers(dir), [a, b], 'another record changed, or the seed is still there');
  assert.equal(fs.existsSync(sessionFile(dir)), false, 'the session of the removed record survived');
  assert.equal(auth.current(), null);
  assert.equal(auth.isVip(), false);
  await assert.rejects(auth.login(ADMIN_EMAIL, 'legacy-seed-pass'), { message: 'Аккаунт не найден' });
  assert.equal((await auth.login('b@example.com', 'secret-b')).isPremium, true);

  // the copy written beside the users file drops it too, seeded personal fields and all
  const snapshot = JSON.parse(fs.readFileSync(path.join(dir, 'insforge-backend.json'), 'utf8'));
  assert.deepEqual(snapshot.accounts.map((u) => u.id), [a.id, b.id]);

  // the address is free again, so the owner can sign up with it
  await auth.logout();
  assert.equal((await auth.register({ email: ADMIN_EMAIL, password: 'owner-new-pass' })).email, ADMIN_EMAIL);
});

test('the session of somebody else survives the removal', (t) => {
  t.mock.method(console, 'error', () => {});
  const dir = tempDir(t);
  const me = record('me@example.com', 'secret-me');
  fs.writeFileSync(usersFile(dir), JSON.stringify([legacySeed('legacy-seed-pass'), me]));
  writeSession(dir, me.id);
  const auth = new AuthManager(dir);
  assert.equal(auth.current().email, 'me@example.com');
  assert.deepEqual(readUsers(dir), [me]);
});

test('an admin-address record the old builds adopted is known by the seeded subscription', (t) => {
  t.mock.method(console, 'error', () => {});
  const dir = tempDir(t);
  const adopted = legacySeed('legacy-seed-pass', { id: 'usr_0123456789abcdef01234567' });
  // the same reference on another address was never written by those builds, so it is left alone
  const unrelated = record('p@example.com', 'secret-p', { subscription: { plan: 'premium', status: 'expired', reference: LEGACY_REF } });
  const later = legacySeed('legacy-seed-pass', { subscription: { plan: 'premium', status: 'active', reference: 'bcp_7' } });
  fs.writeFileSync(usersFile(dir), JSON.stringify([adopted, unrelated]));
  writeSession(dir, adopted.id);
  new AuthManager(dir);
  assert.deepEqual(readUsers(dir), [unrelated]);
  assert.equal(fs.existsSync(sessionFile(dir)), false);

  // a later checkout replaced the reference, but the id still gives the seeded record away
  const dir2 = tempDir(t);
  fs.writeFileSync(usersFile(dir2), JSON.stringify([later, unrelated]));
  new AuthManager(dir2);
  assert.deepEqual(readUsers(dir2), [unrelated]);
});

test('the removal happens once: later starts find nothing and write nothing', async (t) => {
  t.mock.method(console, 'error', () => {});
  const dir = tempDir(t);
  const other = record('other@example.com', 'secret-o');
  fs.writeFileSync(usersFile(dir), JSON.stringify([legacySeed('legacy-seed-pass'), other]));
  new AuthManager(dir);
  const users = fs.readFileSync(usersFile(dir), 'utf8');
  const snapshot = fs.readFileSync(path.join(dir, 'insforge-backend.json'), 'utf8');

  const rename = t.mock.method(fs, 'renameSync');
  new AuthManager(dir);
  new AuthManager(dir);
  assert.equal(rename.mock.callCount(), 0, 'a start with nothing to remove wrote a file');
  assert.equal(fs.readFileSync(usersFile(dir), 'utf8'), users);
  assert.equal(fs.readFileSync(path.join(dir, 'insforge-backend.json'), 'utf8'), snapshot);
  assert.deepEqual(readUsers(dir), [other]);
});

test('a removal that cannot be written does not stop the app, and the next start finishes it', async (t) => {
  t.mock.method(console, 'error', () => {});
  const dir = tempDir(t);
  const other = record('other@example.com', 'secret-o');
  fs.writeFileSync(usersFile(dir), JSON.stringify([legacySeed('legacy-seed-pass'), other]));
  const before = fs.readFileSync(usersFile(dir), 'utf8');
  writeSession(dir, LEGACY_ID);

  const rename = fs.renameSync;
  const locked = t.mock.method(fs, 'renameSync', (from, to) => {
    if (String(to) === usersFile(dir)) throw Object.assign(new Error('locked'), { code: 'EBUSY' });
    return rename(from, to);
  });
  const auth = new AuthManager(dir);
  assert.equal(fs.readFileSync(usersFile(dir), 'utf8'), before);
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')), []);
  assert.equal(fs.existsSync(sessionFile(dir)), false, 'the session stayed while the record could not go');
  assert.equal(auth.current(), null);

  locked.mock.restore();
  new AuthManager(dir);
  assert.deepEqual(readUsers(dir), [other]);
});

test('a damaged file holding the seeded record is still set aside whole, not migrated', (t) => {
  t.mock.method(console, 'error', () => {});
  const dir = tempDir(t);
  const whole = JSON.stringify([legacySeed('legacy-seed-pass'), record('a@example.com', 'secret-a')], null, 2);
  const half = whole.slice(0, Math.floor(whole.length / 2));
  fs.writeFileSync(usersFile(dir), half);
  const auth = new AuthManager(dir);
  const aside = fs.readdirSync(dir).filter((f) => f.startsWith('auth-users.corrupt-'));
  assert.equal(aside.length, 1);
  assert.equal(fs.readFileSync(path.join(dir, aside[0]), 'utf8'), half);
  assert.equal(fs.existsSync(usersFile(dir)), false);
  assert.equal(auth.current(), null);
});

// ---- VIP and its end date ---------------------------------------------------------------------

test('hasVip: the administrator always, a premium plan only while it is active and not past its end', () => {
  const now = Date.parse('2026-09-23T00:00:00Z');
  const premium = (sub) => ({ email: 'p@example.com', role: 'user', plan: 'premium', subscription: sub });
  assert.equal(hasVip(null, now), false);
  assert.equal(hasVip({ email: 'p@example.com', role: 'admin', plan: 'free' }, now), true);
  assert.equal(hasVip({ email: ADMIN_EMAIL, plan: 'free' }, now), true);
  assert.equal(hasVip(premium({ status: 'active', expiresAt: '2026-10-01T00:00:00Z' }), now), true);
  assert.equal(hasVip(premium({ status: 'active' }), now), true, 'no end date counts as running');
  assert.equal(hasVip(premium({ status: 'active', expiresAt: '2026-09-22T23:59:59Z' }), now), false);
  assert.equal(hasVip(premium({ status: 'active', expiresAt: '2026-09-23T00:00:00Z' }), now), false, 'the end instant is already over');
  assert.equal(hasVip(premium({ status: 'active', expiresAt: 'not a date' }), now), false);
  assert.equal(hasVip(premium({ status: 'expired', expiresAt: '2027-01-01T00:00:00Z' }), now), false);
  assert.equal(hasVip(premium(null), now), false);
  assert.equal(hasVip({ ...premium({ status: 'active' }), plan: 'free' }, now), false);
});

test('a subscription past its end date reads as free and expired, and says so on disk', async (t) => {
  const dir = tempDir(t);
  const auth = new AuthManager(dir);
  await auth.register({ email: 'payer@example.com', password: 'payer-pass' });
  await auth.subscribe({ method: 'yape', reference: 'yape_1' });
  assert.equal(auth.isVip(), true);

  const users = readUsers(dir);
  users[0].subscription.expiresAt = new Date(Date.now() - 400 * DAY).toISOString();
  fs.writeFileSync(usersFile(dir), JSON.stringify(users));

  const restarted = new AuthManager(dir);
  const me = restarted.current();
  assert.equal(me.plan, 'free');
  assert.equal(me.subscription.status, 'expired');
  assert.equal(me.isPremium, false);
  assert.equal(restarted.isVip(), false);
  const [stored] = readUsers(dir);
  assert.equal(stored.plan, 'free');
  assert.equal(stored.subscription.status, 'expired');
});

// ---- a damaged users file ---------------------------------------------------------------------

test('a truncated users file is moved aside intact and never saved over', async (t) => {
  t.mock.method(console, 'error', () => {});
  const dir = tempDir(t);
  const auth = new AuthManager(dir);
  await auth.register({ email: 'a@example.com', password: 'secret-a' });
  await auth.register({ email: 'b@example.com', password: 'secret-b' });
  const whole = fs.readFileSync(usersFile(dir), 'utf8');
  const half = whole.slice(0, Math.floor(whole.length / 2));
  fs.writeFileSync(usersFile(dir), half);

  const restarted = new AuthManager(dir);
  const aside = fs.readdirSync(dir).filter((f) => /^auth-users\.corrupt-\d+(-\d+)?\.json$/.test(f));
  assert.equal(aside.length, 1, `set aside as: ${fs.readdirSync(dir).join(', ')}`);
  assert.equal(fs.readFileSync(path.join(dir, aside[0]), 'utf8'), half, 'the damaged copy was altered');
  assert.equal(restarted.current(), null);

  await restarted.register({ email: 'c@example.com', password: 'secret-c' });
  assert.deepEqual(readUsers(dir).map((u) => u.email), ['c@example.com']);
  assert.equal(fs.readFileSync(path.join(dir, aside[0]), 'utf8'), half, 'a later save touched the damaged copy');
});

test('a users file that parses to something other than a list is set aside too', (t) => {
  t.mock.method(console, 'error', () => {});
  for (const body of ['null', '{}', '']) {
    const dir = tempDir(t);
    fs.writeFileSync(usersFile(dir), body);
    new AuthManager(dir);
    assert.equal(fs.existsSync(usersFile(dir)), false, JSON.stringify(body));
    assert.equal(fs.readdirSync(dir).filter((f) => f.startsWith('auth-users.corrupt-')).length, 1, JSON.stringify(body));
  }
});

test('when a damaged file cannot be moved aside, nothing is written over it', async (t) => {
  t.mock.method(console, 'error', () => {});
  const dir = tempDir(t);
  fs.writeFileSync(usersFile(dir), '[{"email":"a@exam');
  const rename = fs.renameSync;
  t.mock.method(fs, 'renameSync', (from, to) => {
    if (String(to).includes('.corrupt-')) throw Object.assign(new Error('locked'), { code: 'EPERM' });
    return rename(from, to);
  });
  const auth = new AuthManager(dir);
  await assert.rejects(auth.register({ email: 'new@example.com', password: 'secret-new' }), /повреждён/);
  assert.equal(fs.readFileSync(usersFile(dir), 'utf8'), '[{"email":"a@exam');
});

test('a users file that cannot be read is not taken for an empty one', async (t) => {
  t.mock.method(console, 'error', () => {});
  const dir = tempDir(t);
  fs.mkdirSync(usersFile(dir)); // reading a directory fails the way a locked file does
  const auth = new AuthManager(dir);
  await assert.rejects(auth.register({ email: 'new@example.com', password: 'secret-new' }), /Не удалось прочитать аккаунты/);
  assert.ok(fs.statSync(usersFile(dir)).isDirectory());
});

test('a users file saved by hand with a byte-order mark is read, not set aside', async (t) => {
  const dir = tempDir(t);
  fs.writeFileSync(usersFile(dir), `﻿${JSON.stringify([record('me@example.com', 'secret-me')])}`);
  const auth = new AuthManager(dir);
  assert.equal((await auth.login('me@example.com', 'secret-me')).email, 'me@example.com');
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.includes('.corrupt-')), []);
});

test('a record without an address does not stop the app from starting', async (t) => {
  const dir = tempDir(t);
  fs.writeFileSync(usersFile(dir), JSON.stringify([{ id: 'usr_x', name: 'no email' }, null, record('ok@example.com', 'secret-ok')]));
  const auth = new AuthManager(dir);
  const me = await auth.login('ok@example.com', 'secret-ok');
  assert.equal(me.email, 'ok@example.com');
});

test('a save that fails half way leaves the previous file whole and no temp file behind', async (t) => {
  const dir = tempDir(t);
  const auth = new AuthManager(dir);
  await auth.register({ email: 'a@example.com', password: 'secret-a' });
  const before = fs.readFileSync(usersFile(dir), 'utf8');

  const rename = fs.renameSync;
  t.mock.method(fs, 'renameSync', (from, to) => {
    if (String(to) === usersFile(dir)) throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
    return rename(from, to);
  });
  await assert.rejects(auth.register({ email: 'b@example.com', password: 'secret-b' }), { message: 'Не удалось сохранить аккаунты: ENOSPC' });
  assert.equal(fs.readFileSync(usersFile(dir), 'utf8'), before);
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')), []);
});

// ---- changing the password --------------------------------------------------------------------

test('changePassword checks the current one, then replaces it for good', async (t) => {
  const dir = tempDir(t);
  const auth = new AuthManager(dir);
  await assert.rejects(auth.changePassword('x', 'yyyyyy'), { message: 'Сначала войди в аккаунт' });

  await auth.register({ email: 'me@example.com', password: 'first-pass' });
  await assert.rejects(auth.changePassword('wrong-pass', 'second-pass'), { message: 'Текущий пароль не подходит' });
  await assert.rejects(auth.changePassword('first-pass', '12345'), { message: 'Пароль должен быть не короче 6 символов' });
  await assert.rejects(auth.changePassword('first-pass', 'first-pass'), { message: 'Новый пароль совпадает с текущим' });
  assert.equal(await auth.changePassword('first-pass', 'second-pass'), true);

  const restarted = new AuthManager(dir);
  await assert.rejects(restarted.login('me@example.com', 'first-pass'), { message: 'Неверный пароль' });
  assert.equal((await restarted.login('me@example.com', 'second-pass')).email, 'me@example.com');
});

// ---- the 'change' event -----------------------------------------------------------------------

test("'change' fires after register, login, subscribe, changePassword and logout", async (t) => {
  const auth = new AuthManager(tempDir(t));
  const seen = [];
  auth.on('change', (user) => seen.push(user ? `${user.email}:${user.isPremium}` : null));

  await auth.register({ email: 'me@example.com', password: 'first-pass' });
  await auth.subscribe({ method: 'bcp', reference: 'bcp_1' });
  await auth.changePassword('first-pass', 'second-pass');
  await auth.logout();
  await auth.login('me@example.com', 'second-pass');
  assert.deepEqual(seen, [
    'me@example.com:false',
    'me@example.com:true',
    'me@example.com:true',
    null,
    'me@example.com:true',
  ]);
});

test('a listener that throws does not turn a sign-in into an error', async (t) => {
  const dir = tempDir(t);
  fs.writeFileSync(usersFile(dir), JSON.stringify([record('me@example.com', 'secret-me')]));
  const auth = new AuthManager(dir);
  t.mock.method(console, 'error', () => {});
  auth.on('change', () => { throw new Error('schema rebuild blew up'); });
  const me = await auth.login('me@example.com', 'secret-me');
  assert.equal(me.email, 'me@example.com');
  assert.equal(auth.current().email, 'me@example.com');
});
