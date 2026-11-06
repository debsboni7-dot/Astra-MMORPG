import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTouchStick, getMovementAxes, getDodgeDestination, getWorldMovementDirection, getFacingYaw, rotateAngleTowards } from '../prototype/src/input/movement.js';
test('joystick haut = avancer et bas = reculer',()=>{assert.deepEqual(normalizeTouchStick(0,-40,40),{side:0,forward:1});assert.deepEqual(normalizeTouchStick(0,40,40),{side:0,forward:-1});});
test('joystick droite et gauche gardent leur direction',()=>{assert.deepEqual(normalizeTouchStick(40,0,40),{side:1,forward:0});assert.deepEqual(normalizeTouchStick(-40,0,40),{side:-1,forward:0});});
test('diagonales normalisées sans dépasser la vitesse axiale',()=>{const v=normalizeTouchStick(40,-40,40);assert.ok(Math.abs(Math.hypot(v.side,v.forward)-1)<1e-9);});
test('axes fusionnés sans double inversion du tactile',()=>{assert.deepEqual(getMovementAxes({touchForward:1}),{side:0,forward:1});assert.deepEqual(getMovementAxes({gamePadY:1}),{side:0,forward:-1});});

test('esquive fixe un point B dans la direction demandée',()=>{const p=getDodgeDestination({x:10,z:20,side:0,forward:1,cameraYaw:0,distance:2});assert.deepEqual(p,{x:10,z:22});});
test('esquive latérale va à droite',()=>{const p=getDodgeDestination({x:0,z:0,side:1,forward:0,cameraYaw:0,distance:2});assert.deepEqual(p,{x:2,z:0});});
test('esquive sans direction suit le personnage',()=>{const p=getDodgeDestination({x:0,z:0,facingYaw:Math.PI,distance:2});assert.ok(Math.abs(p.z-2)<1e-9);});

test('les quatre directions cardinales du joystick orientent le personnage dans le même sens que son déplacement',()=>{
 const cases=[[0,1,0,1],[0,-1,0,-1],[1,0,1,0],[-1,0,-1,0]];
 for(const [side,forward,x,z] of cases){const d=getWorldMovementDirection(side,forward,0);assert.ok(Math.abs(d.x-x)<1e-9);assert.ok(Math.abs(d.z-z)<1e-9);const yaw=getFacingYaw(d.x,d.z);const facing={x:-Math.sin(yaw),z:-Math.cos(yaw)};assert.ok(Math.abs(facing.x-x)<1e-9);assert.ok(Math.abs(facing.z-z)<1e-9);}
});
test('les directions diagonales restent normalisées avec la caméra tournée',()=>{const d=getWorldMovementDirection(1,1,Math.PI/3);assert.ok(Math.abs(Math.hypot(d.x,d.z)-1)<1e-9);});
test('rotation interpolée suit le chemin angulaire le plus court',()=>{const next=rotateAngleTowards(3.1,-3.1,.1);assert.ok(next>3.1);assert.ok(Math.abs(Math.atan2(Math.sin(-3.1-next),Math.cos(-3.1-next)))<Math.PI);});
