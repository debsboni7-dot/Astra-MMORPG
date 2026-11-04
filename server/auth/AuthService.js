import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const TOKEN_BYTES = 32;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const hashToken = token => createHash('sha256').update(token).digest('hex');

export function createAuthService(repository, { sessionTtlSeconds = SESSION_TTL_SECONDS } = {}) {
  for (const method of ['createAccount','findAccountByEmail','createSession','findSession','deleteSession']) {
    if (typeof repository?.[method] !== 'function') throw new TypeError(`Auth repository missing ${method}`);
  }
  async function register({ email, password }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new TypeError('Adresse e-mail invalide');
    if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new TypeError('Le mot de passe doit contenir entre 12 et 256 caractères');
    if (await repository.findAccountByEmail(normalizedEmail)) throw Object.assign(new Error('Compte déjà existant'), { code: 'ACCOUNT_EXISTS' });
    const salt = randomBytes(16);
    const derived = await scrypt(password, salt, 64);
    const account = await repository.createAccount({ email: normalizedEmail, passwordHash: Buffer.from(derived).toString('hex'), passwordSalt: salt.toString('hex') });
    return { id: account.id, email: account.email };
  }
  async function login({ email, password }) {
    const account = await repository.findAccountByEmail(String(email || '').trim().toLowerCase());
    if (!account || typeof password !== 'string') throw Object.assign(new Error('Identifiants invalides'), { code: 'INVALID_CREDENTIALS' });
    const actual = Buffer.from(await scrypt(password, Buffer.from(account.passwordSalt, 'hex'), 64));
    const expected = Buffer.from(account.passwordHash, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Object.assign(new Error('Identifiants invalides'), { code: 'INVALID_CREDENTIALS' });
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    await repository.createSession({ accountId: account.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + sessionTtlSeconds * 1000) });
    return { token, account: { id: account.id, email: account.email }, expiresIn: sessionTtlSeconds };
  }
  async function authenticate(token) {
    if (!token || typeof token !== 'string' || token.length > 256) return null;
    const session = await repository.findSession(hashToken(token));
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;
    return { id: session.accountId };
  }
  async function logout(token) {
    if (token) await repository.deleteSession(hashToken(token));
  }
  return Object.freeze({ register, login, authenticate, logout });
}
