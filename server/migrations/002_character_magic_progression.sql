-- Requires the existing characters(id, account_id) table.
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS magic_progression JSONB NOT NULL
  DEFAULT '{"schemaVersion":1,"unspentSkillPoints":0,"schools":{}}'::jsonb;

CREATE INDEX IF NOT EXISTS characters_magic_progression_gin_idx
  ON characters USING GIN (magic_progression);
