import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, validateSettings } from '../prototype/src/settings.js';

test('settings defaults are mobile-friendly and match ASTREA palette intent',()=>{
 assert.equal(DEFAULT_SETTINGS.targetFps,40);assert.equal(DEFAULT_SETTINGS.quality,'low');assert.equal(DEFAULT_SETTINGS.resolutionScale,85);
});
test('settings validation clamps values and rejects invalid enums',()=>{
 const result=validateSettings({targetFps:40,joystickSize:999,quality:'ultra',shadows:true});
 assert.equal(result.settings.targetFps,40);assert.equal(result.settings.joystickSize,140);assert.equal(result.settings.quality,'low');assert.equal(result.settings.shadows,true);assert.ok(result.errors.includes('quality'));
});
test('settings validation ignores malformed input safely',()=>{
 assert.deepEqual(validateSettings(null).settings,{...DEFAULT_SETTINGS});
});
