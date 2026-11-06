import * as Engine from './CombatEngine.js';
import { awardWeaponMastery, getWeaponProgression, getWeaponTechniqueList, recordWeaponTechniqueUse } from './WeaponProgression.js';
import { isMagicSchoolAllowed, getMagicCastMultiplier } from '../magic/MagicSkillTree.js';

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, number(value)));

export function createCombatant(config = {}) {
  const maxHp = Math.max(1, number(config.maxHp, 100));
  const maxStamina = Math.max(0, number(config.maxStamina, 100));
  return {
    id: config.id || `combatant-${Math.random().toString(36).slice(2)}`,
    name: config.name || 'Combattant',
    race: config.race || 'human',
    mana: clamp(config.mana ?? config.maxMana ?? 100, 0, Math.max(0, number(config.maxMana, 100))),
    maxMana: Math.max(0, number(config.maxMana, 100)),
    manaRegenCombat: Math.max(0, number(config.manaRegenCombat, 4)),
    magicDefense: Math.max(0, number(config.magicDefense, 0)),
    resistances: { ...(config.resistances || {}) },
    hp: clamp(config.hp ?? maxHp, 0, maxHp), maxHp,
    stamina: clamp(config.stamina ?? maxStamina, 0, maxStamina), maxStamina,
    staminaRegenCombat: Math.max(0, number(config.staminaRegenCombat, 8)),
    staminaRegenRest: Math.max(0, number(config.staminaRegenRest, 18)),
    physicalStrength: Math.max(0, number(config.physicalStrength, 10)),
    defense: Math.max(0, number(config.defense, 0)),
    fireMastery: Math.max(0, number(config.fireMastery, 0)),
    weapon: config.weapon || null,
    weaponMastery: Math.max(0, number(config.weaponMastery, 0)),
    weaponMasteries: { ...(config.weaponMasteries || {}) },
    weaponMasteryXpByCategory: { ...(config.weaponMasteryXpByCategory || {}) },
    weaponTechniqueXp: { ...(config.weaponTechniqueXp || {}) },
    weaponUses: Math.max(0, number(config.weaponUses, 0)),
    weaponUsesByCategory: { ...(config.weaponUsesByCategory || {}) },
    shields: config.shields || [],
    statusEffects: config.statusEffects || [],
    modifiers: config.modifiers || [],
    defenseState: { blockingUntil: 0, parryUntil: 0, dodgingUntil: 0, counterUntil: 0 },
    cooldowns: Object.create(null),
    defeated: false,
  };
}


const WEAPON_CATEGORIES = new Set(['sword', 'axe', 'hammer', 'polearm']);

export function equipWeapon(combatant, weapon) {
  if (!combatant) throw new Error('A combatant is required.');
  if (weapon == null) {
    combatant.weapon = null;
    return { equipped: true, weapon: null };
  }
  if (!weapon.id || !WEAPON_CATEGORIES.has(weapon.category)) {
    return { equipped: false, reason: 'invalid-weapon-definition' };
  }
  const mastery = number(combatant.weaponMasteries?.[weapon.category], combatant.weaponMastery);
  const requirement = Engine.canUseWeapon({
    physicalStrength: combatant.physicalStrength,
    requiredStrength: weapon.requiredStrength,
    weaponMastery: mastery,
    requiredMastery: weapon.requiredMastery,
  });
  if (!requirement.canUse) return { equipped: false, reason: 'weapon-requirements', requirement };
  combatant.weapon = { ...weapon };
  return { equipped: true, weapon: combatant.weapon, requirement };
}

export function regenerateStamina(combatant, deltaSeconds, inCombat = true) {
  const regen = inCombat ? combatant.staminaRegenCombat : combatant.staminaRegenRest;
  const before = combatant.stamina;
  combatant.stamina = clamp(before + Math.max(0, number(deltaSeconds)) * regen, 0, combatant.maxStamina);
  return { restored: combatant.stamina - before, stamina: combatant.stamina };
}

export function spendStamina(combatant, amount) {
  const cost = Math.max(0, number(amount));
  if (combatant.stamina < cost) return { paid: false, cost, stamina: combatant.stamina };
  combatant.stamina -= cost;
  return { paid: true, cost, stamina: combatant.stamina };
}

