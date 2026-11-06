import test from 'node:test';
import assert from 'node:assert/strict';
import { ASTREA_ENVIRONMENT_PROFILE, getAstreaEnvironmentProfile } from '../prototype/src/world/environment-profile.js';

test('the environment uses a mobile-conscious terrain grid', () => {
  assert.equal(ASTREA_ENVIRONMENT_PROFILE.terrainSegments, 64);
  assert.ok(ASTREA_ENVIRONMENT_PROFILE.terrainSegments >= 64);
  assert.ok(ASTREA_ENVIRONMENT_PROFILE.terrainSegments <= 80);
});

test('every biome has dense natural dressing with bounded instance counts', () => {
  for (const biome of ['plains','forest','highlands','farmland','lake','riverlands','coastal','wetlands']) {
    const profile = getAstreaEnvironmentProfile(biome);
    assert.ok(profile.grass >= 3000, `${biome} needs substantial ground cover`);
    assert.ok(profile.rocks >= 18, `${biome} needs rock detail`);
    assert.ok(profile.shrubs >= 20, `${biome} needs shrubs`);
    assert.ok(profile.trees >= 6, `${biome} needs trees`);
    const total = profile.grass + profile.rocks + profile.shrubs + (profile.trees * 2) + profile.flowers + profile.pebbles;
    assert.ok(total <= ASTREA_ENVIRONMENT_PROFILE.maxInstancesPerChunk, `${biome} exceeds the per-chunk mobile instance budget: ${total}`);
  }
});

test('unknown biomes safely use the plains profile', () => {
  assert.deepEqual(getAstreaEnvironmentProfile('unknown'), getAstreaEnvironmentProfile('plains'));
});
