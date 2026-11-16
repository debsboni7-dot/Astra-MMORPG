CREATE TABLE IF NOT EXISTS realtime_join_tickets (
  token_hash TEXT PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  server_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS realtime_join_tickets_expiry_idx
  ON realtime_join_tickets (expires_at)
  WHERE consumed_at IS NULL;
