import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/SkeletonUtils.js';
import { createCombatant, regenerateStamina, regenerateMana, updateCombatantEffects, castMagicSpell, beginBlock, beginDodge, executeAttack, resolveIncomingAttack, equipWeapon, getWeaponProgression } from './combat/CombatRuntime.js';
import { createEnemyAI, updateEnemyAI, staggerEnemyAI } from './combat/EnemyAI.js';
import { createComboState, advanceCombo, resetCombo, resolveHitReaction, createHitRecoveryState, beginHitRecovery, updateHitRecovery, createControlDiminishingState, applyControlDiminishing, applyWeaponHitProfile } from './combat/CombatTechniques.js';
import { createAstreaWorld } from './world/astrea-world.js';
import { normalizeTouchStick, getMovementAxes, getDodgeDestination, getWorldMovementDirection, getFacingYaw, rotateAngleTowards } from './input/movement.js';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, validateSettings } from './settings.js';
import { MAGIC_SCHOOLS, MAGIC_RACE_RULES, createMagicProgression, sanitizeMagicProgression, getMagicSkillTree, recordMagicSkillUse, equipMagicTechnique, getMagicRaceStatModifiers } from './magic/MagicSkillTree.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#viewport'), loading = $('#loading'), errorBox = $('#error');
const menu = $('#main-menu'), creator = $('#creator'), gameHud = $('#game-hud');
const loader = new GLTFLoader();
const QUATERNIUS_ARCHIVE_URL = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/8f0a48d9-0075-4ea9-af70-2324e2bf69b4.zip';
let quaterniusZipPromise = null;
let wardrobeAssetLoads = 0;
let pauseRenderForWardrobe = false;
const ZIP_URLS = {
  human_male:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/502efa24-3e80-4e06-8a16-04f4083184c3.zip',
  human_female:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/8f991f9b-2ec3-4ae8-a9a9-9447d3c005aa.zip',
  elf_male:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/57f10f79-0cd9-4f11-98ed-372a8b4a061d.zip',
  elf_female:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/bfd35628-e06b-4fac-9b2d-2a6161ab1c54.zip',
  dwarf_male:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/82d04fb6-9198-4690-a92c-8c4fc3b566a0.zip',
  dwarf_female:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/7824e835-0f7e-44a8-8d29-115bd6356ca4.zip',
  demon_male:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/b232dc06-5866-4992-bc5f-bfe37629906f.zip',
  demon_female:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/bf2f2bd5-903a-4677-b829-6b0ae146d953.zip',
  angel_male:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/e83af76b-cc86-4bb8-b1de-d54bdd71b2d0.zip',
  angel_female:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/0e7fb12e-03b9-4df1-87e9-81cb3138f4b0.zip',
  orc_male:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/285adf12-e8db-4e6a-b598-b6a9383bd428.zip',
  orc_female:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/9b614d2e-153f-40ea-81ed-cad7c3a2a690.zip',
  draconoid_male:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/3fb4c6bd-3a63-4680-85a0-a9beef8778a4.zip',
  draconoid_female:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/cdcf056f-2f2c-47ba-97ea-68769cdb1475.zip'
};
const RACES = [
  ['human','Humain'],['elf','Elfe'],['dwarf','Nain'],['demon','Démon'],['angel','Ange'],['orc','Orc'],['draconoid','Dragonoïde']
];
const WARDROBE_SLOTS = [
  {id:'hair',label:'Cheveux / coiffure'},
  {id:'head',label:'Tête / casque'},
  {id:'torso',label:'Torse'},
  {id:'legs',label:'Jambes'},
  {id:'boots',label:'Bottes'},
  {id:'arms',label:'Bras / manches'},
  {id:'accessory',label:'Accessoires'}
];
// Catalogue Quaternius Standard : 20 pièces séparées (4 Peasant + 6 Ranger, par sexe).
// Les pièces sont d'abord proposées aux humains : l'ajustement sur les six autres races
// nécessite une validation visuelle morphologique avant d'élargir leur compatibilité.
const Q='assets/quaternius/Modular Parts/';
const qItem=(id,label,slot,gender,filename)=>({id,label,slot,url:Q+filename+'.gltf',races:['human'],genders:[gender],source:'Quaternius Modular Character Outfits - Fantasy Standard'});
const QUATERNIUS_ITEMS=[
 qItem('peasant_m_body','Peasant · Torse','torso','male','Male_Peasant_Body'),
 qItem('peasant_m_arms','Peasant · Bras et manches','arms','male','Male_Peasant_Arms'),
 qItem('peasant_m_legs','Peasant · Jambes','legs','male','Male_Peasant_Legs'),
 qItem('peasant_m_feet','Peasant · Pieds','boots','male','Male_Peasant_Feet'),
 qItem('ranger_m_body','Ranger · Torse et ceinture','torso','male','Male_Ranger_Body'),
 qItem('ranger_m_arms','Ranger · Bras et brassards','arms','male','Male_Ranger_Arms'),
 qItem('ranger_m_legs','Ranger · Jambes','legs','male','Male_Ranger_Legs'),
 qItem('ranger_m_feet','Ranger · Bottes','boots','male','Male_Ranger_Feet_Boots'),
 qItem('ranger_m_hood','Ranger · Capuche','head','male','Male_Ranger_Head_Hood'),
 qItem('ranger_m_pauldron','Ranger · Épaulière','accessory','male','Male_Ranger_Acc_Pauldron'),
 qItem('peasant_f_body','Peasant · Torse','torso','female','Female_Peasant_Body'),
 qItem('peasant_f_arms','Peasant · Bras et manches','arms','female','Female_Peasant_Arms'),
 qItem('peasant_f_legs','Peasant · Jambes','legs','female','Female_Peasant_Legs'),
 qItem('peasant_f_feet','Peasant · Pieds','boots','female','Female_Peasant_Feet'),
 qItem('ranger_f_body','Ranger · Torse et ceinture','torso','female','Female_Ranger_Body'),
 qItem('ranger_f_arms','Ranger · Bras et brassards','arms','female','Female_Ranger_Arms'),
 qItem('ranger_f_legs','Ranger · Jambes','legs','female','Female_Ranger_Legs'),
 qItem('ranger_f_feet','Ranger · Bottes','boots','female','Female_Ranger_Feet'),
 qItem('ranger_f_hood','Ranger · Capuche','head','female','Female_Ranger_Head_Hood'),
 qItem('ranger_f_pauldron','Ranger · Épaulières','accessory','female','Female_Ranger_Acc_Pauldrons')
];
const WARDROBE_CATALOG=Object.fromEntries(WARDROBE_SLOTS.map(slot=>[slot.id,QUATERNIUS_ITEMS.filter(item=>item.slot===slot.id)]));
let playerCombatant = createCombatant({ id: 'player', name: 'Joueur', race:'human', physicalStrength: 10, fireMastery: 1, weaponMastery: 0 });
const WEAPON_UI = { sword:{label:'Épée',power:8},axe:{label:'Hache',power:11},hammer:{label:'Marteau',power:13},polearm:{label:'Arme d’hast',power:9} };
let selectedWeaponCategory='sword',selectedTechniqueId='';
function equipTrainingWeapon(category=selectedWeaponCategory){const def=WEAPON_UI[category];if(!def)return false;const result=equipWeapon(playerCombatant,{id:'training-'+category,category,power:def.power,requiredStrength:1,requiredMastery:0});return result.equipped;}
let trainingDummyCombatant = null;
let trainingDummyMesh = null;
let enemyCombatant = null;
let enemyMesh = null;
let enemyTelegraph = null;
let enemyAI = null;
let enemyStaggerUntil = 0;
let enemyKnockdownUntil = 0;
let enemyRecovery = createHitRecoveryState();
let enemyControlDiminishing = createControlDiminishingState();
let comboState = createComboState();
let comboTargetId = null;
let enemyBaseY = 0;
let combatUiTimer = 0;
let combatClockMs = 0;
const state = {settingsOpen:false,settings:loadSettings(),magicProgression:createMagicProgression('human'),selectedMagicSchool:'fire',race:'human',gender:'male',category:'appearance',name:'',alias:'',screen:'menu',model:null,mixer:null,actions:{},currentAction:'idle',actionOneShot:false,dodgeMotion:null,zipCache:new Map(),loadToken:0,gameYaw:0,gamePos:new THREE.Vector3(0,0,0),keys:new Set(),drag:false,lastX:0,previewYaw:0,previewDistance:4.8,wardrobe:Object.fromEntries(WARDROBE_SLOTS.map(slot=>[slot.id,''])),wardrobeObjects:{},wardrobeToken:0,wardrobeSlotTokens:{}};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc5e5bd);
scene.fog = new THREE.Fog(0xc5e5bd, 90, 420);
const camera = new THREE.PerspectiveCamera(38,1,.1,700); camera.position.set(0,1.45,4.7);
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min((devicePixelRatio||1)*state.settings.resolutionScale/100,1.7)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.shadowMap.enabled=state.settings.shadows;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
scene.add(new THREE.HemisphereLight(0xf1fff0,0x526b45,2.15));
const keyLight=new THREE.DirectionalLight(0xfff1d6,3.35);keyLight.position.set(-3,6,4);scene.add(keyLight);
const rimLight=new THREE.DirectionalLight(0x8bdc91,1.8);rimLight.position.set(4,3,-4);scene.add(rimLight);
const ground=new THREE.Mesh(new THREE.CircleGeometry(2.4,64),new THREE.MeshStandardMaterial({color:0x9fcf82,roughness:.92,metalness:0}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;scene.add(ground);
const ring=new THREE.Mesh(new THREE.RingGeometry(2.38,2.42,80),new THREE.MeshBasicMaterial({color:0xeaffdf,transparent:true,opacity:.78,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.012;scene.add(ring);
const grid=new THREE.GridHelper(30,30,0xa8d39a,0xc3dfb9);grid.position.y=-.04;scene.add(grid);
const world=new THREE.Group();scene.add(world);
let worldGround=null;
const combatVfx=[];
function spawnCombatBurst(position,color=0xffa34d,count=34){
 const positions=new Float32Array(count*3),velocities=[];
 for(let i=0;i<count;i++){positions[i*3]=position.x;positions[i*3+1]=position.y;positions[i*3+2]=position.z;const v=new THREE.Vector3(Math.random()-.5,Math.random()*.85,Math.random()-.5).normalize().multiplyScalar(.9+Math.random()*2.6);velocities.push(v);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const material=new THREE.PointsMaterial({color,size:.13,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending});
 const particles=new THREE.Points(geometry,material);world.add(particles);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.22,.035,6,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,side:THREE.DoubleSide}));
 ring.rotation.x=Math.PI/2;ring.position.copy(position);world.add(ring);
 combatVfx.push({geometry,material,particles,ring,velocities,age:0,duration:.62});
}
function spawnMagicVfx(school,origin,destination){
 const color=MAGIC_COLORS[school]||0xffffff;
 const projectile=['fire','water','ice','lightning','demonic'].includes(school);
 const geometry=school==='ice'?new THREE.OctahedronGeometry(.22,0):school==='lightning'?new THREE.TetrahedronGeometry(.24,0):school==='demonic'?new THREE.DodecahedronGeometry(.2,0):new THREE.SphereGeometry(.17,12,8);
 const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,wireframe:school==='lightning',blending:THREE.AdditiveBlending,depthWrite:false});
 const mesh=new THREE.Mesh(geometry,material);
 if(projectile){mesh.position.copy(origin);world.add(mesh);combatVfx.push({kind:'magic-projectile',mesh,geometry,material,from:origin.clone(),to:destination.clone(),age:0,duration:.28});}
 else{mesh.position.copy(destination);mesh.position.y+=school==='earth'?.85:.08;if(school==='earth')mesh.scale.set(1.2,1.4,1.2);world.add(mesh);combatVfx.push({kind:'magic-shape',mesh,geometry,material,startScale:school==='earth'?1.0:.55,age:0,duration:school==='earth'?1.1:.72});}
 spawnCombatBurst(destination.clone(),color,school==='wind'?52:30);
}
function updateCombatVfx(dt){
 for(let i=combatVfx.length-1;i>=0;i--){const fx=combatVfx[i];fx.age+=dt;const t=Math.min(1,fx.age/fx.duration);
  if(fx.kind==='magic-projectile'){fx.mesh.position.lerpVectors(fx.from,fx.to,t);fx.mesh.rotation.x+=dt*7;fx.mesh.rotation.y+=dt*9;fx.material.opacity=1-t;if(t>=1){world.remove(fx.mesh);fx.geometry.dispose();fx.material.dispose();combatVfx.splice(i,1);}continue;}
  if(fx.kind==='magic-shape'){fx.mesh.scale.setScalar(fx.startScale*(.7+t*1.3));fx.material.opacity=Math.max(0,1-t);fx.mesh.rotation.y+=dt*1.8;if(t>=1){world.remove(fx.mesh);fx.geometry.dispose();fx.material.dispose();combatVfx.splice(i,1);}continue;}
  const p=fx.geometry.attributes.position;
  for(let j=0;j<fx.velocities.length;j++){const v=fx.velocities[j];p.array[j*3]+=v.x*dt;p.array[j*3+1]+=v.y*dt-1.6*dt*dt;p.array[j*3+2]+=v.z*dt;}
  p.needsUpdate=true;fx.material.opacity=Math.max(0,1-t);fx.material.size=.13*(1-t*.45);fx.ring.scale.setScalar(1+t*5);fx.ring.material.opacity=Math.max(0,.9-t);
  if(t>=1){world.remove(fx.particles,fx.ring);fx.geometry.dispose();fx.material.dispose();fx.ring.geometry.dispose();fx.ring.material.dispose();combatVfx.splice(i,1);}
 }
}
function makeSurfaceTexture(base, accent, kind='grain'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
  let seed=kind==='stone'?41:kind==='plaster'?83:kind==='wood'?127:kind==='roof'?191:229;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  if(kind==='stone'){
    for(let y=0;y<512;y+=48)for(let x=0;x<512;x+=64){const ox=(Math.floor(y/48)%2)*32;ctx.fillStyle=accent;ctx.globalAlpha=.25+rand()*.28;ctx.fillRect(x+ox+2,y+2,58,42);ctx.globalAlpha=1;ctx.strokeStyle='#252a2a';ctx.globalAlpha=.32;ctx.strokeRect(x+ox+2,y+2,58,42);ctx.globalAlpha=1;}
  }else if(kind==='wood'){
    ctx.strokeStyle=accent;for(let i=0;i<34;i++){ctx.globalAlpha=.12+rand()*.24;ctx.lineWidth=1+rand()*4;ctx.beginPath();const y=rand()*512;ctx.moveTo(0,y);ctx.bezierCurveTo(150,y-18,340,y+18,512,y-5);ctx.stroke();}ctx.globalAlpha=1;
  }else if(kind==='roof'){
    for(let y=0;y<512;y+=38)for(let x=0;x<512;x+=42){ctx.fillStyle=accent;ctx.globalAlpha=.25+rand()*.25;ctx.beginPath();ctx.roundRect(x+(y/38%2)*20,y,38,31,5);ctx.fill();}ctx.globalAlpha=1;
  }else{
    for(let i=0;i<6500;i++){ctx.fillStyle=rand()>.5?accent:'#171a17';ctx.globalAlpha=.035+rand()*.11;ctx.fillRect(rand()*512,rand()*512,1+rand()*4,1+rand()*4);}ctx.globalAlpha=1;
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function makeWorld(){
  createAstreaWorld(THREE, world, { scene, keyLight, rimLight, camera, npcFactory: state.model ? () => SkeletonUtils.clone(state.model) : null });
}

function buildWardrobeUI(){
 const root=$('#wardrobe-slots');root.innerHTML='';let available=0;
 for(const slot of WARDROBE_SLOTS){
  const label=document.createElement('label');label.className='wardrobe-row';label.htmlFor='wardrobe-'+slot.id;
  const title=document.createElement('span');title.textContent=slot.label;
  const select=document.createElement('select');select.id='wardrobe-'+slot.id;select.dataset.slot=slot.id;
  const compatible=(WARDROBE_CATALOG[slot.id]||[]).filter(item=>(!item.races||item.races.includes(state.race))&&(!item.genders||item.genders.includes(state.gender)));
  const none=document.createElement('option');none.value='';none.textContent=compatible.length?'Aucun':'Aucun élément disponible';select.append(none);
  for(const item of compatible){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;select.append(option);}
  select.value=state.wardrobe[slot.id]||'';select.disabled=compatible.length===0;select.addEventListener('change',()=>equipWardrobeItem(slot.id,select.value));  label.append(title,select);root.append(label);available+=compatible.length;
 }
 const presets=$('#wardrobe-presets');presets.innerHTML='';
 if(state.race==='human'){
  for(const [id,labelText] of [['peasant','Tenue Peasant'],['ranger','Tenue Ranger']]){
   const button=document.createElement('button');button.type='button';button.className='wardrobe-preset';button.textContent=labelText;button.addEventListener('click',()=>applyWardrobePreset(id));presets.append(button);
  }
 }
 $('#wardrobe-status').textContent=available?available+' pièce(s) disponibles · 4 tenues complètes reconstituables.':'Pack Quaternius : 20 pièces. Disponibles pour les humains ; adaptation des autres races à valider.';
}
async function applyWardrobePreset(preset){
 const prefix=preset+'_'+(state.gender==='male'?'m':'f')+'_';
 const suffixes={torso:'body',arms:'arms',legs:'legs',boots:'feet',head:'hood',accessory:'pauldron'};
 const included=preset==='peasant'?['torso','arms','legs','boots']:['torso','arms','legs','boots','head','accessory'];
 const values=Object.fromEntries(WARDROBE_SLOTS.map(slot=>[slot.id,'']));
 for(const slot of included){const id=prefix+suffixes[slot];if((WARDROBE_CATALOG[slot]||[]).some(item=>item.id===id))values[slot]=id;}
 state.wardrobe={...values};buildWardrobeUI();
 await Promise.all(WARDROBE_SLOTS.map(slot=>equipWardrobeItem(slot.id,values[slot.id])));
 $('#wardrobe-status').textContent=(preset==='peasant'?'Peasant':'Ranger')+' équipé(e) · tu peux modifier chaque emplacement.';
}
function removeWardrobeItem(slot){
 const object=state.wardrobeObjects[slot];if(!object)return;state.model?.remove(object);
 object.traverse?.(node=>{if(node.isMesh){node.geometry?.dispose();if(Array.isArray(node.material))node.material.forEach(m=>m.dispose());else node.material?.dispose();}});
 delete state.wardrobeObjects[slot];
}
async function equipWardrobeItem(slot,itemId){
 const token=(state.wardrobeSlotTokens[slot]||0)+1;state.wardrobeSlotTokens[slot]=token;const resetToken=state.wardrobeToken;
 state.wardrobe[slot]=itemId;removeWardrobeItem(slot);if(!itemId||!state.model)return;
 const item=(WARDROBE_CATALOG[slot]||[]).find(entry=>entry.id===itemId);if(!item)return;
 $('#wardrobe-status').textContent='Chargement : '+item.label+'…';
 try{
  const gltf=await loadQuaterniusGLTF(item.url);if(resetToken!==state.wardrobeToken||token!==state.wardrobeSlotTokens[slot]||!state.model)return;
  const garment=SkeletonUtils.clone(gltf.scene);let attached=0;const baseBones=new Map();
  state.model.updateMatrixWorld(true);
  state.model.traverse(node=>{if(node.isBone)baseBones.set(node.name,node);});
  const boneAliases={root:'Hips',pelvis:'Hips',spine_01:'Spine',spine_02:'Spine01',spine_03:'Spine02',neck_01:'neck',Head:'Head',clavicle_l:'LeftShoulder',upperarm_l:'LeftArm',lowerarm_l:'LeftForeArm',hand_l:'LeftHand',clavicle_r:'RightShoulder',upperarm_r:'RightArm',lowerarm_r:'RightForeArm',hand_r:'RightHand',thigh_l:'LeftUpLeg',calf_l:'LeftLeg',foot_l:'LeftFoot',ball_l:'LeftToeBase',ball_leaf_l:'LeftToeBase',thigh_r:'RightUpLeg',calf_r:'RightLeg',foot_r:'RightFoot',ball_r:'RightToeBase',ball_leaf_r:'RightToeBase'};
  const mappedBone=(bone)=>baseBones.get(bone.name)||baseBones.get(boneAliases[bone.name])||baseBones.get(bone.name.endsWith('_l')?'LeftHand':bone.name.endsWith('_r')?'RightHand':'Hips');
  // Les doigts Quaternius sont rabattus sur les mains ASTREA, qui ne possèdent pas de phalanges.
  garment.traverse(node=>{
   if(!node.isSkinnedMesh)return;
   const mapped=node.skeleton.bones.map(mappedBone);
   if(mapped.some(bone=>!bone))throw new Error('Squelette ASTREA incomplet : impossible de mapper les os.');
   const skeleton=new THREE.Skeleton(mapped);skeleton.calculateInverses();node.bind(skeleton,node.bindMatrix);
   node.frustumCulled=false;node.castShadow=true;node.receiveShadow=true;node.userData.wardrobeSlot=slot;attached++;
  });
  if(!attached)throw new Error('Le fichier doit contenir au moins un mesh skinné.');
  // Ajuste la hauteur du vêtement à celle du personnage sans modifier l'échelle du personnage.
  const bodyBounds=new THREE.Box3().setFromObject(state.model);const bodyHeight=bodyBounds.getSize(new THREE.Vector3()).y/(state.model.scale.y||1);
  const garmentBounds=new THREE.Box3().setFromObject(garment);const garmentHeight=garmentBounds.getSize(new THREE.Vector3()).y||bodyHeight;
  const fit=THREE.MathUtils.clamp(bodyHeight/garmentHeight,.65,1.45);garment.scale.setScalar(fit);
  garment.name='wardrobe_'+slot+'_'+item.id;state.model.add(garment);state.wardrobeObjects[slot]=garment;
  $('#wardrobe-status').textContent=item.label+' équipé.';
 }catch(error){
  console.error(error);state.wardrobe[slot]='';const select=$('#wardrobe-'+slot);if(select)select.value='';
  $('#wardrobe-status').textContent='Pièce non compatible : '+error.message;showError('Impossible d’équiper '+item.label+'. Vérifie le GLB et son squelette.');
 }
}
function resetWardrobe(){
 state.wardrobeToken++;state.wardrobeSlotTokens={};for(const slot of WARDROBE_SLOTS)removeWardrobeItem(slot.id);
 state.wardrobe=Object.fromEntries(WARDROBE_SLOTS.map(slot=>[slot.id,'']));buildWardrobeUI();
}
function restoreWardrobe(saved={}){
 resetWardrobe();for(const slot of WARDROBE_SLOTS){const id=saved?.[slot.id];if(id&&(WARDROBE_CATALOG[slot.id]||[]).some(item=>item.id===id))equipWardrobeItem(slot.id,id);}
}


function createTrainingDummy(){
 if(trainingDummyMesh){world.remove(trainingDummyMesh);trainingDummyMesh=null;}
 trainingDummyCombatant=createCombatant({id:'training-dummy',name:'Mannequin d’entraînement',maxHp:150,hp:150,physicalStrength:0,fireMastery:0});
 const group=new THREE.Group();
 const wood=new THREE.MeshStandardMaterial({color:0x8b5a35,roughness:.9});
 const dark=new THREE.MeshStandardMaterial({color:0x493126,roughness:.95});
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.34,.42,1.15,8),wood);body.position.y=1.15;group.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.27,12,10),wood);head.position.y=1.92;group.add(head);
 const crossbar=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,1.25,8),dark);crossbar.rotation.z=Math.PI/2;crossbar.position.y=1.42;group.add(crossbar);
 const post=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,2.2,8),dark);post.position.y=.15;group.add(post);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.48,.55,.18,10),dark);base.position.y=-.04;group.add(base);
 group.position.set(0,world.userData.getHeightAt?.(0,2.8)??0,2.8);group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});world.add(group);trainingDummyMesh=group;
 updateCombatHud();
}
function createTrainingEnemy(){
 if(enemyMesh)world.remove(enemyMesh);
 enemyCombatant=createCombatant({id:'forest-raider',name:'Pillard des ruines',maxHp:120,hp:120,physicalStrength:7});
 enemyAI=createEnemyAI({id:'forest-raider',attackRange:1.8,telegraphMs:850,recoveryMs:1050,attackCooldownMs:350});
 enemyCombatant.poise=42;enemyCombatant.mass=1.25;enemyCombatant.controlResistance=.08;
 enemyStaggerUntil=0;enemyKnockdownUntil=0;enemyRecovery=createHitRecoveryState();enemyControlDiminishing=createControlDiminishingState();enemyBaseY=0;resetCombo(comboState);comboTargetId=null;
 const group=new THREE.Group();
 const armor=new THREE.MeshStandardMaterial({color:0x344b4a,roughness:.78,metalness:.15});
 const leather=new THREE.MeshStandardMaterial({color:0x573b2c,roughness:.95});
 const skin=new THREE.MeshStandardMaterial({color:0x8e6650,roughness:.9});
 const eye=new THREE.MeshStandardMaterial({color:0xff553e,emissive:0x9b1b0b,emissiveIntensity:1.6});
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.62,4,8),armor);torso.position.y=1.15;group.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.27,12,10),skin);head.position.y=1.82;group.add(head);
 const hood=new THREE.Mesh(new THREE.ConeGeometry(.32,.38,8),leather);hood.position.y=2.12;group.add(hood);
 const armL=new THREE.Mesh(new THREE.CapsuleGeometry(.11,.52,3,6),leather);armL.position.set(-.43,1.2,0);armL.rotation.z=-.3;group.add(armL);
 const armR=armL.clone();armR.position.x=.43;armR.rotation.z=.3;group.add(armR);
 const legL=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.55,3,6),leather);legL.position.set(-.18,.43,0);group.add(legL);
 const legR=legL.clone();legR.position.x=.18;group.add(legR);
 for(const x of [-.105,.105]){const e=new THREE.Mesh(new THREE.SphereGeometry(.035,8,8),eye);e.position.set(x,1.84,.235);group.add(e);}
 group.position.set(4.5,world.userData.getHeightAt?.(4.5,8.2)??0,8.2);enemyBaseY=group.position.y;group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});world.add(group);enemyMesh=group;
 enemyTelegraph=new THREE.Mesh(new THREE.RingGeometry(.62,.78,40),new THREE.MeshBasicMaterial({color:0xff553e,transparent:true,opacity:.85,side:THREE.DoubleSide}));enemyTelegraph.rotation.x=-Math.PI/2;enemyTelegraph.position.y=.025;enemyTelegraph.visible=false;group.add(enemyTelegraph);
 updateCombatHud();
}
function ensureCombatHud(){
 let panel=$('#combat-panel');
 if(!panel){
  panel=document.createElement('div');panel.id='combat-panel';
  panel.className='combat-panel';
  panel.innerHTML='<div style="font-weight:800;letter-spacing:.12em;margin-bottom:8px">ENTRAÎNEMENT · COMBO J × 3</div><div>JOUEUR · PV <span id="combat-player-hp">100 / 100</span></div><div style="height:7px;background:#263746;border-radius:8px;overflow:hidden;margin:4px 0 8px"><div id="combat-player-hp-bar" style="height:100%;width:100%;background:#55bd83"></div></div><div>ENDURANCE <span id="combat-player-stamina">100 / 100</span></div><div style="height:7px;background:#263746;border-radius:8px;overflow:hidden;margin:4px 0 10px"><div id="combat-player-stamina-bar" style="height:100%;width:100%;background:#56bfff"></div></div><div style="font-weight:700">MANNEQUIN · PV <span id="combat-target-hp">150 / 150</span></div><div style="height:7px;background:#263746;border-radius:8px;overflow:hidden;margin:4px 0 10px"><div id="combat-target-hp-bar" style="height:100%;width:100%;background:#e18a55"></div></div><div style="font-weight:700">PILLARD · PV <span id="combat-enemy-hp">120 / 120</span> · <span id="combat-enemy-state">APPROACH</span></div><div style="height:7px;background:#263746;border-radius:8px;overflow:hidden;margin:4px 0 10px"><div id="combat-enemy-hp-bar" style="height:100%;width:100%;background:#e65d4d"></div></div><div id="combat-message" style="min-height:32px;color:#b9d9f2;margin-bottom:8px">Le pillard approche. Prépare-toi à esquiver ou à parer.</div><div class="weapon-progression"><label for="combat-weapon-select">ARME ÉQUIPÉE</label><select id="combat-weapon-select" class="combat-select"><option value="sword">Épée</option><option value="axe">Hache</option><option value="hammer">Marteau</option><option value="polearm">Arme d’hast</option></select><div id="combat-mastery-progress" class="mastery-progress" aria-live="polite"></div><label for="combat-technique-select">TECHNIQUE</label><select id="combat-technique-select" class="combat-select"><option value="">Attaque normale</option></select><div id="combat-technique-progress" class="mastery-progress" aria-live="polite"></div></div><div class="combat-actions"><button data-combat="attack">Attaque (J)</button><button data-combat="fire">Feu (K)</button><button data-combat="block">Parade (L)</button><button data-combat="dodge">Esquive (O)</button><button data-combat="reset" class="combat-reset">Réinitialiser le combat</button></div>';
  for(const button of panel.querySelectorAll('button')){button.classList.add('combat-action-button');button.addEventListener('click',()=>combatAction(button.dataset.combat));}
  panel.querySelector('#combat-weapon-select').addEventListener('change',e=>selectCombatWeapon(e.target.value));
  panel.querySelector('#combat-technique-select').addEventListener('change',e=>{selectedTechniqueId=e.target.value;updateWeaponProgressionHud();});
  gameHud.append(panel);
  equipTrainingWeapon(selectedWeaponCategory);
  updateWeaponProgressionHud();
 }
 panel.hidden=true;
}
function selectCombatWeapon(category){
 if(!WEAPON_UI[category])return;
 if(!equipTrainingWeapon(category)){combatMessage('Impossible d’équiper cette arme.');return;}
 selectedWeaponCategory=category;selectedTechniqueId='';
 updateWeaponProgressionHud();
}
function updateWeaponProgressionHud(){
 const weaponSelect=$('#combat-weapon-select'),techniqueSelect=$('#combat-technique-select');
 if(!weaponSelect||!techniqueSelect||!playerCombatant)return;
 weaponSelect.value=selectedWeaponCategory;
 const progression=getWeaponProgression(playerCombatant,selectedWeaponCategory);
 const m=progression.mastery;
 const mastery=$('#combat-mastery-progress');
 if(mastery)mastery.textContent='Maîtrise '+m.level+'/100 · '+Math.floor(m.xp)+' XP · '+(m.level>=100?'Maximum atteint':m.xpRemaining+' XP avant le rang suivant');
 const previous=selectedTechniqueId;
 techniqueSelect.replaceChildren(new Option('Attaque normale',''));
 for(const technique of progression.techniques){
  const option=new Option((technique.unlocked?'✓ ':'🔒 ')+technique.name+(technique.unlocked?' · R'+technique.techniqueMasteryLevel:' · Maîtrise '+technique.requiredMastery),technique.id);
  option.disabled=!technique.unlocked;
  techniqueSelect.add(option);
 }
 selectedTechniqueId=progression.techniques.some(t=>t.id===previous&&t.unlocked)?previous:'';
 techniqueSelect.value=selectedTechniqueId;
 const selected=progression.techniques.find(t=>t.id===selectedTechniqueId);
 const detail=$('#combat-technique-progress');
 if(detail)detail.textContent=selected?'Technique R'+selected.techniqueMasteryLevel+'/5 · '+selected.xp+' utilisations · '+(selected.techniqueMasteryLevel>=5?'Maîtrise maximale':selected.xpRemaining+' utilisations avant le rang suivant'):'Choisis une technique débloquée ou utilise une attaque normale.';
}
function combatMessage(message){
 const el=$('#combat-message');if(el)el.textContent=message;
 const toast=$('#world-toast');if(toast)toast.textContent=message;
}
function updateMagicHud(){
 const update=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
 const bar=$('#magic-mana-bar');if(bar)bar.style.width=(playerCombatant.maxMana>0?playerCombatant.mana/playerCombatant.maxMana*100:0)+'%';
 update('#magic-mana-value',Math.ceil(playerCombatant.mana)+' / '+playerCombatant.maxMana);
 update('#magic-school-label',MAGIC_LABELS[state.selectedMagicSchool]||'Feu');
 const select=$('#magic-school-quick-select');if(select){select.value=state.selectedMagicSchool;for(const option of select.options)option.disabled=!MAGIC_RACE_RULES[state.race]?.allowed.includes(option.value);if(select.selectedOptions[0]?.disabled){state.selectedMagicSchool=MAGIC_SCHOOLS.find(school=>MAGIC_RACE_RULES[state.race]?.allowed.includes(school))||'fire';select.value=state.selectedMagicSchool;}}
 const remaining=Math.max(0,(playerCombatant.cooldowns['magic:'+state.selectedMagicSchool]||0)-combatClockMs);
 update('#magic-cooldown',remaining>0?'RECHARGE '+(remaining/1000).toFixed(1)+' s':'PRÊT');
}
function updateCombatHud(){
 const update=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
 const bar=(id,value,max)=>{const el=$(id);if(el)el.style.width=(max>0?Math.max(0,Math.min(100,value/max*100)):0)+'%';}; if(!playerCombatant||!trainingDummyCombatant)return;
 update('#combat-player-hp',Math.ceil(playerCombatant.hp)+' / '+playerCombatant.maxHp);
 update('#combat-player-stamina',Math.floor(playerCombatant.stamina)+' / '+playerCombatant.maxStamina);
 updateMagicHud();
 update('#combat-target-hp',Math.ceil(trainingDummyCombatant.hp)+' / '+trainingDummyCombatant.maxHp);
 if(enemyCombatant){update('#combat-enemy-hp',Math.ceil(enemyCombatant.hp)+' / '+enemyCombatant.maxHp);update('#combat-enemy-state',(enemyAI?.state||'approach').toUpperCase());}
 bar('#combat-player-hp-bar',playerCombatant.hp,playerCombatant.maxHp);
 bar('#combat-player-stamina-bar',playerCombatant.stamina,playerCombatant.maxStamina);
 bar('#combat-target-hp-bar',trainingDummyCombatant.hp,trainingDummyCombatant.maxHp);
 if(enemyCombatant)bar('#combat-enemy-hp-bar',enemyCombatant.hp,enemyCombatant.maxHp);
}
const MAGIC_LABELS={fire:'Feu',water:'Eau',wind:'Vent',earth:'Terre',ice:'Glace',lightning:'Foudre',nature:'Nature',light:'Lumière',demonic:'Démoniaque'};
const MAGIC_COLORS={fire:0xff713b,water:0x53b8ed,wind:0xc9f3dd,earth:0xb88b58,ice:0x9ce9ff,lightning:0xffed62,nature:0x75d66e,light:0xfff3b0,demonic:0x9c68d8};
function loadMagicProgression(){try{state.magicProgression=sanitizeMagicProgression(JSON.parse(localStorage.getItem('astrea.magic.v2')||'{}'),state.race);}catch{state.magicProgression=createMagicProgression(state.race);}playerCombatant.fireMastery=state.magicProgression.schools.fire.level;saveMagicProgression();}
function saveMagicProgression(){localStorage.setItem('astrea.magic.v2',JSON.stringify(state.magicProgression));}
function performMagicCast(){
 const school=state.selectedMagicSchool||'fire';
 if(!state.model){combatMessage('Personnage indisponible.');return;}
 const selfCast=['earth','nature','light'].includes(school);
 const allTargets=[{combatant:enemyCombatant,mesh:enemyMesh},{combatant:trainingDummyCombatant,mesh:trainingDummyMesh}].filter(item=>item.combatant&&!item.combatant.defeated&&item.mesh);
 let targets=[];
 if(!selfCast){
  if(school==='wind')targets=allTargets.filter(item=>state.model.position.distanceTo(item.mesh.position)<=4.5).map(item=>item.combatant);
  else{const closest=allTargets.sort((a,b)=>state.model.position.distanceTo(a.mesh.position)-state.model.position.distanceTo(b.mesh.position))[0];if(closest&&state.model.position.distanceTo(closest.mesh.position)<=3.35)targets=[closest.combatant];}
 }
 const result=castMagicSpell(playerCombatant,selfCast?null:targets,school,{now:combatClockMs});
 if(!result.executed){const messages={'race-school-restriction':'Cette école est interdite à ta race.','target-required':school==='wind'?'Aucune cible dans la zone de l’onde.':'Rapproche-toi d’une cible.','insufficient-mana':'Pas assez de mana.','cooldown':'Ce sort est encore en recharge.','target-at-full-health':'Tes PV sont déjà au maximum.'};combatMessage(messages[result.reason]||'Sort impossible : '+result.reason);updateMagicHud();return;}
 playAction('charged_spell_cast',true);
 const origin=state.model.position.clone().add(new THREE.Vector3(0,1.15,0));
 const affected=result.targets.map(item=>allTargets.find(entry=>entry.combatant.id===item.targetId)).filter(Boolean);
 let destination=origin.clone();
 if(affected.length){destination=affected.reduce((sum,item)=>sum.add(item.mesh.position.clone().add(new THREE.Vector3(0,1,0))),new THREE.Vector3()).multiplyScalar(1/affected.length);}
 spawnMagicVfx(school,origin,destination);
 if(result.knockback>0){for(const item of affected){if(item.combatant.id==='forest-raider'){const dx=item.mesh.position.x-state.model.position.x,dz=item.mesh.position.z-state.model.position.z,len=Math.hypot(dx,dz)||1;item.mesh.position.x+=dx/len*result.knockback;item.mesh.position.z+=dz/len*result.knockback;}}}
 if(result.hit){const equipped=state.magicProgression.equippedTechniques.normal.find(id=>id?.startsWith(school+':'))||null;const progress=recordMagicSkillUse(state.magicProgression,state.race,school,equipped);if(progress.recorded){state.magicProgression=progress.progression;playerCombatant.fireMastery=state.magicProgression.schools.fire.level;saveMagicProgression();}}
 const detail=result.damage>0?Math.round(result.damage)+' dégâts':result.healing>0?Math.round(result.healing)+' PV restaurés':result.shield?'bouclier de '+result.shield.remaining+' PV':result.purified>0?result.purified+' effet(s) purifié(s)':'effet appliqué';
 combatMessage(MAGIC_LABELS[school]+' · '+result.spell.name+' : '+detail+'.');
 updateCombatHud();
}
function performPlayerAttack(kind='physical'){
 if(kind==='magic'){performMagicCast();return;}
 if(!state.model){combatMessage('Personnage indisponible.');return;}
 const dummyDistance=trainingDummyMesh?state.model.position.distanceTo(trainingDummyMesh.position):Infinity;
 const enemyDistance=enemyMesh&&enemyCombatant&&!enemyCombatant.defeated?state.model.position.distanceTo(enemyMesh.position):Infinity;
 let targetIsEnemy=enemyDistance<dummyDistance;
 let target=targetIsEnemy?enemyCombatant:trainingDummyCombatant;
 let targetMesh=targetIsEnemy?enemyMesh:trainingDummyMesh;
 if(kind==='physical'&&comboState.stage>0&&comboTargetId){const locked=comboTargetId==='forest-raider'?enemyCombatant:trainingDummyCombatant;const lockedMesh=comboTargetId==='forest-raider'?enemyMesh:trainingDummyMesh;const lockedDistance=lockedMesh?state.model.position.distanceTo(lockedMesh.position):Infinity;if(locked&&!locked.defeated&&lockedDistance<=3.35){target=locked;targetMesh=lockedMesh;targetIsEnemy=locked.id==='forest-raider';}else comboTargetId=null;}
 const distance=targetMesh?state.model.position.distanceTo(targetMesh.position):Infinity;
 if(!target||target.defeated){combatMessage('Aucune cible disponible.');return;}
 if(distance>3.35){combatMessage('Rapproche-toi de la cible.');return;}
 const combo=advanceCombo(comboState,combatClockMs);
 const attack={id:'training-combo-'+combo.stage,kind:'physical',base:16,strength:playerCombatant.physicalStrength,strengthCoefficient:.25,techniqueMultiplier:combo.multiplier,executionQuality:1,criticalChance:0,staminaCost:combo.staminaCost,impact:24+combo.stage*18,attackType:combo.finisher?'finisher':combo.stage===2?'launcher':'light',techniqueId:selectedTechniqueId||undefined};
 const result=executeAttack(playerCombatant,target,attack,{now:combatClockMs});
 if(!result.executed){if(kind!=='magic'){resetCombo(comboState);comboTargetId=null;}combatMessage(result.reason==='insufficient-stamina'?'Pas assez d’endurance.':'Attaque impossible : '+result.reason);return;}
 playAction('attack',true);
 let reaction=null;
 if(kind==='physical'){if(combo.finisher)comboTargetId=null;else if(combo.stage===1)comboTargetId=target.id;}
 if(targetIsEnemy&&result.executed){reaction=resolveHitReaction({impact:attack.impact??result.damage,targetPoise:enemyCombatant.poise,targetMass:enemyCombatant.mass,controlResistance:enemyCombatant.controlResistance,attackType:attack.attackType||'magic'});if(attack.kind==='physical'&&(result.weaponCategory||attack.weaponCategory))reaction=applyWeaponHitProfile(reaction,result.weaponCategory||attack.weaponCategory);reaction=applyControlDiminishing(enemyControlDiminishing,reaction,combatClockMs);if(reaction.staggerMs>0)staggerEnemyAI(enemyAI);enemyStaggerUntil=combatClockMs+reaction.staggerMs;enemyKnockdownUntil=reaction.knockdown?enemyStaggerUntil:0;
  if(reaction.knockdown||reaction.launch){beginHitRecovery(enemyRecovery,reaction,combatClockMs);enemyMesh.position.y=reaction.launch?0:-.55;}
  if(reaction.knockback>0){const dx=enemyMesh.position.x-state.model.position.x,dz=enemyMesh.position.z-state.model.position.z,len=Math.hypot(dx,dz)||1;const displacement=reaction.knockback*(attack.attackType==='finisher'?1:.22);enemyMesh.position.x+=dx/len*displacement;enemyMesh.position.z+=dz/len*displacement;}
  if(reaction.knockdown)enemyMesh.rotation.x=-Math.PI/2;
 }
 const comboText=combo?(combo.finisher?' · FINISHER':` · COMBO ${combo.stage}/3`):'';
 const reactionText=reaction?' · '+reaction.reaction.toUpperCase():'';
 spawnCombatBurst(targetMesh.position.clone().add(new THREE.Vector3(0,1,0)),0xffd18a,32);
 combatMessage('Attaque'+comboText+reactionText+' : '+Math.round(result.damage)+' dégâts infligés à '+target.name+'.');
 if(target.defeated)combatMessage(targetIsEnemy?'Pillard vaincu !':'Mannequin détruit ! Tu peux le réinitialiser.');
 updateCombatHud();updateWeaponProgressionHud();
}
function combatAction(action){
 const now=combatClockMs;
 if(action==='attack')performPlayerAttack('physical');
 else if(action==='fire'){resetCombo(comboState);comboTargetId=null;performPlayerAttack('magic');}
 else if(action==='block'){
  resetCombo(comboState);comboTargetId=null;const result=beginBlock(playerCombatant,{now,staminaCost:4,durationMs:650,parryWindowMs:180});
  if(result.started){playAction('block',true);combatMessage('Garde active : fenêtre de parade parfaite pendant 180 ms.');}
  else combatMessage('Pas assez d’endurance pour bloquer.');
 }else if(action==='dodge'){
  resetCombo(comboState);comboTargetId=null;const result=beginDodge(playerCombatant,{now,staminaCost:18,durationMs:420});
  if(result.started){const dodgeAxes=getMovementAxes({gamePadX:state.gamePadX||0,gamePadY:state.gamePadY||0,touchX:state.touchX||0,touchForward:state.touchY||0});const destination=getDodgeDestination({x:state.model.position.x,z:state.model.position.z,side:dodgeAxes.side,forward:dodgeAxes.forward,cameraYaw:state.gameYaw,facingYaw:state.model.rotation.y,distance:2.15});state.dodgeMotion={from:state.model.position.clone(),to:new THREE.Vector3(destination.x,state.model.position.y,destination.z),elapsed:0,duration:.42};playAction('dodge_roll',true);combatMessage('Esquive : déplacement et invulnérabilité temporaire.');}
  else combatMessage('Pas assez d’endurance pour esquiver.');
 }else if(action==='reset'){
  playerCombatant=createCombatant({id:'player',name:state.name||'Joueur',race:state.race,physicalStrength:10*getMagicRaceStatModifiers(state.race).physicalStrength,defense:10*getMagicRaceStatModifiers(state.race).defense,fireMastery:state.magicProgression.schools.fire.level,weaponMastery:0});equipTrainingWeapon(selectedWeaponCategory);selectedTechniqueId='';resetCombo(comboState);comboTargetId=null;
  createTrainingDummy();createTrainingEnemy();combatMessage('Combat réinitialisé : PV, endurance et ennemis restaurés.');
 }
 updateCombatHud();updateWeaponProgressionHud();
}

