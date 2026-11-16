import test from 'node:test';
import assert from 'node:assert/strict';
import { createNodeWebSocketPrototypeServer } from '../server/realtime/NodeWebSocketPrototypeServer.js';

async function withRealtimeServer(run, options = {}) {
  const realtime = createNodeWebSocketPrototypeServer(options);
  await new Promise(resolve => realtime.server.listen(0, '127.0.0.1', resolve));
  const address = realtime.address;
  const url = `ws://127.0.0.1:${address.port}/realtime/v1`;
  const clients = [];
  try {
    await run({
      url,
      issueTicket: realtime.issueTicket,
      connect(ticket) {
        const client = new WebSocket(url);
        clients.push(client);
        const messages = [];
        const waiters = [];
        const opened = new Promise((resolve, reject) => {
          if (client.readyState === WebSocket.OPEN) resolve();
          else {
            client.addEventListener('open', resolve, { once: true });
            client.addEventListener('error', reject, { once: true });
          }
        });
        let closeInfo = null;
        client.addEventListener('close', event => { closeInfo = { code: event.code, reason: event.reason }; });
        client.addEventListener('message', event => {
          const message = JSON.parse(event.data);
          messages.push(message);
          const index = waiters.findIndex(waiter => waiter.predicate(message));
          if (index >= 0) {
            const [waiter] = waiters.splice(index, 1);
            waiter.resolve(message);
          }
        });
        return {
          client,
          messages,
          async waitOpen() {
            await opened;
            assert.equal(client.readyState, WebSocket.OPEN, `WebSocket closed before authentication: ${JSON.stringify(closeInfo)}`);
          },
          async authenticate() {
            await this.waitOpen();
            client.send(JSON.stringify({ version: 1, type: 'AUTH', ticket }));
            return this.waitFor(message => message.type === 'WELCOME');
          },
          waitClose(timeoutMs = 1500) {
            if (client.readyState === WebSocket.CLOSED) return Promise.resolve(closeInfo);
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error('Timed out waiting for WebSocket close')), timeoutMs);
              client.addEventListener('close', event => {
                clearTimeout(timer);
                resolve({ code: event.code, reason: event.reason });
              }, { once: true });
            });
          },
          waitFor(predicate, timeoutMs = 1500) {
            const existing = messages.find(predicate);
            if (existing) return Promise.resolve(existing);
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                const index = waiters.findIndex(waiter => waiter.resolve === resolve);
                if (index >= 0) waiters.splice(index, 1);
                reject(new Error('Timed out waiting for realtime message'));
              }, timeoutMs);
              waiters.push({
                predicate,
                resolve: value => { clearTimeout(timer); resolve(value); },
              });
            });
          },
          send(message) { client.send(JSON.stringify(message)); },
        };
      },
    });
  } finally {
    for (const client of clients) if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) client.close();
    await new Promise(resolve => setTimeout(resolve, 20));
    await realtime.close();
  }
}

function ticket(issueTicket, playerId, accountId = playerId) {
  return issueTicket({
    accountId,
    characterId: `character-${playerId}`,
    sessionId: 'two-client-test',
    playerId,
  });
}

test('WebSocket upgrade handler can share the authenticated HTTP API server port', async () => {
  const { createServer } = await import('node:http');
  const httpServer = createServer((_request, response) => {
    response.writeHead(404);
    response.end();
  });
  const realtime = createNodeWebSocketPrototypeServer();
  realtime.attachTo(httpServer);
  await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve));
  const url = `ws://127.0.0.1:${httpServer.address().port}/realtime/v1`;
  const client = new WebSocket(url);
  try {
    await new Promise((resolve, reject) => {
      client.addEventListener('open', resolve, { once: true });
      client.addEventListener('error', reject, { once: true });
    });
    const welcomed = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for WELCOME')), 1500);
      client.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.type === 'WELCOME') {
          clearTimeout(timer);
          resolve(message);
        }
      });
    });
    client.send(JSON.stringify({
      version: 1,
      type: 'AUTH',
      ticket: realtime.issueTicket({
        accountId: 'account-shared',
        characterId: 'character-shared',
        sessionId: 'shared-http-room',
        playerId: 'player-shared',
      }),
    }));
    const welcome = await welcomed;
    assert.equal(welcome.playerId, 'player-shared');
    assert.equal(welcome.characterId, 'character-shared');
  } finally {
    if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) client.close();
    await new Promise(resolve => httpServer.close(resolve));
  }
});

