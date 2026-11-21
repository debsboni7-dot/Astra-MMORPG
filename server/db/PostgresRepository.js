export function createPostgresRepository(pool) {
  if (!pool || typeof pool.query !== 'function' || typeof pool.connect !== 'function') throw new TypeError('A PostgreSQL pool is required');
  return {
    async createAccount({ email, passwordHash, passwordSalt }) {
      const { rows } = await pool.query(
        'INSERT INTO accounts (email, password_hash, password_salt) VALUES ($1,$2,$3) RETURNING id,email',
        [email, passwordHash, passwordSalt],
      );
      return rows[0];
    },
    async findAccountByEmail(email) {
      const { rows } = await pool.query('SELECT id,email,password_hash AS "passwordHash",password_salt AS "passwordSalt" FROM accounts WHERE email=$1', [email]);
      return rows[0] || null;
    },
    async createCharacter(accountId, displayName, race = 'human') {
      const { rows } = await pool.query(
        `INSERT INTO characters (account_id,display_name,character_data) VALUES ($1,$2,$3::jsonb) RETURNING id,display_name AS "displayName",character_data AS "characterData",COALESCE(character_data->>'race','human') AS race,created_at AS "createdAt"`,
        [accountId, displayName, JSON.stringify({ race })],
      );
      return rows[0];
    },
    async findCharacterByAccount(accountId, characterId) {
      const { rows } = await pool.query(
        `SELECT id,display_name AS "displayName",COALESCE(character_data->>'race','human') AS race FROM characters WHERE account_id=$1 AND id=$2`,
        [accountId, characterId],
      );
      return rows[0] || null;
    },
    async listCharacters(accountId) {
      const { rows } = await pool.query(
        `SELECT id,display_name AS "displayName",COALESCE(character_data->>'race','human') AS race,created_at AS "createdAt" FROM characters WHERE account_id=$1 ORDER BY created_at,id`,
        [accountId],
      );
      return rows;
    },
    async createRealtimeJoinTicket({ tokenHash, accountId, characterId, serverId, expiresAt }) {
      await pool.query(
        'INSERT INTO realtime_join_tickets (token_hash,account_id,character_id,server_id,expires_at) VALUES ($1,$2,$3,$4,$5)',
        [tokenHash, accountId, characterId, serverId, expiresAt],
      );
    },
    async consumeRealtimeJoinTicket(tokenHash, serverId) {
      const { rows } = await pool.query(
        `UPDATE realtime_join_tickets
         SET consumed_at=NOW()
         WHERE token_hash=$1 AND server_id=$2 AND consumed_at IS NULL AND expires_at>NOW()
         RETURNING account_id AS "accountId",character_id AS "characterId",server_id AS "serverId"`,
        [tokenHash, serverId],
      );
      if (!rows[0]) return null;
      return { ...rows[0], accountId: String(rows[0].accountId) };
    },
    async cleanupRealtimeJoinTickets() {
      const { rowCount } = await pool.query(
        `DELETE FROM realtime_join_tickets
         WHERE (consumed_at IS NOT NULL AND consumed_at < NOW() - INTERVAL '5 minutes')
            OR (consumed_at IS NULL AND expires_at < NOW() - INTERVAL '5 minutes')`,
      );
      return rowCount;
    },
    async createSession({ accountId, tokenHash, expiresAt }) {
      await pool.query('INSERT INTO account_sessions (account_id,token_hash,expires_at) VALUES ($1,$2,$3)', [accountId, tokenHash, expiresAt]);
    },
    async findSession(tokenHash) {
      const { rows } = await pool.query('SELECT account_id AS "accountId",expires_at AS "expiresAt" FROM account_sessions WHERE token_hash=$1', [tokenHash]);
      return rows[0] || null;
    },
    async deleteSession(tokenHash) {
      await pool.query('DELETE FROM account_sessions WHERE token_hash=$1', [tokenHash]);
    },
    async acquireZoneLease({ zoneId, ownerId, leaseMs }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'INSERT INTO world_zone_state (zone_id) VALUES ($1) ON CONFLICT (zone_id) DO NOTHING',
          [zoneId],
        );
        const { rows } = await client.query(
          `INSERT INTO world_zone_leases (zone_id, owner_id, fencing_epoch, lease_expires_at)
           VALUES ($1, $2, 1, NOW() + ($3::bigint * INTERVAL '1 millisecond'))
           ON CONFLICT (zone_id) DO UPDATE
             SET owner_id = EXCLUDED.owner_id,
                 fencing_epoch = world_zone_leases.fencing_epoch + 1,
                 lease_expires_at = EXCLUDED.lease_expires_at,
                 updated_at = NOW()
             WHERE world_zone_leases.lease_expires_at <= NOW()
           RETURNING zone_id AS "zoneId", owner_id AS "ownerId",
                     fencing_epoch AS "fencingEpoch", lease_expires_at AS "leaseExpiresAt"`,
          [zoneId, ownerId, leaseMs],
        );
        await client.query('COMMIT');
        return rows[0] ? { ...rows[0], fencingEpoch: String(rows[0].fencingEpoch) } : null;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async renewZoneLease({ zoneId, ownerId, fencingEpoch, leaseMs }) {
      const { rows } = await pool.query(
        `UPDATE world_zone_leases
         SET lease_expires_at = NOW() + ($4::bigint * INTERVAL '1 millisecond'), updated_at = NOW()
         WHERE zone_id = $1 AND owner_id = $2 AND fencing_epoch = $3 AND lease_expires_at > NOW()
         RETURNING zone_id AS "zoneId", owner_id AS "ownerId",
                   fencing_epoch AS "fencingEpoch", lease_expires_at AS "leaseExpiresAt"`,
        [zoneId, ownerId, fencingEpoch, leaseMs],
      );
      return rows[0] ? { ...rows[0], fencingEpoch: String(rows[0].fencingEpoch) } : null;
    },
    async appendZoneEvent({ zoneId, ownerId, fencingEpoch, eventId, eventType, schemaVersion, payload }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const lease = await client.query(
          `SELECT 1 FROM world_zone_leases
           WHERE zone_id=$1 AND owner_id=$2 AND fencing_epoch=$3 AND lease_expires_at>NOW()
           FOR UPDATE`,
          [zoneId, ownerId, fencingEpoch],
        );
        if (!lease.rows[0]) throw Object.assign(new Error('Zone lease lost'), { code: 'ZONE_LEASE_LOST' });

        const existing = await client.query(
          'SELECT zone_id AS "zoneId", sequence, event_type AS "eventType", schema_version AS "schemaVersion", payload = $2::jsonb AS "samePayload" FROM world_zone_events WHERE event_id=$1',
          [eventId, JSON.stringify(payload)],
        );
        if (existing.rows[0]) {
          const row = existing.rows[0];
          const same = row.zoneId === zoneId && row.eventType === eventType
            && row.schemaVersion === schemaVersion
            && row.samePayload === true;
          if (!same) throw Object.assign(new Error('Event id reused with different content'), { code: 'IDEMPOTENCY_CONFLICT' });
          await client.query('COMMIT');
          return { sequence: String(row.sequence), duplicate: true };
        }

        const state = await client.query(
          'SELECT last_event_sequence AS "lastEventSequence" FROM world_zone_state WHERE zone_id=$1 FOR UPDATE',
          [zoneId],
        );
        if (!state.rows[0]) throw Object.assign(new Error('Zone state missing'), { code: 'ZONE_STATE_NOT_FOUND' });
        const sequence = BigInt(state.rows[0].lastEventSequence) + 1n;
        await client.query(
          'INSERT INTO world_zone_events (event_id, zone_id, sequence, event_type, schema_version, payload) VALUES ($1,$2,$3,$4,$5,$6::jsonb)',
          [eventId, zoneId, sequence.toString(), eventType, schemaVersion, JSON.stringify(payload)],
        );
        await client.query(
          'UPDATE world_zone_state SET last_event_sequence=$2, updated_at=NOW() WHERE zone_id=$1',
          [zoneId, sequence.toString()],
        );
        await client.query('COMMIT');
        return { sequence: sequence.toString(), duplicate: false };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async saveZoneSnapshot({ zoneId, ownerId, fencingEpoch, schemaVersion, payload }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const lease = await client.query(
          `SELECT 1 FROM world_zone_leases
           WHERE zone_id=$1 AND owner_id=$2 AND fencing_epoch=$3 AND lease_expires_at>NOW()
           FOR UPDATE`,
          [zoneId, ownerId, fencingEpoch],
        );
        if (!lease.rows[0]) throw Object.assign(new Error('Zone lease lost'), { code: 'ZONE_LEASE_LOST' });
        const state = await client.query(
          'SELECT last_event_sequence AS "lastEventSequence" FROM world_zone_state WHERE zone_id=$1 FOR UPDATE',
          [zoneId],
        );
        if (!state.rows[0]) throw Object.assign(new Error('Zone state missing'), { code: 'ZONE_STATE_NOT_FOUND' });
        const sequence = String(state.rows[0].lastEventSequence);
        const { rows } = await client.query(
          `INSERT INTO world_zone_snapshots (zone_id, last_event_sequence, schema_version, payload)
           VALUES ($1,$2,$3,$4::jsonb)
           ON CONFLICT (zone_id) DO UPDATE
             SET last_event_sequence=EXCLUDED.last_event_sequence,
                 schema_version=EXCLUDED.schema_version,
                 payload=EXCLUDED.payload,
                 created_at=NOW()
             WHERE world_zone_snapshots.last_event_sequence < EXCLUDED.last_event_sequence
           RETURNING zone_id AS "zoneId", last_event_sequence AS "lastEventSequence",
                     schema_version AS "schemaVersion", payload, created_at AS "createdAt"`,
          [zoneId, sequence, schemaVersion, JSON.stringify(payload)],
        );
        if (!rows[0]) throw Object.assign(new Error('Snapshot sequence must advance'), { code: 'SNAPSHOT_NOT_ADVANCED' });
        await client.query('COMMIT');
        return { ...rows[0], lastEventSequence: String(rows[0].lastEventSequence) };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async loadZoneRecoveryState({ zoneId, ownerId, fencingEpoch }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const lease = await client.query(
          `SELECT 1 FROM world_zone_leases
           WHERE zone_id=$1 AND owner_id=$2 AND fencing_epoch=$3 AND lease_expires_at>NOW()
           FOR SHARE`,
          [zoneId, ownerId, fencingEpoch],
        );
        if (!lease.rows[0]) throw Object.assign(new Error('Zone lease lost'), { code: 'ZONE_LEASE_LOST' });

        const snapshotResult = await client.query(
          'SELECT zone_id AS "zoneId", last_event_sequence AS "lastEventSequence", schema_version AS "schemaVersion", payload, created_at AS "createdAt" FROM world_zone_snapshots WHERE zone_id=$1',
          [zoneId],
        );
        const snapshot = snapshotResult.rows[0]
          ? { ...snapshotResult.rows[0], lastEventSequence: String(snapshotResult.rows[0].lastEventSequence) }
          : null;
        const sequence = snapshot?.lastEventSequence || '0';
        const eventsResult = await client.query(
          `SELECT event_id AS "eventId", sequence, event_type AS "eventType",
                  schema_version AS "schemaVersion", payload, created_at AS "createdAt"
           FROM world_zone_events WHERE zone_id=$1 AND sequence>$2
           ORDER BY sequence ASC`,
          [zoneId, sequence],
        );
        const result = {
          snapshot,
          events: eventsResult.rows.map(row => ({ ...row, sequence: String(row.sequence) })),
          lastEventSequence: eventsResult.rows.length
            ? String(eventsResult.rows[eventsResult.rows.length - 1].sequence)
            : sequence,
        };
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async withCharacterTransaction(accountId, characterId, callback) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          'SELECT id,account_id AS "accountId",character_data AS "characterData",weapon_progression AS "weaponProgression",magic_progression AS "magicProgression",magic_combat_state AS "magicCombatState" FROM characters WHERE id=$1 AND account_id=$2 FOR UPDATE',
          [characterId, accountId],
        );
        if (!rows[0]) throw Object.assign(new Error('Personnage introuvable ou non autorisé'), { code: 'CHARACTER_NOT_FOUND' });
        const character = rows[0];
        const saveProgression = async (progression, kind = 'weapon') => {
          const column = kind === 'magic' ? 'magic_progression' : kind === 'weapon' ? 'weapon_progression' : null;
          if (!column) throw new TypeError('Unknown progression storage kind');
          await client.query(`UPDATE characters SET ${column}=$1::jsonb WHERE id=$2`, [JSON.stringify(progression), characterId]);
        };
        const saveCombatState = async state => {
          await client.query('UPDATE characters SET magic_combat_state=$1::jsonb,updated_at=NOW() WHERE id=$2', [JSON.stringify(state), characterId]);
        };
        const result = await callback(character, saveProgression, saveCombatState);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
