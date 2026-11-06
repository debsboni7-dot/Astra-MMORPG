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
  human_male:'https://d2ol7oe51mr4n9.cloudfront.net/user_3L8BH1pH0WyTHJdboyJ7rT3kcR8/502e
…[1 chars truncated — re-run with head/grep/tail for full output]…
n await window.JSZip.loadAsync(await response.arrayBuffer());})();}
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