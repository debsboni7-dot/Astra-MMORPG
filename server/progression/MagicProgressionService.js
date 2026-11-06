import {
  createMagicProgression, sanitizeMagicProgression, getMagicSkillTree,
  recordMagicSkillUse, equipMagicTechnique,
} from '../../prototype/src/magic/MagicSkillTree.js';

const clone = value => structuredClone(value);

export function createMagicProgressionService(repository) {
  if (!repository || typeof repository.withCharacterTransaction !== 'function') {
    throw new Error('Magic progression repository requires withCharacterTransaction.');
  }

  async function transact(accountId, characterId, operation) {
    if (!accountId || !characterId) throw new Error('Authenticated account and character are required.');
    return repository.withCharacterTransaction(accountId, characterId, async (character, saveProgression) => {
      if (!character || character.accountId !== accountId || character.id !== characterId) throw new Error('Character ownership validation failed.');
      const race = character.race || character.profile?.race || character.magicProgression?.race || 'human';
      const progression = sanitizeMagicProgression(character.magicProgression || createMagicProgression(race), race);
      const result = await operation(progression, race);
      if (result.persist !== false) {
        if (typeof saveProgression === 'function') await saveProgression(progression, 'magic');
        else if (typeof repository.saveMagicProgression === 'function') await repository.saveMagicProgression(characterId, progression);
        else throw new TypeError('Transactional magic progression writer is required');
      }
      return { ...result, progression: clone(progression) };
    });
  }

  return Object.freeze({
    async getSnapshot(accountId, characterId) {
      return transact(accountId, characterId, async progression => ({ snapshot: clone(progression), persist: false }));
    },

    /** Must be called by authoritative combat after a cast has actually succeeded. */
    async recordSuccessfulCast({ accountId, characterId, school, skillId = null, castEventId }) {
      if (!castEventId || typeof castEventId !== 'string') throw new Error('A trusted cast event id is required.');
      return transact(accountId, characterId, async (progression, race) => {
        const key = `cast:${castEventId}`;
        if (progression.processedEvents.includes(key)) return { recorded: false, reason: 'duplicate-event', persist: false };
        const result = recordMagicSkillUse(progression, race, school, skillId);
        if (!result.recorded) return { recorded: false, reason: result.reason, persist: false };
        Object.assign(progression, result.progression);
        progression.processedEvents.push(key);
        progression.processedEvents = progression.processedEvents.slice(-1000);
        return { recorded: true, school, skillId, schoolXp: result.schoolXp, schoolLevel: result.schoolLevel,
          newlyUnlocked: result.newlyUnlocked, masteryXp: result.masteryXp, castEventId };
      });
    },

    async equipTechnique({ accountId, characterId, school, skillId, slotType, slotIndex }) {
      return transact(accountId, characterId, async progression => {
        const result = equipMagicTechnique(progression, school, skillId, slotType, slotIndex);
        if (!result.equipped) return { equipped: false, reason: result.reason, persist: false };
        Object.assign(progression, result.progression);
        return { equipped: true, slotType, slotIndex };
      });
    },

    async getTree(accountId, characterId, school) {
      const result = await this.getSnapshot(accountId, characterId);
      return getMagicSkillTree(school, result.snapshot);
    },
  });
}
