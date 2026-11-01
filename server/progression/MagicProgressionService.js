import {
  createMagicProgression, sanitizeMagicProgression, getMagicSkillTree,
  unlockMagicSkill, grantMagicSkillPoints, grantMagicSchoolXp, recordMagicSkillUse,
} from '../../prototype/src/magic/MagicSkillTree.js';

const clone = value => structuredClone(value);

export function createMagicProgressionService(repository) {
  if (!repository || typeof repository.withCharacterTransaction !== 'function') {
    throw new Error('Magic progression repository requires withCharacterTransaction.');
  }

  async function transact(accountId, characterId, operation) {
    if (!accountId || !characterId) throw new Error('Authenticated account and character are required.');
    return repository.withCharacterTransaction(accountId, characterId, async (character, saveProgression) => {
      if (!character || character.accountId !== accountId || character.id !== characterId) {
        throw new Error('Character ownership validation failed.');
      }
      const progression = sanitizeMagicProgression(character.magicProgression || createMagicProgression());
      const result = await operation(progression);
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
      return transact(accountId, characterId, async progression => ({
        snapshot: clone(progression),
        persist: false,
      }));
    },

    async unlockSkill({ accountId, characterId, school, branch, index }) {
      return transact(accountId, characterId, async progression => {
        const result = unlockMagicSkill(progression, school, branch, index);
        if (!result.unlocked) return { unlocked: false, reason: result.reason, details: result.details, persist: false };
        Object.assign(progression, result.progression);
        return { unlocked: true, skill: result.skill };
      });
    },

    /**
     * Called only by trusted server progression code after a legitimate
     * character-level reward event. Never expose this as a client-controlled
     * arbitrary point grant.
     */
    async grantPointsFromServerEvent({ accountId, characterId, amount, eventId }) {
      if (!eventId || typeof eventId !== 'string') throw new Error('A trusted progression event id is required.');
      return transact(accountId, characterId, async progression => {
        const key = `points:${eventId}`;
        if (progression.processedEvents.includes(key)) return { granted: 0, duplicate: true, persist: false };
        const result = grantMagicSkillPoints(progression, amount);
        Object.assign(progression, result.progression);
        progression.processedEvents.push(key);
        progression.processedEvents = progression.processedEvents.slice(-1000);
        return { granted: result.granted, unspentSkillPoints: result.unspentSkillPoints, eventId };
      });
    },

    /** Trusted account progression event; never expose arbitrary XP grants to clients. */
    async grantSchoolXpFromServerEvent({ accountId, characterId, school, amount, eventId }) {
      if (!eventId || typeof eventId !== 'string') throw new Error('A trusted progression event id is required.');
      return transact(accountId, characterId, async progression => {
        const key = `school-xp:${eventId}`;
        if (progression.processedEvents.includes(key)) return { granted: 0, duplicate: true, persist: false };
        const result = grantMagicSchoolXp(progression, school, amount);
        if (result.reason) return { granted: 0, reason: result.reason, persist: false };
        Object.assign(progression, result.progression);
        progression.processedEvents.push(key);
        progression.processedEvents = progression.processedEvents.slice(-1000);
        return { granted: result.granted, school: result.school, schoolXp: result.schoolXp, schoolLevel: result.schoolLevel, eventId };
      });
    },

    /**
     * The server supplies school + skill only after its combat simulation has
     * confirmed a valid cast. Client-reported XP and mastery are never read.
     */
    async recordSuccessfulCast({ accountId, characterId, school, skillId, castEventId }) {
      if (!castEventId || typeof castEventId !== 'string') throw new Error('A trusted cast event id is required.');
      return transact(accountId, characterId, async progression => {
        const key = `cast:${castEventId}`;
        if (progression.processedEvents.includes(key)) return { recorded: false, reason: 'duplicate-event', persist: false };
        const result = recordMagicSkillUse(progression, school, skillId);
        if (!result.recorded) return { recorded: false, reason: result.reason, persist: false };
        Object.assign(progression, result.progression);
        progression.processedEvents.push(key);
        progression.processedEvents = progression.processedEvents.slice(-1000);
        return {
          recorded: true, school: result.school, skillId: result.skill,
          schoolXp: result.schoolXp, schoolLevel: result.schoolLevel,
          masteryXp: result.masteryXp, castEventId,
        };
      });
    },

    async getTree(accountId, characterId, school) {
      const result = await this.getSnapshot(accountId, characterId);
      return getMagicSkillTree(school, result.snapshot);
    },
  });
}
