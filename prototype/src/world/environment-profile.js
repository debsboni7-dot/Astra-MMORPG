/**
 * Per-biome environment budgets for ASTREA's 1 km streamed terrain chunks.
 * Counts are instances, not individual vertices. Keep the combined count bounded
 * so the denser ground cover remains practical on mid-range mobile GPUs.
 */
export const ASTREA_ENVIRONMENT_PROFILE = Object.freeze({
  terrainSegments: 64,
  maxInstancesPerChunk: 6200,
  biomes: Object.freeze({
    plains: Object.freeze({ trees: 22, grass: 5200, shrubs: 95, rocks: 42, pebbles: 150, flowers: 110 }),
    forest: Object.freeze({ trees: 92, grass: 4400, shrubs: 135, rocks: 34, pebbles: 95, flowers: 65 }),
    highlands: Object.freeze({ trees: 8, grass: 3100, shrubs: 28, rocks: 115, pebbles: 190, flowers: 42 }),
    farmland: Object.freeze({ trees: 8, grass: 3900, shrubs: 36, rocks: 22, pebbles: 90, flowers: 90 }),
    lake: Object.freeze({ trees: 12, grass: 4200, shrubs: 55, rocks: 38, pebbles: 115, flowers: 76 }),
    riverlands: Object.freeze({ trees: 18, grass: 4800, shrubs: 88, rocks: 32, pebbles: 115, flowers: 105 }),
    coastal: Object.freeze({ trees: 14, grass: 4100, shrubs: 48, rocks: 78, pebbles: 175, flowers: 58 }),
    wetlands: Object.freeze({ trees: 16, grass: 4300, shrubs: 120, rocks: 28, pebbles: 105, flowers: 72 })
  })
});

export function getAstreaEnvironmentProfile(biome) {
  return ASTREA_ENVIRONMENT_PROFILE.biomes[biome] ?? ASTREA_ENVIRONMENT_PROFILE.biomes.plains;
}
