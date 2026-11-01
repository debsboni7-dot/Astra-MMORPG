import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../prototype/src/combat/CombatEngine.js';

test('physical damage applies diminishing-return defense', () => {
  const r = C.calculatePhysicalDamage({ base: 100, defense: 100, balance: { defenseK: 100 }, rng: () => 1 });
  assert.equal(r.damage, 50);
});
test('elemental resistance and weakness modify damage', () => {
  assert.equal(C.calculateMagicDamage({ base: 100, resistance: .25, rng: () => 1 }).damage, 75);
  assert.equal(C.calculateMagicDamage({ base: 100, resistance: -.5, rng: () => 1 }).damage, 150);
});
test('resistance is capped by configuration', () => {
  const r = C.calculateMagicDamage({ base: 100, resistance: 1, balance: { maxResistance: .9 }, rng: () => 1 });
  assert.equal(r.damage, 10);
});
test('critical chance is clamped and deterministic with injected RNG', () => {
  assert.equal(C.calculateCritical({ chance: 2, rng: () => 0 }).critical, true);
  assert.equal(C.calculateCritical({ chance: -1, rng: () => 0 }).critical, false);
});
test('execution quality is bounded by balance configuration', () => {
  const low = C.calculatePhysicalDamage({ base: 100, executionQuality: 0, rng: () => 1 });
  const high = C.calculatePhysicalDamage({ base: 100, executionQuality: 5, rng: () => 1 });
  assert.equal(low.damage, 75);
  assert.equal(high.damage, 125);
});
test('shields absorb matching damage before HP', () => {
  const target = { hp: 100 };
  const shield = C.createShield({ id: 'ward', capacity: 30, protectionType: 'physical' });
  const result = C.applyDamage(target, 50, { shields: [shield], damageType: 'physical' });
  assert.equal(result.hpLost, 20);
  assert.equal(shield.remaining, 0);
});
test('element-specific shield does not absorb a different element', () => {
  const target = { hp: 100 };
  const shield = C.createShield({ id: 'frost', capacity: 40, protectionType: 'ice' });
  C.applyDamage(target, 20, { shields: [shield], element: 'fire', damageType: 'magic' });
  assert.equal(shield.remaining, 40);
  assert.equal(target.hp, 80);
});
test('healing is capped at maximum HP and reports overheal', () => {
  const target = { hp: 90, maxHp: 100 };
  const result = C.applyHealing(target, 50);
  assert.equal(result.restored, 10);
  assert.equal(result.overheal, 40);
  assert.equal(target.hp, 100);
});
test('reapplying burn extends duration without increasing intensity', () => {
  const target = { statusEffects: [] };
  C.applyStatus(target, { id: 'burn', durationMs: 5000, intensity: 2 }, 1000);
  const result = C.applyStatus(target, { id: 'burn', durationMs: 3000, intensity: 9 }, 2000);
  assert.equal(result.effect.intensity, 2);
  assert.equal(result.effect.expiresAt, 9000);
});
test('damage over time starts at the first interval', () => {
  const target = { hp: 100, statusEffects: [] };
  C.applyStatus(target, { id: 'poison', durationMs: 5000, tickDamage: 4, tickIntervalMs: 1000 }, 0);
  assert.equal(C.tickDamageOverTime(target, 999).damage, 0);
  assert.equal(C.tickDamageOverTime(target, 1000).damage, 4);
  assert.equal(target.hp, 96);
});
test('expired damage-over-time effect is removed without ticking', () => {
  const target = { hp: 100, statusEffects: [{ id: 'poison', expiresAt: 1000, nextTickAt: 500, tickDamage: 10, intensity: 1, tickIntervalMs: 500 }] };
  assert.equal(C.tickDamageOverTime(target, 1000).damage, 0);
  assert.equal(target.statusEffects.length, 0);
  assert.equal(target.hp, 100);
});
test('purification removes only selected categories', () => {
  const target = { statusEffects: [{ id: 'burn', category: 'dot' }, { id: 'slow', category: 'control' }] };
  assert.equal(C.purifyStatuses(target, { categories: ['dot'] }).removed, 1);
  assert.equal(target.statusEffects[0].id, 'slow');
});
test('strongest same-group modifier wins rather than stacking', () => {
  const target = { modifiers: [] };
  C.applyModifier(target, { id: 'small', stat: 'strength', category: 'buff', value: 20, durationMs: 10000 }, 0);
  C.applyModifier(target, { id: 'large', stat: 'strength', category: 'buff', value: 35, durationMs: 5000 }, 0);
  assert.equal(C.getModifiedStat(100, target.modifiers, 'strength', 1), 135);
});
test('buff and debuff categories can coexist on the same stat', () => {
  const target = { modifiers: [] };
  C.applyModifier(target, { id: 'buff', stat: 'strength', category: 'buff', value: 20, durationMs: 10000 }, 0);
  C.applyModifier(target, { id: 'debuff', stat: 'strength', category: 'debuff', value: -10, durationMs: 10000 }, 0);
  assert.equal(C.getModifiedStat(100, target.modifiers, 'strength', 1), 110);
});
test('fire absorption requires strictly greater fire mastery', () => {
  assert.equal(C.absorbAndIntensifyHostileAttack({ element: 'fire', defenderFireMastery: 11, attackerFireMastery: 10, incomingDamage: 40 }).absorbed, true);
  assert.equal(C.absorbAndIntensifyHostileAttack({ element: 'fire', defenderFireMastery: 10, attackerFireMastery: 10, incomingDamage: 40 }).absorbed, false);
});
test('no element other than fire can be absorbed and intensified', () => {
  for (const element of ['water', 'wind', 'earth', 'ice', 'lightning', 'nature']) {
    assert.equal(C.absorbAndIntensifyHostileAttack({ element, defenderFireMastery: 99, attackerFireMastery: 1, incomingDamage: 40 }).absorbed, false);
  }
});
test('weapon use requires both strength and category mastery', () => {
  assert.equal(C.canUseWeapon({ physicalStrength: 100, requiredStrength: 50, weaponMastery: 2, requiredMastery: 3 }).canUse, false);
  assert.equal(C.canUseWeapon({ physicalStrength: 49, requiredStrength: 50, weaponMastery: 9, requiredMastery: 3 }).canUse, false);
  assert.equal(C.canUseWeapon({ physicalStrength: 50, requiredStrength: 50, weaponMastery: 3, requiredMastery: 3 }).canUse, true);
});
test('resolveAttack applies calculated physical damage to target', () => {
  const target = { hp: 100, shields: [] };
  const result = C.resolveAttack({ attacker: { id: 'a' }, target, attack: { kind: 'physical', base: 25 }, rng: () => 1 });
  assert.equal(result.hpLost, 25);
  assert.equal(target.hp, 75);
});
test('resolveAttack rejects unsupported attack kinds', () => {
  assert.throws(() => C.resolveAttack({ attacker: {}, target: {}, attack: { kind: 'unknown' } }), /Unsupported attack kind/);
});
