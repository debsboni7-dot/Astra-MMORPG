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
    magicCombatService: {
      async getSnapshot(accountId, characterId) { calls.push({ action:'combat-snapshot', accountId, characterId }); return { combat:{ mana:100 } }; },
      async castSpell(input) { calls.push({ action:'combat-cast', ...input }); return { cast:{ executed:true, damage:18 } }; },
    },
    magicProgressionService: {
      async getSnapshot(accountId, characterId) {
        calls.push({ action: 'snapshot', accountId, characterId });
        return { snapshot: { schools: {} } };
      },
      async getTree(accountId, characterId, school) {
        calls.push({ action: 'tree', accountId, characterId, school });
        return { school, nodes: [] };
      },
      async equipTechnique(input) {
        calls.push({ action: 'equip', ...input });
        return { equipped: true };
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

test('magic equip route uses authenticated account rather than client account id', async () => {
  await withServer(async (base, calls) => {
    const response = await fetch(base + '/v1/characters/char-1/progression/magic/equip', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify({ accountId: 'attacker-account', school: 'water', skillId: 'water:offense:1', slotType: 'normal', slotIndex: 0 }),
    });
    assert.equal(response.status, 200);
    const call = calls[0];
    assert.equal(call.accountId, 'account-owner');
    assert.equal(call.characterId, 'char-1');
    assert.equal(call.school, 'water');
    assert.equal(call.slotType, 'normal');
  });
});


test('magic combat routes require authentication and never accept client damage or account data', async () => {
  await withServer(async (base, calls) => {
    const denied = await fetch(base + '/v1/characters/char-1/combat/magic/cast', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({school:'fire',requestId:'request-123'}) });
    assert.equal(denied.status,401);
    const snapshot = await fetch(base + '/v1/characters/char-1/combat/magic', { headers:{authorization:'Bearer '+token} });
    assert.equal(snapshot.status,200);
    assert.deepEqual(await snapshot.json(),{combat:{mana:100}});
    const response = await fetch(base + '/v1/characters/char-1/combat/magic/cast', {
      method:'POST', headers:{authorization:'Bearer '+token,'content-type':'application/json'},
      body:JSON.stringify({accountId:'attacker-account',school:'fire',targetId:'enemy-1',requestId:'request-123',damage:999999,mana:999999,target:{hp:1}}),
    });
    assert.equal(response.status,200);
    const call = calls.find(item=>item.action==='combat-cast');
    assert.deepEqual(call,{action:'combat-cast',accountId:'account-owner',characterId:'char-1',school:'fire',targetId:'enemy-1',requestId:'request-123'});
  });
});
