import test from 'node:test';
import assert from 'node:assert/strict';
import { ASTREA_CONTINENT, ASTREA_REGIONS, ASTREA_ACTIVITIES, ASTREA_LANDMARKS, ASTREA_SPAWN_HEIGHT, getAstreaBiomeAt, getAstreaRegionAt, getAstreaTerrainHeight } from '../prototype/src/world/astrea-world.js';
test('échelle du continent immense',()=>{assert.equal(ASTREA_CONTINENT.width*ASTREA_CONTINENT.height/1_000_000,1_080_000);assert.equal(ASTREA_REGIONS.length,8);});
test('les huit centres régionaux sont reconnus',()=>{for(const r of ASTREA_REGIONS){assert.equal(getAstreaRegionAt(r.x,r.z).id,r.id);assert.equal(getAstreaBiomeAt(r.x,r.z),r.biome);}});
test('les altitudes sont finies et bornées',()=>{for(const r of ASTREA_REGIONS){const h=getAstreaTerrainHeight(r.x,r.z);assert.ok(Number.isFinite(h));assert.ok(h>=-35&&h<=3600);}});
test('la plaine de départ est basse et Veyr est montagneux',()=>{assert.ok(getAstreaTerrainHeight(0,0)<150);assert.ok(getAstreaTerrainHeight(20000,-280000)>getAstreaTerrainHeight(0,0)+100);});

test('chaque région dispose de ressources et d’activités dédiées',()=>{for(const region of ASTREA_REGIONS){const local=ASTREA_ACTIVITIES.filter(a=>Math.hypot(a.x-region.x,a.z-region.z)<1000);assert.ok(local.length>=2,region.name+' doit proposer au moins deux activités');}});

test('les sept régions secondaires ont chacune un monument distinct',()=>{assert.equal(ASTREA_LANDMARKS.length,7);assert.equal(new Set(ASTREA_LANDMARKS.map(x=>x.regionId)).size,7);for(const landmark of ASTREA_LANDMARKS){assert.ok(ASTREA_REGIONS.some(r=>r.id===landmark.regionId));assert.ok(landmark.name&&landmark.kind);}});

test('la zone d’apparition est nivelée et sa hauteur correspond au terrain',()=>{assert.ok(Math.abs(getAstreaTerrainHeight(0,0)-ASTREA_SPAWN_HEIGHT)<1e-6);for(const [x,z] of [[8,0],[-8,0],[0,8],[0,-8],[12,12]])assert.ok(Math.abs(getAstreaTerrainHeight(x,z)-ASTREA_SPAWN_HEIGHT)<1e-6);assert.ok(Math.abs(getAstreaTerrainHeight(76,0)-ASTREA_SPAWN_HEIGHT)>.01);});

test('la zone immédiate de départ reste dégagée et parfaitement plane',()=>{for(let r=0;r<=20;r+=2)for(let a=0;a<Math.PI*2;a+=Math.PI/4)assert.ok(Math.abs(getAstreaTerrainHeight(Math.cos(a)*r,Math.sin(a)*r)-ASTREA_SPAWN_HEIGHT)<1e-6);});
