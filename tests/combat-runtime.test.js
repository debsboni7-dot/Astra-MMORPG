import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatant, regenerateStamina, beginBlock, beginDodge, resolveIncomingAttack, executeAttack, equipWeapon, getWeaponProgression } from '../prototype/src/combat/CombatRuntime.js';

test('combatants have bounded HP and stamina resources', () => {
  const c = createCombatant({ hp: 140, maxHp: 100, stamina: -5, maxStamina: 80 });
  assert.equal(c.hp, 100);
  assert.equal(c.stamina, 0);
});
test('stamina regenerates slower in combat than at rest', () => {
  const c = createCombatant({ stamina: 0, maxStamina: 100, staminaRegenCombat: 5, staminaRegenRest: 15 });
  assert.equal(regenerateStamina(c, 2, true).stamina, 10);
  assert.equal(regenerateStamina(c, 2, false).stamina, 40);
});
test('block spends stamina and reduces incoming damage', () => {
  const defender = createCombatant({ hp: 100, stamina: 50 });
  const attacker = createCombatant();
  assert.equal(beginBlock(defender, { now: 1000, staminaCost: 5 }).started, true);
  const result = resolveIncomingAttack(attacker, defender, { kind: 'physical', base: 40 }, { now: 1300, blockDamageMultiplier: .25, rng: () => 1 });
  assert.equal(result.blocked, true);
  assert.equal(result.hpLost, 10);
  assert.equal(defender.stamina, 45);
});
test('perfect parry cancels damage and opens a manual counter window', () => {
  const defender = createCombatant({ hp: 100 });
  const resultStart = beginBlock(defender, { now: 1000, staminaCost: 0, parryWindowMs: 180 });
  assert.equal(resultStart.started, true);
  const result = resolveIncomingAttack(createCombatant(), defender, { kind: 'physical', base: 90 }, { now: 1150, rng: () => 1 });
  assert.equal(result.parried, true);
  assert.equal(defender.hp, 100);
  assert.ok(defender.defenseState.counterUntil > 1150);
});
test('dodge avoids attacks only during its active window', () => {
  const defender = createCombatant();
  beginDodge(defender, { now: 1000, durationMs: 400, staminaCost: 0 });
  assert.equal(resolveIncomingAttack(createCombatant(), defender, { kind: 'physical', base: 10 }, { now: 1200 }).dodged, true);
  assert.equal(resolveIncomingAttack(createCombatant(), defender, { kind: 'physical', base: 10 }, { now: 1500, rng: () => 1 }).hit, true);
});
test('fire absorption cancels incoming fire and grants configured strength buff', () => {
  const defender = createCombatant({ fireMastery: 11, hp: 100 });
  const attacker = createCombatant({ fireMastery: 10 });
  const result = resolveIncomingAttack(attacker, defender, { kind: 'magic', element: 'fire', base: 40 }, { now: 1000, firePhysicalBonus: 7, rng: () => 1 });
  assert.equal(result.absorbed, true);
  assert.equal(defender.hp, 100);
  assert.equal(defender.modifiers[0].value, 7);
});
test('fire absorption cannot trigger for ice or equal mastery', () => {
  const defender = createCombatant({ fireMastery: 11 });
  const attacker = createCombatant({ fireMastery: 10 });
  assert.equal(resolveIncomingAttack(attacker, defender, { kind: 'magic', element: 'ice', base: 20 }, { now: 1000 }).absorbed, undefined);
  assert.equal(resolveIncomingAttack(createCombatant({ fireMastery: 11 }), defender, { kind: 'magic', element: 'fire', base: 20 }, { now: 1000 }).absorbed, undefined);
});
test('attacks require both weapon strength and category mastery', () => {
  const player = createCombatant({ physicalStrength: 100, weaponMastery: 2, stamina: 100 });
  const enemy = createCombatant({ hp: 100 });
  const result = executeAttack(player, enemy, { id: 'heavy-sword', kind: 'physical', base: 20, weapon: { requiredStrength: 50, requiredMastery: 3 } }, { rng: () => 1 });
  assert.equal(result.executed, false);
  assert.equal(result.reason, 'weapon-requirements');
  assert.equal(enemy.hp, 100);
});
test('attack spends stamina and updates target HP', () => {
  const player = createCombatant({ stamina: 100 });
  const enemy = createCombatant({ hp: 100 });
  const result = executeAttack(player, enemy, { id: 'quick', kind: 'physical', base: 20, staminaCost: 8 }, { rng: () => 1 });
  assert.equal(result.executed, true);
  assert.equal(result.hpLost, 20);
  assert.equal(player.stamina, 92);
});
test('counterattack must be manually executed before the window closes', () => {
  const player = createCombatant();
  const enemy = createCombatant();
  assert.equal(executeAttack(player, enemy, { id: 'counter', kind: 'physical', base: 5, counterOnly: true }, { now: 1000 }).reason, 'counter-window-closed');
  player.defenseState.counterUntil = 1800;
  assert.equal(executeAttack(player, enemy, { id: 'counter', kind: 'physical', base: 5, counterOnly: true }, { now: 1200, rng: () => 1 }).executed, true);
});


