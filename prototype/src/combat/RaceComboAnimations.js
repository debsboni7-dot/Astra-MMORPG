/**
 * Builds race-specific, rig-driven combo clips at runtime.
 * The ASTREA base rigs share Mixamo-style upper/lower-body joint names.
 * This keeps the browser build self-contained while dedicated authored clips
 * can replace these procedural clips later without changing the combo system.
 */
export const RACE_COMBO_ANIMATION_PROFILES = Object.freeze({
  human:     { power:1.00, sweep:1.00, turn:1.00, lift:1.00, tempo:1.00 },
  elf:       { power:.76, sweep:1.38, turn:1.24, lift:1.18, tempo:1.12 },
  dwarf:     { power:1.42, sweep:.68, turn:.72, lift:.68, tempo:.88 },
  demon:     { power:1.28, sweep:1.18, turn:1.30, lift:1.10, tempo:1.04 },
  angel:     { power:.88, sweep:1.08, turn:.92, lift:1.42, tempo:1.08 },
  orc:       { power:1.52, sweep:.84, turn:1.12, lift:.76, tempo:.94 },
  dragonoid: { power:1.22, sweep:1.28, turn:1.18, lift:1.06, tempo:1.02 },
  draconoid: { power:1.22, sweep:1.28, turn:1.18, lift:1.06, tempo:1.02 },
});

const KEY_TIMES = [0, .10, .24, .38, .56, .72];
const ENVELOPE = [0, .42, 1, .76, .24, 0];

function normalizedBoneName(name) {
  return String(name || '').replace(/^mixamorig/i, '').replace(/[^a-z]/gi, '').toLowerCase();
}

function findRigBones(root) {
  const bones = new Map();
  root.traverse((node) => {
    if (!node.isBone) return;
    const key = normalizedBoneName(node.name);
    if (key && !bones.has(key)) bones.set(key, node);
  });
  return bones;
}

function poseFor(mode, stage, profile, race) {
  const sign = stage === 2 ? -1 : 1;
  const finish = stage === 3 ? 1.28 : stage === 2 ? .88 : 1;
  const p = profile.power * finish;
  const s = profile.sweep * sign;
  const t = profile.turn * sign;
  const l = profile.lift;
  const raceLean = race === 'dwarf' || race === 'orc' ? .16 : race === 'elf' || race === 'angel' ? -.08 : .04;
  const pose = {};
  const set = (bone, x, y, z) => { pose[bone] = [x, y, z]; };

  if (mode === 'physical') {
    set('RightArm', -.72*p, .12*t, -.82*s);
    set('RightForeArm', -.78*p, .08*t, -.12*s);
    set('RightHand', -.12*p, .10*t, -.08*s);
    set('LeftArm', .24*p, -.10*t, .42*s);
    set('LeftForeArm', -.24*p, 0, .16*s);
    set('Spine', .06*p, .34*t, raceLean);
    set('Spine01', -.08*p, .24*t, raceLean);
    set('Spine02', -.14*p, .18*t, 0);
    set('Hips', .04*p, .24*t, 0);
    set('LeftUpLeg', .18*p, 0, -.10*s);
    set('RightUpLeg', -.14*p, 0, .12*s);
  } else if (mode === 'magic') {
    set('LeftArm', -1.02*l, -.10*t, .30*s);
    set('LeftForeArm', -.84*l, .08*t, .12*s);
    set('LeftHand', -.16*l, .12*t, 0);
    set('RightArm', -.48*l, .10*t, -.22*s);
    set('RightForeArm', -.34*l, 0, -.10*s);
    set('Spine', -.10*l, .22*t, raceLean);
    set('Spine01', -.12*l, .16*t, 0);
    set('Spine02', -.08*l, .12*t, 0);
    set('Head', -.08*l, .08*t, 0);
    set('Hips', .02*l, .12*t, 0);
  } else {
    set('RightArm', -.88*p, .18*t, -.76*s);
    set('RightForeArm', -.68*p, .08*t, -.16*s);
    set('LeftArm', -1.12*l, -.12*t, .34*s);
    set('LeftForeArm', -.92*l, .08*t, .12*s);
    set('LeftHand', -.18*l, .12*t, 0);
    set('Spine', -.12*p, .42*t, raceLean);
    set('Spine01', -.10*p, .28*t, raceLean);
    set('Spine02', -.12*l, .16*t, 0);
    set('Hips', .06*p, .30*t, 0);
    set('LeftUpLeg', .14*p, 0, -.10*s);
    set('RightUpLeg', -.12*p, 0, .10*s);
  }
  return pose;
}

export function createRaceComboAnimations(THREE, model, mixer, race = 'human') {
  const profile = RACE_COMBO_ANIMATION_PROFILES[race] || RACE_COMBO_ANIMATION_PROFILES.human;
  const bones = findRigBones(model);
  const actions = {};
  const modes = ['physical', 'magic', 'hybrid'];

  for (const mode of modes) {
    for (let stage = 1; stage <= 3; stage += 1) {
      const pose = poseFor(mode, stage, profile, race);
      const tracks = [];
      for (const [name, angles] of Object.entries(pose)) {
        const bone = bones.get(normalizedBoneName(name));
        if (!bone) continue;
        const base = bone.quaternion.clone();
        const values = [];
        for (const amount of ENVELOPE) {
          const offset = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(angles[0]*amount, angles[1]*amount, angles[2]*amount, 'XYZ')
          );
          const q = base.clone().multiply(offset);
          values.push(q.x, q.y, q.z, q.w);
        }
        tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, KEY_TIMES, values));
      }
      if (!tracks.length) continue;
      const name = `combo_${race}_${mode}_${stage}`;
      const clip = new THREE.AnimationClip(name, .72, tracks);
      actions[name] = mixer.clipAction(clip);
    }
  }
  return actions;
}
