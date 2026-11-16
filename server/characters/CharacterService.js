import { MAGIC_RACE_RULES } from '../../prototype/src/magic/MagicSkillTree.js';
export function createCharacterService(repository) {
  if (typeof repository?.createCharacter !== 'function' || typeof repository?.listCharacters !== 'function' || typeof repository?.findCharacterByAccount !== 'function') {
    throw new TypeError('Character repository methods are required');
  }
  async function create(accountId, displayName, race = 'human') {
    const name = String(displayName || '').normalize('NFC').trim();
    if (!accountId) throw new TypeError('Authenticated account required');
    if (!Object.hasOwn(MAGIC_RACE_RULES, race)) throw new TypeError('Race de personnage invalide');
    if (name.length < 3 || name.length > 24 || !/^[\p{L}\p{N} _'-]+$/u.test(name)) {
      throw new TypeError('Le nom du personnage doit contenir 3 à 24 caractères autorisés');
    }
    return repository.createCharacter(accountId, name, race);
  }
  async function list(accountId) {
    if (!accountId) throw new TypeError('Authenticated account required');
    return repository.listCharacters(accountId);
  }
  async function get(accountId, characterId) {
    if (!accountId || typeof characterId !== 'string' || !characterId) throw new TypeError('Authenticated account and character are required');
    return repository.findCharacterByAccount(accountId, characterId);
  }
  return Object.freeze({ create, list, get });
}
