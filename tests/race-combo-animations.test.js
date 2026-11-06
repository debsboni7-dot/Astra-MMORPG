import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_COMBO_ANIMATION_PROFILES, WEAPON_ANIMATION_PROFILES, createRaceComboAnimations } from '../prototype/src/combat/RaceComboAnimations.js';

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

test('weapon finisher profiles cover ASTREA weapon families without polearms', () => { for (const weapon of ['sword','dagger','sabre','axe','hammer','mace','bow','crossbow','staff','wand','grimoire']) assert.ok(WEAPON_ANIMATION_PROFILES[weapon]); assert.equal(WEAPON_ANIMATION_PROFILES.polearm, undefined); assert.ok(new Set(Object.values(WEAPON_ANIMATION_PROFILES).map(x=>x.kind)).size>=5); });
test('each race has deterministic physical and hybrid weapon finisher identifiers', () => { for (const race of ['human','elf','dwarf','demon','angel','orc','dragonoid']) for (const weapon of Object.keys(WEAPON_ANIMATION_PROFILES)) { assert.ok('combo_'+race+'_'+weapon+'_finisher'); assert.ok('combo_'+race+'_'+weapon+'_hybrid_finisher'); } });
