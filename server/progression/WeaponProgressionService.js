import { awardWeaponMastery, recordWeaponTechniqueUse, getWeaponProgression, WEAPON_TECHNIQUES } from '../../prototype/src/combat/WeaponProgression.js';

const ATTACK_TYPES = new Set(['light', 'heavy', 'charged', 'finisher', 'special', 'aerial', 'default']);
const CATEGORIES = new Set(Object.keys(WEAPON_TECHNIQUES));

function emptyProgression() {
  return { schemaVersion: 1, weaponMasteries: {}, weaponMasteryXpByCategory: {}, weaponTechniqueXp: {}, weaponUses: 0, weaponUsesByCategory: {} };
}

function sanitizeProgression(value = {}) {
  const clean = emptyProgression();
  for (const category of CATEGORIES) {
    const xp = Number(value.weaponMasteryXpByCategory?.[category]);
    const legacyLevel = Number(value.weaponMasteries?.[category]);
    if (Number.isFinite(xp) && xp >= 0) clean.weaponMasteryXpByCategory[category] = Math.min(11100, xp);
    if (Number.isFinite(legacyLevel) && legacyLevel >= 0) clean.weaponMasteries[category] = Math.min(100, Math.floor(legacyLevel));
    const uses = Number(value.weaponUsesByCategory?.[category]);
    if (Number.isFinite(uses) && uses >= 0) clean.weaponUsesByCategory[category] = Math.floor(uses);
  }
  for (const category of CATEGORIES) {
    const techniqueIds = new Set(WEAPON_TECHNIQUES[category].map(t => t.id));
    for (const [id, xp] of Object.entries(value.weaponTechniqueXp || {})) {
      if (techniqueIds.has(id) && Number.isFinite(Number(xp)) && Number(xp) >= 0) clean.weaponTechniqueXp[id] = Math.floor(Number(xp));
    }
  }
  clean.weaponUses = Number.isFinite(Number(value.weaponUses)) && Number(value.weaponUses) >= 0 ? Math.floor(Number(value.weaponUses)) : 0;
  return clean;
}

/**
 * repository.withCharacterTransaction(accountId, characterId, callback)
 * must verify ownership, lock the character row/document, and atomically commit
 * the returned progression. The authenticated account ID is never read from the request body.
 */
export function createWeaponProgressionService(repository) {
  if (!repository || typeof repository.withCharacterTransaction !== 'function' || typeof repository.saveWeaponProgression !== 'function') {
    throw new TypeError('A transactional character repository is required');
  }

  async function read(accountId, characterId) {
    if (!accountId || !characterId) throw new TypeError('Authenticated account and character are required');
    return repository.withCharacterTransaction(accountId, characterId, async character => ({
      characterId: character.id,
      progression: sanitizeProgression(character.weaponProgression),
    }));
  }

  async function recordSuccessfulAttack({ accountId, characterId, category, attackType = 'default', techniqueId = null }) {
    if (!accountId || !characterId) throw new TypeError('Authenticated account and character are required');
    if (!CATEGORIES.has(category) || !ATTACK_TYPES.has(attackType)) throw new TypeError('Invalid server-validated weapon attack');
    return repository.withCharacterTransaction(accountId, characterId, async character => {
      const progression = sanitizeProgression(character.weaponProgression);
      const combatant = { ...progression };
      const mastery = awardWeaponMastery(combatant, category, attackType);
      combatant.weaponUses = (combatant.weaponUses || 0) + 1;
      combatant.weaponUsesByCategory[category] = (combatant.weaponUsesByCategory[category] || 0) + 1;
      let technique = null;
      if (techniqueId) {
        const known = WEAPON_TECHNIQUES[category].some(item => item.id === techniqueId);
        if (!known) throw new TypeError('Technique does not belong to this weapon category');
        technique = recordWeaponTechniqueUse(combatant, category, techniqueId);
        if (!technique.recorded) throw new TypeError(technique.reason);
      }
      const saved = sanitizeProgression(combatant);
      await repository.saveWeaponProgression(character.id, saved);
      return { progression: saved, result: { awarded: mastery.awarded, mastery, technique } };
    });
  }

  async function getSnapshot(accountId, characterId) {
    const { characterId: id, progression } = await read(accountId, characterId);
    return {
      characterId: id,
      progression,
      categories: Object.fromEntries([...CATEGORIES].map(category => [category, getWeaponProgression(progression, category)])),
    };
  }

  return Object.freeze({ read, recordSuccessfulAttack, getSnapshot });
}

export { emptyProgression, sanitizeProgression };