test('equipping a weapon enforces strength and category mastery independently', () => {
  const player = createCombatant({ physicalStrength: 80, weaponMasteries: { sword: 4, axe: 1 } });
  const sword = { id: 'iron-sword', category: 'sword', power: 12, requiredStrength: 50, requiredMastery: 3 };
  const axe = { id: 'battle-axe', category: 'axe', power: 18, requiredStrength: 40, requiredMastery: 2 };
  assert.equal(equipWeapon(player, sword).equipped, true);
  const rejected = equipWeapon(player, axe);
  assert.equal(rejected.equipped, false);
  assert.equal(rejected.requirement.masteryMet, false);
  assert.equal(player.weapon.id, 'iron-sword');
});

test('equipped weapon supplies power, category and per-category usage tracking', () => {
  const player = createCombatant({ physicalStrength: 50, weaponMasteries: { hammer: 2 }, stamina: 100 });
  const enemy = createCombatant({ hp: 100 });
  equipWeapon(player, { id: 'training-hammer', category: 'hammer', power: 15, requiredStrength: 30, requiredMastery: 1 });
  const result = executeAttack(player, enemy, { id: 'hammer-hit', kind: 'physical', base: 10, strength: 0, staminaCost: 0 }, { rng: () => 1 });
  assert.equal(result.executed, true);
  assert.equal(result.rawDamage, 25);
  assert.equal(result.weaponCategory, 'hammer');
  assert.equal(player.weaponUses, 1);
  assert.equal(player.weaponUsesByCategory.hammer, 1);
});

test('unequipping a weapon restores unarmed attack and invalid definitions are rejected', () => {
  const player = createCombatant({ physicalStrength: 50, weaponMastery: 5 });
  assert.equal(equipWeapon(player, { id: 'bad', category: 'wand' }).reason, 'invalid-weapon-definition');
  equipWeapon(player, { id: 'sword', category: 'sword', requiredStrength: 1, requiredMastery: 1 });
  assert.equal(equipWeapon(player, null).equipped, true);
  assert.equal(player.weapon, null);
});

test('weapon mastery grows through valid use and higher ranks need more experience', () => {
  const player = createCombatant({ physicalStrength: 50, stamina: 1000 });
  const enemy = createCombatant({ hp: 100000 });
  equipWeapon(player, { id: 'training-sword', category: 'sword', power: 1, requiredStrength: 1, requiredMastery: 0 });
  for (let i = 0; i < 12; i++) {
    const result = executeAttack(player, enemy, { id: 'practice-' + i, kind: 'physical', base: 1, staminaCost: 0, attackType: 'light' }, { rng: () => 1 });
    assert.equal(result.executed, true);
  }
  assert.equal(player.weaponMasteries.sword, 1);
  assert.equal(player.weaponUsesByCategory.sword, 12);
  assert.equal(getWeaponProgression(player, 'sword').mastery.xpRemaining, 14);
});

