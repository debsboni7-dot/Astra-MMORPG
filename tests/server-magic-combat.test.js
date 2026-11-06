import test from 'node:test';
import assert from 'node:assert/strict';
import { createMagicProgression } from '../prototype/src/magic/MagicSkillTree.js';
import { createCombatant } from '../prototype/src/combat/CombatRuntime.js';
import { createMagicCombatService } from '../server/combat/MagicCombatService.js';

function fixture({ race='human', hp=100, mana=100, target=null, now=1000 }={}) {
  const character={id:'char-1',accountId:'account-1',characterData:{race},magicProgression:createMagicProgression(race),magicCombatState:{schemaVersion:1,hp,maxHp:100,mana,maxMana:100,manaRegenCombat:4,lastUpdatedAt:now,cooldowns:{},shields:[],statusEffects:[],modifiers:[]}};
  const saved={combat:0,progression:0,target:0};
  const repository={
    async withCharacterTransaction(accountId,characterId,callback){
      if(accountId!==character.accountId||characterId!==character.id)throw Object.assign(new Error('Character not found'),{code:'CHARACTER_NOT_FOUND'});
      return callback(character,async value=>{character.magicProgression=structuredClone(value);saved.progression++;},async value=>{character.magicCombatState=structuredClone(value);saved.combat++;});
    }
  };
  const targetMap=new Map(target?[['enemy-1',target]]:[]);
  const service=createMagicCombatService(repository,{
    now:()=>now,
    resolveTargets:async({targetId,school})=>({targets:targetMap.has(targetId)?[targetMap.get(targetId)]:[],persist:async()=>{saved.target++;}}),
  });
  return {service,character,saved,targetMap,setNow(value){now=value;}};
}

test('server resolves and persists a valid spell using character race, mana and target state', async()=>{
  const target=createCombatant({id:'enemy-1',hp:100,maxHp:100,fireMastery:0,magicDefense:0,resistances:{}});
  const f=fixture({target});
  const result=await f.service.castSpell({accountId:'account-1',characterId:'char-1',school:'fire',targetId:'enemy-1',requestId:'req-fire-123'});
  assert.equal(result.cast.executed,true);
  assert.equal(result.cast.damage,18);
  assert.equal(f.character.magicCombatState.mana,92);
  assert.equal(target.hp,82);
  assert.equal(f.saved.combat,1);
  assert.equal(f.saved.progression,1);
  assert.equal(f.saved.target,1);
  assert.equal(f.character.magicProgression.schools.fire.successfulCasts,1);
});

test('server rejects race-forbidden schools without spending mana or awarding XP', async()=>{
  const f=fixture({race:'elf'});
  const result=await f.service.castSpell({accountId:'account-1',characterId:'char-1',school:'demonic',requestId:'req-forbidden-123'});
  assert.equal(result.cast.executed,false);
  assert.equal(result.cast.reason,'race-school-restriction');
  assert.equal(f.character.magicCombatState.mana,100);
  assert.equal(f.character.magicProgression.schools.demonic.successfulCasts,0);
});

test('server cooldowns and insufficient mana are authoritative and do not double-charge', async()=>{
  const target=createCombatant({id:'enemy-1',hp:100,maxHp:100,fireMastery:0});
  const f=fixture({target,mana:8});
  const first=await f.service.castSpell({accountId:'account-1',characterId:'char-1',school:'fire',targetId:'enemy-1',requestId:'req-one-123'});
  assert.equal(first.cast.executed,true);
  assert.equal(f.character.magicCombatState.mana,0);
  f.setNow(1100);
  const second=await f.service.castSpell({accountId:'account-1',characterId:'char-1',school:'fire',targetId:'enemy-1',requestId:'req-two-123'});
  assert.equal(second.cast.reason,'cooldown');
  assert.equal(f.character.magicCombatState.mana,0);
});

test('replayed request IDs cannot consume mana or award progression twice', async()=>{
  const target=createCombatant({id:'enemy-1',hp:100,maxHp:100,fireMastery:0});
  const f=fixture({target});
  const input={accountId:'account-1',characterId:'char-1',school:'fire',targetId:'enemy-1',requestId:'same-request-123'};
  assert.equal((await f.service.castSpell(input)).cast.executed,true);
  const replay=await f.service.castSpell(input);
  assert.equal(replay.cast.reason,'duplicate-request');
  assert.equal(f.character.magicCombatState.mana,92);
  assert.equal(f.character.magicProgression.schools.fire.successfulCasts,1);
});

test('server resolves self-support spells without accepting a client target', async()=>{
  const f=fixture({race:'elf',hp:50});
  const result=await f.service.castSpell({accountId:'account-1',characterId:'char-1',school:'nature',requestId:'req-heal-123'});
  assert.equal(result.cast.executed,true);
  assert.equal(result.cast.healing,22);
  assert.equal(f.character.magicCombatState.hp,72);
  assert.equal(f.character.magicCombatState.mana,90);
  assert.equal(f.character.magicProgression.schools.nature.successfulCasts,1);
});

test('server refuses offensive spells when the authoritative target resolver returns no target', async()=>{
  const f=fixture();
  const result=await f.service.castSpell({accountId:'account-1',characterId:'char-1',school:'fire',targetId:'missing',requestId:'req-missing-123'});
  assert.equal(result.cast.executed,false);
  assert.equal(result.cast.reason,'target-required');
  assert.equal(f.character.magicCombatState.mana,100);
});

test('server requires an idempotency request ID and scopes casts to the owning account', async()=>{
  const f=fixture();
  await assert.rejects(()=>f.service.castSpell({accountId:'account-1',characterId:'char-1',school:'fire'}),/request ID/);
  await assert.rejects(()=>f.service.castSpell({accountId:'other',characterId:'char-1',school:'fire',requestId:'req-x-123'}),error=>error.code==='CHARACTER_NOT_FOUND');
});