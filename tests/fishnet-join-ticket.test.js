import test from 'node:test';
import assert from 'node:assert/strict';
import { createFishNetJoinTicketService } from '../server/realtime/FishNetJoinTicketService.js';
import { createAstreaHttpServer } from '../server/http/createAstreaHttpServer.js';

const sessionToken = 's'.repeat(48);
const serverSecret = 'server-secret-for-fishnet-tests-1234567890';

function makeHarness() {
  const records = new Map();
  const characterService = {
    async get(accountId, characterId) {
      return accountId === 'account-1' && characterId === 'character-1'
        ? { id: 'character-1' }
        : null;
    },
  };
  const repository = {
    async createRealtimeJoinTicket(record) {
      records.set(record.tokenHash, { ...record, consumed: false });
    },
    async consumeRealtimeJoinTicket(tokenHash, serverId) {
      const record = records.get(tokenHash);
      if (!record || record.consumed || record.serverId !== serverId || record.expiresAt.getTime() <= Date.now()) return null;
      record.consumed = true;
      return { accountId: record.accountId, characterId: record.characterId, serverId: record.serverId };
    },
  };
  const service = createFishNetJoinTicketService({ characterService, repository });
  return { records, service };
}

async function withServer(run, service, serverOptions = {}) {
  const server = createAstreaHttpServer({
    authService: {
      async authenticate(token) { return token === sessionToken ? { id: 'account-1' } : null; },
      async register() {},
      async login() {},
      async logout() {},
    },
    characterService: { async list() { return []; }, async create() {} },
    progressionService: { async getSnapshot() { return {}; } },
    fishNetJoinTicketService: service,
    realtimeServerSecret: serverSecret,
    ...serverOptions,
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test('FishNet join tickets are opaque, bound to owned characters, hashed at rest and one-use', async () => {
  const { records, service } = makeHarness();
  const issued = await service.issueForCharacter('account-1', 'character-1');
  assert.equal(issued.expiresIn, 30);
  assert.match(issued.ticket, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(records.size, 1);
  const stored = [...records.entries()][0];
  assert.notEqual(stored[0], issued.ticket);
  assert.equal(stored[1].accountId, 'account-1');
  assert.equal(stored[1].characterId, 'character-1');
  assert.equal(stored[1].serverId, 'astrea-prototype-zone-01');
  assert.equal(stored[1].expiresAt.getTime() - Date.now() <= 30_100, true);
  assert.deepEqual(await service.consume(issued.ticket), {
    accountId: 'account-1',
    characterId: 'character-1',
    serverId: 'astrea-prototype-zone-01',
  });
  assert.equal(await service.consume(issued.ticket), null);
});

test('FishNet join tickets cannot be issued for another account character or consumed by another server', async () => {
  const { service } = makeHarness();
  await assert.rejects(service.issueForCharacter('attacker', 'character-1'), error => error.code === 'CHARACTER_NOT_FOUND');
  const issued = await service.issueForCharacter('account-1', 'character-1');
  assert.equal(await service.consume(issued.ticket, 'astrea-other-zone'), null);
  assert.deepEqual(await service.consume(issued.ticket), {
    accountId: 'account-1',
    characterId: 'character-1',
    serverId: 'astrea-prototype-zone-01',
  });
});

test('FishNet HTTP ticket issuance requires an authenticated owner and internal consumption requires server secret', async () => {
  const { records, service } = makeHarness();
  await withServer(async base => {
    const denied = await fetch(base + '/v1/realtime/fishnet/tickets', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ characterId: 'character-1' }),
    });
    assert.equal(denied.status, 401);

    const issuedResponse = await fetch(base + '/v1/realtime/fishnet/tickets', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + sessionToken, 'content-type': 'application/json' },
      body: JSON.stringify({ characterId: 'character-1', accountId: 'forged-account' }),
    });
    assert.equal(issuedResponse.status, 201);
    const issued = await issuedResponse.json();
    assert.equal(issued.expiresIn, 30);
    assert.match(issued.ticket, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(records.size, 1);

    const noSecret = await fetch(base + '/v1/internal/realtime/fishnet/consume', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticket: issued.ticket }),
    });
    assert.equal(noSecret.status, 401);

    const wrongSecret = await fetch(base + '/v1/internal/realtime/fishnet/consume', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-astrea-server-key': 'x'.repeat(serverSecret.length) },
      body: JSON.stringify({ ticket: issued.ticket }),
    });
    assert.equal(wrongSecret.status, 401);

    const consumed = await fetch(base + '/v1/internal/realtime/fishnet/consume', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-astrea-server-key': serverSecret },
      body: JSON.stringify({ ticket: issued.ticket, serverId: 'astrea-prototype-zone-01' }),
    });
    assert.equal(consumed.status, 200);
    assert.deepEqual((await consumed.json()).identity, {
      accountId: 'account-1',
      characterId: 'character-1',
      serverId: 'astrea-prototype-zone-01',
    });

    const replay = await fetch(base + '/v1/internal/realtime/fishnet/consume', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-astrea-server-key': serverSecret },
      body: JSON.stringify({ ticket: issued.ticket, serverId: 'astrea-prototype-zone-01' }),
    });
    assert.equal(replay.status, 401);
    assert.deepEqual(await replay.json(), { error: 'INVALID_OR_EXPIRED_TICKET' });
  }, service);
});


test('FishNet join ticket issuance is rate limited per IP', async () => {
  const { service } = makeHarness();
  await withServer(async base => {
    const issue = () => fetch(base + '/v1/realtime/fishnet/tickets', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + sessionToken, 'content-type': 'application/json' },
      body: JSON.stringify({ characterId: 'character-1' }),
    });
    assert.equal((await issue()).status, 201);
    const limited = await issue();
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).error, 'RATE_LIMITED');
    assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  }, service, { authRateLimitLimit: 1, authRateLimitWindowMs: 60_000 });
});
