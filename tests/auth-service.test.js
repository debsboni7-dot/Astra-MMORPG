import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../server/auth/AuthService.js';

function fixture() {
  const accounts = new Map();
  const sessions = new Map();
  let nextId = 1;
  return {
    accounts, sessions,
    async createAccount(data) {
      const account = { id: String(nextId++), email: data.email, passwordHash: data.passwordHash, passwordSalt: data.passwordSalt };
      accounts.set(account.email, account);
      return account;
    },
    async findAccountByEmail(email) { return accounts.get(email) || null; },
    async createSession(data) { sessions.set(data.tokenHash, data); },
    async findSession(hash) { return sessions.get(hash) || null; },
    async deleteSession(hash) { sessions.delete(hash); },
  };
}

test('registration stores a salted password hash, never the plaintext password', async () => {
  const repository = fixture();
  const auth = createAuthService(repository);
  const account = await auth.register({ email: 'Player@Example.com', password: 'a-very-long-secret-123' });
  const stored = repository.accounts.get('player@example.com');
  assert.equal(account.email, 'player@example.com');
  assert.notEqual(stored.passwordHash, 'a-very-long-secret-123');
  assert.equal(stored.passwordSalt.length, 32);
});

test('login issues an opaque token and only its hash is stored', async () => {
  const repository = fixture();
  const auth = createAuthService(repository);
  await auth.register({ email: 'player@example.com', password: 'a-very-long-secret-123' });
  const session = await auth.login({ email: 'player@example.com', password: 'a-very-long-secret-123' });
  assert.ok(session.token.length >= 40);
  assert.equal(repository.sessions.has(session.token), false);
  assert.equal((await auth.authenticate(session.token)).id, '1');
});

test('invalid credentials and weak passwords are rejected', async () => {
  const auth = createAuthService(fixture());
  await assert.rejects(auth.register({ email: 'not-an-email', password: 'short' }), /Adresse e-mail invalide/);
  await assert.rejects(auth.register({ email: 'p@example.com', password: 'short' }), /12 et 256/);
  await assert.rejects(auth.login({ email: 'nobody@example.com', password: 'password' }), error => error.code === 'INVALID_CREDENTIALS');
});

test('logout revokes the session token', async () => {
  const auth = createAuthService(fixture());
  await auth.register({ email: 'player@example.com', password: 'a-very-long-secret-123' });
  const { token } = await auth.login({ email: 'player@example.com', password: 'a-very-long-secret-123' });
  assert.ok(await auth.authenticate(token));
  await auth.logout(token);
  assert.equal(await auth.authenticate(token), null);
});
