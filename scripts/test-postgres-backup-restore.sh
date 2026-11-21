#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

RESTORE_DB="astrea_restore_test"
RESTORE_URL="${DATABASE_URL%/*}/${RESTORE_DB}"
DUMP_FILE="$(mktemp --suffix=.dump)"

cleanup() {
  docker run --rm --network host postgres:16 dropdb --if-exists --maintenance-db="$DATABASE_URL" "$RESTORE_DB" >/dev/null 2>&1 || true
  docker run --rm --network host postgres:16 psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'DROP TABLE IF EXISTS astrea_backup_restore_probe' >/dev/null 2>&1 || true
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

docker run --rm -i --network host postgres:16 psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS astrea_backup_restore_probe (
  id integer PRIMARY KEY,
  value text NOT NULL
);
TRUNCATE astrea_backup_restore_probe;
INSERT INTO astrea_backup_restore_probe (id, value) VALUES (1, 'astrea-backup-restore-ok');

-- Include representative ASTREA zone data in the dump, not only a generic probe table.
INSERT INTO world_zone_state (zone_id, last_event_sequence)
VALUES ('astrea-backup-restore-zone', 1)
ON CONFLICT (zone_id) DO UPDATE SET last_event_sequence = 1;
INSERT INTO world_zone_leases (zone_id, owner_id, fencing_epoch, lease_expires_at)
VALUES ('astrea-backup-restore-zone', 'backup-restore-process', 7, NOW() + INTERVAL '1 hour')
ON CONFLICT (zone_id) DO UPDATE
  SET owner_id = EXCLUDED.owner_id,
      fencing_epoch = EXCLUDED.fencing_epoch,
      lease_expires_at = EXCLUDED.lease_expires_at;
INSERT INTO world_zone_events (event_id, zone_id, sequence, event_type, schema_version, payload)
VALUES ('d13e3e8d-8c5d-4d95-9a7f-cdc9f6b10a01', 'astrea-backup-restore-zone', 1,
        'BACKUP_RESTORE_PROBE', 1, '{"marker":"restored-zone-state"}'::jsonb)
ON CONFLICT (event_id) DO UPDATE SET payload = EXCLUDED.payload;
INSERT INTO world_zone_snapshots (zone_id, last_event_sequence, schema_version, payload)
VALUES ('astrea-backup-restore-zone', 1, 1, '{"marker":"restored-zone-state"}'::jsonb)
ON CONFLICT (zone_id) DO UPDATE
  SET last_event_sequence = EXCLUDED.last_event_sequence,
      schema_version = EXCLUDED.schema_version,
      payload = EXCLUDED.payload;
SQL

docker run --rm --network host postgres:16 pg_dump --format=custom --no-owner "$DATABASE_URL" > "$DUMP_FILE"
docker run --rm --network host postgres:16 createdb --maintenance-db="$DATABASE_URL" "$RESTORE_DB"
docker run --rm -i --network host postgres:16 pg_restore --exit-on-error --no-owner --dbname="$RESTORE_URL" < "$DUMP_FILE"

RESTORED_VALUE="$(docker run --rm --network host postgres:16 psql "$RESTORE_URL" -v ON_ERROR_STOP=1 -Atc 'SELECT value FROM astrea_backup_restore_probe WHERE id = 1')"
if [[ "$RESTORED_VALUE" != "astrea-backup-restore-ok" ]]; then
  echo "Backup/restore verification failed: unexpected restored value" >&2
  exit 1
fi

RESTORED_ZONE_VALUE="$(docker run --rm --network host postgres:16 psql "$RESTORE_URL" -v ON_ERROR_STOP=1 -Atc "SELECT s.payload->>'marker' || ':' || COUNT(e.event_id)::text || ':' || l.fencing_epoch::text FROM world_zone_snapshots s JOIN world_zone_events e ON e.zone_id=s.zone_id JOIN world_zone_leases l ON l.zone_id=s.zone_id WHERE s.zone_id='astrea-backup-restore-zone' GROUP BY s.payload, l.fencing_epoch")"
if [[ "$RESTORED_ZONE_VALUE" != "restored-zone-state:1:7" ]]; then
  echo "ASTREA zone backup/restore verification failed: unexpected restored zone state" >&2
  exit 1
fi

echo "PostgreSQL backup/restore verification passed for generic data and ASTREA zone snapshot/event/lease state."