test('heavy attacks grant more weapon mastery than light attacks', () => {
  const player = createCombatant({ physicalStrength: 50 });
  const enemy = createCombatant({ hp: 1000 });
  equipWeapon(player, { id: 'training-axe', category: 'axe', power: 1, requiredStrength: 1, requiredMastery: 0 });
  const result = executeAttack(player, enemy, { id: 'heavy', kind: 'physical', base: 1, staminaCost: 0, attackType: 'heavy' }, { rng: () => 1 });
  assert.equal(result.weaponProgression.awarded, 1.5);
});

test('category mastery automatically unlocks techniques at milestones', () => {
  const player = createCombatant({ weaponMasteries: { sword: 2 }, weaponMasteryXpByCategory: { sword: 42 } });
  const progression = getWeaponProgression(player, 'sword');
  assert.equal(progression.mastery.level, 3);
  assert.equal(progression.techniques[0].unlocked, true);
  assert.equal(progression.techniques[1].unlocked, false);
});

test('locked techniques are rejected and unlocked techniques gain separate mastery', () => {
  const player = createCombatant({ physicalStrength: 50, weaponMasteries: { sword: 3 } });
  const enemy = createCombatant({ hp: 1000 });
  equipWeapon(player, { id: 'starter-sword', category: 'sword', power: 1, requiredStrength: 1, requiredMastery: 0 });
  const locked = executeAttack(player, enemy, { id: 'locked', kind: 'physical', base: 1, staminaCost: 0, techniqueId: 'riposte' }, { rng: () => 1 });
  assert.equal(locked.executed, false);
  assert.equal(locked.reason, 'technique-locked');
  for (let i = 0; i < 3; i++) {
    const result = executeAttack(player, enemy, { id: 'quick-' + i, kind: 'physical', base: 1, staminaCost: 0, techniqueId: 'quick_slash' }, { rng: () => 1 });
    assert.equal(result.executed, true);
  }
  assert.equal(player.weaponTechniqueXp.quick_slash, 3);
  assert.equal(getWeaponProgression(player, 'sword').techniques[0].techniqueMasteryLevel, 1);
});

test('technique mastery improves damage and reduces stamina cost with a ten percent cap', () => {
  const player = createCombatant({ physicalStrength: 50, weaponMasteries: { sword: 3 }, weaponTechniqueXp: { quick_slash: 40 }, stamina: 100 });
  const enemy = createCombatant({ hp: 1000 });
  equipWeapon(player, { id: 'starter-sword', category: 'sword', power: 1, requiredStrength: 1, requiredMastery: 0 });
  const result = executeAttack(player, enemy, { id: 'mastered', kind: 'physical', base: 10, staminaCost: 10, techniqueId: 'quick_slash' }, { rng: () => 1 });
  assert.ok(Math.abs(result.rawDamage - 12.1) < 1e-9);
  assert.equal(result.staminaSpent, 9);
  assert.equal(player.weaponTechniqueXp.quick_slash, 41);
});

test('failed attacks do not grant weapon mastery', () => {
  const player = createCombatant({ physicalStrength: 50, stamina: 0 });
  const enemy = createCombatant({ hp: 100 });
  equipWeapon(player, { id: 'sword', category: 'sword', power: 1, requiredStrength: 1, requiredMastery: 0 });
  const result = executeAttack(player, enemy, { id: 'costly', kind: 'physical', base: 1, staminaCost: 10 }, { rng: () => 1 });
  assert.equal(result.reason, 'insufficient-stamina');
  assert.equal(player.weaponMasteryXpByCategory.sword, undefined);
  assert.equal(player.weaponUses, 0);
});

test('magic attacks do not increase physical weapon mastery', () => {
  const player = createCombatant({ physicalStrength: 50 });
  const enemy = createCombatant({ hp: 1000 });
  equipWeapon(player, { id: 'training-sword', category: 'sword', power: 8, requiredStrength: 1, requiredMastery: 0 });
  const result = executeAttack(player, enemy, { id: 'fire-bolt', kind: 'magic', element: 'fire', base: 12, staminaCost: 0 }, { rng: () => 1 });
  assert.equal(result.executed, true);
  assert.equal(player.weaponUses, 0);
  assert.equal(player.weaponMasteryXpByCategory.sword, undefined);
});
