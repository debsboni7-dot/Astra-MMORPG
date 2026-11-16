import { performance } from 'node:perf_hooks';
import { createNodeWebSocketPrototypeServer } from '../server/realtime/NodeWebSocketPrototypeServer.js';

const [samplesArg = '100', delayArg = '25', jitterArg = '10', dropArg = '10'] = process.argv.slice(2);
const samples = Number(samplesArg);
const oneWayDelayMs = Number(delayArg);
const jitterMs = Number(jitterArg);
const dropEvery = Number(dropArg);
if (!Number.isInteger(samples) || samples < 10 || samples > 500
  || !Number.isFinite(oneWayDelayMs) || oneWayDelayMs < 0 || oneWayDelayMs > 500
  || !Number.isFinite(jitterMs) || jitterMs < 0 || jitterMs > 250
  || !Number.isInteger(dropEvery) || dropEvery < 0 || dropEvery > 100) {
  throw new Error('Usage: node scripts/benchmark-realtime-network-conditions.js [samples 10..500] [one-way-delay-ms 0..500] [jitter-ms 0..250] [drop-every-nth-snapshot 0..100; 0 disables]');
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}
function createClient(url, { inbound = null } = {}) {
  const socket = new WebSocket(url);
  const messages = [];
  const waiters = [];
  let snapshotCount = 0;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const deliver = async () => {
      if (message.type === 'SNAPSHOT' && inbound) {
        snapshotCount += 1;
        const { jitterMs: jitter, delayMs, dropEvery: drop } = inbound;
        if (drop > 0 && snapshotCount > 1 && (snapshotCount - 1) % drop === 0) return;
        const phase = (snapshotCount - 1) % 3 - 1;
        await sleep(Math.max(0, delayMs + phase * jitter));
      }
      messages.push(message);
      for (let i = waiters.length - 1; i >= 0; i -= 1) {
        if (waiters[i].predicate(message)) {
          const [waiter] = waiters.splice(i, 1);
          waiter.resolve(message);
        }
      }
    };
    void deliver();
  });
  return {
    socket,
    open() {
      if (socket.readyState === WebSocket.OPEN) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('WebSocket open timeout')), 3000);
        socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
        socket.addEventListener('error', error => { clearTimeout(timer); reject(error); }, { once: true });
      });
    },
    send(value) { socket.send(JSON.stringify(value)); },
    waitFor(predicate, timeoutMs = 5000) {
      const existing = messages.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve: value => { clearTimeout(timer); resolve(value); } };
        const timer = setTimeout(() => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) waiters.splice(index, 1);
          reject(new Error('Timed out waiting for network-condition benchmark message'));
        }, timeoutMs);
        waiters.push(waiter);
      });
    },
  };
}
const realtime = createNodeWebSocketPrototypeServer();
let first;
let second;
try {
  await new Promise(resolve => realtime.server.listen(0, '127.0.0.1', resolve));
  const url = `ws://127.0.0.1:${realtime.address.port}/realtime/v1`;
  first = createClient(url);
  second = createClient(url, { inbound: { delayMs: oneWayDelayMs, jitterMs, dropEvery } });
  await Promise.all([first.open(), second.open()]);
  first.send({ version: 1, type: 'AUTH', ticket: realtime.issueTicket({ accountId: 'condition-a', characterId: 'condition-ca', sessionId: 'condition-room', playerId: 'condition-player-a' }) });
  second.send({ version: 1, type: 'AUTH', ticket: realtime.issueTicket({ accountId: 'condition-b', characterId: 'condition-cb', sessionId: 'condition-room', playerId: 'condition-player-b' }) });
  await Promise.all([
    first.waitFor(message => message.type === 'WELCOME'),
    second.waitFor(message => message.type === 'WELCOME'),
    second.waitFor(message => message.type === 'SNAPSHOT' && message.serverTick === 0),
  ]);

  const delays = [];
  const start = performance.now();
  let delivered = 0;
  let dropped = 0;
  for (let sequence = 1; sequence <= samples; sequence += 1) {
    const willDrop = dropEvery > 0 && sequence % dropEvery === 0;
    const expected = willDrop ? null : second.waitFor(message => message.type === 'SNAPSHOT' && message.serverTick === sequence);
    const phase = (sequence - 1) % 3 - 1;
    const uplinkDelay = Math.max(0, oneWayDelayMs + phase * jitterMs);
    await sleep(uplinkDelay);
    const sentAt = performance.now();
    first.send({ version: 1, type: 'INPUT', sequence, payload: { x: 1, z: 0 } });
    if (willDrop) {
      dropped += 1;
      continue;
    }
    const snapshot = await expected;
    const observedAt = performance.now();
    delays.push(observedAt - sentAt);
    delivered += 1;
    if (snapshot.serverTick !== sequence) throw new Error('Unexpected server tick in delivered snapshot');
  }
  const elapsedMs = performance.now() - start;
  const sorted = [...delays].sort((a, b) => a - b);
  process.stdout.write(`${JSON.stringify({
    benchmark: 'ASTREA WebSocket controlled application-layer impairment',
    note: 'Deterministic application-layer delay/jitter and snapshot suppression. This is NOT IP packet loss, WAN emulation, Android or Unity testing.',
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    configuration: { samples, simulatedOneWayDelayMs: oneWayDelayMs, simulatedJitterMs: jitterMs, dropEveryNthSnapshot: dropEvery },
    results: {
      sentInputs: samples,
      deliveredSnapshots: delivered,
      suppressedSnapshots: dropped,
      suppressionRatePercent: Number((dropped / samples * 100).toFixed(2)),
      observedDelayMs: delays.length ? {
        min: Number(Math.min(...delays).toFixed(2)),
        mean: Number((delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(2)),
        p50: Number(percentile(sorted, 0.5).toFixed(2)),
        p95: Number(percentile(sorted, 0.95).toFixed(2)),
        p99: Number(percentile(sorted, 0.99).toFixed(2)),
        max: Number(Math.max(...delays).toFixed(2)),
      } : null,
      elapsedMs: Number(elapsedMs.toFixed(2)),
      observedUpdatesPerSecond: Number((delivered / (elapsedMs / 1000)).toFixed(2)),
    },
  }, null, 2)}\\n`);
} finally {
  realtime.destroyConnections();
  await realtime.close();
}
