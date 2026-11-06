import * as Engine from './CombatEngine.js';
import { awardWeaponMastery, getWeaponProgression, getWeaponTechniqueList, recordWeaponTechniqueUse } from './WeaponProgression.js';

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, number(value)));

export function createCombatant(config = {}) {
  const maxHp = Math.max(1, number(config.maxHp, 100));
  const maxStamina = Math.max(0, number(config.maxStamina, 100));
  return {
    id: config.id || `combatant-${Math.random().toString(36).slice(2)}`,
    name: config.name || 'Combattant',
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
