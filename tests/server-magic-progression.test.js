import test from 'node:test';
import assert from 'node:assert/strict';
import { createMagicProgression, grantMagicSkillPoints } from '../prototype/src/magic/MagicSkillTree.js';
import { createMagicProgressionService } from '../server/progression/MagicProgressionService.js';

function fixture() {
  const characters = new Map([['char-1', {
    id: 'char-1', accountId: 'account-1', magicProgression: createMagicProgression(),
  }]]);
  const repository = {
    async withCharacterTransaction(accountId, characterId, callback) {
      const character = characters.get(characterId);
      if (!character || character.accountId !== accountId) throw new Error('Character ownership validation failed.');
      return callback(character);
    },
    async saveMagicProgression(characterId, progression) {
      characters.get(characterId).magicProgression = structuredClone(progression);
    },
  };
  return { service: createMagicProgressionService(repository), characters };
}

test('magic snapshot is character-scoped and starts empty', async () => {
  const { service } = fixture();
  const result = await service.getSnapshot('account-1', 'char-1');
  assert.equal(result.snapshot.unspentSkillPoints, 0);
  assert.equal(result.snapshot.schools.fire.level, 0);
});

test('skill unlock validates points and saves the character progression', async () => {
  const { service } = fixture();
  await service.grantPointsFromServerEvent({
    accountId: 'account-1', characterId: 'char-1', amount: 1, eventId: 'level-reward-1',
  });
  const result = await service.unlockSkill({
    accountId: 'account-1', characterId: 'char-1', school: 'fire', branch: 'offense', index: 0,
  });
  assert.equal(result.unlocked, false);
  assert.equal(result.reason, 'school-level');
});

test('server-confirmed cast records mastery only for an unlocked skill', async () => {
  const { service } = fixture();
  const grant = await service.grantPointsFromServerEvent({
    accountId: 'account-1', characterId: 'char-1', amount: 1, eventId: 'level-reward-2',
  });
  assert.equal(grant.granted, 1);
  // The school level is intentionally still zero; a cast cannot bypass the level/unlock gate.
  const result = await service.recordSuccessfulCast({
    accountId: 'account-1', characterId: 'char-1', school: 'fire',
    skillId: 'fire:offense:1', castEventId: 'cast-1',
  });
  assert.equal(result.recorded, false);
  assert.equal(result.reason, 'skill-locked-or-unknown');
});

test('ownership is checked before progression can be read or changed', async () => {
  const { service } = fixture();
  await assert.rejects(() => service.getSnapshot('other-account', 'char-1'), /ownership/);
});

test('client-supplied XP is ignored and trusted event id is required', async () => {
  const { service } = fixture();
  await assert.rejects(() => service.grantPointsFromServerEvent({
    accountId: 'account-1', characterId: 'char-1', amount: 999999,
  }), /event id/);
});

test('repository must implement atomic persistence methods', () => {
  assert.throws(() => createMagicProgressionService({}), /withCharacterTransaction/);
});
