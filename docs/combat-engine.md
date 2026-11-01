# ASTREA — Combat Engine 0.1

## Statut
Noyau technique initial, isolé du prototype 3D. Les formules et coefficients de ce module sont configurables et provisoires. Aucun coefficient de balance n'est déclaré officiellement validé.

## Principes invariants
- Les attributs physiques ne sont pas déduits automatiquement du niveau du personnage.
- Une arme exige simultanément la force physique et la maîtrise de catégorie nécessaires.
- La défense réduit les dégâts avec rendement décroissant ; les résistances élémentaires sont calculées séparément.
- Les boucliers absorbent les dégâts ; les altérations sont résolues séparément.
- Les soins sont plafonnés aux PV maximums.
- Les réapplications de brûlure/gel peuvent prolonger la durée sans empiler l'intensité.
- Les buffs de même statistique/groupe ne s'additionnent pas : la valeur absolue la plus forte prévaut.
- L'absorption/intensification d'une attaque hostile est réservée au feu et exige une maîtrise du feu strictement supérieure à celle de l'attaquant. La fonction actuelle vérifie l'éligibilité et retourne une décision ; le futur contrôleur de combat devra annuler explicitement les dégâts entrants et appliquer les bonus.
- L'immunité doit être représentée explicitement, jamais par une résistance approximativement infinie.

…[1 chars truncated — re-run with head/grep/tail for full output]…
enemyAI.attackRange*.88,2.15*dt);enemyMesh.position.x+=dx/(distance||1)*step;enemyMesh.position.z+=dz/(distance||1)*step;}
 if(distance>.08)enemyMesh.rotation.y=Math.atan2(dx,dz);
 if(enemyTelegraph){enemyTelegraph.visible=result.telegraph;enemyTelegraph.material.opacity=result.telegraph?.55+.3*Math.sin(now*.025):.0;}
 if(result.attack&&distance<=enemyAI.attackRange+.35){
  const hit=resolveIncomingAttack(enemyCombatant,playerCombatant,{kind:'physical',base:12,strength:5,strengthCoefficient:.2,weaponPower:0,techniqueMultiplier:1,executionQuality:1,criticalChance:0},{now,rng:Math.random});
  if(hit.parried){staggerEnemyAI(enemyAI);enemyStaggerUntil=now+650;combatMessage('Parade parfaite ! Le pillard est déstabilisé : contre-attaque !');}
  else if(hit.dodged)combatMessage('Esquive réussie : le pillard a manqué son attaque.');
  else if(hit.blocked)combatMessage('Garde : dégâts réduits à '+Math.round(hit.hpLost)+'.');
  else if(hit.hit)combatMessage('Le pillard te frappe : '+Math.round(hit.hpLost)+' dégâts.');
  if(playerCombatant.defeated)combatMessage('Tu es vaincu. Réinitialise le combat pour recommencer.');
 }
 if(enemyCombatant.defeated){enemyAI.state='defeated';enemyMesh.rotation.x=-Math.PI/2;enemyMesh.position.y=-.55;if(enemyTelegraph)enemyTelegraph.visible=false;}
}

function setStatus(text,good=false){$('#model-status').textContent=text;$('#model-status').style.color=good?'#77d8a0':'#f1c77a';}
function setScreen(name){state.screen=name;menu.hidden=name!=='menu';creator.hidden=name!=='creator';gameHud.hidden=name!=='game';canvas.style.opacity=name==='menu'?'0.38':'1';if(name==='creator'){camera.position.set(0,1.45,4.7);camera.lookAt(0,1,0);}if(name==='game'){makeWorld();createTrainingDummy();createTrainingEnemy();ensureCombatHud();camera.position.set(0,3,7);}}
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
  const animationNames=['idle','walking','running','jump','attack','charged_spell_cast','block','hit_reaction','dodge_roll'];state.mixer=new THREE.AnimationMixer(model);state.mixer.addEventListener('finished',()=>{state.actionOneShot=false;if(state.screen==='game')playAction('idle');});for(const name of animationNames){try{const anim=await parseGLB(zip,`animations/${name}.glb`);if(token!==state.loadToken)return false;const clip=anim.animations?.[0];if(clip){state.actions[name]=state.mixer.clipAction(clip);}}catch(e){console.warn(`Animation ${name} indisponible pour ${key}`,e);}}
  buildWardrobeUI();playAction('idle');setStatus('MODÈLE CHARGÉ',true);$('#category-note').textContent=`Modèle ${RACES.find(x=>x[0]===state.race)[1]} ${state.gender==='male'?'masculin':'féminin'} chargé. Aperçu 3D réel.`;return true;
 }catch(err){console.error(err);if(token===state.loadToken){setStatus('ERREUR DE CHARGEMENT');$('#category-note').textContent=err.message;showError(`Impossible de charger le personnage ${key}.\n${err.message}`);}return false;}}