export const MAGIC_SPELLS = Object.freeze({
  fire: Object.freeze({ id:'fire-bolt', name:'Trait ardent', kind:'projectile', targetMode:'single', manaCost:8, cooldownMs:900, baseDamage:18, status:{id:'burn',category:'negative',durationMs:3000,tickIntervalMs:1000,tickDamage:3} }),
  water: Object.freeze({ id:'water-jet', name:'Jet d’eau', kind:'projectile', targetMode:'single', manaCost:8, cooldownMs:800, baseDamage:14, status:{id:'soaked',category:'negative',durationMs:3000,slowMultiplier:.65} }),
  wind: Object.freeze({ id:'wind-burst', name:'Onde de vent', kind:'area', targetMode:'area', manaCost:9, cooldownMs:1400, baseDamage:11, knockback:1.5 }),
  earth: Object.freeze({ id:'earth-ward', name:'Égide de pierre', kind:'shield', targetMode:'self', manaCost:12, cooldownMs:5000, shieldCapacity:30, shieldDurationMs:6000 }),
  ice: Object.freeze({ id:'ice-shard', name:'Éclat de givre', kind:'projectile', targetMode:'single', manaCost:9, cooldownMs:1200, baseDamage:14, status:{id:'frozen',category:'negative',durationMs:900} }),
  lightning: Object.freeze({ id:'lightning-arc', name:'Arc électrique', kind:'projectile', targetMode:'single', manaCost:10, cooldownMs:1300, baseDamage:17, status:{id:'shocked',category:'negative',durationMs:2500,tickIntervalMs:1000,tickDamage:2}, stunMs:400 }),
  nature: Object.freeze({ id:'nature-mend', name:'Sève réparatrice', kind:'heal', targetMode:'self', manaCost:10, cooldownMs:1500, healing:20 }),
  light: Object.freeze({ id:'light-purify', name:'Lueur purificatrice', kind:'purify', targetMode:'self', manaCost:10, cooldownMs:1800, healing:20 }),
  demonic: Object.freeze({ id:'demonic-drain', name:'Ponction démoniaque', kind:'drain', targetMode:'single', manaCost:12, cooldownMs:1500, baseDamage:20, lifeSteal:.35 }),
});

export function regenerateMana(combatant, deltaSeconds) {
  const before = combatant.mana;
  const amount = Math.max(0, number(deltaSeconds)) * Math.max(0, number(combatant.manaRegenCombat));
  combatant.mana = clamp(before + amount, 0, combatant.maxMana);
  return { restored: combatant.mana - before, mana: combatant.mana };
}

export function updateCombatantEffects(combatant, now = Date.now()) {
  if (!combatant) return { damageOverTime:0, expiredShields:0 };
  const tick = Engine.tickDamageOverTime(combatant, now);
  const before = combatant.shields.length;
  combatant.shields = combatant.shields.filter(shield => shield.expiresAt == null || shield.expiresAt > now);
  const expiredShields = before - combatant.shields.length;
  if (combatant.hp <= 0) combatant.defeated = true;
  return { damageOverTime:tick.damage, expiredShields, hpRemaining:combatant.hp };
}

