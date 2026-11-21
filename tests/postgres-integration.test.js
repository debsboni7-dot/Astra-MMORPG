import { createHash, randomBytes } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPostgresRepository } from '../server/db/PostgresRepository.js';
import { createAuthService } from '../server/auth/AuthService.js';
import { createCharacterService } from '../server/characters/CharacterService.js';
import { createWeaponProgressionService } from '../server/progression/WeaponProgressionService.js';
import { createMagicProgressionService } from '../server/progression/MagicProgressionService.js';
import { createMagicCombatService } from '../server/combat/MagicCombatService.js';
import { createZonePersistenceService } from '../server/realtime/ZonePersistenceService.js';
import { createAstreaHttpServer } from '../server/http/createAstreaHttpServer.js';

const databaseUrl = process.env.DATABASE_URL;

test('real PostgreSQL migrations, account ownership and character persistence', { skip: !databaseUrl }, async () => {
  const { Pool } = await import('pg');
  let pool = new Pool({ connectionString: databaseUrl });
  let email;
  try {
    for (const file of [
      '000_accounts_and_sessions.sql',
      '001_character_weapon_progression.sql',
      '002_character_magic_progression.sql',
      '003_character_magic_combat_state.sql',
      '004_realtime_join_tickets.sql',
      '005_realtime_join_ticket_cleanup.sql',
      '006_world_zone_persistence.sql',
    ]) {
      await pool.query(await readFile(new URL(`../server/migrations/${file}`, import.meta.url), 'utf8'));
    }

    const repository = createPostgresRepository(pool);
    const auth = createAuthService(repository);
    const characters = createCharacterService(repository);
    email = `integration-${crypto.randomUUID()}@astrea.test`;
    const account = await auth.register({ email, password: 'integration-password-123' });
    const session = await auth.login({ email, password: 'integration-password-123' });
    assert.equal((await auth.authenticate(session.token)).id, String(account.id));

    const character = await characters.create(account.id, 'IntegrationHero', 'elf');
    assert.equal(character.race, 'elf');
    assert.equal((await characters.list(account.id)).length, 1);
    assert.equal((await characters.list('999999999')).length, 0);
    assert.equal((await characters.get(account.id, character.id)).id, character.id);
    assert.equal(await characters.get('999999999', character.id), null);

    const joinTicketHash = createHash('sha256').update(randomBytes(32)).digest('hex');
    const joinTicketExpiry = new Date(Date.now() + 30_000);
    await repository.createRealtimeJoinTicket({
      tokenHash: joinTicketHash,
      accountId: String(account.id),
      characterId: character.id,
      serverId: 'astrea-integration-zone',
      expiresAt: joinTicketExpiry,
    });
    const concurrentConsumptions = await Promise.all([
      repository.consumeRealtimeJoinTicket(joinTicketHash, 'astrea-integration-zone'),
      repository.consumeRealtimeJoinTicket(joinTicketHash, 'astrea-integration-zone'),
    ]);
    const successfulConsumptions = concurrentConsumptions.filter(Boolean);
    assert.equal(successfulConsumptions.length, 1, 'exactly one concurrent consumer must win');
    assert.deepEqual(successfulConsumptions[0], {
      accountId: String(account.id),
      characterId: character.id,
      serverId: 'astrea-integration-zone',
    });
    assert.equal(await repository.consumeRealtimeJoinTicket(joinTicketHash, 'astrea-integration-zone'), null);
    assert.equal(await repository.consumeRealtimeJoinTicket(joinTicketHash, 'another-zone'), null);

    const expiredTicketHash = createHash('sha256').update(randomBytes(32)).digest('hex');
    await repository.createRealtimeJoinTicket({
      tokenHash: expiredTicketHash,
      accountId: String(account.id),
      characterId: character.id,
      serverId: 'astrea-integration-zone',
      expiresAt: new Date(Date.now() - 1_000),
    });
    assert.equal(await repository.consumeRealtimeJoinTicket(expiredTicketHash, 'astrea-integration-zone'), null);

    const staleExpiredHash = createHash('sha256').update(randomBytes(32)).digest('hex');
    await repository.createRealtimeJoinTicket({
      tokenHash: staleExpiredHash,
      accountId: String(account.id),
      characterId: character.id,
      serverId: 'astrea-integration-zone',
      expiresAt: new Date(Date.now() - 6 * 60_000),
    });
    const staleConsumedHash = createHash('sha256').update(randomBytes(32)).digest('hex');
    await repository.createRealtimeJoinTicket({
      tokenHash: staleConsumedHash,
      accountId: String(account.id),
      characterId: character.id,
      serverId: 'astrea-integration-zone',
      expiresAt: new Date(Date.now() + 30_000),
    });
    await pool.query(
      'UPDATE realtime_join_tickets SET consumed_at=NOW() - INTERVAL \'6 minutes\' WHERE token_hash=$1',
      [staleConsumedHash],
    );
    assert.equal(await repository.cleanupRealtimeJoinTickets(), 2);
    const retainedStaleTickets = await pool.query(
      'SELECT token_hash FROM realtime_join_tickets WHERE token_hash = ANY($1::text[])',
      [[staleExpiredHash, staleConsumedHash]],
    );
    assert.equal(retainedStaleTickets.rowCount, 0);

    // Simulate a zone process crash, recovery from snapshot + event tail,
    // and fencing of the former process after a replacement acquires the lease.
    const zonePersistence = createZonePersistenceService(repository);
    const zoneId = `zone-recovery-${crypto.randomUUID()}`;
    const firstLease = await zonePersistence.acquireLease({
      zoneId, ownerId: 'zone-process-a', leaseMs: 5_000,
    });
    assert.ok(firstLease);
    assert.equal(firstLease.fencingEpoch, '1');

    const event1 = 'c8a9b6b2-78e6-4f3c-a0a4-4d5a9f70c111';
    const event2 = 'c8a9b6b2-78e6-4f3c-a0a4-4d5a9f70c112';
    const event3 = 'c8a9b6b2-78e6-4f3c-a0a4-4d5a9f70c113';
    assert.deepEqual(await zonePersistence.appendEvent({
      zoneId, ownerId: 'zone-process-a', fencingEpoch: firstLease.fencingEpoch,
      eventId: event1, eventType: 'RESOURCE_CREATED', payload: { resourceId: 'oak-001', amount: 3 },
    }), { sequence: '1', duplicate: false });
    await zonePersistence.saveSnapshot({
      zoneId, ownerId: 'zone-process-a', fencingEpoch: firstLease.fencingEpoch,
      payload: { resources: { 'oak-001': 3 } },
    });
    assert.deepEqual(await zonePersistence.appendEvent({
      zoneId, ownerId: 'zone-process-a', fencingEpoch: firstLease.fencingEpoch,
      eventId: event2, eventType: 'RESOURCE_HARVESTED', payload: { resourceId: 'oak-001', delta: -1 },
    }), { sequence: '2', duplicate: false });
    assert.deepEqual(await zonePersistence.appendEvent({
      zoneId, ownerId: 'zone-process-a', fencingEpoch: firstLease.fencingEpoch,
      eventId: event2, eventType: 'RESOURCE_HARVESTED', payload: { resourceId: 'oak-001', delta: -1 },
    }), { sequence: '2', duplicate: true });
    await assert.rejects(zonePersistence.appendEvent({
      zoneId, ownerId: 'zone-process-a', fencingEpoch: firstLease.fencingEpoch,
      eventId: event2, eventType: 'RESOURCE_HARVESTED', payload: { resourceId: 'oak-001', delta: -2 },
    }), error => error.code === 'IDEMPOTENCY_CONFLICT');

    const recoveredAfterCrash = await zonePersistence.loadRecoveryState({ zoneId, ownerId: 'zone-process-a', fencingEpoch: firstLease.fencingEpoch });
    assert.equal(recoveredAfterCrash.snapshot.lastEventSequence, '1');
    assert.deepEqual(recoveredAfterCrash.events.map(item => item.sequence), ['2']);
    const restoredCount = recoveredAfterCrash.events.reduce(
      (count, item) => count + Number(item.payload.delta || 0),
      recoveredAfterCrash.snapshot.payload.resources['oak-001'],
    );
    assert.equal(restoredCount, 2);

    await pool.query(
      'UPDATE world_zone_leases SET lease_expires_at=NOW() - INTERVAL \'1 second\' WHERE zone_id=$1',
      [zoneId],
    );
    const secondLease = await zonePersistence.acquireLease({
      zoneId, ownerId: 'zone-process-b', leaseMs: 30_000,
    });
    assert.ok(secondLease);
    assert.equal(secondLease.fencingEpoch, '2');
    await assert.rejects(
      zonePersistence.loadRecoveryState({ zoneId, ownerId: 'zone-process-a', fencingEpoch: firstLease.fencingEpoch }),
      error => error.code === 'ZONE_LEASE_LOST',
    );
    await assert.rejects(zonePersistence.appendEvent({
      zoneId, ownerId: 'zone-process-a', fencingEpoch: firstLease.fencingEpoch,
      eventId: event3, eventType: 'RESOURCE_HARVESTED', payload: { resourceId: 'oak-001', delta: -1 },
    }), error => error.code === 'ZONE_LEASE_LOST');

    await zonePersistence.appendEvent({
      zoneId, ownerId: 'zone-process-b', fencingEpoch: secondLease.fencingEpoch,
      eventId: event3, eventType: 'RESOURCE_HARVESTED', payload: { resourceId: 'oak-001', delta: -1 },
    });
    const recoveredByReplacement = await zonePersistence.loadRecoveryState({ zoneId, ownerId: 'zone-process-b', fencingEpoch: secondLease.fencingEpoch });
    const finalCount = recoveredByReplacement.events.reduce(
      (count, item) => count + Number(item.payload.delta || 0),
      recoveredByReplacement.snapshot.payload.resources['oak-001'],
    );
    assert.equal(finalCount, 1);
    assert.deepEqual(recoveredByReplacement.events.map(item => item.sequence), ['2', '3']);
    await zonePersistence.saveSnapshot({
      zoneId, ownerId: 'zone-process-b', fencingEpoch: secondLease.fencingEpoch,
      payload: { resources: { 'oak-001': finalCount } },
    });
    const checkpointed = await zonePersistence.loadRecoveryState({ zoneId, ownerId: 'zone-process-b', fencingEpoch: secondLease.fencingEpoch });
    assert.equal(checkpointed.snapshot.lastEventSequence, '3');
    assert.equal(checkpointed.events.length, 0);

    // Competing processes cannot both own a zone; concurrent events receive
    // a contiguous, monotone sequence while one valid fencing lease is held.
    const concurrentZoneId = `zone-concurrency-${crypto.randomUUID()}`;
    const competingLeases = await Promise.all([
      zonePersistence.acquireLease({ zoneId: concurrentZoneId, ownerId: 'competing-process-a' }),
      zonePersistence.acquireLease({ zoneId: concurrentZoneId, ownerId: 'competing-process-b' }),
    ]);
    assert.equal(competingLeases.filter(Boolean).length, 1, 'only one process may acquire an active zone lease');
    const winningLease = competingLeases.find(Boolean);
    const concurrentEvents = await Promise.all(Array.from({ length: 24 }, (_, index) =>
      zonePersistence.appendEvent({
        zoneId: concurrentZoneId,
        ownerId: winningLease.ownerId,
        fencingEpoch: winningLease.fencingEpoch,
        eventId: crypto.randomUUID(),
        eventType: 'RESOURCE_DELTA',
        payload: { resourceId: 'oak-001', delta: 1, requestIndex: index },
      }),
    ));
    assert.deepEqual(
      concurrentEvents.map(result => Number(result.sequence)).sort((a, b) => a - b),
      Array.from({ length: 24 }, (_, index) => index + 1),
      'concurrent durable events must have a gap-free sequence',
    );

    // Exercise the authenticated internal HTTP boundary against the same
    // real PostgreSQL repository, including stale fencing rejection.
    const apiZoneId = `zone-http-${crypto.randomUUID()}`;
    const apiServerSecret = `zone-http-secret-${crypto.randomUUID()}-extra`;
    const zoneHttpServer = createAstreaHttpServer({
      authService: auth,
      characterService: characters,
      progressionService: { async getSnapshot() { return {}; } },
      zonePersistenceService,
      realtimeServerSecret: apiServerSecret,
      realtimeServerId: apiZoneId,
    });
    await new Promise(resolve => zoneHttpServer.listen(0, '127.0.0.1', resolve));
    const zoneApiBase = `http://127.0.0.1:${zoneHttpServer.address().port}/v1/internal/zones/${encodeURIComponent(apiZoneId)}`;
    const zonePost = (path, body, key = apiServerSecret) => fetch(zoneApiBase + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(key ? { 'x-astrea-server-key': key } : {}) },
      body: JSON.stringify(body),
    });
    try {
      assert.equal((await zonePost('/lease/acquire', { ownerId: 'http-zone-a' }, null)).status, 401);
      const wrongZone = await fetch(zoneApiBase.replace(apiZoneId, 'different-zone') + '/lease/acquire', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-astrea-server-key': apiServerSecret },
        body: JSON.stringify({ ownerId: 'http-zone-a' }),
      });
      assert.equal(wrongZone.status, 403);

      const apiLeaseResponse = await zonePost('/lease/acquire', { ownerId: 'http-zone-a', leaseMs: 30000 });
      assert.equal(apiLeaseResponse.status, 201);
      const apiLease = (await apiLeaseResponse.json()).lease;
      const apiEventId = crypto.randomUUID();
      const apiEvent = {
        ownerId: 'http-zone-a', fencingEpoch: apiLease.fencingEpoch,
        eventId: apiEventId, eventType: 'RESOURCE_CREATED',
        payload: { resourceId: 'stone-001', amount: 2 },
      };
      assert.equal((await zonePost('/events', apiEvent)).status, 201);
      assert.equal((await zonePost('/snapshots', {
        ownerId: 'http-zone-a', fencingEpoch: apiLease.fencingEpoch,
        payload: { resources: { 'stone-001': 2 } },
      })).status, 201);
      const tailEvent = {
        ownerId: 'http-zone-a', fencingEpoch: apiLease.fencingEpoch,
        eventId: crypto.randomUUID(), eventType: 'RESOURCE_HARVESTED',
        payload: { resourceId: 'stone-001', delta: -1 },
      };
      assert.equal((await zonePost('/events', tailEvent)).status, 201);
      const apiRecoveryResponse = await zonePost('/recovery', {
        ownerId: 'http-zone-a', fencingEpoch: apiLease.fencingEpoch,
      });
      assert.equal(apiRecoveryResponse.status, 200);
      const apiRecovery = await apiRecoveryResponse.json();
      assert.equal(apiRecovery.snapshot.lastEventSequence, '1');
      assert.deepEqual(apiRecovery.events.map(item => item.sequence), ['2']);

      await pool.query(
        'UPDATE world_zone_leases SET lease_expires_at=clock_timestamp() - INTERVAL \'1 second\' WHERE zone_id=$1',
        [apiZoneId],
      );
      assert.equal((await zonePost('/lease/renew', {
        ownerId: 'http-zone-a', fencingEpoch: apiLease.fencingEpoch, leaseMs: 30000,
      })).status, 409);
      const replacementResponse = await zonePost('/lease/acquire', {
        ownerId: 'http-zone-b', leaseMs: 30000,
      });
      assert.equal(replacementResponse.status, 201);
      const replacementLease = (await replacementResponse.json()).lease;
      assert.equal(replacementLease.fencingEpoch, '2');
      const staleWrite = await zonePost('/events', {
        ownerId: 'http-zone-a', fencingEpoch: apiLease.fencingEpoch,
        eventId: crypto.randomUUID(), eventType: 'RESOURCE_HARVESTED',
        payload: { resourceId: 'stone-001', delta: -1 },
      });
      assert.equal(staleWrite.status, 409);
    } finally {
      await new Promise(resolve => zoneHttpServer.close(resolve));
    }

    const weaponProgression = createWeaponProgressionService(repository);
    const magicProgression = createMagicProgressionService(repository);
    const magicCombat = createMagicCombatService(repository);
    assert.equal((await weaponProgression.getSnapshot(account.id, character.id)).characterId, character.id);
    assert.ok((await magicProgression.getSnapshot(account.id, character.id)).snapshot);
    assert.equal((await magicCombat.getSnapshot(account.id, character.id)).combat.hp, 100);
    for (const operation of [
      () => weaponProgression.getSnapshot('999999999', character.id),
      () => magicProgression.getSnapshot('999999999', character.id),
      () => magicCombat.getSnapshot('999999999', character.id),
    ]) {
      await assert.rejects(operation(), error => error.code === 'CHARACTER_NOT_FOUND');
    }

    await repository.withCharacterTransaction(account.id, character.id, async (record, saveProgression, saveCombatState) => {
      assert.equal(record.characterData.race, 'elf');
      await saveProgression({ schemaVersion: 1, schools: { nature: { successfulCasts: 3 } } }, 'magic');
      await saveCombatState({ schemaVersion: 1, hp: 87, mana: 64 });
    });

    const saved = await repository.withCharacterTransaction(account.id, character.id, async record => ({
      race: record.characterData.race,
      progression: record.magicProgression,
      combat: record.magicCombatState,
    }));
    assert.equal(saved.race, 'elf');
    assert.equal(saved.progression.schools.nature.successfulCasts, 3);
    assert.equal(saved.combat.hp, 87);
    assert.equal(saved.combat.mana, 64);

    await assert.rejects(repository.withCharacterTransaction(account.id, character.id, async (_record, saveProgression) => {
      await saveProgression({ schemaVersion: 1, schools: { nature: { successfulCasts: 999 } } }, 'magic');
      throw new Error('force rollback');
    }), /force rollback/);

    const afterRollback = await repository.withCharacterTransaction(account.id, character.id, async record => record.magicProgression);
    assert.equal(afterRollback.schools.nature.successfulCasts, 3);

    await auth.logout(session.token);
    assert.equal(await auth.authenticate(session.token), null);

    // Recreate the database connection pool to prove committed data survives
    // a backend connection restart, not just reads through the original pool.
    await pool.end();
    pool = new Pool({ connectionString: databaseUrl });
    const reconnectedRepository = createPostgresRepository(pool);
    const afterReconnect = await reconnectedRepository.withCharacterTransaction(account.id, character.id, async record => ({
      race: record.characterData.race,
      progression: record.magicProgression,
      combat: record.magicCombatState,
    }));
    assert.equal(afterReconnect.race, 'elf');
    assert.equal(afterReconnect.progression.schools.nature.successfulCasts, 3);
    assert.equal(afterReconnect.combat.hp, 87);
    assert.equal(afterReconnect.combat.mana, 64);
  } finally {
    if (email) await pool.query('DELETE FROM accounts WHERE email=$1', [email]);
    await pool.end();
  }
});
