import test from 'node:test';
import assert from 'node:assert/strict';
import { createMagicProgression } from '../prototype/src/magic/MagicSkillTree.js';
import { createMagicProgressionService } from '../server/progression/MagicProgressionService.js';

function fixture(race = 'human') {
  const characters = new Map([['char-1', { id:'char-1', accountId:'account-1', race, characterData:{race}, magicProgression:createMagicProgression(race) }]]);
  const repository = {
    async withCharacterTransaction(accountId, characterId, callback) {
      const character = characters.get(characterId);
      if (!character || character.accountId !== accountId) throw new Error('Character ownership validation failed.');
      return callback(character, async (progression, kind) => {
        if (kind !== 'magic') throw new Error('Unexpected progression kind');
        character.magicProgression = structuredClone(progression);
      });
    },
  };
  return { service:createMagicProgressionService(repository), characters };
}

test('magic snapshot is character-scoped, race-aware and starts with no points', async () => {
  const { service } = fixture('elf');
  const result = await service.getSnapshot('account-1','char-1');
  assert.equal(result.snapshot.race,'elf');
  assert.equal(result.snapshot.schools.fire.level,0);
  assert.equal('unspentSkillPoints' in result.snapshot,false);
});

test('only a trusted confirmed cast can grant school progression', async () => {
  const { service } = fixture();
  const cast = await service.recordSuccessfulCast({ accountId:'account-1', characterId:'char-1', school:'fire', castEventId:'cast-1' });
  assert.equal(cast.recorded,true);
  assert.equal(cast.schoolXp,1);
  assert.deepEqual(cast.newlyUnlocked, []);
  let result = cast;
  for (let i=1;i<20;i++) result = await service.recordSuccessfulCast({ accountId:'account-1', characterId:'char-1', school:'fire', castEventId:'cast-'+(i+1) });
  assert.ok(result.newlyUnlocked.includes('fire:offense:1'));
});

test('replayed cast event cannot grant progression twice', async () => {
  const { service } = fixture();
  const input = { accountId:'account-1', characterId:'char-1', school:'fire', castEventId:'same-cast' };
  assert.equal((await service.recordSuccessfulCast(input)).recorded,true);
  const replay = await service.recordSuccessfulCast(input);
  assert.equal(replay.recorded,false);
  assert.equal(replay.reason,'duplicate-event');
});

test('server enforces race restrictions before awarding magic progression', async () => {
  const { service } = fixture('angel');
  const result = await service.recordSuccessfulCast({ accountId:'account-1', characterId:'char-1', school:'demonic', castEventId:'forbidden-cast' });
  assert.equal(result.recorded,false);
  assert.equal(result.reason,'race-school-restriction');
});

test('character ownership is checked before reading or changing progression', async () => {
  const { service } = fixture();
  await assert.rejects(() => service.getSnapshot('other-account','char-1'), /ownership/);
});

test('server requires a trusted cast event id', async () => {
  const { service } = fixture();
  await assert.rejects(() => service.recordSuccessfulCast({ accountId:'account-1', characterId:'char-1', school:'fire' }), /event id/);
});

test('repository must implement atomic persistence methods', () => {
  assert.throws(() => createMagicProgressionService({}), /withCharacterTransaction/);
});

test('equipping a technique requires that it has already been unlocked through use', async () => {
  const { service } = fixture();
  const denied = await service.equipTechnique({ accountId:'account-1', characterId:'char-1', school:'fire', skillId:'fire:offense:1', slotType:'normal', slotIndex:0 });
  assert.equal(denied.equipped,false);
  for(let i=0;i<20;i++) await service.recordSuccessfulCast({ accountId:'account-1', characterId:'char-1', school:'fire', castEventId:'equip-cast-'+i });
  const equipped = await service.equipTechnique({ accountId:'account-1', characterId:'char-1', school:'fire', skillId:'fire:offense:1', slotType:'normal', slotIndex:0 });
  assert.equal(equipped.equipped,true);
});