function updateEnemyEncounter(dt,now){
 if(!enemyAI||!enemyMesh||!enemyCombatant||!state.model||playerCombatant.defeated)return;
 const dx=state.model.position.x-enemyMesh.position.x,dz=state.model.position.z-enemyMesh.position.z;
 const distance=Math.hypot(dx,dz);
 const recoveryPose=updateHitRecovery(enemyRecovery,now);
 const recovering=recoveryPose.phase==='airborne'||recoveryPose.phase==='down'||recoveryPose.phase==='getting-up';
 const activeStatuses=enemyCombatant.statusEffects.filter(effect=>effect.expiresAt>now);
 const frozen=enemyCombatant.frozenUntil>now,stunned=enemyCombatant.stunnedUntil>now,slowed=activeStatuses.some(effect=>effect.id==='soaked');
 const result=updateEnemyAI(enemyAI,{deltaSeconds:dt,distance,defeated:enemyCombatant.defeated,staggered:now<enemyStaggerUntil||recovering||frozen||stunned});
 if(result.canMove&&distance>enemyAI.attackRange*.88&&!frozen&&!stunned){const step=Math.min(distance-enemyAI.attackRange*.88,2.15*dt*(slowed?.65:1));enemyMesh.position.x+=dx/(distance||1)*step;enemyMesh.position.z+=dz/(distance||1)*step;}
 if(distance>.08)enemyMesh.rotation.y=Math.atan2(dx,dz);
 if(enemyMesh&&enemyCombatant&&!enemyCombatant.defeated){
  if(recoveryPose.phase==='airborne'){enemyMesh.rotation.x=-.18;enemyMesh.position.y=recoveryPose.height;}
  else if(recoveryPose.phase==='down'){enemyMesh.rotation.x=-Math.PI/2;enemyMesh.position.y=-.55;}
  else if(recoveryPose.phase==='getting-up'){enemyMesh.rotation.x=-Math.PI/2*(1-recoveryPose.progress);enemyMesh.position.y=-.55*(1-recoveryPose.progress);}
  else if(recoveryPose.phase==='standing'){enemyMesh.rotation.x=0;enemyMesh.position.y=0;}
 }
 if(enemyTelegraph){enemyTelegraph.visible=result.telegraph;enemyTelegraph.material.opacity=result.telegraph?.55+.3*Math.sin(now*.025):.0;}
 if(result.attack&&distance<=enemyAI.attackRange+.35){
  const hit=resolveIncomingAttack(enemyCombatant,playerCombatant,{kind:'physical',base:12,strength:5,strengthCoefficient:.2,weaponPower:0,techniqueMultiplier:1,executionQuality:1,criticalChance:0},{now,rng:Math.random});
  if(hit.parried){staggerEnemyAI(enemyAI);enemyStaggerUntil=now+650;combatMessage('Parade parfaite ! Le pillard est déstabilisé : contre-attaque !');}
  else if(hit.dodged)combatMessage('Esquive réussie : le pillard a manqué son attaque.');
  else if(hit.blocked){playAction('block',true);combatMessage('Garde : dégâts réduits à '+Math.round(hit.hpLost)+'.');}
  else if(hit.hit){playAction('hit_reaction',true);combatMessage('Le pillard te frappe : '+Math.round(hit.hpLost)+' dégâts.');}
  if(playerCombatant.defeated)combatMessage('Tu es vaincu. Réinitialise le combat pour recommencer.');
 }
 if(enemyCombatant.defeated){enemyAI.state='defeated';enemyRecovery.phase='defeated';enemyMesh.rotation.x=-Math.PI/2;enemyMesh.position.y=-.55;if(enemyTelegraph)enemyTelegraph.visible=false;}
}

