/**
 * ASTREA — race-aware magic progression.
 * Progress is earned only through successful use: no skill-point currency and
 * no manual point spending. Server-side combat must validate every cast.
 */
export const MAGIC_TREE_VERSION = 2;

export const MAGIC_SCHOOLS = Object.freeze([
  'fire', 'water', 'wind', 'earth', 'ice', 'lightning', 'nature', 'light', 'demonic',
]);

export const MAGIC_BRANCHES = Object.freeze({
  offense: 20,
  defense: 20,
  control: 20,
  support: 10,
  ultimate: 5,
});

export const MAGIC_RACE_RULES = Object.freeze({
  human: Object.freeze({ allowed: MAGIC_SCHOOLS, bonuses: {} }),
  elf: Object.freeze({ allowed: MAGIC_SCHOOLS.filter(s => s !== 'demonic'), bonuses: { nature: 1.10 } }),
  dwarf: Object.freeze({ allowed: ['fire', 'water', 'wind', 'earth'], bonuses: {}, defense: 1.15 }),
  demon: Object.freeze({ allowed: MAGIC_SCHOOLS.filter(s => !['light', 'nature'].includes(s)), bonuses: { demonic: 1.20 } }),
  angel: Object.freeze({ allowed: MAGIC_SCHOOLS.filter(s => s !== 'demonic'), bonuses: { light: 1.20 } }),
  orc: Object.freeze({ allowed: MAGIC_SCHOOLS.filter(s => !['light', 'nature'].includes(s)), bonuses: { fire: 1.14 }, physicalStrength: 1.14 }),
  draconoid: Object.freeze({ allowed: MAGIC_SCHOOLS, bonuses: { offense: 1.15 } }),
});

export const MAGIC_TREE_RULES = Object.freeze({
  schoolLevelMax: 100,
  schoolLevelByTier: Object.freeze([1, 10, 25, 45, 70]),
  masteryUseThresholds: Object.freeze([3, 8, 15, 25, 40]),
  masteryXpPerSuccessfulUse: 1,
  normalTechniqueSlots: 3,
  ultimateTechniqueSlots: 2,
  maxEquippedTechniques: 5,
});

const isSchool = school => MAGIC_SCHOOLS.includes(school);
const isRace = race => Object.hasOwn(MAGIC_RACE_RULES, race);
const isBranch = branch => Object.hasOwn(MAGIC_BRANCHES, branch);
const clampInt = (value, min, max) => Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
const skillId = (school, branch, index) => `${school}:${branch}:${index + 1}`;

function branchTier(index, branch) {
  const count = MAGIC_BRANCHES[branch];
  if (!count || index < 0 || index >= count) return null;
  return Math.floor(index / (count / 5));
}

export function isMagicSchoolAllowed(race, school) {
  return isSchool(school) && isRace(race) && MAGIC_RACE_RULES[race].allowed.includes(school);
}

export function getMagicRaceModifier(race, school, branch = 'offense') {
  if (!isMagicSchoolAllowed(race, school)) return 0;
  if (race === 'draconoid' && branch === 'offense') return 1.15;
  return MAGIC_RACE_RULES[race].bonuses[school] || 1;
}

export function createMagicProgression(race = 'human') {
  const safeRace = isRace(race) ? race : 'human';
  return {
    schemaVersion: MAGIC_TREE_VERSION,
    race: safeRace,
    processedEvents: [],
    equippedTechniques: { normal: [null, null, null], ultimate: [null, null] },
    schools: Object.fromEntries(MAGIC_SCHOOLS.map(school => [school, {
      level: 0, xp: 0, unlockedSkills: [], skillMasteryXp: {}, successfulCasts: 0,
    }])),
  };
}

