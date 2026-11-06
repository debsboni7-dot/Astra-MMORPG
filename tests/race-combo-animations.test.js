import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_COMBO_ANIMATION_PROFILES, createRaceComboAnimations } from '../prototype/src/combat/RaceComboAnimations.js';

test('every ASTREA race has a distinct procedural combo motion profile', () => {
  for (const race of ['human','elf','dwarf','demon','angel','orc','dragonoid']) {
    const profile = RACE_COMBO_ANIMATION_PROFILES[race];
    assert.ok(profile, `missing profile for ${race}`);
    assert.ok(profile.power > 0 && profile.sweep > 0 && profile.turn > 0 && profile.lift > 0);
  }
  const signatures = ['human','elf','dwarf','demon','angel','orc','dragonoid']
    .map(race => Object.values(RACE_COMBO_ANIMATION_PROFILES[race]).join(':'));
  assert.equal(new Set(signatures).size, 7);
});

test('the repository draconoid identifier shares the dragonoid profile', () => {
  assert.deepEqual(RACE_COMBO_ANIMATION_PROFILES.draconoid, RACE_COMBO_ANIMATION_PROFILES.dragonoid);
});

test('animation generator safely returns no clips for a rig without recognized bones', () => {
  const model = { traverse(callback) { callback({ isBone: false, name: 'mesh' }); } };
  const mixer = { clipAction() { throw new Error('no clip should be created'); } };
  assert.deepEqual(createRaceComboAnimations({}, model, mixer, 'human'), {});
});
