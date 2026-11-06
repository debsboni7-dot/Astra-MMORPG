import test from 'node:test';
import assert from 'node:assert/strict';
import * as CombatRuntime from '../prototype/src/combat/CombatRuntime.js';

const { createCombatant } = CombatRuntime;

test('combatants start with a bounded mana resource and combat regeneration', () => {
  const caster = createCombatant({ mana: 150, maxMana: 100, manaRegenCombat: 6 });
  assert.equal(caster.maxMana, 100);
  assert.equal(caster.mana, 100);
  assert.equal(caster.manaRegenCombat, 6);
});

test('mana regenerates over delta time without exceeding its maximum', () => {
  const caster = createCombatant({ mana: 20, maxMana: 100, manaRegenCombat: 5 });
  assert.equal(typeof CombatRuntime.regenerateMana, 'function');
  assert.deepEqual(CombatRuntime.regenerateMana(caster, 3), { restored: 15, mana: 35 });
  assert.deepEqual(CombatRuntime.regenerateMana(caster, 30), { restored: 65, mana: 100 });
});

test('fire spell deals damage, applies burn and consumes mana only after validation', () => {
  const caster = createCombatant({ id: 'mage', race: 'human', mana: 100, maxMana: 100 });
  const target = createCombatant({ id: 'target', hp: 100, maxHp: 100 });
  assert.equal(typeof CombatRuntime.castMagicSpell, 'function');
  const result = CombatRuntime.castMagicSpell(caster, target, 'fire', { now: 1000, rng: () => 1 });
  assert.equal(result.executed, true);
  assert.ok(result.damage > 0);
  assert.ok(target.statusEffects.some(effect => effect.id === 'burn'));
  assert.equal(caster.mana, 92);
});

test('earth spell creates a timed shield on the caster without requiring an enemy target', () => {
  const caster = createCombatant({ id: 'earth-mage', race: 'dwarf', mana: 100, maxMana: 100 });
  const result = CombatRuntime.castMagicSpell(caster, null, 'earth', { now: 1000 });
  assert.equal(result.executed, true);
  assert.equal(result.shield.remaining, 30);
  assert.equal(result.shield.protectionType, 'all');
  assert.equal(caster.shields.length, 1);
});

test('nature spell heals the caster but cannot be used to farm progression at full health', () => {
  const caster = createCombatant({ race: 'elf', hp: 78, maxHp: 100, mana: 100, maxMana: 100 });
  const result = CombatRuntime.castMagicSpell(caster, null, 'nature', { now: 1000 });
  assert.equal(result.executed, true);
  assert.equal(result.healing, 22);
  assert.equal(caster.hp, 100);
  const manaAfterHeal = caster.mana;
  const rejected = CombatRuntime.castMagicSpell(caster, null, 'nature', { now: 4000 });
  assert.equal(rejected.reason, 'target-at-full-health');
  assert.equal(caster.mana, manaAfterHeal);
});

test('race restrictions, cooldowns, missing targets and insufficient mana reject casts without spending mana', () => {
  const elf = createCombatant({ race: 'elf', mana: 100, maxMana: 100 });
  assert.equal(CombatRuntime.castMagicSpell(elf, null, 'demonic', { now: 1000 }).reason, 'race-school-restriction');
  const caster = createCombatant({ race: 'human', mana: 100, maxMana: 100 });
  assert.equal(CombatRuntime.castMagicSpell(caster, null, 'fire', { now: 1000 }).reason, 'target-required');
  const target = createCombatant();
  assert.equal(CombatRuntime.castMagicSpell(caster, target, 'fire', { now: 1000 }).executed, true);
  const mana = caster.mana;
  assert.equal(CombatRuntime.castMagicSpell(caster, target, 'fire', { now: 1100 }).reason, 'cooldown');
  assert.equal(caster.mana, mana);
  const poor = createCombatant({ race: 'human', mana: 1, maxMana: 100 });
  assert.equal(CombatRuntime.castMagicSpell(poor, target, 'fire', { now: 1000 }).reason, 'insufficient-mana');
  assert.equal(poor.mana, 1);
});

test('wind hits every target in its area and applies knockback metadata', () => {
  const caster = createCombatant({ race: 'human', mana: 100, maxMana: 100 });
  const first = createCombatant({ hp: 100, maxHp: 100 });
  const second = createCombatant({ hp: 100, maxHp: 100 });
  const result = CombatRuntime.castMagicSpell(caster, [first, second], 'wind', { now: 1000, rng: () => 1 });
  assert.equal(result.executed, true);
  assert.equal(result.targets.length, 2);
  assert.ok(first.hp < 100 && second.hp < 100);
  assert.equal(result.knockback, 1.5);
});

