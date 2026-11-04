-- Character records are owned by an account. UUIDs are stable across game servers.
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  character_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS characters_account_id_idx ON characters (account_id);

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS weapon_progression JSONB NOT NULL
  DEFAULT '{"schemaVersion":1,"weaponMasteries":{},"weaponMasteryXpByCategory":{},"weaponTechniqueXp":{},"weaponUses":0,"weaponUsesByCategory":{}}'::jsonb;
