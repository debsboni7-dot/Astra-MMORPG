import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharacterService } from '../server/characters/CharacterService.js';

test('characters are created and listed only within the authenticated account scope', async () => {
  const rows = [];
  const repository = {
    async createCharacter(accountId, displayName, race) {
      const row = { id: String(rows.length + 1), accountId, displayName, race };
      rows.push(row);
      return row;
    },
    async listCharacters(accountId) { return rows.filter(row => row.accountId === accountId); },
  };
  const service = createCharacterService(repository);
  await service.create('account-A', 'Chevalier');
  await service.create('account-B', 'Mage');
  assert.equal((await service.list('account-A')).length, 1);
  assert.equal((await service.list('account-A'))[0].displayName, 'Chevalier');
  assert.equal(rows[0].race, 'human');
});

test('character names are normalized, bounded and validated', async () => {
  const repository = { async createCharacter(_id, name) { return { displayName: name }; }, async listCharacters() { return []; } };
  const service = createCharacterService(repository);
  assert.equal((await service.create('account-A', '  Éowyn  ')).displayName, 'Éowyn');
  await assert.rejects(service.create('account-A', 'ab'), /3 à 24/);
  await assert.rejects(service.create('account-A', '<script>'), /3 à 24/);
});

test('character race is validated and passed to persistence', async () => {
  const rows=[];
  const service=createCharacterService({async createCharacter(accountId,displayName,race){const row={accountId,displayName,race};rows.push(row);return row;},async listCharacters(){return rows;}});
  await service.create('account-A','Sylve','elf');
  assert.equal(rows[0].race,'elf');
  await assert.rejects(service.create('account-A','Mage','undead'),/Race de personnage invalide/);
});
