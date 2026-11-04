import test from 'node:test';
import assert from 'node:assert/strict';
import { createWeaponProgressionService, emptyProgression, sanitizeProgression } from '../server/progression/WeaponProgressionService.js';

function repositoryFixture() {
  const character = { id: 'character-1', accountId: 'account-1', weaponProgression: emptyProgression() };
  return {
    character,
    async withCharacterTransaction(accountId, characterId, callback) {
      if (accountId !== character.accountId || characterId !== character.id) throw new Error('character-not-owned');
      return callback(character);
    },
    async saveWeaponProgression(characterId, progression) {
      assert.equal(characterId, character.id);
      character.weaponProgression = structuredClone(progression);
    },
  };
}

test('server progression loads an empty character save safely', async () => {
  const repository = repositoryFixture();
  const service = createWeaponProgressionService(repository);
  const snapshot = await service.getSnapshot('account-1', 'character-1');
  assert.equal(snapshot.progression.schemaVersion, 1);
  assert.equal(snapshot.categories.sword.mastery.level, 0);
});

test('only server-confirmed successful attacks award and persist category mastery', async () => {
  const repository = repositoryFixture();
  const service = createWeaponProgressionService(repository);
  const result = await service.recordSuccessfulAttack({
    accountId: 'account-1', characterId: 'character-1', category: 'sword', attackType: 'heavy',
  });
  assert.equal(result.result.awarded, 1.5);
  assert.equal(repository.character.weaponProgression.weaponUses, 1);
  assert.equal(repository.character.weaponProgression.weaponMasteryXpByCategory.sword, 1.5);
});

test('ownership is checked before reading or changing character progression', async () => {
  const service = createWeaponProgressionService(repositoryFixture());
  await assert.rejects(service.getSnapshot('other-account', 'character-1'), /character-not-owned/);
  await assert.rejects(service.recordSuccessfulAttack({
    accountId: 'other-account', characterId: 'character-1', category: 'sword',
  }), /character-not-owned/);
});

test('client-supplied XP, levels and unknown techniques are never accepted as attack rewards', async () => {
  const repository = repositoryFixture();
  const service = createWeaponProgressionService(repository);
  await assert.rejects(service.recordSuccessfulAttack({
    accountId: 'account-1', characterId: 'character-1', category: 'wand', attackType: 'light', xp: 999999,
  }), /Invalid server-validated/);
  await assert.rejects(service.recordSuccessfulAttack({
    accountId: 'account-1', characterId: 'character-1', category: 'sword', attackType: 'light', techniqueId: 'not-a-technique',
  }), /Technique does not belong/);
  assert.equal(repository.character.weaponProgression.weaponUses, 0);
});

test('legacy progression is bounded and unknown fields are discarded', () => {
  const clean = sanitizeProgression({
    weaponMasteries: { sword: 999, wand: 50 },
    weaponMasteryXpByCategory: { sword: 999999, axe: -10 },
    weaponTechniqueXp: { quick_slash: 4, cheat_skill: 1000 },
    weaponUses: -5,
    isAdmin: true,
  });
  assert.equal(clean.weaponMasteries.sword, 100);
  assert.equal(clean.weaponMasteryXpByCategory.sword, 11100);
  assert.equal(clean.weaponTechniqueXp.quick_slash, 4);
  assert.equal(clean.weaponTechniqueXp.cheat_skill, undefined);
  assert.equal(clean.weaponUses, 0);
  assert.equal(clean.isAdmin, undefined);
});

test('individual technique mastery persists independently after category mastery is capped', async () => {
  const repository = repositoryFixture();
  repository.character.weaponProgression.weaponMasteries.sword = 100;
  repository.character.weaponProgression.weaponMasteryXpByCategory.sword = 11100;
  const service = createWeaponProgressionService(repository);
  const result = await service.recordSuccessfulAttack({
    accountId: 'account-1', characterId: 'character-1', category: 'sword',
    attackType: 'light', techniqueId: 'quick_slash',
  });
  assert.equal(result.result.awarded, 0);
  assert.equal(result.result.technique.recorded, true);
  assert.equal(repository.character.weaponProgression.weaponTechniqueXp.quick_slash, 1);
  assert.equal(repository.character.weaponProgression.weaponUses, 1);
});