export function castMagicSpell(caster, targetOrTargets, school, { now = Date.now(), rng = Math.random } = {}) {
  if (!caster) return { executed:false, reason:'caster-required' };
  const spell = MAGIC_SPELLS[school];
  if (!spell) return { executed:false, reason:'unknown-school' };
  if (!isMagicSchoolAllowed(caster.race || 'human', school)) return { executed:false, reason:'race-school-restriction' };
  if (caster.defeated || caster.hp <= 0) return { executed:false, reason:'caster-defeated' };
  const cooldownKey = `magic:${school}`;
  if ((caster.cooldowns[cooldownKey] || 0) > now) return { executed:false, reason:'cooldown', remainingMs:caster.cooldowns[cooldownKey]-now };
  const selfTarget = spell.targetMode === 'self';
  const targets = selfTarget ? [caster] : (Array.isArray(targetOrTargets) ? targetOrTargets : targetOrTargets ? [targetOrTargets] : []);
  const validTargets = targets.filter(target => target && !target.defeated && target.hp > 0);
  if (!selfTarget && !validTargets.length) return { executed:false, reason:'target-required' };
  if (caster.mana < spell.manaCost) return { executed:false, reason:'insufficient-mana', manaRequired:spell.manaCost };
  if (school === 'nature' && caster.hp >= caster.maxHp) return { executed:false, reason:'target-at-full-health' };
  if (school === 'light' && caster.hp >= caster.maxHp && !(caster.statusEffects || []).some(effect => effect.category === 'negative')) return { executed:false, reason:'target-at-full-health' };

  const supportMultiplier = getMagicCastMultiplier(caster.race || 'human', school, 'support');
  const offenseMultiplier = getMagicCastMultiplier(caster.race || 'human', school, 'offense');
  caster.mana -= spell.manaCost;
  caster.cooldowns[cooldownKey] = now + spell.cooldownMs;

  if (school === 'earth') {
    caster.shields = caster.shields.filter(shield => shield.id !== 'earth-ward');
    const shield = Engine.createShield({ id:'earth-ward', capacity:spell.shieldCapacity, protectionType:'all', sourceId:caster.id, durationMs:spell.shieldDurationMs });
    shield.expiresAt = now + spell.shieldDurationMs;
    caster.shields.push(shield);
    return { executed:true, school, spell, manaSpent:spell.manaCost, shield, targets:[], hit:true };
  }

  if (school === 'nature' || school === 'light') {
    const healing = Engine.applyHealing(caster, spell.healing * supportMultiplier).restored;
    const purified = school === 'light' ? Engine.purifyStatuses(caster, { categories:['negative'] }).removed : 0;
    return { executed:true, school, spell, manaSpent:spell.manaCost, healing, purified, targets:[], hit:healing>0 || purified>0 };
  }

  const resolvedTargets = spell.targetMode === 'area' ? validTargets : [validTargets[0]];
  const results = [];
  for (const target of resolvedTargets) {
    const result = resolveIncomingAttack(caster, target, {
      id:spell.id, kind:'magic', element:school, base:spell.baseDamage * offenseMultiplier,
      relevantPower:0, powerCoefficient:0, techniqueMultiplier:1, schoolMasteryMultiplier:1,
      executionQuality:1, criticalChance:0,
    }, { now, rng });
    let appliedStatus = null;
    if (result.hit && spell.status) {
      appliedStatus = Engine.applyStatus(target, spell.status, now).effect;
      if (school === 'ice') target.frozenUntil = Math.max(target.frozenUntil || 0, now + spell.status.durationMs);
      if (school === 'lightning') target.stunnedUntil = Math.max(target.stunnedUntil || 0, now + spell.stunMs);
    }
    if (target.hp <= 0) target.defeated = true;
    results.push({ targetId:target.id, ...result, appliedStatus });
  }
  const damage = results.reduce((sum, result) => sum + Math.max(0, number(result.hpLost)), 0);
  const hit = results.some(result => result.hit === true);
  let healing = 0;
  if (school === 'demonic' && hit) healing = Engine.applyHealing(caster, damage * spell.lifeSteal).restored;
  return { executed:true, school, spell, manaSpent:spell.manaCost, damage, healing, knockback:school === 'wind' ? spell.knockback : 0, hit, targets:results };
}

export function beginBlock(combatant, { now = Date.now(), durationMs = 600, staminaCost = 4, parryWindowMs = 180 } = {}) {
  const payment = spendStamina(combatant, staminaCost);
  if (!payment.paid) return { started: false, reason: 'insufficient-stamina' };
  combatant.defenseState.blockingUntil = now + Math.max(0, durationMs);
  combatant.defenseState.parryUntil = now + Math.max(0, parryWindowMs);
  return { started: true, blockingUntil: combatant.defenseState.blockingUntil, parryUntil: combatant.defenseState.parryUntil };
}

export function beginDodge(combatant, { now = Date.now(), durationMs = 420, staminaCost = 18 } = {}) {
  const payment = spendStamina(combatant, staminaCost);
  if (!payment.paid) return { started: false, reason: 'insufficient-stamina' };
  combatant.defenseState.dodgingUntil = now + Math.max(0, durationMs);
  return { started: true, dodgingUntil: combatant.defenseState.dodgingUntil };
}

export function openCounterWindow(combatant, now, durationMs = 900) {
  combatant.defenseState.counterUntil = now + Math.max(0, durationMs);
}

