import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/SkeletonUtils.js';
import { createCombatant, regenerateStamina, beginBlock, beginDodge, executeAttack, resolveIncomingAttack, equipWeapon, getWeaponProgression } from './combat/CombatRuntime.js';
import { createEnemyAI, updateEnemyAI, staggerEnemyAI } from './combat/EnemyAI.js';
import { createComboState, advanceCombo, resetCombo, resolveHitReaction, createHitRecoveryState, beginHitRecovery, updateHitRecovery, createControlDiminishingState, applyControlDiminishing, applyWeaponHitProfile } from './combat/CombatTechniques.js';
import { createAstreaWorld } from './world/astrea-world.js';
import { normalizeTouchStick, getMovementAxes, getDodgeDestination } from './input/movement.js';

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
const Q='as