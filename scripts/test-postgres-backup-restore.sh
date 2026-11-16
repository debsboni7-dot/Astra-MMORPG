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
SQL

docker run --rm --network host postgres:16 pg_dump --format=custom --no-owner "$DATABASE_URL" > "$DUMP_FILE"
docker run --rm --network host postgres:16 createdb --maintenance-db="$DATABASE_URL" "$RESTORE_DB"
docker run --rm -i --network host postgres:16 pg_restore --exit-on-error --no-owner --dbname="$RESTORE_URL" < "$DUMP_FILE"

RESTORED_VALUE="$(docker run --rm --network host postgres:16 psql "$RESTORE_URL" -v ON_ERROR_STOP=1 -Atc 'SELECT value FROM astrea_backup_restore_probe WHERE id = 1')"
if [[ "$RESTORED_VALUE" != "astrea-backup-restore-ok" ]]; then
  echo "Backup/restore verification failed: unexpected restored value" >&2
  exit 1
fi

echo "PostgreSQL backup/restore verification passed."