function playAction(name,oneShot=false){if(!state.mixer||!state.actions[name])return;const next=state.actions[name];if(state.currentAction===name&&next.isRunning())return;const previous=state.actions[state.currentAction];next.reset();next.setLoop(oneShot?THREE.LoopOnce:THREE.LoopRepeat,oneShot?1:Infinity);next.clampWhenFinished=oneShot;state.actionOneShot=oneShot;next.fadeIn(.16).play();if(previous&&previous!==next)previous.fadeOut(.16);state.currentAction=name;}
async function saveCharacter(){state.name=$('#character-name').value.trim();state.alias=$('#player-alias').value.trim();if(!state.name||!state.alias){$('#category-note').textContent='Renseigne le nom du personnage et ton pseudonyme avant de continuer.';(!state.name?$('#character-name'):$('#player-alias')).focus();return;}playerCombatant=createCombatant({id:'player',name:state.name,physicalStrength:10,fireMastery:1,weaponMastery:0});const button=$('#create-character');button.disabled=true;button.textContent='CHARGEMENT…';try{if(!state.model||state.model.name!==archiveKey()){const loaded=await loadSelectedCharacter();if(!loaded||!state.model||state.model.name!==archiveKey())return;}const data={race:state.race,gender:state.gender,name:state.name,alias:state.alias,wardrobe:{...state.wardrobe}};localStorage.setItem('astrea-character',JSON.stringify(data));$('#hud-player').textContent=`${state.name} · ${state.alias} · ${RACES.find(x=>x[0]===state.race)[1]}`;setScreen('game');state.model.position.set(0,0,0);state.model.rotation.y=0;state.previewYaw=0;playAction('idle');}finally{button.disabled=false;button.textContent='CRÉER LE PERSONNAGE';}}
function showError(message){errorBox.hidden=false;errorBox.textContent=message;setTimeout(()=>{errorBox.hidden=true;},9000);}

createRaceButtons();updateSelection();buildWardrobeUI();
$('#race-options').addEventListener('click',()=>{});
document.querySelectorAll('[data-gender]').forEach(b=>b.addEventListener('click',()=>{state.gender=b.dataset.gender;updateSelection();loadSelectedCharacter();}));
document.querySelectorAll('.category').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.category;document.querySelectorAll('.category').forEach(x=>x.classList.toggle('selected',x===b));const messages={appearance:'Le modèle de base de la race et du sexe sélectionnés est affiché.',hair:'Les variantes de coiffure ne sont pas encore séparées en pièces sélectionnables.',outfit:'20 pièces Quaternius disponibles pour les personnages humains : torse, bras, jambes, pieds, capuche et épaulières.',accessories:'Les accessoires personnalisables seront ajoutés à cette catégorie.'};$('#category-note').textContent=messages[state.category];}));
$('#new-game-btn').addEventListener('click',()=>{setScreen('creator');loadSelectedCharacter();});
$('#continue-btn').addEventListener('click',async()=>{const saved=localStorage.getItem('astrea-character');if(!saved){$('#new-game-btn').click();return;}try{const data=JSON.parse(saved);state.race=data.race;state.gender=data.gender;state.name=data.name;state.alias=data.alias;updateSelection();$('#character-name').value=state.name;$('#player-alias').value=state.alias;$('#hud-player').textContent=`${state.name} · ${state.alias} · ${RACES.find(x=>x[0]===state.race)[1]}`;const loaded=await loadSelectedCharacter();if(!loaded)return;restoreWardrobe(data.wardrobe||{});setScreen('game');state.model.position.set(0,0,0);state.model.rotation.y=0;state.previewYaw=0;playAction('idle');}catch(err){showError('La sauvegarde du personnage est illisible.');console.error(err);}});
$('#back-menu').addEventListener('click',()=>setScreen('menu'));
$('#create-character').addEventListener('click',saveCharacter);
$('#back-creator').addEventListener('click',()=>{setScreen('creator');loadSelectedCharacter();});

