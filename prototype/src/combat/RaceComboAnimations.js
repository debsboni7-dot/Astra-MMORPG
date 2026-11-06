/**
 * Rig-authored ASTREA combo motions.
 * These clips are authored as deterministic joint keyframes and generated on the
 * loaded character armature. Imported GLB clips keep priority over these fallbacks.
 */
export const RACE_COMBO_ANIMATION_PROFILES = Object.freeze({
  human:{power:1,sweep:1,turn:1,lift:1,tempo:1},
  elf:{power:.76,sweep:1.38,turn:1.24,lift:1.18,tempo:1.12},
  dwarf:{power:1.42,sweep:.68,turn:.72,lift:.68,tempo:.88},
  demon:{power:1.28,sweep:1.18,turn:1.30,lift:1.10,tempo:1.04},
  angel:{power:.88,sweep:1.08,turn:.92,lift:1.42,tempo:1.08},
  orc:{power:1.52,sweep:.84,turn:1.12,lift:.76,tempo:.94},
  dragonoid:{power:1.22,sweep:1.28,turn:1.18,lift:1.06,tempo:1.02},
  draconoid:{power:1.22,sweep:1.28,turn:1.18,lift:1.06,tempo:1.02},
});

export const WEAPON_ANIMATION_PROFILES = Object.freeze({
  sword:{sweep:1.0,weight:1.0,arc:.9,kind:'slash'},
  dagger:{sweep:1.18,weight:.62,arc:.42,kind:'thrust'},
  sabre:{sweep:1.34,weight:.82,arc:1.02,kind:'slash'},
  axe:{sweep:.82,weight:1.42,arc:1.34,kind:'overhead'},
  hammer:{sweep:.64,weight:1.62,arc:1.52,kind:'overhead'},
  mace:{sweep:.72,weight:1.48,arc:1.28,kind:'overhead'},
  bow:{sweep:.52,weight:.7,arc:.22,kind:'draw'},
  crossbow:{sweep:.38,weight:1.0,arc:.18,kind:'aim'},
  staff:{sweep:1.08,weight:1.08,arc:.86,kind:'spin'},
  wand:{sweep:.92,weight:.42,arc:.32,kind:'flick'},
  grimoire:{sweep:.72,weight:.62,arc:.28,kind:'invoke'},
});

const KEY_TIMES=[0,.09,.19,.31,.47,.62,.78];
const ENVELOPE=[0,.28,.86,1,.72,.26,0];
const normalize=name=>String(name||'').replace(/^mixamorig/i,'').replace(/[^a-z]/gi,'').toLowerCase();
function findRigBones(root){const bones=new Map();root.traverse(node=>{if(node.isBone){const key=normalize(node.name);if(key&&!bones.has(key))bones.set(key,node);}});return bones;}

function basePose(mode,stage,profile,race){
 const sign=stage===2?-1:1, finish=stage===3?1.28:stage===2?.88:1;
 const p=profile.power*finish,s=profile.sweep*sign,t=profile.turn*sign,l=profile.lift;
 const lean=race==='dwarf'||race==='orc'?.16:race==='elf'||race==='angel'?-.08:.04;
 const pose={};
 const set=(bone,x,y,z)=>{pose[bone]=[x,y,z];};
 if(mode==='physical'){
  set('RightArm',-.72*p,.12*t,-.82*s);set('RightForeArm',-.78*p,.08*t,-.12*s);set('RightHand',-.12*p,.10*t,-.08*s);
  set('LeftArm',.24*p,-.10*t,.42*s);set('LeftForeArm',-.24*p,0,.16*s);
  set('Spine',.06*p,.34*t,lean);set('Spine01',-.08*p,.24*t,lean);set('Spine02',-.14*p,.18*t,0);
  set('Hips',.04*p,.24*t,0);set('LeftUpLeg',.18*p,0,-.10*s);set('RightUpLeg',-.14*p,0,.12*s);
 }else if(mode==='magic'){
  set('LeftArm',-1.02*l,-.10*t,.30*s);set('LeftForeArm',-.84*l,.08*t,.12*s);set('LeftHand',-.16*l,.12*t,0);
  set('RightArm',-.48*l,.10*t,-.22*s);set('RightForeArm',-.34*l,0,-.10*s);
  set('Spine',-.10*l,.22*t,lean);set('Spine01',-.12*l,.16*t,0);set('Spine02',-.08*l,.12*t,0);set('Head',-.08*l,.08*t,0);set('Hips',.02*l,.12*t,0);
 }else{
  set('RightArm',-.88*p,.18*t,-.76*s);set('RightForeArm',-.68*p,.08*t,-.16*s);
  set('LeftArm',-1.12*l,-.12*t,.34*s);set('LeftForeArm',-.92*l,.08*t,.12*s);set('LeftHand',-.18*l,.12*t,0);
  set('Spine',-.12*p,.42*t,lean);set('Spine01',-.10*p,.28*t,lean);set('Spine02',-.12*l,.16*t,0);
  set('Hips',.06*p,.30*t,0);set('LeftUpLeg',.14*p,0,-.10*s);set('RightUpLeg',-.12*p,0,.10*s);
 }
 return pose;
}