export function sanitizeMagicProgression(value = {}, raceOverride = null) {
  const race = isRace(raceOverride) ? raceOverride : isRace(value.race) ? value.race : 'human';
  const clean = createMagicProgression(race);
  clean.processedEvents = [...new Set((Array.isArray(value.processedEvents) ? value.processedEvents : [])
    .filter(id => typeof id === 'string' && id.length > 0 && id.length <= 160))].slice(-1000);
  for (const school of MAGIC_SCHOOLS) {
    const source = value.schools?.[school] || {};
    const target = clean.schools[school];
    target.xp = clampInt(source.xp, 0, 100000000);
    target.level = Math.min(MAGIC_TREE_RULES.schoolLevelMax, getMagicSchoolLevel(target.xp).level);
    target.successfulCasts = clampInt(source.successfulCasts, 0, 1000000000);
    const validIds = new Set();
    for (const branch of Object.keys(MAGIC_BRANCHES)) {
      for (let i = 0; i < MAGIC_BRANCHES[branch]; i++) validIds.add(skillId(school, branch, i));
    }
    target.unlockedSkills = [...new Set((Array.isArray(source.unlockedSkills) ? source.unlockedSkills : [])
      .filter(id => validIds.has(id)))];
    for (const [id, xp] of Object.entries(source.skillMasteryXp || {})) {
      if (validIds.has(id)) target.skillMasteryXp[id] = clampInt(xp, 0, 1000000);
    }
  }
  const sourceSlots = value.equippedTechniques || {};
  for (const slot of ['normal', 'ultimate']) {
    const count = slot === 'normal' ? 3 : 2;
    clean.equippedTechniques[slot] = Array.from({ length: count }, (_, i) => {
      const id = sourceSlots[slot]?.[i];
      return typeof id === 'string' && Object.values(clean.schools).some(s => s.unlockedSkills.includes(id)) ? id : null;
    });
  }
  return clean;
}

/** XP curve is deliberately provisional; only successful, validated casts add XP. */
export function magicSchoolXpForLevel(level) {
  const n = clampInt(level, 0, MAGIC_TREE_RULES.schoolLevelMax);
  return 20 * n + 2 * n * (n - 1);
}

export function getMagicSchoolLevel(totalXp = 0) {
  const xp = Math.max(0, Number(totalXp) || 0);
  let level = 0;
  while (level < MAGIC_TREE_RULES.schoolLevelMax && xp >= magicSchoolXpForLevel(level + 1)) level++;
  const current = magicSchoolXpForLevel(level);
  const next = level >= MAGIC_TREE_RULES.schoolLevelMax ? current : magicSchoolXpForLevel(level + 1);
  return { level, xp, xpIntoLevel: xp - current, xpForNextLevel: next - current,
    xpRemaining: Math.max(0, next - xp), progress: next === current ? 1 : (xp - current) / (next - current) };
}

export function getMagicSkillDefinition(school, branch, index) {
  if (!isSchool(school) || !isBranch(branch) || !Number.isInteger(index) || index < 0 || index >= MAGIC_BRANCHES[branch]) return null;
  const tier = branchTier(index, branch) + 1;
  return { id: skillId(school, branch, index), school, branch, index: index + 1, tier,
    requiredSchoolLevel: MAGIC_TREE_RULES.schoolLevelByTier[tier - 1],
    prerequisiteId: index > 0 ? skillId(school, branch, index - 1) : null };
}

export function getMagicSkillTree(school, progression = createMagicProgression()) {
  if (!isSchool(school)) return null;
  const state = sanitizeMagicProgression(progression).schools[school];
  const nodes = [];
  for (const branch of Object.keys(MAGIC_BRANCHES)) {
    for (let index = 0; index < MAGIC_BRANCHES[branch]; index++) {
      const definition = getMagicSkillDefinition(school, branch, index);
      const masteryXp = state.skillMasteryXp[definition.id] || 0;
      const masteryLevel = MAGIC_TREE_RULES.masteryUseThresholds.filter(t => masteryXp >= t).length;
      nodes.push({ ...definition, unlocked: state.unlockedSkills.includes(definition.id), masteryXp, masteryLevel });
    }
  }
  return { school, schoolLevel: state.level, schoolXp: state.xp, nodes };
}

