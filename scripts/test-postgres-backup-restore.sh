#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

RESTORE_DB="astrea_restore_test"
RESTORE_URL="${DATABASE_URL%/*}/${RESTORE_DB}"
DUMP_FILE="$(mktemp --suffix=.dump)"

cleanup() {
  dropdb --if-exists --maintenance-db="$DATABASE_URL" "$RESTORE_DB" >/dev/null 2>&1 || true
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'DROP TABLE IF EXISTS astrea_backup_restore_probe' >/dev/null 2>&1 || true
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS astrea_backup_restore_probe (
  id integer PRIMARY KEY,
  value text NOT NULL
);
TRUNCATE astrea_backup_restore_probe;
INSERT INTO astrea_backup_restore_probe (id, value) VALUES (1, 'astrea-backup-restore-ok');
SQL

pg_dump --format=custom --no-owner "$DATABASE_URL" --file="$DUMP_FILE"
createdb --maintenance-db="$DATABASE_URL" "$RESTORE_DB"
pg_restore --exit-on-error --no-owner --dbname="$RESTORE_URL" "$DUMP_FILE"

RESTORED_VALUE="$(psql "$RESTORE_URL" -v ON_ERROR_STOP=1 -Atc 'SELECT value FROM astrea_backup_restore_probe WHERE id = 1')"
if [[ "$RESTORED_VALUE" != "astrea-backup-restore-ok" ]]; then
  echo "Backup/restore verification failed: unexpected restored value" >&2
  exit 1
fi

echo "PostgreSQL backup/restore verification passed."