function weaponFinisherPose(weapon,profile,race,hybrid=false){
 const w=WEAPON_ANIMATION_PROFILES[weapon];if(!w)return null;
 const power=profile.power*w.weight*(hybrid?1.08:1);
 const sweep=profile.sweep*w.sweep, lift=profile.lift*w.arc;
 const raceTurn=profile.turn*(race==='elf'||race==='dragonoid'?1.18:race==='dwarf'||race==='orc'?.78:1);
 const pose={};
 const set=(bone,x,y,z)=>{pose[bone]=[x,y,z];};
 const hand=w.kind==='draw'||w.kind==='aim'||w.kind==='invoke';
 if(w.kind==='overhead'){
  set('RightArm',-1.55*power,.12,-.08*sweep);set('RightForeArm',-1.18*power,.04,.06);
  set('LeftArm',-.48*power,.12,.32);set('LeftForeArm',-.62*power,0,.12);
  set('Spine',-.22*power,.24*raceTurn,.08);set('Spine01',-.18*power,.16*raceTurn,0);
  set('Hips',.12*power,.18*raceTurn,0);set('LeftUpLeg',.34*power,0,-.12);set('RightUpLeg',-.22*power,0,.12);
 }else if(w.kind==='thrust'){
  set('RightArm',-.34*power,.02,-.12);set('RightForeArm',-1.18*power,.02,-.04);
  set('LeftArm',.42*power,.08,.28);set('LeftForeArm',-.24,0,.08);
  set('Spine',-.18*power,.12*raceTurn,0);set('Hips',.16*power,.12*raceTurn,0);set('LeftUpLeg',.28*power,0,0);
 }else if(w.kind==='draw'||w.kind==='aim'){
  set('LeftArm',-.18*lift,.02,.82);set('LeftForeArm',-.24*lift,0,.08);
  set('RightArm',-.46*lift,.08,-.92);set('RightForeArm',-.72*lift,0,-.10);
  set('Spine',-.06,.16*raceTurn,0);set('Head',-.04,.08*raceTurn,0);set('Hips',0,.08*raceTurn,0);
 }else if(w.kind==='spin'||w.kind==='slash'){
  set('RightArm',-.82*power,.14*raceTurn,-.92*sweep);set('RightForeArm',-.72*power,.04,-.18*sweep);
  set('LeftArm',-.18*power,-.08,.52*sweep);set('LeftForeArm',-.32*power,0,.12);
  set('Spine',-.08*power,.48*raceTurn,.04);set('Spine01',-.12*power,.28*raceTurn,0);
  set('Hips',.08*power,.32*raceTurn,0);set('LeftUpLeg',.22*power,0,-.12);set('RightUpLeg',-.12*power,0,.12);
 }else{
  set('RightArm',-.52*lift,.12,-.24);set('RightForeArm',-.38*lift,0,-.10);
  set('LeftArm',-.96*lift,-.08,.24);set('LeftForeArm',-.72*lift,.04,.10);
  set('Spine',-.12*lift,.18*raceTurn,0);set('Spine01',-.10*lift,.12*raceTurn,0);set('Head',-.06*lift,0,0);
 }
 if(hand){set('LeftHand',-.12*lift,0,0);set('RightHand',-.12*lift,0,0);}
 return pose;
}

function makeClip(THREE,mixer,bones,name,pose,duration=.78){
 const tracks=[];
 for(const [boneName,angles] of Object.entries(pose)){
  const bone=bones.get(normalize(boneName));if(!bone)continue;
  const base=bone.quaternion.clone(),values=[];
  for(const amount of ENVELOPE){
   const offset=new THREE.Quaternion().setFromEuler(new THREE.Euler(angles[0]*amount,angles[1]*amount,angles[2]*amount,'XYZ'));
   const q=base.clone().multiply(offset);values.push(q.x,q.y,q.z,q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`,KEY_TIMES,values));
 }
 if(!tracks.length)return null;
 return mixer.clipAction(new THREE.AnimationClip(name,duration,tracks));
}

export function createRaceComboAnimations(THREE,model,mixer,race='human'){
 const profile=RACE_COMBO_ANIMATION_PROFILES[race]||RACE_COMBO_ANIMATION_PROFILES.human;
 const bones=findRigBones(model),actions={};
 for(const mode of ['physical','magic','hybrid']){
  for(let stage=1;stage<=3;stage++){
   const name=`combo_${race}_${mode}_${stage}`;
   const action=makeClip(THREE,mixer,bones,name,basePose(mode,stage,profile,race));
   if(action)actions[name]=action;
  }
 }
 for(const [weapon] of Object.entries(WEAPON_ANIMATION_PROFILES)){
  for(const hybrid of [false,true]){
   const name=hybrid?`combo_${race}_${weapon}_hybrid_finisher`:`combo_${race}_${weapon}_finisher`;
   const pose=weaponFinisherPose(weapon,profile,race,hybrid);
   const action=makeClip(THREE,mixer,bones,name,pose,.92);
   if(action)actions[name]=action;
  }
 }
 return actions;
}