function unlockAvailableSkills(progression, school) {
  const schoolState = progression.schools[school];
  const newlyUnlocked = [];
  for (const branch of Object.keys(MAGIC_BRANCHES)) {
    for (let index = 0; index < MAGIC_BRANCHES[branch]; index++) {
      const def = getMagicSkillDefinition(school, branch, index);
      if (schoolState.level < def.requiredSchoolLevel || schoolState.unlockedSkills.includes(def.id)) continue;
      if (def.prerequisiteId && !schoolState.unlockedSkills.includes(def.prerequisiteId)) continue;
      if (branch === 'ultimate') {
        const capstones = ['offense', 'defense', 'control', 'support'].map(key => skillId(school, key, MAGIC_BRANCHES[key] - 1));
        if (!capstones.every(id => schoolState.unlockedSkills.includes(id))) continue;
      }
      schoolState.unlockedSkills.push(def.id);
      newlyUnlocked.push(def.id);
    }
  }
  return newlyUnlocked;
}

export function recordMagicSkillUse(progression, race, school, skill = null) {
  const state = sanitizeMagicProgression(progression, race);
  if (!isMagicSchoolAllowed(state.race, school)) return { recorded: false, reason: 'race-school-restriction', progression: state };
  const schoolState = state.schools[school];
  schoolState.successfulCasts++;
  schoolState.xp = Math.min(100000000, schoolState.xp + 1);
  schoolState.level = getMagicSchoolLevel(schoolState.xp).level;
  const newlyUnlocked = unlockAvailableSkills(state, school);
  let masteryXp = 0;
  let masteryLevel = 0;
  if (skill) {
    if (!schoolState.unlockedSkills.includes(skill)) return { recorded: false, reason: 'skill-locked-or-unknown', progression: state };
    masteryXp = schoolState.skillMasteryXp[skill] = Math.min(1000000, (schoolState.skillMasteryXp[skill] || 0) + 1);
    masteryLevel = MAGIC_TREE_RULES.masteryUseThresholds.filter(t => masteryXp >= t).length;
  }
  return { recorded: true, school, skill, schoolXp: schoolState.xp, schoolLevel: schoolState.level,
    masteryXp, masteryLevel, newlyUnlocked, progression: state };
}

export function equipMagicTechnique(progression, school, skill, slotType, slotIndex) {
  const state = sanitizeMagicProgression(progression);
  if (!['normal', 'ultimate'].includes(slotType)) return { equipped: false, reason: 'invalid-slot-type', progression: state };
  const slots = state.equippedTechniques[slotType];
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= slots.length) return { equipped: false, reason: 'invalid-slot-index', progression: state };
  if (!isSchool(school) || !state.schools[school].unlockedSkills.includes(skill)) return { equipped: false, reason: 'skill-not-unlocked', progression: state };
  const definition = Object.keys(MAGIC_BRANCHES).flatMap(branch => Array.from({ length: MAGIC_BRANCHES[branch] }, (_, i) => getMagicSkillDefinition(school, branch, i))).find(def => def.id === skill);
  if (!definition || (slotType === 'ultimate') !== (definition.branch === 'ultimate')) return { equipped: false, reason: 'wrong-slot-category', progression: state };
  for (const list of Object.values(state.equippedTechniques)) {
    const duplicate = list.indexOf(skill);
    if (duplicate >= 0) list[duplicate] = null;
  }
  slots[slotIndex] = skill;
  return { equipped: true, progression: state };
}

export function getMagicRaceStatModifiers(race) {
  const rules = MAGIC_RACE_RULES[isRace(race) ? race : 'human'];
  return { physicalStrength: rules.physicalStrength || 1, defense: rules.defense || 1 };
}

export function getMagicCastMultiplier(race, school, branch = 'offense') {
  return getMagicRaceModifier(race, school, branch);
}
