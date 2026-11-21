CREATE TABLE IF NOT EXISTS world_zone_state (
  zone_id TEXT PRIMARY KEY,
  last_event_sequence BIGINT NOT NULL DEFAULT 0 CHECK (last_event_sequence >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_zone_leases (
  zone_id TEXT PRIMARY KEY REFERENCES world_zone_state(zone_id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  fencing_epoch BIGINT NOT NULL CHECK (fencing_epoch > 0),
  lease_expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS world_zone_leases_expiry_idx
  ON world_zone_leases (lease_expires_at);

CREATE TABLE IF NOT EXISTS world_zone_events (
  event_id UUID PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES world_zone_state(zone_id) ON DELETE CASCADE,
  sequence BIGINT NOT NULL CHECK (sequence > 0),
  event_type TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (zone_id, sequence)
);
CREATE INDEX IF NOT EXISTS world_zone_events_replay_idx
  ON world_zone_events (zone_id, sequence);

CREATE TABLE IF NOT EXISTS world_zone_snapshots (
  zone_id TEXT PRIMARY KEY REFERENCES world_zone_state(zone_id) ON DELETE CASCADE,
  last_event_sequence BIGINT NOT NULL CHECK (last_event_sequence >= 0),
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