export function resolveIncomingAttack(attacker, target, attack, {
  now = Date.now(), balance = {}, blockDamageMultiplier = 0.35, firePhysicalBonus = 0, fireBuffDurationMs = 4000, rng = Math.random,
} = {}) {
  if (target.defeated || target.hp <= 0) return { hit: false, reason: 'target-defeated' };
  updateCombatantEffects(target, now);

  if (attack.element === 'fire') {
    const absorption = Engine.absorbAndIntensifyHostileAttack({
      element: 'fire', defenderFireMastery: target.fireMastery, attackerFireMastery: attacker.fireMastery,
      incomingDamage: attack.base, physicalStatBonus: firePhysicalBonus,
    });
    if (absorption.absorbed) {
      if (firePhysicalBonus > 0) Engine.applyModifier(target, {
        id: 'fire-intensification', stat: 'physicalStrength', category: 'buff',
        value: firePhysicalBonus, durationMs: fireBuffDurationMs,
      }, now);
      return { hit: false, absorbed: true, absorption, hpLost: 0, hpRemaining: target.hp };
    }
  }

  const defense = target.defenseState || {};
  if (defense.dodgingUntil > now) return { hit: false, dodged: true, hpLost: 0, hpRemaining: target.hp };
  if (defense.parryUntil > now) {
    defense.parryUntil = 0;
    defense.blockingUntil = 0;
    openCounterWindow(target, now);
    return { hit: false, parried: true, counterWindowUntil: defense.counterUntil, hpLost: 0, hpRemaining: target.hp };
  }

  let result;
  if (attack.kind === 'physical') {
    result = Engine.calculatePhysicalDamage({ ...attack, defense: target.defense, armor: target.armor, balance, rng });
  } else if (attack.kind === 'magic') {
    result = Engine.calculateMagicDamage({ ...attack, defense: target.magicDefense, resistance: target.resistances?.[attack.element] ?? attack.resistance ?? 0, balance, rng });
  } else {
    throw new Error(`Unsupported attack kind: ${attack.kind}`);
  }
  const blocking = defense.blockingUntil > now;
  const damage = result.damage * (blocking ? clamp(blockDamageMultiplier, 0, 1) : 1);
  const applied = Engine.applyDamage(target, damage, {
    shields: target.shields || [], element: attack.element,
    damageType: attack.kind === 'physical' ? 'physical' : 'magic',
  });
  if (target.hp <= 0) target.defeated = true;
  return { ...result, ...applied, hit: true, blocked: blocking, damageAfterBlock: damage };
}

export function executeAttack(attacker, target, attack, {
  now = Date.now(), balance = {}, rng = Math.random,
} = {}) {
  if (!attacker || !target || !attack) throw new Error('attacker, target and attack are required.');
  if (attacker.defeated || attacker.hp <= 0) return { executed: false, reason: 'attacker-defeated' };
  if (target.defeated || target.hp <= 0) return { executed: false, reason: 'target-defeated' };
  if (attacker.cooldowns[attack.id] > now) return { executed: false, reason: 'cooldown' };
  if (attacker.defenseState.counterUntil > 0 && attacker.defenseState.counterUntil <= now) attacker.defenseState.counterUntil = 0;
  if (attack.counterOnly && attacker.defenseState.counterUntil <= now) return { executed: false, reason: 'counter-window-closed' };
  const usesPhysicalWeapon = attack.kind !== 'magic' && attack.kind !== 'spell';
  const weapon = usesPhysicalWeapon ? (attack.weapon || attacker.weapon || null) : null;
  if (weapon) {
    const mastery = number(attacker.weaponMasteries?.[weapon.category], attacker.weaponMastery);
    const requirement = Engine.canUseWeapon({
      physicalStrength: attacker.physicalStrength, requiredStrength: weapon.requiredStrength,
      weaponMastery: mastery, requiredMastery: weapon.requiredMastery,
    });
    if (!requirement.canUse) return { executed: false, reason: 'weapon-requirements', requirement };
  }
  const category = weapon?.category || null;
  const technique = category && attack.techniqueId
    ? getWeaponTechniqueList(category, attacker.weaponMasteries?.[category] || attacker.weaponMastery, attacker.weaponTechniqueXp || {}).find(item => item.id === attack.techniqueId)
    : null;
  if (attack.techniqueId && (!technique || !technique.unlocked)) return { executed: false, reason: 'technique-locked', requiredMastery: technique?.requiredMastery ?? null };
  const staminaCost = Math.max(0, number(attack.staminaCost) * (technique?.staminaCostMultiplier || 1));
  const payment = spendStamina(attacker, staminaCost);
  if (!payment.paid) return { executed: false, reason: 'insufficient-stamina' };
  const effectiveAttack = weapon ? {
    ...attack,
    weaponPower: attack.weaponPower ?? weapon.power ?? 0,
    weaponCategory: attack.weaponCategory || weapon.category,
    techniqueMultiplier: number(attack.techniqueMultiplier, 1) * (technique?.powerMultiplier || 1),
  } : attack;
  const result = Engine.resolveAttack({ attacker, target, attack: effectiveAttack, balance, rng });
  let weaponProgression = null;
  let techniqueProgression = null;
  if (weapon) {
    attacker.weaponUses += 1;
    attacker.weaponUsesByCategory[category] = (attacker.weaponUsesByCategory[category] || 0) + 1;
    weaponProgression = awardWeaponMastery(attacker, category, attack.attackType || 'light', attack.masteryXp ?? null);
    if (attack.techniqueId) techniqueProgression = recordWeaponTechniqueUse(attacker, category, attack.techniqueId);
  }
  attacker.defenseState.counterUntil = 0;
  if (target.hp <= 0) target.defeated = true;
  return { executed: true, ...result, weaponCategory: effectiveAttack.weaponCategory || null, staminaSpent: payment.cost, weaponProgression, techniqueProgression };
}

export { getWeaponProgression };
