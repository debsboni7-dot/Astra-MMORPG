import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_COMBO_ANIMATION_PROFILES } from '../prototype/src/combat/RaceComboAnimations.js';

test('every ASTREA race has a procedural combo motion profile', () => {
  for (const race of ['human','elf','dwarf','demon','angel','orc','dragonoid']) {
    assert.ok(RACE_COMBO_ANIMATION_PROFILES[race], `missing profile for ${race}`);
    assert.ok(RACE_COMBO_ANIMATION_PROFILES[race].power > 0);
    assert.ok(RACE_COMBO_ANIMATION_PROFILES[race].sweep > 0);
  }
});

test('draconoid aliases share the dragonoid movement identity', () => {
  assert.deepEqual(RACE_COMBO_ANIMATION_PROFILES.draconoid, RACE_COMBO_ANIMATION_PROFILES.dragonoid);
});

test('the seven playable races do not all share one movement profile', () => {
  const signatures = ['human','elf','dwarf','demon','angel','orc','dragonoid']
    .map(race => { const p=RACE_COMBO_ANIMATION_PROFILES[race]; return [p.power,p.sweep,p.turn,p.lift].join(':'); });
  assert.equal(new Set(signatures).size, 7);
});