const worldResources={herbs:0,wood:0,stone:0,fish:0,crops:0,relics:0};
function loadWorldResources(){try{const saved=JSON.parse(localStorage.getItem('astrea-world-resources')||'{}');for(const k of Object.keys(worldResources))worldResources[k]=Math.max(0,Number(saved[k])||0);}catch{}}
function updateWorldHud(){if(state.screen!=='game'||!state.model)return;const r=world.userData.getRegionAt?.(state.model.position.x,state.model.position.z);const loc=$('#world-location');if(loc&&r)loc.textContent=r.name.toUpperCase()+' · CONTINENT ASTREA';const near=world.userData.getNearbyActivity?.(state.model.position);const hint=$('#world-interact-hint'),button=$('#world-interact');if(hint){hint.hidden=!near;hint.textContent=near?'E · '+near.prompt:'';}if(button)button.hidden=!near;const resources=$('#world-resources');if(resources)resources.textContent='HERBES '+worldResources.herbs+' · BOIS '+worldResources.wood+' · MINERAI '+worldResources.stone+' · POISSON '+worldResources.fish+' · RÉCOLTES '+worldResources.crops+' · RELIQUES '+worldResources.relics;}
function interactWithWorld(){if(state.screen!=='game'||!state.model)return;const r=world.userData.interact?.(state.model.position);const toast=$('#world-toast');if(!r){if(toast)toast.textContent='Aucune activité à proximité.';return;}worldResources[r.resource]=(worldResources[r.resource]||0)+r.amount;localStorage.setItem('astrea-world-resources',JSON.stringify(worldResources));if(toast)toast.textContent=r.message+'  +'+r.amount;updateWorldHud();}
function setStatus(text,good=false){$('#model-status').textContent=text;$('#model-status').style.color=good?'#77d8a0':'#f1c77a';}

