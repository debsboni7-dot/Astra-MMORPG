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
            if (client.readyState === WebSocket.OPEN) return;
            await new Promise((resolve, reject) => {
              client.addEventListener('open', resolve, { once: true });
              client.addEventListener('error', reject, { once: true });
            });
          },
          async authenticate() {
            await this.waitOpen();
            client.send(JSON.stringify({ version: 1, type: 'AUTH', ticket }));
            return this.waitFor(message => message.type === 'WELCOME');
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
    assert.equal(rejected.code, 'UNAUTHENTICATED');
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
