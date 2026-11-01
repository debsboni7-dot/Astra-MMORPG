-- PostgreSQL migration: progression belongs to a character, not a browser or game server.
-- characters.id must be the character primary key and characters.account_id its owner.
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS weapon_progression JSONB NOT NULL
  DEFAULT '{"schemaVersion":1,"weaponMasteries":{},"weaponMasteryXpByCategory":{},"weaponTechniqueXp":{},"weaponUses":0,"weaponUsesByCategory":{}}'::jsonb;

CREATE INDEX IF NOT EXISTS characters_account_id_idx ON characters (account_id);
