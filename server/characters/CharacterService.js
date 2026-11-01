export function createCharacterService(repository) {
  if (typeof repository?.createCharacter !== 'function' || typeof repository?.listCharacters !== 'function') {
    throw new TypeError('Character repository methods are required');
  }
  async function create(accountId, displayName) {
    const name = String(displayName || '').normalize('NFC').trim();
    if (!accountId) throw new TypeError('Authenticated account required');
    if (name.length < 3 || name.length > 24 || !/^[\p{L}\p{N} _'-]+$/u.test(name)) {
      throw new TypeError('Le nom du personnage doit contenir 3 à 24 caractères autorisés');
    }
    return repository.createCharacter(accountId, name);
  }
  async function list(accountId) {
    if (!accountId) throw new TypeError('Authenticated account required');
    return repository.listCharacters(accountId);
  }
  return Object.freeze({ create, list });
}