test('two authenticated clients receive the same server-authoritative movement snapshot', async () => {
  await withRealtimeServer(async ({ connect, issueTicket }) => {
    const first = connect(ticket(issueTicket, 'player-a'));
    const second = connect(ticket(issueTicket, 'player-b'));
    await Promise.all([first.authenticate(), second.authenticate()]);

    first.send({ version: 1, type: 'INPUT', sequence: 1, payload: { x: 1, z: 0 } });
    const [firstSnapshot, secondSnapshot] = await Promise.all([
      first.waitFor(message => message.type === 'SNAPSHOT' && message.serverTick === 1),
      second.waitFor(message => message.type === 'SNAPSHOT' && message.serverTick === 1),
    ]);

    assert.deepEqual(firstSnapshot, secondSnapshot);
    assert.deepEqual(firstSnapshot.players.find(player => player.playerId === 'player-a').position, { x: 0.2, z: 0 });
    assert.deepEqual(firstSnapshot.players.find(player => player.playerId === 'player-b').position, { x: 0, z: 0 });
  });
});

test('client-supplied positions and damage are rejected without changing authoritative state', async () => {
  await withRealtimeServer(async ({ connect, issueTicket }) => {
    const client = connect(ticket(issueTicket, 'player-a'));
    await client.authenticate();

    client.send({ version: 1, type: 'INPUT', sequence: 1, payload: { x: 1, z: 0, position: { x: 9999, z: 9999 }, damage: 999999 } });
    const rejected = await client.waitFor(message => message.type === 'REJECT' && message.sequence === 1);
    assert.equal(rejected.code, 'INVALID_INPUT');

    client.send({ version: 1, type: 'ACTION', sequence: 2, payload: { damage: 999999, targetId: 'boss' } });
    const actionRejected = await client.waitFor(message => message.type === 'REJECT' && message.sequence === 2);
    assert.equal(actionRejected.code, 'UNSUPPORTED_MESSAGE');

    const snapshot = client.messages.find(message => message.type === 'SNAPSHOT');
    assert.deepEqual(snapshot.players[0].position, { x: 0, z: 0 });
    assert.equal(snapshot.serverTick, 0);
  });
});

test('tickets are one-use and required before any gameplay input', async () => {
  await withRealtimeServer(async ({ connect, issueTicket }) => {
    const value = ticket(issueTicket, 'player-a');
    const first = connect(value);
    await first.authenticate();
    const replay = connect(value);
    await replay.waitOpen();
    replay.client.send(JSON.stringify({ version: 1, type: 'AUTH', ticket: value }));
    const rejected = await replay.waitFor(message => message.type === 'REJECT');
    assert.equal(rejected.code, 'INVALID_OR_EXPIRED_TICKET');
  });
});

test('duplicate and out-of-order input sequences cannot change player state', async () => {
  await withRealtimeServer(async ({ connect, issueTicket }) => {
    const client = connect(ticket(issueTicket, 'player-a'));
    await client.authenticate();
    client.send({ version: 1, type: 'INPUT', sequence: 1, payload: { x: 1, z: 0 } });
    await client.waitFor(message => message.type === 'SNAPSHOT' && message.serverTick === 1);
    client.send({ version: 1, type: 'INPUT', sequence: 1, payload: { x: -1, z: 0 } });
    const rejected = await client.waitFor(message => message.type === 'REJECT' && message.code === 'INVALID_SEQUENCE');
    assert.equal(rejected.sequence, 1);
    const latest = [...client.messages].reverse().find(message => message.type === 'SNAPSHOT');
    assert.deepEqual(latest.players[0].position, { x: 0.2, z: 0 });
    assert.equal(latest.serverTick, 1);
  });
});

test('diagonal movement is normalized to the same maximum speed', async () => {
  await withRealtimeServer(async ({ connect, issueTicket }) => {
    const client = connect(ticket(issueTicket, 'player-diagonal'));
    await client.authenticate();
    client.send({ version: 1, type: 'INPUT', sequence: 1, payload: { x: 1, z: 1 } });
    const snapshot = await client.waitFor(message => message.type === 'SNAPSHOT' && message.serverTick === 1);
    const position = snapshot.players[0].position;
    assert.ok(Math.abs(position.x - position.z) < 1e-10);
    assert.ok(Math.abs(Math.hypot(position.x, position.z) - 0.2) < 1e-10);
  });
});

