import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnemyAI, updateEnemyAI, staggerEnemyAI } from '../prototype/src/combat/EnemyAI.js';

test('enemy approaches until it reaches attack range', () => {
  const ai = createEnemyAI();
  const result = updateEnemyAI(ai, { deltaSeconds: .1, distance: 4 });
  assert.equal(result.state, 'approach');
  assert.equal(result.canMove, true);
  assert.equal(result.attack, false);
});
test('enemy telegraphs before releasing its attack', () => {
  const ai = createEnemyAI({ telegraphMs: 800 });
  assert.equal(updateEnemyAI(ai, { deltaSeconds: .1, distance: 1.5 }).state, 'telegraph');
  assert.equal(updateEnemyAI(ai, { deltaSeconds: .5, distance: 1.5 }).attack, false);
  const attack = updateEnemyAI(ai, { deltaSeconds: .31, distance: 1.5 });
  assert.equal(attack.attack, true);
  assert.equal(attack.sequence, 1);
});
test('enemy cancels its telegraph when the player escapes its range', () => {
  const ai = createEnemyAI({ telegraphMs: 500 });
  updateEnemyAI(ai, { deltaSeconds: .01, distance: 1.5 });
  const result = updateEnemyAI(ai, { deltaSeconds: .1, distance: 4 });
  assert.equal(result.state, 'approach');
  assert.equal(result.attack, false);
});
test('enemy recovers before starting another telegraph', () => {
  const ai = createEnemyAI({ telegraphMs: 100, recoveryMs: 500 });
  updateEnemyAI(ai, { deltaSeconds: .01, distance: 1.5 });
  assert.equal(updateEnemyAI(ai, { deltaSeconds: .11, distance: 1.5 }).attack, true);
  assert.equal(updateEnemyAI(ai, { deltaSeconds: .01, distance: 1.5 }).state, 'recover');
  assert.equal(updateEnemyAI(ai, { deltaSeconds: .3, distance: 1.5 }).state, 'recover');
  assert.equal(updateEnemyAI(ai, { deltaSeconds: .21, distance: 1.5 }).state, 'approach');
});
test('stagger interrupts the attack sequence and defeated enemies stay inactive', () => {
  const ai = createEnemyAI();
  assert.equal(staggerEnemyAI(ai), true);
  assert.equal(updateEnemyAI(ai, { deltaSeconds: .1, distance: 1 }).state, 'approach');
  assert.equal(updateEnemyAI(ai, { deltaSeconds: .1, distance: 1, defeated: true }).canMove, false);
  assert.equal(updateEnemyAI(ai, { deltaSeconds: .1, distance: 1 }).state, 'defeated');
  assert.equal(staggerEnemyAI(ai), false);
});

test('enemy attack event is emitted once, then enters recovery', () => {
  const ai = createEnemyAI({ telegraphMs: 100, recoveryMs: 400 });
  updateEnemyAI(ai, { deltaSeconds: .01, distance: 1.5 });
  assert.equal(updateEnemyAI(ai, { deltaSeconds: .11, distance: 1.5 }).attack, true);
  assert.equal(updateEnemyAI(ai, { deltaSeconds: .01, distance: 1.5 }).attack, false);
  assert.equal(ai.state, 'recover');
});

test('staggered enemy cannot attack until the stagger is released', () => {
  const ai = createEnemyAI({ telegraphMs: 1 });
  staggerEnemyAI(ai);
  const held = updateEnemyAI(ai, { deltaSeconds: .5, distance: 1, staggered: true });
  assert.equal(held.state, 'stagger');
  assert.equal(held.attack, false);
  const released = updateEnemyAI(ai, { deltaSeconds: .01, distance: 1, staggered: false });
  assert.equal(released.state, 'approach');
  assert.equal(released.attack, false);
});