const settingsScreen=$('#settings-screen'),settingsContent=$('#settings-content');
let activeSettingsTab='graphics';
const settingDefinitions={
 graphics:[['Rendu',[
  ['Qualité graphique','select','quality',[['low','Économie'],['medium','Équilibré'],['high','Élevé']]],
  ['FPS cible','select','targetFps',[[30,'30 FPS'],[40,'40 FPS'],[60,'60 FPS']]],
  ['Échelle de résolution','range','resolutionScale',50,100,'%'],['Ombres dynamiques','toggle','shadows']
 ]]],
 controls:[['Déplacement',[
  ['Taille du joystick','range','joystickSize',70,140,'%'],['Taille des boutons','range','buttonSize',70,140,'%'],
  ['Sensibilité caméra','range','cameraSensitivity',10,100,'%'],['Suivi caméra','toggle','cameraFollow']
 ]]],
 audio:[['Volume',[
  ['Volume général','range','masterVolume',0,100,'%'],['Musique','range','musicVolume',0,100,'%'],
  ['Effets sonores','range','effectsVolume',0,100,'%'],['Voix','range','voiceVolume',0,100,'%']
 ]]],
 gameplay:[['Interface',[
  ['Langue','select','language',[['fr','Français'],['en','English']]],['Sous-titres','toggle','subtitles'],
  ['Chiffres de dégâts','toggle','damageNumbers'],['Marqueurs de quête','toggle','questMarkers']
 ]]],
 accessibility:[['Confort',[
  ['Échelle interface','range','uiScale',85,125,'%'],['Réduire les animations','toggle','reduceMotion'],['Contraste élevé','toggle','highContrast']
 ]]]
};
function settingRow(label,type,key,extra=[]){
 const value=state.settings[key];let control='';
 if(type==='range'){const [min,max,unit]=extra;control=`<input type="range" min="${min}" max="${max}" step="5" value="${value}" data-setting="${key}"><output>${value}${unit||''}</output>`;}
 else if(type==='toggle')control=`<input type="checkbox" data-setting="${key}" ${value?'checked':''}>`;
 else {const options=Array.isArray(extra[0])?extra[0]:extra;control=`<select data-setting="${key}">${options.map(([v,l])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${l}</option>`).join('')}</select>`;}
 return `<label class="setting-row"><span>${label}</span>${control}</label>`;
}
let selectedMagicSchool='fire';
function renderMagicSystem(){
 const progression=state.magicProgression;
 const allowed=MAGIC_RACE_RULES[state.race]?.allowed||[];
 const school=selectedMagicSchool;
 const schoolState=progression.schools[school];
 const tree=getMagicSkillTree(school,progression);
 const slots=[...progression.equippedTechniques.normal.map((id,i)=>({id,type:'normal',index:i,label:'Normale '+(i+1)})),...progression.equippedTechniques.ultimate.map((id,i)=>({id,type:'ultimate',index:i,label:'Ultime '+(i+1)}))];
 const schoolCards=MAGIC_SCHOOLS.map(key=>`<button type="button" class="magic-school ${school===key?'selected':''} ${allowed.includes(key)?'':'locked'}" data-magic-school="${key}" ${allowed.includes(key)?'':'disabled'}><b>${MAGIC_LABELS[key]}</b><small>${allowed.includes(key)?'NIVEAU '+progression.schools[key].level:'INTERDITE À TA RACE'}</small></button>`).join('');
 const nodes=tree.nodes.filter(node=>node.unlocked).slice(0,20).map(node=>`<article class="magic-skill"><div><b>${node.id}</b><small>${node.branch.toUpperCase()} · PALIER ${node.tier} · MAÎTRISE ${node.masteryLevel}/5</small></div><div class="magic-equip">${(node.branch==='ultimate'?slots.filter(x=>x.type==='ultimate'):slots.filter(x=>x.type==='normal')).map(slot=>`<button type="button" data-equip-skill="${node.id}" data-slot-type="${slot.type}" data-slot-index="${slot.index}">${slot.id===node.id?'✓ ':''}${slot.label}</button>`).join('')}</div></article>`).join('');
 settingsContent.innerHTML=`<div class="magic-heading"><button type="button" data-magic-back>← SYSTÈMES</button><div><h3>MAGIE · ${MAGIC_LABELS[school].toUpperCase()}</h3><p>Progression par utilisation réussie · aucune dépense de points</p></div></div><div class="magic-school-grid">${schoolCards}</div><section class="setting-card magic-progress"><h3>Progression · ${MAGIC_LABELS[school]}</h3><div class="magic-progress-row"><b>Niveau ${schoolState.level}/100</b><span>${schoolState.xp} XP · ${schoolState.successfulCasts} lancements réussis</span></div><div class="magic-progress-track"><i style="width:${Math.round((schoolState.xp%Math.max(1,20+4*schoolState.level))/Math.max(1,20+4*schoolState.level)*100)}%"></i></div><p>Les techniques se débloquent automatiquement en utilisant cette école.</p></section><section class="setting-card"><h3>Techniques équipées</h3><div class="magic-slots">${slots.map(slot=>`<div><small>${slot.label}</small><b>${slot.id||'Emplacement vide'}</b></div>`).join('')}</div></section><section class="setting-card"><h3>Techniques débloquées (${tree.nodes.filter(n=>n.unlocked).length}/75)</h3>${nodes||'<p class="magic-empty">Aucune technique débloquée. Utilise cette école en combat pour progresser.</p>'}</section><p class="magic-disclaimer">Prototype local : la progression est sauvegardée sur cet appareil. La synchronisation serveur et le combat multijoueur restent à connecter.</p>`;
}
function renderSettingsTab(){
 if(!settingsContent)return;
 if(activeSettingsTab==='magic'){renderMagicSystem();return;}
 if(activeSettingsTab==='systems'){
  const cards=[['Personnage','Races, apparence, équipement et progression.','Actif'],['Magie',`${MAGIC_SCHOOLS.length} écoles · progression par utilisation réussie · restrictions selon la race · 3 techniques normales et 2 ultimes.`,'Prototype'],['Compétences','Maîtrise des armes, techniques et progression par utilisation.','Prototype'],['Inventaire','Objets, ressources, équipements et artisanat.','À construire'],['Quêtes','Missions, objectifs et récompenses.','À construire'],['Guildes','Création de guilde, rangs, membres et coffre commun.','À construire'],['Royaumes','Territoires, souverain, ministères, taxes et lois.','À construire'],['Carte','Continents, régions, villes et points d’intérêt.','Prototype'],['Social','Amis, groupes, échanges et messagerie.','À construire']];
  settingsContent.innerHTML=`<div class="setting-card"><h3>Univers ASTREA</h3><p>Les modules indiqués Prototype ou À construire ne sont pas encore des services multijoueurs opérationnels.</p></div><div class="system-grid">${cards.map(([n,d,s])=>`<button type="button" class="system-card" data-system="${n}"><b>${n}</b><p>${d}</p><em>${s.toUpperCase()}</em></button>`).join('')}</div>`;return;
 }
 const groups=settingDefinitions[activeSettingsTab]||[];settingsContent.innerHTML=groups.map(([title,rows])=>`<section class="setting-card"><h3>${title}</h3>${rows.map(([label,type,key,...extra])=>settingRow(label,type,key,extra)).join('')}</section>`).join('');
}
function applySettings(){
 renderer.setPixelRatio(Math.min((devicePixelRatio||1)*state.settings.resolutionScale/100,1.7));renderer.shadowMap.enabled=state.settings.shadows;resize();
 stickRootStyle();document.documentElement.style.setProperty('--astrea-ui-scale',String(state.settings.uiScale/100));document.body.classList.toggle('astrea-high-contrast',state.settings.highContrast);document.body.classList.toggle('astrea-reduce-motion',state.settings.reduceMotion);
}
function stickRootStyle(){const stick=$('#move-stick'),actions=$('.touch-actions');if(stick){stick.style.transform=`scale(${state.settings.joystickSize/100})`;stick.style.transformOrigin='bottom left';}if(actions){actions.style.transform=`scale(${state.settings.buttonSize/100})`;actions.style.transformOrigin='bottom right';}}
function setSetting(key,value){const checked=validateSettings({...state.settings,[key]:value});state.settings=checked.settings;saveSettings(state.settings);applySettings();const out=settingsContent?.querySelector(`[data-setting="${key}"]`)?.parentElement?.querySelector('output');if(out)out.textContent=state.settings[key]+(key==='resolutionScale'||key==='joystickSize'||key==='buttonSize'||key==='cameraSensitivity'||key==='masterVolume'||key==='musicVolume'||key==='effectsVolume'||key==='voiceVolume'||key==='uiScale'?'%':'');const label=$('#settings-saved');if(label)label.textContent='Modifications enregistrées';}
function openSettings(){if(state.screen!=='game')return;state.settingsOpen=true;settingsScreen.hidden=false;$('#settings-open').hidden=true;state.keys.clear();state.touchX=state.touchY=0;renderSettingsTab();}
function closeSettings(){state.settingsOpen=false;settingsScreen.hidden=true;$('#settings-open').hidden=false;}
$('#settings-open')?.addEventListener('click',openSettings);$('#settings-close')?.addEventListener('click',closeSettings);
$('#settings-tabs')?.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;activeSettingsTab=b.dataset.tab;document.querySelectorAll('#settings-tabs button').forEach(x=>x.classList.toggle('active',x===b));renderSettingsTab();});
settingsContent?.addEventListener('click',e=>{
 const system=e.target.closest('[data-system]');
 if(system?.dataset.system==='Magie'){selectedMagicSchool=state.selectedMagicSchool;activeSettingsTab='magic';renderSettingsTab();return;}
 const back=e.target.closest('[data-magic-back]');if(back){activeSettingsTab='systems';renderSettingsTab();return;}
 const school=e.target.closest('[data-magic-school]');if(school){selectedMagicSchool=school.dataset.magicSchool;state.selectedMagicSchool=selectedMagicSchool;renderMagicSystem();return;}
 const equip=e.target.closest('[data-equip-skill]');if(equip){const result=equipMagicTechnique(state.magicProgression,selectedMagicSchool,equip.dataset.equipSkill,equip.dataset.slotType,Number(equip.dataset.slotIndex));if(result.equipped){state.magicProgression=result.progression;saveMagicProgression();}renderMagicSystem();return;}
});
settingsContent?.addEventListener('input',e=>{const el=e.target.closest('[data-setting]');if(!el)return;setSetting(el.dataset.setting,el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value);const output=el.parentElement.querySelector('output');if(output&&el.type==='range')output.textContent=el.value+'%';});
settingsContent?.addEventListener('change',e=>{const el=e.target.closest('[data-setting]');if(!el)return;setSetting(el.dataset.setting,el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value);});
$('#settings-reset')?.addEventListener('click',()=>{state.settings={...DEFAULT_SETTINGS};saveSettings(state.settings);applySettings();renderSettingsTab();$('#settings-saved').textContent='Valeurs par défaut restaurées';});
applySettings();


function setScreen(name){if(name!=='game')closeSettings();state.screen=name;menu.hidden=name!=='menu';creator.hidden=name!=='creator';gameHud.hidden=name!=='game';canvas.style.opacity=name==='menu'?'0.38':'1';if(name==='creator'){camera.position.set(0,1.45,4.7);camera.lookAt(0,1,0);}if(name==='game'){makeWorld();createTrainingDummy();createTrainingEnemy();ensureCombatHud();const spawnHeight=world.userData.getHeightAt?.(0,0)??0;camera.position.set(0,spawnHeight+4.8,-7);camera.lookAt(0,spawnHeight+1,0);}}
function createRaceButtons(){const root=$('#race-options');root.innerHTML='';for(const [id,label] of RACES){const b=document.createElement('button');b.className='race-choice'+(id===state.race?' selected':'');b.textContent=label;b.dataset.race=id;b.addEventListener('click',()=>{state.race=id;updateSelection();loadSelectedCharacter();});root.append(b);}}
function updateSelection(){document.querySelectorAll('.race-choice').forEach(b=>b.classList.toggle('selected',b.dataset.race===state.race));document.querySelectorAll('[data-gender]').forEach(b=>b.classList.toggle('selected',b.dataset.gender===state.gender));$('#preview-name').textContent=`${RACES.find(x=>x[0]===state.race)[1].toUpperCase()} · ${state.gender==='male'?'MASCULIN':'FÉMININ'}`;}
function archiveKey(){return `${state.race}_${state.gender}`;}
async function getArchive(key){if(state.zipCache.has(key))return state.zipCache.get(key);const url=ZIP_URLS[key];if(!url)throw new Error(`Aucun pack 3D disponible pour ${key}`);const promise=(async()=>{const response=await fetch(url);if(!response.ok)throw new Error(`Téléchargement du pack ${key}: HTTP ${response.status}`);const bytes=await response.arrayBuffer();return await window.JSZip.loadAsync(bytes);})();state.zipCache.set(key,promise);try{return await promise;}catch(e){state.zipCache.delete(key);throw e;}}
async function parseGLB(zip,path){const file=zip.file(path);if(!file)throw new Error(`Fichier manquant dans le pack : ${path}`);const data=await file.async('arraybuffer');return await loader.parseAsync(data,'');}
async function getQuaterniusZip(){
 if(!quaterniusZipPromise){quaterniusZipPromise=(async()=>{const response=await fetch(QUATERNIUS_ARCHIVE_URL,{cache:'force-cache'});if(!response.ok)throw new Error(`Pack de vêtements Quaternius : HTTP ${response.status}`);return await window.JSZip.loadAsync(await response.arrayBuffer());})();}
 try{return await quaterniusZipPromise;}catch(error){quaterniusZipPromise=null;throw error;}
}
async function loadQuaterniusGLTF(assetUrl){
 wardrobeAssetLoads++;pauseRenderForWardrobe=true;
 const urls=new Map();
 try{
  const zip=await getQuaterniusZip();
  const archivePath=assetUrl.replace('assets/quaternius/','');
  const file=zip.file(archivePath);if(!file)throw new Error(`Pièce absente du pack Quaternius : ${archivePath}`);
  const json=JSON.parse(await file.async('string'));
  const baseDir=archivePath.slice(0,archivePath.lastIndexOf('/')+1);
  const baseURL='https://astrea-quaternius.invalid/'+baseDir;
  const references=[...(json.buffers||[]).map(entry=>entry.uri),...(json.images||[]).map(entry=>entry.uri)].filter(Boolean);
  for(const uri of references){
   const dependency=zip.file(baseDir+uri);if(!dependency)throw new Error(`Ressource GLTF absente : ${uri}`);
   const blob=await dependency.async('blob');urls.set(baseURL+uri,URL.createObjectURL(blob));
  }
  const manager=new THREE.LoadingManager();manager.setURLModifier(url=>urls.get(url)||url);
  return await new GLTFLoader(manager).parseAsync(JSON.stringify(json),baseURL);
 }finally{
  for(const objectUrl of urls.values())URL.revokeObjectURL(objectUrl);
  wardrobeAssetLoads=Math.max(0,wardrobeAssetLoads-1);pauseRenderForWardrobe=wardrobeAssetLoads>0;
 }
}
function clearCurrentModel(){if(state.mixer){state.mixer.stopAllAction();state.mixer=null;}if(state.model){scene.remove(state.model);state.model.traverse(o=>{if(o.isMesh){o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();}});state.model=null;}state.actions={};}
async function loadSelectedCharacter(){const token=++state.loadToken,key=archiveKey();setStatus('CHARGEMENT…');$('#category-note').textContent='Chargement du véritable modèle 3D et de ses animations…';try{const zip=await getArchive(key);if(token!==state.loadToken)return false;const gltf=await parseGLB(zip,'model.glb');if(token!==state.loadToken)return false;resetWardrobe();clearCurrentModel();const model=gltf.scene;model.name=key;const box=new THREE.Box3().setFromObject(model);const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());const height=size.y||1.8;model.scale.setScalar(1.78/height);model.position.set(1.15-center.x*model.scale.x,-box.min.y*model.scale.y,-center.z*model.scale.z);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.side=THREE.DoubleSide;}}});scene.add(model);state.model=model;
  const animationNames=['idle','walking','running','jump','attack','charged_spell_cast','block','hit_reaction','dodge_roll'];state.mixer=new THREE.AnimationMixer(model);state.mixer.addEventListener('finished',()=>{state.actionOneShot=false;if(state.screen==='game')playAction('idle');});for(const name of animationNames){try{const anim=await parseGLB(zip,`animations/${name}.glb`);if(token!==state.loadToken)return false;const clip=anim.animations?.[0];if(clip){if(name==='dodge_roll'){clip.tracks=clip.tracks.filter(track=>!/(?:^|[|.])(?:mixamorig)?(?:Hips|Root)\.position$/i.test(track.name));}state.actions[name]=state.mixer.clipAction(clip);}}catch(e){console.warn(`Animation ${name} indisponible pour ${key}`,e);}}
  buildWardrobeUI();playAction('idle');setStatus('MODÈLE CHARGÉ',true);$('#category-note').textContent=`Modèle ${RACES.find(x=>x[0]===state.race)[1]} ${state.gender==='male'?'masculin':'féminin'} chargé. Aperçu 3D réel.`;return true;
 }catch(err){console.error(err);if(token===state.loadToken){setStatus('ERREUR DE CHARGEMENT');$('#category-note').textContent=err.message;showError(`Impossible de charger le personnage ${key}.\n${err.message}`);}return false;}}
function playAction(name,oneShot=false){if(!state.mixer||!state.actions[name])return;const next=state.actions[name];if(state.currentAction===name&&next.isRunning()&&!oneShot)return;const previous=state.actions[state.currentAction];next.reset();next.setLoop(oneShot?THREE.LoopOnce:THREE.LoopRepeat,oneShot?1:Infinity);next.clampWhenFinished=oneShot;if(oneShot){const duration=name==='attack'?.52:name==='charged_spell_cast'?.82:name==='dodge_roll'?.42:.62;next.setDuration(duration);}else next.timeScale=1;state.actionOneShot=oneShot;next.fadeIn(.08).play();if(previous&&previous!==next)previous.fadeOut(.08);state.currentAction=name;}
async function saveCharacter(){state.name=$('#character-name').value.trim();state.alias=$('#player-alias').value.trim();if(!state.name||!state.alias){$('#category-note').textContent='Renseigne le nom du personnage et ton pseudonyme avant de continuer.';(!state.name?$('#character-name'):$('#player-alias')).focus();return;}const raceStats=getMagicRaceStatModifiers(state.race);playerCombatant=createCombatant({id:'player',name:state.name,race:state.race,physicalStrength:10*raceStats.physicalStrength,defense:10*raceStats.defense,fireMastery:1,weaponMastery:0});const button=$('#create-character');button.disabled=true;button.textContent='CHARGEMENT…';try{if(!state.model||state.model.name!==archiveKey()){const loaded=await loadSelectedCharacter();if(!loaded||!state.model||state.model.name!==archiveKey())return;}const data={race:state.race,gender:state.gender,name:state.name,alias:state.alias,wardrobe:{...state.wardrobe}};localStorage.setItem('astrea-character',JSON.stringify(data));loadMagicProgression();$('#hud-player').textContent=`${state.name} · ${state.alias} · ${RACES.find(x=>x[0]===state.race)[1]}`;setScreen('game');state.model.position.set(0,0,0);state.model.rotation.y=Math.PI;state.previewYaw=0;playAction('idle');}finally{button.disabled=false;button.textContent='CRÉER LE PERSONNAGE';}}
function showError(message){errorBox.hidden=false;errorBox.textContent=message;setTimeout(()=>{errorBox.hidden=true;},9000);}
createRaceButtons();updateSelection();buildWardrobeUI();loadWorldResources();
$('#race-options').addEventListener('click',()=>{});
document.querySelectorAll('[data-gender]').forEach(b=>b.addEventListener('click',()=>{state.gender=b.dataset.gender;updateSelection();loadSelectedCharacter();}));
document.querySelectorAll('.category').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.category;document.querySelectorAll('.category').forEach(x=>x.classList.toggle('selected',x===b));const messages={appearance:'Le modèle de base de la race et du sexe sélectionnés est affiché.',hair:'Les variantes de coiffure ne sont pas encore séparées en pièces sélectionnables.',outfit:'20 pièces Quaternius disponibles pour les personnages humains : torse, bras, jambes, pieds, capuche et épaulières.',accessories:'Les accessoires personnalisables seront ajoutés à cette catégorie.'};$('#category-note').textContent=messages[state.category];}));
$('#new-game-btn').addEventListener('click',()=>{setScreen('creator');loadSelectedCharacter();});
$('#continue-btn').addEventListener('click',async()=>{const saved=localStorage.getItem('astrea-character');if(!saved){$('#new-game-btn').click();return;}try{const data=JSON.parse(saved);state.race=data.race;state.gender=data.gender;state.name=data.name;state.alias=data.alias;const raceStats=getMagicRaceStatModifiers(state.race);playerCombatant=createCombatant({id:'player',name:state.name,race:state.race,physicalStrength:10*raceStats.physicalStrength,defense:10*raceStats.defense,fireMastery:1,weaponMastery:0});loadMagicProgression();updateSelection();$('#character-name').value=state.name;$('#player-alias').value=state.alias;$('#hud-player').textContent=`${state.name} · ${state.alias} · ${RACES.find(x=>x[0]===state.race)[1]}`;const loaded=await loadSelectedCharacter();if(!loaded)return;restoreWardrobe(data.wardrobe||{});setScreen('game');state.model.position.set(0,0,0);state.model.rotation.y=0;state.previewYaw=0;playAction('idle');}catch(err){showError('La sauvegarde du personnage est illisible.');console.error(err);}});
$('#back-menu').addEventListener('click',()=>setScreen('menu'));
$('#create-character').addEventListener('click',saveCharacter);
$('#magic-school-quick-select')?.addEventListener('change',e=>{state.selectedMagicSchool=e.target.value;updateMagicHud();});


canvas.addEventListener('pointerdown',e=>{if(state.screen==='creator'){state.drag=true;state.lastX=e.clientX;canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(state.drag&&state.model){state.previewYaw+=(e.clientX-state.lastX)*.009;state.model.rotation.y=state.previewYaw;state.lastX=e.clientX;}});
canvas.addEventListener('pointerup',()=>state.drag=false);canvas.addEventListener('pointercancel',()=>state.drag=false);
canvas.addEventListener('wheel',e=>{if(state.screen==='creator'){e.preventDefault();state.previewDistance=THREE.MathUtils.clamp(state.previewDistance+e.deltaY*.004,3.0,7.5);}}, {passive:false});
addEventListener('keydown',e=>{state.keys.add(e.key.toLowerCase());if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))e.preventDefault();if(e.key==='Enter'&&state.screen==='menu')$('#new-game-btn').click();if(e.key==='Escape'&&state.screen==='creator')setScreen('menu');});
addEventListener('keyup',e=>state.keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{state.keys.clear();state.gamePadX=0;state.gamePadY=0;state.touchX=0;state.touchY=0;state.drag=false;mouseDown=false;});
function visibleFocusables(){return state.screen==='menu'?[...document.querySelectorAll('#main-menu .ps-option')]:state.screen==='creator'?[...document.querySelectorAll('#creator button:not([disabled]),#creator input:not([disabled]),#creator select:not([disabled])')].filter(el=>el.offsetParent!==null):[];}
function moveFocus(direction){const list=visibleFocusables();if(!list.length)return;let index=list.indexOf(document.activeElement);if(index<0)index=0;index=(index+direction+list.length)%list.length;list[index].focus();}
function backAction(){if(state.screen==='creator')setScreen('menu');else if(state.screen==='game'){setScreen('creator');loadSelectedCharacter();}}
addEventListener('keydown',e=>{if(state.screen==='menu'&&['arrowup','arrowdown'].includes(e.key.toLowerCase())){e.preventDefault();moveFocus(e.key==='ArrowDown'?1:-1);}if(state.screen==='creator'&&['arrowup','arrowdown'].includes(e.key.toLowerCase())&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)) {e.preventDefault();moveFocus(e.key==='ArrowDown'?1:-1);}if(e.key==='Escape'||e.key.toLowerCase()==='backspace'){if(state.screen!=='menu')backAction();}if(state.screen==='game'){const k=e.key.toLowerCase();if(k==='e')interactWithWorld();if(k===' '||k==='space')triggerAction('jump');if(k==='j')triggerAction('attack');if(k==='k')triggerAction('charged_spell_cast');if(k==='l')triggerAction('block');if(k==='o')triggerAction('dodge_roll');}});
let gamepadPrev={};function triggerAction(name){if(state.screen!=='game')return;if(name==='attack'){performPlayerAttack('physical');return;}if(name==='charged_spell_cast'){performPlayerAttack('magic');return;}if(name==='block'){combatAction('block');return;}if(name==='dodge_roll'){combatAction('dodge');return;}if(state.actions[name])playAction(name,true);}
function pollGamepad(){const pads=navigator.getGamepads?.()||[];const pad=[...pads].find(Boolean);if(!pad)return;const pressed=(i)=>!!pad.buttons[i]?.pressed;const edge=(key,down)=>{const was=!!gamepadPrev[key];gamepadPrev[key]=down;return down&&!was;};if(edge('up',pressed(12)))moveFocus(-1);if(edge('down',pressed(13)))moveFocus(1);if(edge('left',pressed(14))&&state.screen==='creator')cycleRace(-1);if(edge('right',pressed(15))&&state.screen==='creator')cycleRace(1);if(edge('cross',pressed(0))){if(state.screen==='game')triggerAction('jump');else document.activeElement?.click?.();}if(edge('circle',pressed(1))){if(state.screen==='game')triggerAction('dodge_roll');else backAction();}if(edge('square',pressed(2)))triggerAction('attack');if(edge('triangle',pressed(3)))triggerAction('charged_spell_cast');if(edge('l1',pressed(4))){if(state.screen==='creator')cycleCategory(-1);else triggerAction('block');}if(edge('r1',pressed(5))){if(state.screen==='creator')cycleCategory(1);else triggerAction('attack');}if(edge('r2',pressed(7)))triggerAction('charged_spell_cast');if(state.screen==='game'){const x=pad.axes?.[0]||0,y=pad.axes?.[1]||0;if(Math.abs(x)>.15||Math.abs(y)>.15){state.gamePadX=x;state.gamePadY=y;}else{state.gamePadX=0;state.gamePadY=0;}}}
function cycleRace(dir){const i=RACES.findIndex(x=>x[0]===state.race);state.race=RACES[(i+dir+RACES.length)%RACES.length][0];updateSelection();loadSelectedCharacter();}
function cycleCategory(dir){const buttons=[...document.querySelectorAll('.category')];const i=buttons.findIndex(x=>x.dataset.category===state.category);buttons[(i+dir+buttons.length)%buttons.length]?.click();}
let mouseDown=false,lastMouseX=0;canvas.addEventListener('pointerdown',e=>{if(state.screen==='game'&&e.pointerType==='mouse'){mouseDown=true;lastMouseX=e.clientX;}});addEventListener('pointerup',()=>mouseDown=false);addEventListener('pointermove',e=>{if(mouseDown&&state.screen==='game'){state.gameYaw-=(e.clientX-lastMouseX)*.006*(state.settings.cameraSensitivity/60);lastMouseX=e.clientX;}});


 // Commandes tactiles : joystick gauche et actions à droite.
 const stickRoot=$('#move-stick'),stickKnob=$('#stick-knob');let stickPointer=null;
 function updateStick(e){const r=stickRoot.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,limit=r.width*.34,len=Math.hypot(dx,dy)||1,k=Math.min(1,limit/len);const axes=normalizeTouchStick(dx,dy,limit);state.touchX=axes.side;state.touchY=axes.forward;stickKnob.style.transform=`translate(${dx*k}px,${dy*k}px)`;}
 stickRoot.addEventListener('pointerdown',e=>{if(state.screen!=='game')return;stickPointer=e.pointerId;stickRoot.setPointerCapture(e.pointerId);updateStick(e);e.preventDefault();});
 stickRoot.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)updateStick(e);});
 function releaseStick(e){if(stickPointer===null||e.pointerId!==stickPointer)return;stickPointer=null;state.touchX=state.touchY=0;stickKnob.style.transform='translate(0,0)';}
 stickRoot.addEventListener('pointerup',releaseStick);stickRoot.addEventListener('pointercancel',releaseStick);
 document.querySelectorAll('.touch-actions [data-action]').forEach(button=>{button.addEventListener('pointerdown',e=>{e.preventDefault();triggerAction(button.dataset.action);});});
  $('#world-interact')?.addEventListener('pointerdown',e=>{e.preventDefault();interactWithWorld();});

let lastTime=performance.now();let currentMode='';let worldHudTimer=0;let lastRenderTime=0;
function animate(now){requestAnimationFrame(animate);if(pauseRenderForWardrobe)return;const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;pollGamepad();const mode=state.screen;if(mode!==currentMode){currentMode=mode;}if(state.mixer)state.mixer.update(dt);if(mode==='game'){regenerateStamina(playerCombatant,dt,true);regenerateStamina(enemyCombatant,dt,true);regenerateMana(playerCombatant,dt);combatClockMs+=dt*1000;updateCombatantEffects(playerCombatant,combatClockMs);updateCombatantEffects(enemyCombatant,combatClockMs);updateCombatantEffects(trainingDummyCombatant,combatClockMs);updateEnemyEncounter(dt,combatClockMs);combatUiTimer+=dt;if(combatUiTimer>=.12){combatUiTimer=0;updateCombatHud();}}
 if(mode==='creator'||mode==='menu'){camera.position.lerp(new THREE.Vector3(0,1.45,state.previewDistance),.08);camera.lookAt(0,.92,0);if(state.model)state.model.rotation.y=state.previewYaw;}
 if(mode==='game'&&state.model){world.userData.updateStreaming?.(state.model.position);state.model.position.y=world.userData.getHeightAt?.(state.model.position.x,state.model.position.z)??state.model.position.y;worldHudTimer+=dt;if(worldHudTimer>=.25){worldHudTimer=0;updateWorldHud();}}
  if(world.userData.updateVFX)world.userData.updateVFX(now,dt);updateCombatVfx(dt);if(mode==='game'&&state.model&&!state.settingsOpen){const forward=(state.keys.has('w')||state.keys.has('z')||state.keys.has('arrowup')?1:0)-(state.keys.has('s')||state.keys.has('arrowdown')?1:0);const keyboardSide=(state.keys.has('d')||state.keys.has('arrowright')?1:0)-(state.keys.has('a')||state.keys.has('q')||state.keys.has('arrowleft')?1:0);const axes=getMovementAxes({keyboardForward:forward,keyboardSide,gamePadX:state.gamePadX||0,gamePadY:state.gamePadY||0,touchX:state.touchX||0,touchForward:state.touchY||0});const side=axes.side,actualForward=axes.forward;const moving=Math.hypot(actualForward,side)>.05;if(state.dodgeMotion){const motion=state.dodgeMotion;motion.elapsed=Math.min(motion.duration,motion.elapsed+dt);const t=motion.elapsed/motion.duration,ease=1-Math.pow(1-t,3);state.model.position.lerpVectors(motion.from,motion.to,ease);if(t>=1){state.model.position.copy(motion.to);state.dodgeMotion=null;}}else if(moving){const direction=getWorldMovementDirection(side,actualForward,state.gameYaw);const dx=direction.x,dz=direction.z;const run=state.keys.has('shift');state.model.position.x+=dx*(run?5.6:2.8)*dt;state.model.position.z+=dz*(run?5.6:2.8)*dt;const targetYaw=getFacingYaw(dx,dz);state.model.rotation.y=rotateAngleTowards(state.model.rotation.y,targetYaw,dt*9);if(!state.actionOneShot)playAction(run?'running':'walking');}else if(!state.actionOneShot)playAction('idle');const target=state.model.position.clone().add(new THREE.Vector3(0,1,0));const desired=new THREE.Vector3(target.x-Math.sin(state.gameYaw)*7,target.y+3.8,target.z-Math.cos(state.gameYaw)*7);if(state.settings.cameraFollow)camera.position.lerp(desired,.08);camera.lookAt(target);}
 if(now-lastRenderTime>=1000/state.settings.targetFps){renderer.render(scene,camera);lastRenderTime=now;}
}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
addEventListener('resize',resize);resize();loading.hidden=true;setScreen('menu');
requestAnimationFrame(animate)