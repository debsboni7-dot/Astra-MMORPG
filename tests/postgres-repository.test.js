import test from 'node:test';
import assert from 'node:assert/strict';
import { createPostgresRepository } from '../server/db/PostgresRepository.js';

function fakePool(){
  const queries=[];
  const character={id:'char-1',accountId:'account-1',characterData:{race:'elf'},weaponProgression:{},magicProgression:{race:'elf'},magicCombatState:{mana:100}};
  const client={
    async query(sql,params=[]){queries.push({sql,params});if(sql.includes('SELECT id,account_id'))return {rows:[structuredClone(character)]};return {rows:[]};},
    release(){queries.push({sql:'RELEASE',params:[]});},
  };
  const pool={
    async query(sql,params=[]){queries.push({sql,params});if(sql.includes('INSERT INTO characters'))return {rows:[{id:'char-1',displayName:params[1],characterData:JSON.parse(params[2])}]};if(sql.includes('SELECT id,display_name'))return {rows:[{id:'char-1',displayName:'Sylve',race:'elf'}]};return {rows:[]};},
    async connect(){return client;},
  };
  return {repository:createPostgresRepository(pool),queries};
}

test('PostgreSQL character creation persists the selected race in character_data',async()=>{
  const {repository,queries}=fakePool();
  const character=await repository.createCharacter('account-1','Sylve','elf');
  assert.deepEqual(character.characterData,{race:'elf'});
  const insert=queries.find(q=>q.sql.includes('INSERT INTO characters'));
  assert.match(insert.sql,/character_data/);
  assert.deepEqual(JSON.parse(insert.params[2]),{race:'elf'});
});

test('character transaction locks and loads race, magic combat state and writes them atomically',async()=>{
  const {repository,queries}=fakePool();
  const result=await repository.withCharacterTransaction('account-1','char-1',async(character,saveProgression,saveCombatState)=>{
    assert.equal(character.characterData.race,'elf');
    assert.equal(character.magicCombatState.mana,100);
    await saveProgression({race:'elf',schools:{}},'magic');
    await saveCombatState({hp:80,mana:90});
    return 'saved';
  });
  assert.equal(result,'saved');
  assert.ok(queries.some(q=>q.sql==='BEGIN'));
  assert.ok(queries.some(q=>q.sql.includes('FOR UPDATE')));
  assert.ok(queries.some(q=>q.sql.includes('UPDATE characters SET magic_progression')));
  assert.ok(queries.some(q=>q.sql.includes('UPDATE characters SET magic_combat_state')));
  assert.ok(queries.some(q=>q.sql==='COMMIT'));
  assert.ok(queries.some(q=>q.sql==='RELEASE'));
});