test('server limits movement input to 20 messages per second', async () => {
  await withRealtimeServer(async ({ connect, issueTicket }) => {
    const client = connect(ticket(issueTicket, 'player-rate'));
    await client.authenticate();
    for (let sequence = 1; sequence <= 21; sequence += 1) {
      client.send({ version: 1, type: 'INPUT', sequence, payload: { x: 1, z: 0 } });
    }
    const rejected = await client.waitFor(message => message.type === 'REJECT' && message.code === 'INPUT_RATE_LIMITED');
    assert.equal(rejected.sequence, 21);
    const latest = [...client.messages].reverse().find(message => message.type === 'SNAPSHOT');
    assert.equal(latest.serverTick, 20);
    assert.deepEqual(latest.players[0].position, { x: 0.2, z: 0 });
  }, { now: () => 1000 });
});

test('reconnection restores the last authoritative position and sequence', async () => {
  await withRealtimeServer(async ({ connect, issueTicket }) => {
    const firstTicket = ticket(issueTicket, 'player-reconnect');
    const first = connect(firstTicket);
    await first.authenticate();
    first.send({ version: 1, type: 'INPUT', sequence: 1, payload: { x: 1, z: 0 } });
    await first.waitFor(message => message.type === 'SNAPSHOT' && message.serverTick === 1);
    first.client.close();
    await first.waitClose();

    const reconnectTicket = ticket(issueTicket, 'player-reconnect');
    const reconnected = connect(reconnectTicket);
    await reconnected.authenticate();
    const restored = reconnected.messages.find(message => message.type === 'SNAPSHOT');
    const player = restored.players.find(item => item.playerId === 'player-reconnect');
    assert.deepEqual(player.position, { x: 0.2, z: 0 });
    assert.equal(player.lastSequence, 1);

    reconnected.send({ version: 1, type: 'INPUT', sequence: 1, payload: { x: -1, z: 0 } });
    const stale = await reconnected.waitFor(message => message.type === 'REJECT' && message.code === 'INVALID_SEQUENCE');
    assert.equal(stale.sequence, 1);
    reconnected.send({ version: 1, type: 'INPUT', sequence: 2, payload: { x: 0, z: 1 } });
    const updated = await reconnected.waitFor(message => message.type === 'SNAPSHOT' && message.serverTick === 2);
    const current = updated.players.find(item => item.playerId === 'player-reconnect');
    assert.deepEqual(current.position, { x: 0.2, z: 0 });
  }, { now: () => 1000 });
});

test('reconnect tickets cannot switch character identity inside an existing player slot', async () => {
  await withRealtimeServer(async ({ connect, issueTicket }) => {
    const first = connect(issueTicket({
      accountId: 'account-a', characterId: 'character-a', sessionId: 'shared-room', playerId: 'player-a',
    }));
    await first.authenticate();

    const conflictTicket = issueTicket({
      accountId: 'account-a', characterId: 'character-b', sessionId: 'shared-room', playerId: 'player-a',
    });
    const conflicting = connect(conflictTicket);
    await conflicting.waitOpen();
    conflicting.client.send(JSON.stringify({ version: 1, type: 'AUTH', ticket: conflictTicket }));
    const rejected = await conflicting.waitFor(message => message.type === 'REJECT');
    assert.equal(rejected.code, 'PLAYER_IDENTITY_CONFLICT');
  });
});

test('pending ticket storage is bounded and expired tickets are pruned', () => {
  let currentTime = 1000;
  const realtime = createNodeWebSocketPrototypeServer({ now: () => currentTime });
  for (let index = 0; index < 5000; index += 1) {
    realtime.issueTicket({
      accountId: 'account-capacity',
      characterId: `character-${index}`,
      sessionId: 'capacity-room',
      playerId: `player-${index}`,
    });
  }
  assert.throws(
    () => realtime.issueTicket({
      accountId: 'account-capacity',
      characterId: 'character-overflow',
      sessionId: 'capacity-room',
      playerId: 'player-overflow',
    }),
    error => error.code === 'REALTIME_CAPACITY',
  );
  currentTime += 30_000;
  assert.doesNotThrow(() => realtime.issueTicket({
    accountId: 'account-capacity',
    characterId: 'character-after-expiry',
    sessionId: 'capacity-room',
    playerId: 'player-after-expiry',
  }));
});

test('expired one-use tickets are rejected', async () => {
  let currentTime = 1000;
  await withRealtimeServer(async ({ connect, issueTicket }) => {
    const value = ticket(issueTicket, 'player-a');
    currentTime += 30_001;
    const client = connect(value);
    await client.waitOpen();
    client.client.send(JSON.stringify({ version: 1, type: 'AUTH', ticket: value }));
    const rejected = await client.waitFor(message => message.type === 'REJECT');
    assert.equal(rejected.code, 'INVALID_OR_EXPIRED_TICKET');
  }, { now: () => currentTime });
});