canvas.addEventListener('pointerdown',e=>{if(state.screen==='creator'){state.drag=true;state.lastX=e.clientX;canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(state.drag&&state.model){state.previewYaw+=(e.clientX-state.lastX)*.009;state.model.rotation.y=state.previewYaw;state.lastX=e.clientX;}});
canvas.addEventListener('pointerup',()=>state.drag=false);canvas.addEventListener('pointercancel',()=>state.drag=false);
canvas.addEventListener('wheel',e=>{if(state.screen==='creator'){e.preventDefault();state.previewDistance=THREE.MathUtils.clamp(state.previewDistance+e.deltaY*.004,3.0,7.5);}}, {passive:false});
addEventListener('keydown',e=>{state.keys.add(e.key.toLowerCase());if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))e.preventDefault();if(e.key==='Enter'&&state.screen==='menu')$('#new-game-btn').click();if(e.key==='Escape'&&state.screen==='creator')setScreen('menu');});
addEventListener('keyup',e=>state.keys.delete(e.key.toLowerCase()));
function visibleFocusables(){return state.screen==='menu'?[...document.querySelectorAll('#main-menu .ps-option')]:state.screen==='creator'?[...document.querySelectorAll('#creator button:not([disabled]),#creator input')].filter(el=>el.offsetParent!==null):[];}
function moveFocus(direction){const list=visibleFocusables();if(!list.length)return;let index=list.indexOf(document.activeElement);if(index<0)index=0;index=(index+direction+list.length)%list.length;list[index].focus();}
function backAction(){if(state.screen==='creator')setScreen('menu');else if(state.screen==='game'){setScreen('creator');loadSelectedCharacter();}}
addEventListener('keydown',e=>{if(state.screen==='menu'&&['arrowup','arrowdown'].includes(e.key.toLowerCase())){e.preventDefault();moveFocus(e.key==='ArrowDown'?1:-1);}if(state.screen==='creator'&&['arrowup','arrowdown'].includes(e.key.toLowerCase())&&document.activeElement?.tagName!=='INPUT'){e.preventDefault();moveFocus(e.key==='ArrowDown'?1:-1);}if(e.key==='Escape'||e.key.toLowerCase()==='backspace'){if(state.screen!=='menu')backAction();}if(state.screen==='game'){const k=e.key.toLowerCase();if(k===' '||k==='space')triggerAction('jump');if(k==='j')triggerAction('attack');if(k==='k')triggerAction('charged_spell_cast');if(k==='l')triggerAction('block');if(k==='o')triggerAction('dodge_roll');}});
let gamepadPrev={};function triggerAction(name){if(state.screen!=='game')return;if(name==='attack'){performPlayerAttack('physical');return;}if(name==='charged_spell_cast'){performPlayerAttack('magic');return;}if(name==='block'){combatAction('block');return;}if(name==='dodge_roll'){combatAction('dodge');return;}if(state.actions[name])playAction(name,true);}
function pollGamepad(){const pads=navigator.getGamepads?.()||[];const pad=[...pads].find(Boolean);if(!pad)return;const pressed=(i)=>!!pad.buttons[i]?.pressed;const edge=(key,down)=>{const was=!!gamepadPrev[key];gamepadPrev[key]=down;return down&&!was;};if(edge('up',pressed(12)))moveFocus(-1);if(edge('down',pressed(13)))moveFocus(1);if(edge('left',pressed(14))&&state.screen==='creator')cycleRace(-1);if(edge('right',pressed(15))&&state.screen==='creator')cycleRace(1);if(edge('cross',pressed(0))){if(state.screen==='game')triggerAction('jump');else document.activeElement?.click?.();}if(edge('circle',pressed(1))){if(state.screen==='game')triggerAction('dodge_roll');else backAction();}if(edge('square',pressed(2)))triggerAction('attack');if(edge('triangle',pressed(3)))triggerAction('charged_spell_cast');if(edge('l1',pressed(4))){if(state.screen==='creator')cycleCategory(-1);else triggerAction('block');}if(edge('r1',pressed(5))){if(state.screen==='creator')cycleCategory(1);else triggerAction('attack');}if(edge('r2',pressed(7)))triggerAction('charged_spell_cast');if(state.screen==='game'){const x=pad.axes?.[0]||0,y=pad.axes?.[1]||0;if(Math.abs(x)>.15||Math.abs(y)>.15){state.gamePadX=x;state.gamePadY=y;}else{state.gamePadX=0;state.gamePadY=0;}}}
function cycleRace(dir){const i=RACES.findIndex(x=>x[0]===state.race);state.race=RACES[(i+dir+RACES.length)%RACES.length][0];updateSelection();loadSelectedCharacter();}
function cycleCategory(dir){const buttons=[...document.querySelectorAll('.category')];const i=buttons.findIndex(x=>x.dataset.category===state.category);buttons[(i+dir+buttons.length)%buttons.length]?.click();}
let mouseDown=false,lastMouseX=0;canvas.addEventListener('pointerdown',e=>{if(state.screen==='game'&&e.pointerType==='mouse'){mouseDown=true;lastMouseX=e.clientX;}});addEventListener('pointerup',()=>mouseDown=false);addEventListener('pointermove',e=>{if(mouseDown&&state.screen==='game'){state.gameYaw-=(e.clientX-lastMouseX)*.006;lastMouseX=e.clientX;}});

