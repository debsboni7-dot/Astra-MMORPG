import test from 'node:test';
import assert from 'node:assert/strict';
import { createAstreaHttpServer } from '../server/http/createAstreaHttpServer.js';

const token = 'a'.repeat(40);

async function withServer(run) {
  const calls = [];
  const server = createAstreaHttpServer({
    authService: {
      async authenticate(value) { return value === token ? { id: 'account-owner' } : null; },
    },
    characterService: { async list() { return []; }, async create() { return {}; } },
    progressionService: { async getSnapshot() { return {}; } },
    magicProgressionService: {
      async getSnapshot(accountId, characterId) {
        calls.push({ action: 'snapshot', accountId, characterId });
        return { snapshot: { schools: {} } };
      },
      async getTree(accountId, characterId, school) {
        calls.push({ action: 'tree', accountId, characterId, school });
        return { school, nodes: [] };
      },
      async unlockSkill(input) {
        calls.push({ action: 'unlock', ...input });
        return { unlocked: true, skill: { id: input.school + ':' + input.branch + ':' + input.index } };
      },
    },
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`, calls);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('magic progression snapshot route requires authentication and scopes by account', async () => {
  await withServer(async (base, calls) => {
    const denied = await fetch(base + '/v1/characters/char-1/progression/magic');
    assert.equal(denied.status, 401);
    const response = await fetch(base + '/v1/characters/char-1/progression/magic', {
      headers: { authorization: 'Bearer ' + token },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(calls[0], { action: 'snapshot', accountId: 'account-owner', characterId: 'char-1' });
  });
});

test('magic school tree route returns the requested school', async () => {
  await withServer(async (base, calls) => {
    const response = await fetch(base + '/v1/characters/char-1/progression/magic/fire', {
      headers: { authorization: 'Bearer ' + token },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { school: 'fire', nodes: [] });
    assert.equal(calls[0].school, 'fire');
  });
});

test('magic unlock route uses authenticated account rather than client account id', async () => {
  await withServer(async (base, calls) => {
    const response = await fetch(base + '/v1/characters/char-1/progression/magic/unlock', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify({ accountId: 'attacker-account', school: 'water', branch: 'defense', index: 0 }),
    });
    assert.equal(response.status, 200);
    const call = calls[0];
    assert.equal(call.accountId, 'account-owner');
    assert.equal(call.characterId, 'char-1');
    assert.equal(call.school, 'water');
  });
});
