import test from 'node:test';
import assert from 'node:assert/strict';
import { createComboState, advanceCombo, resetCombo, resolveHitReaction } from '../prototype/src/combat/CombatTechniques.js';

test('combo advances through three timed hits and marks the finisher', () => {
  const combo = createComboState({ maxStage: 3, inputWindowMs: 700 });
  assert.equal(advanceCombo(combo, 1000).stage, 1);
  assert.equal(advanceCombo(combo, 1500).stage, 2);
  const finisher = advanceCombo(combo, 2000);
  assert.equal(finisher.stage, 3);
  assert.equal(finisher.finisher, true);
  assert.equal(finisher.multiplier, 1.3);
});

test('combo resets when input arrives outside the chain window', () => {
  const combo = createComboState({ maxStage: 3, inputWindowMs: 700, resetAfterMs: 1400 });
  advanceCombo(combo, 100);
  assert.equal(advanceCombo(combo, 950).stage, 1);
});

test('combo wraps to first hit after its finisher and can be manually reset', () => {
  const combo = createComboState({ maxStage: 2 });
  advanceCombo(combo, 0); advanceCombo(combo, 100);
  assert.equal(advanceCombo(combo, 200).stage, 1);
  resetCombo(combo);
  assert.equal(combo.stage, 0);
});

test('strong impact can knock down a light target', () => {
  const result = resolveHitReaction({ impact: 120, targetPoise: 40, targetMass: 1, attackType: 'heavy' });
  assert.equal(result.reaction, 'knockdown');
  assert.equal(result.knockdown, true);
});

test('mass and control resistance reduce reaction severity', () => {
  const light = resolveHitReaction({ impact: 45, targetPoise: 40, targetMass: 1 });
  const heavy = resolveHitReaction({ impact: 45, targetPoise: 40, targetMass: 5, controlResistance: .5 });
  assert.ok(heavy.ratio < light.ratio);
  assert.ok(['flinch','stagger'].includes(heavy.reaction));
});

test('small impact causes a flinch without knockback', () => {
  const result = resolveHitReaction({ impact: 5, targetPoise: 40 });
  assert.equal(result.reaction, 'flinch');
  assert.equal(result.knockback, 0);
});
