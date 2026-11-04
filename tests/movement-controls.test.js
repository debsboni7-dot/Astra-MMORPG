import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTouchStick, getMovementAxes } from '../prototype/src/input/movement.js';
test('joystick haut = avancer et bas = reculer',()=>{assert.deepEqual(normalizeTouchStick(0,-40,40),{side:0,forward:1});assert.deepEqual(normalizeTouchStick(0,40,40),{side:0,forward:-1});});
test('joystick droite et gauche gardent leur direction',()=>{assert.deepEqual(normalizeTouchStick(40,0,40),{side:1,forward:0});assert.deepEqual(normalizeTouchStick(-40,0,40),{side:-1,forward:0});});
test('diagonales normalisées sans dépasser la vitesse axiale',()=>{const v=normalizeTouchStick(40,-40,40);assert.ok(Math.abs(Math.hypot(v.side,v.forward)-1)<1e-9);});
test('axes fusionnés sans double inversion du tactile',()=>{assert.deepEqual(getMovementAxes({touchForward:1}),{side:0,forward:1});assert.deepEqual(getMovementAxes({gamePadY:1}),{side:0,forward:-1});});
