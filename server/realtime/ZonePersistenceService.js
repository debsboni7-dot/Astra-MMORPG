const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PAYLOAD_BYTES = 256 * 1024;

function requireId(value, field) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw Object.assign(new TypeError(`Invalid ${field}`), { code: 'INVALID_ZONE_INPUT' });
  }
  return value;
}

function requireLeaseMs(value) {
  if (!Number.isInteger(value) || value < 5_000 || value > 120_000) {
    throw Object.assign(new TypeError('leaseMs must be between 5000 and 120000'), { code: 'INVALID_ZONE_INPUT' });
  }
  return value;
}

function requireSchemaVersion(value) {
  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    throw Object.assign(new TypeError('Invalid schemaVersion'), { code: 'INVALID_ZONE_INPUT' });
  }
  return value;
}

function requirePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Object.assign(new TypeError('Zone payload must be a JSON object'), { code: 'INVALID_ZONE_INPUT' });
  }
  let encoded;
  try { encoded = JSON.stringify(value); }
  catch { throw Object.assign(new TypeError('Zone payload must be JSON serializable'), { code: 'INVALID_ZONE_INPUT' }); }
  if (Buffer.byteLength(encoded) > MAX_PAYLOAD_BYTES) {
    throw Object.assign(new TypeError('Zone payload exceeds 256 KiB'), { code: 'INVALID_ZONE_INPUT' });
  }
  return JSON.parse(encoded);
}

export function createZonePersistenceService(repository) {
  if (!repository
    || typeof repository.acquireZoneLease !== 'function'
    || typeof repository.renewZoneLease !== 'function'
    || typeof repository.appendZoneEvent !== 'function'
    || typeof repository.saveZoneSnapshot !== 'function'
    || typeof repository.loadZoneRecoveryState !== 'function') {
    throw new TypeError('A zone persistence repository is required');
  }

  return {
    acquireLease({ zoneId, ownerId, leaseMs = 30_000 }) {
      return repository.acquireZoneLease({
        zoneId: requireId(zoneId, 'zoneId'),
        ownerId: requireId(ownerId, 'ownerId'),
        leaseMs: requireLeaseMs(leaseMs),
      });
    },
    renewLease({ zoneId, ownerId, fencingEpoch, leaseMs = 30_000 }) {
      if (!/^\d{1,20}$/.test(String(fencingEpoch))) {
        throw Object.assign(new TypeError('Invalid fencingEpoch'), { code: 'INVALID_ZONE_INPUT' });
      }
      return repository.renewZoneLease({
        zoneId: requireId(zoneId, 'zoneId'),
        ownerId: requireId(ownerId, 'ownerId'),
        fencingEpoch: String(fencingEpoch),
        leaseMs: requireLeaseMs(leaseMs),
      });
    },
    appendEvent({ zoneId, ownerId, fencingEpoch, eventId, eventType, schemaVersion = 1, payload }) {
      if (!UUID_PATTERN.test(eventId || '')) {
        throw Object.assign(new TypeError('eventId must be a UUID'), { code: 'INVALID_ZONE_INPUT' });
      }
      if (typeof eventType !== 'string' || !/^[A-Z][A-Z0-9_]{1,63}$/.test(eventType)) {
        throw Object.assign(new TypeError('Invalid eventType'), { code: 'INVALID_ZONE_INPUT' });
      }
      if (!/^\d{1,20}$/.test(String(fencingEpoch))) {
        throw Object.assign(new TypeError('Invalid fencingEpoch'), { code: 'INVALID_ZONE_INPUT' });
      }
      return repository.appendZoneEvent({
        zoneId: requireId(zoneId, 'zoneId'),
        ownerId: requireId(ownerId, 'ownerId'),
        fencingEpoch: String(fencingEpoch),
        eventId,
        eventType,
        schemaVersion: requireSchemaVersion(schemaVersion),
        payload: requirePayload(payload),
      });
    },
    saveSnapshot({ zoneId, ownerId, fencingEpoch, schemaVersion = 1, payload }) {
      if (!/^\d{1,20}$/.test(String(fencingEpoch))) {
        throw Object.assign(new TypeError('Invalid fencingEpoch'), { code: 'INVALID_ZONE_INPUT' });
      }
      return repository.saveZoneSnapshot({
        zoneId: requireId(zoneId, 'zoneId'),
        ownerId: requireId(ownerId, 'ownerId'),
        fencingEpoch: String(fencingEpoch),
        schemaVersion: requireSchemaVersion(schemaVersion),
        payload: requirePayload(payload),
      });
    },
    loadRecoveryState({ zoneId, ownerId, fencingEpoch }) {
      if (!/^\\d{1,20}$/.test(String(fencingEpoch))) {
        throw Object.assign(new TypeError('Invalid fencingEpoch'), { code: 'INVALID_ZONE_INPUT' });
      }
      return repository.loadZoneRecoveryState({
        zoneId: requireId(zoneId, 'zoneId'),
        ownerId: requireId(ownerId, 'ownerId'),
        fencingEpoch: String(fencingEpoch),
      });
    },
  };
}
