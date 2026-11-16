import { performance } from 'node:perf_hooks';
import { createNodeWebSocketPrototypeServer } from '../server/realtime/NodeWebSocketPrototypeServer.js';

const samples = Number(process.argv[2] ?? 20);
if (!Number.isInteger(samples) || samples < 1 || samples > 500) {
  throw new Error('Usage: node scripts/benchmark-realtime-websocket.js [samples: 1..500]');
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function createClient(url) {
  const socket = new WebSocket(url);
  const messages = [];
  const waiters = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    messages.push({ message, bytes: Buffer.byteLength(event.data) });
    for (let index = waiters.length - 1; index >= 0; index -= 1) {
      if (waiters[index].predicate(message)) {
        const [waiter] = waiters.splice(index, 1);
        waiter.resolve(messages.at(-1));
      }
    }
  });
  return {
    socket,
    async open() {
      if (socket.readyState === WebSocket.OPEN) return;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('WebSocket open timeout')), 3000);
        socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
        socket.addEventListener('error', error => { clearTimeout(timer); reject(error); }, { once: true });
      });
    },
    send(value) { socket.send(JSON.stringify(value)); },
    waitFor(predicate) {
      const existing = messages.find(item => predicate(item.message));
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const waiter = {
          predicate,
          resolve: value => { clearTimeout(timer); resolve(value); },
        };
        const timer = setTimeout(() => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) waiters.splice(index, 1);
          reject(new Error('Timed out waiting for benchmark message'));
        }, 3000);
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
  second = createClient(url);
  await Promise.all([first.open(), second.open()]);
  first.send({
    version: 1, type: 'AUTH',
    ticket: realtime.issueTicket({
      accountId: 'benchmark-account-a', characterId: 'benchmark-character-a',
      sessionId: 'benchmark-room', playerId: 'benchmark-player-a',
    }),
  });
  second.send({
    version: 1, type: 'AUTH',
    ticket: realtime.issueTicket({
      accountId: 'benchmark-account-b', characterId: 'benchmark-character-b',
      sessionId: 'benchmark-room', playerId: 'benchmark-player-b',
    }),
  });
  await Promise.all([
    first.waitFor(message => message.type === 'WELCOME'),
    second.waitFor(message => message.type === 'WELCOME'),
  ]);
  await second.waitFor(message => message.type === 'SNAPSHOT' && message.serverTick === 0);

  const cpuBefore = process.cpuUsage();
  const memoryBefore = process.memoryUsage().rss;
  const startedAt = performance.now();
  const latencies = [];
  const snapshotSizes = [];
  const inputPayload = { version: 1, type: 'INPUT', sequence: 0, payload: { x: 1, z: 0 } };
  const inputBytes = Buffer.byteLength(JSON.stringify(inputPayload));

  for (let index = 1; index <= samples; index += 1) {
    const expectedTick = index;
    const observed = second.waitFor(message => message.type === 'SNAPSHOT' && message.serverTick === expectedTick);
    const sentAt = performance.now();
    first.send({ ...inputPayload, sequence: index });
    const received = await observed;
    latencies.push(performance.now() - sentAt);
    snapshotSizes.push(received.bytes);
    if (index < samples) await new Promise(resolve => setTimeout(resolve, 55));
  }

  const elapsedMs = performance.now() - startedAt;
  const cpu = process.cpuUsage(cpuBefore);
  const cpuMs = (cpu.user + cpu.system) / 1000;
  const mean = latencies.reduce((sum, value) => sum + value, 0) / latencies.length;
  const result = {
    benchmark: 'ASTREA Node WebSocket two-client loopback',
    note: 'Local loopback microbenchmark only. Not a WAN, phone, Unity, production-capacity or protocol-selection result.',
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    samples,
    elapsedMs: Number(elapsedMs.toFixed(2)),
    observedUpdatesPerSecond: Number((samples / (elapsedMs / 1000)).toFixed(2)),
    clientToOtherClientSnapshotMs: {
      min: Number(Math.min(...latencies).toFixed(3)),
      mean: Number(mean.toFixed(3)),
      p50: Number(percentile(latencies, 0.50).toFixed(3)),
      p95: Number(percentile(latencies, 0.95).toFixed(3)),
      p99: Number(percentile(latencies, 0.99).toFixed(3)),
      max: Number(Math.max(...latencies).toFixed(3)),
    },
    messageBytes: {
      input: inputBytes,
      snapshotMean: Number((snapshotSizes.reduce((sum, value) => sum + value, 0) / snapshotSizes.length).toFixed(1)),
      snapshotMax: Math.max(...snapshotSizes),
    },
    process: {
      cpuMs: Number(cpuMs.toFixed(2)),
      rssBeforeBytes: memoryBefore,
      rssAfterBytes: process.memoryUsage().rss,
    },
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\\n`);
} finally {
  realtime.destroyConnections();
  await realtime.close();
}
