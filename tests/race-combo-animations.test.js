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

test('each race generates distinct weapon-specific physical and hybrid finisher clips', () => {
  class Quaternion {
    constructor(){this.x=0;this.y=0;this.z=0;this.w=1;}
    clone(){return new Quaternion();}
    setFromEuler(){return this;}
    multiply(){return this;}
  }
  class Track { constructor(name,times,values){this.name=name;this.times=times;this.values=values;} }
  class Clip { constructor(name,duration,tracks){this.name=name;this.duration=duration;this.tracks=tracks;} }
  const THREE={Quaternion, Euler:class{}, QuaternionKeyframeTrack:Track, AnimationClip:Clip};
  const names=['RightArm','RightForeArm','RightHand','LeftArm','LeftForeArm','LeftHand','Spine','Spine01','Spine02','Hips','LeftUpLeg','RightUpLeg','Head'];
  for(const race of ['human','elf','dwarf','demon','angel','orc','dragonoid']){
    const model={traverse(fn){for(const name of names)fn({isBone:true,name,quaternion:new Quaternion()});}};
    const mixer={clipAction(clip){return {clip};}};
    const actions=createRaceComboAnimations(THREE,model,mixer,race);
    assert.equal(Object.keys(actions).length,31, race+' should have 9 combo stages and 22 weapon finishers');
    for(const weapon of Object.keys(WEAPON_ANIMATION_PROFILES)){
      assert.ok(actions['combo_'+race+'_'+weapon+'_finisher']);
      assert.ok(actions['combo_'+race+'_'+weapon+'_hybrid_finisher']);
    }
  }
});
