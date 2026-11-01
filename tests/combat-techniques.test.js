import test from 'node:test';
import assert from 'node:assert/strict';
import { createComboState, advanceCombo, resetCombo, resolveHitReaction, createHitRecoveryState, beginHitRecovery, updateHitRecovery } from '../prototype/src/combat/CombatTechniques.js';

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


test('knockdown recovery stays grounded until its stun ends, then stands up over time', async () => {
  const { createHitRecoveryState, beginHitRecovery, updateHitRecovery } = await import('../prototype/src/combat/CombatTechniques.js');
  const recovery = createHitRecoveryState({ getUpDurationMs: 500 });
  beginHitRecovery(recovery, { knockdown: true, staggerMs: 900 }, 1000);
  assert.deepEqual(updateHitRecovery(recovery, 1500), { phase: 'down', progress: 0, height: 0, grounded: true });
  assert.deepEqual(updateHitRecovery(recovery, 1900), { phase: 'getting-up', progress: 0, height: 0, grounded: true });
  assert.deepEqual(updateHitRecovery(recovery, 2150), { phase: 'getting-up', progress: 0.5, height: 0, grounded: true });
  assert.deepEqual(updateHitRecovery(recovery, 2400), { phase: 'standing', progress: 1, height: 0, grounded: false });
});

test('non-knockdown reactions do not force a grounded recovery', async () => {
  const { createHitRecoveryState, beginHitRecovery, updateHitRecovery } = await import('../prototype/src/combat/CombatTechniques.js');
  const recovery = createHitRecoveryState();
  beginHitRecovery(recovery, { knockdown: false, staggerMs: 300 }, 500);
  assert.equal(updateHitRecovery(recovery, 600).phase, 'standing');
});


test('launcher sends a target airborne and then into grounded recovery', () => {
  const reaction = resolveHitReaction({ impact: 80, targetPoise: 40, targetMass: 1, attackType: 'launcher' });
  assert.equal(reaction.reaction, 'launch');
  const state = createHitRecoveryState({ getUpDurationMs: 400 });
  beginHitRecovery(state, reaction, 1000);
  const apex = updateHitRecovery(state, 1360);
  assert.equal(apex.phase, 'airborne');
  assert.ok(apex.height > 1.2);
  const landing = updateHitRecovery(state, 1720);
  assert.equal(landing.phase, 'down');
  assert.equal(landing.height, 0);
  assert.equal(landing.grounded, true);
});

test('launched target waits through landing stun and get-up before standing', () => {
  const state = createHitRecoveryState({ getUpDurationMs: 300 });
  beginHitRecovery(state, { launch: true, airborneMs: 500, launchHeight: 1, staggerMs: 600 }, 0);
  assert.equal(updateHitRecovery(state, 500).phase, 'down');
  assert.equal(updateHitRecovery(state, 1099).phase, 'down');
  assert.equal(updateHitRecovery(state, 1100).phase, 'getting-up');
  assert.equal(updateHitRecovery(state, 1400).phase, 'standing');
});


test('repeated control effects diminish and hard control is downgraded to prevent stun-locks', async () => {
  const { createControlDiminishingState, applyControlDiminishing } = await import('../prototype/src/combat/CombatTechniques.js');
  const state = createControlDiminishingState();
  const hit = { reaction: 'knockdown', staggerMs: 1000, knockback: 1, knockdown: true, launch: false };
  const first = applyControlDiminishing(state, hit, 100);
  const second = applyControlDiminishing(state, hit, 500);
  const third = applyControlDiminishing(state, hit, 900);
  assert.equal(first.staggerMs, 1000);
  assert.equal(second.staggerMs, 820);
  assert.equal(third.staggerMs, 640);
  assert.equal(third.knockdown, false);
  assert.equal(third.reaction, 'stagger');
});

test('control diminishing resets after its recovery window', async () => {
  const { createControlDiminishingState, applyControlDiminishing } = await import('../prototype/src/combat/CombatTechniques.js');
  const state = createControlDiminishingState();
  const hit = { reaction: 'stagger', staggerMs: 500, knockback: .5, knockdown: false, launch: false };
  applyControlDiminishing(state, hit, 0);
  applyControlDiminishing(state, hit, 100);
  const recovered = applyControlDiminishing(state, hit, 5000);
  assert.equal(recovered.controlCount, 1);
  assert.equal(recovered.controlReduction, 0);
  assert.equal(recovered.staggerMs, 500);
});