let lastTime=performance.now();let currentMode='';
function animate(now){requestAnimationFrame(animate);if(pauseRenderForWardrobe)return;const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;pollGamepad();const mode=state.screen;if(mode!==currentMode){currentMode=mode;}if(state.mixer)state.mixer.update(dt);if(mode==='game'){regenerateStamina(playerCombatant,dt,true);regenerateStamina(enemyCombatant,dt,true);combatClockMs+=dt*1000;updateEnemyEncounter(dt,combatClockMs);combatUiTimer+=dt;if(combatUiTimer>=.12){combatUiTimer=0;updateCombatHud();}}
 if(mode==='creator'||mode==='menu'){camera.position.lerp(new THREE.Vector3(0,1.45,state.previewDistance),.08);camera.lookAt(0,.92,0);if(state.model)state.model.rotation.y=state.previewYaw;}
 if(mode==='game'&&state.model){const forward=(state.keys.has('w')||state.keys.has('z')||state.keys.has('arrowup')?1:0)-(state.keys.has('s')||state.keys.has('arrowdown')?1:0);const side=(state.keys.has('d')||state.keys.has('arrowright')?1:0)-(state.keys.has('a')||state.keys.has('q')||state.keys.has('arrowleft')?1:0)+(state.gamePadX||0);const padForward=-(state.gamePadY||0);const actualForward=forward+padForward;const moving=Math.hypot(actualForward,side)>.05;if(moving){const dx=side*Math.cos(state.gameYaw)+actualForward*Math.sin(state.gameYaw),dz=-side*Math.sin(state.gameYaw)+actualForward*Math.cos(state.gameYaw);const len=Math.hypot(dx,dz)||1;const run=state.keys.has('shift');state.model.position.x+=dx/len*(run?5.6:2.8)*dt;state.model.position.z+=dz/len*(run?5.6:2.8)*dt;state.model.rotation.y=Math.atan2(dx/len,dz/len);if(!state.actionOneShot)playAction(run?'running':'walking');}else if(!state.actionOneShot)playAction('idle');const target=state.model.position.clone().add(new THREE.Vector3(0,1,0));const desired=new THREE.Vector3(target.x-Math.sin(state.gameYaw)*6,3.1,target.z-Math.cos(state.gameYaw)*6);camera.position.lerp(desired,.08);camera.lookAt(target);}
 renderer.render(scene,camera);
}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
addEventListener('resize',resize);resize();loading.hidden=true;setScreen('menu');
requestAnimationFrame(animate);