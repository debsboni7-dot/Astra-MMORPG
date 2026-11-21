CREATE INDEX IF NOT EXISTS realtime_join_tickets_consumed_idx
  ON realtime_join_tickets (consumed_at)
  WHERE consumed_at IS NOT NULL;