test('water slows, ice freezes, and lightning shocks and briefly stuns targets', () => {
  const caster = createCombatant({ race: 'human', mana: 100, maxMana: 100 });
  const waterTarget = createCombatant();
  const iceTarget = createCombatant();
  const lightningTarget = createCombatant();
  CombatRuntime.castMagicSpell(caster, waterTarget, 'water', { now: 1000, rng: () => 1 });
  CombatRuntime.castMagicSpell(caster, iceTarget, 'ice', { now: 3000, rng: () => 1 });
  CombatRuntime.castMagicSpell(caster, lightningTarget, 'lightning', { now: 5000, rng: () => 1 });
  assert.ok(waterTarget.statusEffects.some(effect => effect.id === 'soaked'));
  assert.equal(iceTarget.frozenUntil, 3900);
  assert.equal(lightningTarget.stunnedUntil, 5400);
  assert.ok(lightningTarget.statusEffects.some(effect => effect.id === 'shocked'));
});

test('expired shields are removed and damage-over-time effects tick through combat updates', () => {
  const caster = createCombatant({ race: 'dwarf', mana: 100, maxMana: 100 });
  const target = createCombatant({ hp: 100, maxHp: 100 });
  CombatRuntime.castMagicSpell(caster, null, 'earth', { now: 1000 });
  assert.equal(CombatRuntime.updateCombatantEffects(caster, 8000).expiredShields, 1);
  const fireCaster = createCombatant({ race: 'human', mana: 100, maxMana: 100 });
  CombatRuntime.castMagicSpell(fireCaster, target, 'fire', { now: 1000, rng: () => 1 });
  const tick = CombatRuntime.updateCombatantEffects(target, 2000);
  assert.equal(tick.damageOverTime, 3);
  assert.equal(target.hp, 79);
});

test('light purifies negative statuses while demonic magic drains health from its target', () => {
  const angel = createCombatant({ race: 'angel', hp: 40, maxHp: 100, mana: 100, maxMana: 100 });
  angel.statusEffects.push({ id: 'burn', category: 'negative', expiresAt: 9000 });
  const light = CombatRuntime.castMagicSpell(angel, null, 'light', { now: 1000 });
  assert.equal(light.executed, true);
  assert.equal(light.purified, 1);
  assert.equal(angel.hp, 64);
  const demon = createCombatant({ race: 'demon', hp: 50, maxHp: 100, mana: 100, maxMana: 100 });
  const victim = createCombatant({ hp: 100, maxHp: 100 });
  const drain = CombatRuntime.castMagicSpell(demon, victim, 'demonic', { now: 1000, rng: () => 1 });
  assert.equal(drain.executed, true);
  assert.ok(drain.damage > 0);
  assert.ok(drain.healing > 0);
  assert.ok(demon.hp > 50);
});

test('fire absorption remains exclusive to the fire school and requires strictly higher defender mastery', () => {
  const caster = createCombatant({ race:'human', fireMastery:10, mana:100, maxMana:100 });
  const defender = createCombatant({ race:'human', fireMastery:11, hp:100, maxHp:100 });
  const absorbed = CombatRuntime.castMagicSpell(caster, defender, 'fire', { now:1000, rng:()=>1 });
  assert.equal(absorbed.executed,true);
  assert.equal(absorbed.hit,false);
  assert.equal(absorbed.targets[0].absorbed,true);
  assert.equal(defender.hp,100);
  assert.equal(CombatRuntime.castMagicSpell(caster, defender, 'ice', { now:2500, rng:()=>1 }).targets[0].absorbed,undefined);
});

test('expired earth ward cannot absorb a later incoming attack', () => {
  const defender = createCombatant({ race:'dwarf', hp:100, maxHp:100, mana:100, maxMana:100 });
  const attacker = createCombatant({ race:'human' });
  CombatRuntime.castMagicSpell(defender, null, 'earth', { now:1000 });
  const hit = CombatRuntime.resolveIncomingAttack(attacker, defender, { kind:'physical', base:20 }, { now:8000, rng:()=>1 });
  assert.equal(hit.hpLost,20);
  assert.equal(defender.shields.length,0);
  assert.equal(defender.hp,80);
});
