-- Authoritative magic resources, cooldowns and temporary effects.
-- Race remains in characters.character_data.race; old characters default to human.
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS magic_combat_state JSONB NOT NULL
  DEFAULT '{"schemaVersion":1,"hp":100,"maxHp":100,"mana":100,"maxMana":100,"manaRegenCombat":4,"lastUpdatedAt":0,"cooldowns":{},"shields":[],"statusEffects":[],"modifiers":[],"processedRequests":[]}'::jsonb;
