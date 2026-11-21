import test from 'node:test';
import assert from 'node:assert/strict';
import { createZonePersistenceService } from '../server/realtime/ZonePersistenceService.js';

function fakeRepository() {
  const calls = [];
  return {
    calls,
    acquireZoneLease: async input => { calls.push(['acquire', input]); return { ...input, fencingEpoch: '1' }; },
    renewZoneLease: async input => { calls.push(['renew', input]); return { ...input, fencingEpoch: input.fencingEpoch }; },
    appendZoneEvent: async input => { calls.push(['event', input]); return { sequence: '1', duplicate: false }; },
    saveZoneSnapshot: async input => { calls.push(['snapshot', input]); return { zoneId: input.zoneId, lastEventSequence: '1' }; },
    loadZoneRecoveryState: async input => { calls.push(['load', input]); return { snapshot: null, events: [], lastEventSequence: '0' }; },
  };
}

const lease = { zoneId: 'astrea-plains-01', ownerId: 'process-a', fencingEpoch: '1' };
const event = {
  ...lease,
  eventId: 'c8a9b6b2-78e6-4f3c-a0a4-4d5a9f70c111',
  eventType: 'RESOURCE_HARVESTED',
  payload: { resourceId: 'oak-001', amount: 1 },
};

test('zone persistence validates and forwards lease, event, snapshot and recovery operations', async () => {
  const repository = fakeRepository();
  const service = createZonePersistenceService(repository);
  const acquired = await service.acquireLease({ zoneId: lease.zoneId, ownerId: lease.ownerId });
  assert.equal(acquired.fencingEpoch, '1');
  await service.renewLease(lease);
  assert.deepEqual(await service.appendEvent(event), { sequence: '1', duplicate: false });
  await service.saveSnapshot({ ...lease, payload: { resources: { 'oak-001': 4 } } });
  assert.equal((await service.loadRecoveryState(lease)).lastEventSequence, '0');
  assert.deepEqual(repository.calls.map(call => call[0]), ['acquire', 'renew', 'event', 'snapshot', 'load']);
});

test('zone persistence rejects invalid identifiers, fencing epochs and event types', async () => {
  const service = createZonePersistenceService(fakeRepository());
  assert.throws(() => service.acquireLease({ zoneId: '../zone', ownerId: 'process-a' }), error => error.code === 'INVALID_ZONE_INPUT');
  assert.throws(() => service.renewLease({ ...lease, fencingEpoch: '1; DROP TABLE' }), error => error.code === 'INVALID_ZONE_INPUT');
  assert.throws(() => service.appendEvent({ ...event, eventType: 'resource harvested' }), error => error.code === 'INVALID_ZONE_INPUT');
  assert.throws(() => service.appendEvent({ ...event, eventId: 'not-a-uuid' }), error => error.code === 'INVALID_ZONE_INPUT');
});

test('zone persistence accepts only bounded JSON object payloads', async () => {
  const service = createZonePersistenceService(fakeRepository());
  assert.throws(() => service.appendEvent({ ...event, payload: [] }), error => error.code === 'INVALID_ZONE_INPUT');
  assert.throws(() => service.appendEvent({ ...event, payload: { text: 'x'.repeat(270 * 1024) } }), error => error.code === 'INVALID_ZONE_INPUT');
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => service.saveSnapshot({ ...lease, payload: cyclic }), error => error.code === 'INVALID_ZONE_INPUT');
  assert.throws(() => service.saveSnapshot({ ...lease, payload: new Date() }), error => error.code === 'INVALID_ZONE_INPUT');
});
