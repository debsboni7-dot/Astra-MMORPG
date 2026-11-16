import test from 'node:test';
import assert from 'node:assert/strict';
import { createAstreaHttpServer } from '../server/http/createAstreaHttpServer.js';
import { createNodeWebSocketPrototypeServer } from '../server/realtime/NodeWebSocketPrototypeServer.js';
import { createRealtimeTicketService } from '../server/realtime/RealtimeTicketService.js';

test('authenticated HTTP ticket issuance connects a character to WebSocket on the same port', async () => {
  const token = 'valid-http-session-token-for-realtime-test';
  const characterService = {
    async get(accountId, characterId) {
      return accountId === 'account-1' && characterId === 'character-1'
        ? { id: 'character-1' }
        : null;
    },
    async list() { return []; },
    async create() { throw new Error('not used'); },
  };
  const realtimeServer = createNodeWebSocketPrototypeServer();
  const realtimeTicketService = createRealtimeTicketService({ characterService, realtimeServer });
  const httpServer = createAstreaHttpServer({
    authService: {
      async authenticate(value) { return value === token ? { id: 'account-1' } : null; },
      async register() {},
      async login() {},
      async logout() {},
    },
    characterService,
    progressionService: { async getSnapshot() { return {}; } },
    realtimeTicketService,
  });
  realtimeServer.attachTo(httpServer);
  await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${httpServer.address().port}`;
  const wsUrl = `ws://127.0.0.1:${httpServer.address().port}/realtime/v1`;
  let client;
  try {
    const ticketResponse = await fetch(base + '/v1/realtime/tickets', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + token,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ characterId: 'character-1', accountId: 'forged-account' }),
    });
    assert.equal(ticketResponse.status, 201);
    const { ticket, expiresIn } = await ticketResponse.json();
    assert.equal(expiresIn, 30);
    assert.equal(typeof ticket, 'string');
    assert.ok(ticket.length >= 32);

    client = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out opening realtime WebSocket')), 1500);
      client.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      client.addEventListener('error', error => { clearTimeout(timer); reject(error); }, { once: true });
    });
    const welcomePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for realtime WELCOME')), 1500);
      client.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.type === 'WELCOME') {
          clearTimeout(timer);
          resolve(message);
        }
      });
    });
    client.send(JSON.stringify({ version: 1, type: 'AUTH', ticket }));
    const welcome = await welcomePromise;
    assert.equal(welcome.playerId, 'character-1');
    assert.equal(welcome.characterId, 'character-1');
  } finally {
    realtimeServer.destroyConnections();
    await new Promise(resolve => httpServer.close(resolve));
  }
});
