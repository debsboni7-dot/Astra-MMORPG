import { createCombatant, castMagicSpell, regenerateMana, updateCombatantEffects } from '../../prototype/src/combat/CombatRuntime.js';
import { createMagicProgression, sanitizeMagicProgression, recordMagicSkillUse } from '../../prototype/src/magic/MagicSkillTree.js';

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,finite(value)));
const clone=value=>structuredClone(value);
const SELF_SCHOOLS=new Set(['earth','nature','light']);
const REQUEST_ID=/^[A-Za-z0-9_-]{8,128}$/;

export function createMagicCombatService(repository,{resolveTargets=null,now=Date.now,rng=Math.random}={}){
 if(!repository||typeof repository.withCharacterTransaction!=='function')throw new TypeError('Magic combat repository requires withCharacterTransaction.');
 if(resolveTargets!==null&&typeof resolveTargets!=='function')throw new TypeError('resolveTargets must be a trusted server resolver.');
 function sanitizeCombatState(value={}){
  const maxHp=clamp(value.maxHp??100,1,1000000000);
  const maxMana=clamp(value.maxMana??100,0,1000000000);
  const cooldowns={};
  for(const [key,until] of Object.entries(value.cooldowns||{}))if(/^magic:(fire|water|wind|earth|ice|lightning|nature|light|demonic)$/.test(key)&&Number.isFinite(Number(until)))cooldowns[key]=Math.max(0,Number(until));
  const shields=Array.isArray(value.shields)?value.shields.filter(item=>item&&typeof item.id==='string').slice(0,16).map(item=>({id:item.id,remaining:clamp(item.remaining,0,1000000000),protectionType:typeof item.protectionType==='string'?item.protectionType:'all',sourceId:typeof item.sourceId==='string'?item.sourceId:null,expiresAt:Math.max(0,finite(item.expiresAt))})):[];
  const allowedStatuses=new Set(['burn','soaked','frozen','shocked']);
  const statusEffects=Array.isArray(value.statusEffects)?value.statusEffects.filter(item=>item&&allowedStatuses.has(item.id)).slice(0,32).map(item=>({...item,expiresAt:Math.max(0,finite(item.expiresAt)),nextTickAt:Math.max(0,finite(item.nextTickAt)),tickDamage:clamp(item.tickDamage,0,1000000)})):[];
  const processedRequests=Array.isArray(value.processedRequests)?[...new Set(value.processedRequests.filter(id=>typeof id==='string'&&id.length<=128))].slice(-1000):[];
  return {schemaVersion:1,hp:clamp(value.hp??maxHp,0,maxHp),maxHp,mana:clamp(value.mana??maxMana,0,maxMana),maxMana,manaRegenCombat:clamp(value.manaRegenCombat??4,0,1000),lastUpdatedAt:Math.max(0,finite(value.lastUpdatedAt)),cooldowns,shields,statusEffects,modifiers:Array.isArray(value.modifiers)?value.modifiers.slice(0,32):[],processedRequests};
 }
 function snapshot(caster,state,nowMs){
  return sanitizeCombatState({...state,hp:caster.hp,mana:caster.mana,cooldowns:caster.cooldowns,shields:caster.shields,statusEffects:caster.statusEffects,modifiers:caster.modifiers,lastUpdatedAt:nowMs});
 }
 async function transact(accountId,characterId,operation){
  if(!accountId||!characterId)throw new Error('Authenticated account and character are required.');
  return repository.withCharacterTransaction(accountId,characterId,async(character,saveProgression,saveCombatState)=>{
   if(!character||character.accountId!==accountId||character.id!==characterId)throw Object.assign(new Error('Character ownership validation failed.'),{code:'CHARACTER_NOT_FOUND'});
   const race=character.characterData?.race||character.race||character.magicProgression?.race||'human';
   const progression=sanitizeMagicProgression(character.magicProgression||createMagicProgression(race),race);
   const state=sanitizeCombatState(character.magicCombatState||{maxHp:100,hp:100,maxMana:100,mana:100,manaRegenCombat:4});
   return operation({character,race,progression,state,saveProgression,saveCombatState});
  });
 }
 return Object.freeze({
  async getSnapshot(accountId,characterId){
   return transact(accountId,characterId,async({race,progression,state})=>({race,progression:clone(progression),combat:clone(state)}));
  },
  async castSpell({accountId,characterId,school,targetId=null,requestId}){
   if(typeof requestId!=='string'||!REQUEST_ID.test(requestId))throw new TypeError('A valid idempotency request ID is required.');
   return transact(accountId,characterId,async({character,race,progression,state,saveProgression,saveCombatState})=>{
    if(state.processedRequests.includes(requestId))return {cast:{executed:false,reason:'duplicate-request'},combat:clone(state),progression:clone(progression)};
    const nowMs=Math.max(0,finite(now(),Date.now()));
    const caster=createCombatant({...state,id:characterId,race,fireMastery:progression.schools.fire.level});
    caster.cooldowns={...state.cooldowns};
    const elapsed=Math.max(0,nowMs-state.lastUpdatedAt)/1000;
    regenerateMana(caster,elapsed);
    updateCombatantEffects(caster,nowMs);
    let resolved={targets:[],persist:null};
    if(!SELF_SCHOOLS.has(school)&&resolveTargets){
      const value=await resolveTargets({character,race,school,targetId,now:nowMs});
      resolved=Array.isArray(value)?{targets:value,persist:null}:value||resolved;
    }
    const cast=castMagicSpell(caster,SELF_SCHOOLS.has(school)?null:(resolved.targets||[]),school,{now:nowMs,rng});
    if(!cast.executed)return {cast,combat:clone(state),progression:clone(progression)};
    const nextState=snapshot(caster,state,nowMs);
    nextState.processedRequests.push(requestId);
    nextState.processedRequests=nextState.processedRequests.slice(-1000);
    let nextProgression=progression,progressionResult=null;
    if(cast.hit){
      const recorded=recordMagicSkillUse(progression,race,school,null);
      if(recorded.recorded){nextProgression=recorded.progression;nextProgression.processedEvents.push(`cast:${requestId}`);nextProgression.processedEvents=nextProgression.processedEvents.slice(-1000);progressionResult={recorded:true,schoolXp:recorded.schoolXp,schoolLevel:recorded.schoolLevel,newlyUnlocked:recorded.newlyUnlocked};}
    }
    if(typeof saveCombatState!=='function')throw new TypeError('Transactional magic combat state writer is required.');
    await saveCombatState(nextState);
    if(nextProgression!==progression){
      if(typeof saveProgression!=='function')throw new TypeError('Transactional magic progression writer is required.');
      await saveProgression(nextProgression,'magic');
    }
    if(typeof resolved.persist==='function')await resolved.persist();
    return {cast,combat:clone(nextState),progression:clone(nextProgression),progressionResult};
   });
  },
 });
}

export { SELF_SCHOOLS };