/**
 * ASTREA — shared magic skill-tree progression.
 *
 * All 16 schools use one data model. Balance values in MAGIC_TREE_RULES are
 * provisional defaults and must be play-tested before being treated as final.
 * This module is deterministic game logic; authoritative unlocks and XP must be
 * validated and persisted by the game server.
 */
export const MAGIC_TREE_VERSION = 1;

export const MAGIC_SCHOOLS = Object.freeze([
  'fire','water','wind','earth','ice','lightning','nature',
  'light','demonic','spatial','temporal','summoning','healing',
  'illusion','barriers','enchantment',
]);

export const MAGIC_BRANCHES = Object.freeze({
  offense: 20,
  defense: 20,
  control: 20,
  support: 10,
  ultimate: 5,
});

export const MAGIC_TREE_RULES = Object.freeze({
  schoolLevelMax: 100,
  skillMasteryMax: 5,
  schoolLevelByTier: Object.freeze([1, 10, 25, 45, 70]),
  skillPointCostByTier: Object.freeze([1, 2, 3, 4, 6]),
  masteryUseThresholds: Object.freeze([3, 8, 15, 25, 40]),
  masteryXpPerSuccessfulUse: 1,
  ultimateRequiresAllCapstones: true,
});

const isSchool = school => MAGIC_SCHOOLS.includes(school);
const isBranch = branch => Object.hasOwn(MAGIC_BRANCHES, branch);
const clampInt = (value, min, max) => Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
const skillId = (school, branch, index) => `${school}:${branch}:${index + 1}`;

function branchIndex(index, branch) {
  const count = MAGIC_BRANCHES[branch];
  if (!count || index < 0 || index >= count) return null;
  return Math.floor(index / (count / 5));
}

/** Create an empty progression record for one character. */
export function createMagicProgression() {
  return {
    schemaVersion: MAGIC_TREE_VERSION,
    unspentSkillPoints: 0,
    schools: Object.fromEntries(MAGIC_SCHOOLS.map(school => [school, {
      level: 0,
      xp: 0,
      unlockedSkills: [],
      skillMasteryXp: {},
      successfulCasts: 0,
    }])),
  };
}

/**
 * Sanitizes untrusted/legacy progression before it is loaded.
 * Unknown schools, branches, skill ids and negative values are discarded.
 */
export function sanitizeMagicProgression(value = {}) {
  const clean = createMagicProgression();
  clean.unspentSkillPoints = clampInt(value.unspentSkillPoints, 0, 100000);
  for (const school of MAGIC_SCHOOLS) {
    const source = value.schools?.[school] || {};
    const target = clean.schools[school];
    target.level = clampInt(source.level, 0, MAGIC_TREE_RULES.schoolLevelMax);
    target.xp = clampInt(source.xp, 0, 100000000);
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
  return clean;
}

/** XP required to reach a school level: 20*n + 2*n*(n-1). */
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

/** Stable generated definition for a skill slot in one of the 16 trees. */
export function getMagicSkillDefinition(school, branch, index) {
  if (!isSchool(school) || !isBranch(branch) || !Number.isInteger(index) ||
      index < 0 || index >= MAGIC_BRANCHES[branch]) return null;
  const tier = branchIndex(index, branch) + 1;
  const slotInTier = index % (MAGIC_BRANCHES[branch] / 5) + 1;
  return {
    id: skillId(school, branch, index), school, branch, index: index + 1,
    tier, slotInTier,
    requiredSchoolLevel: MAGIC_TREE_RULES.schoolLevelByTier[tier - 1],
    pointCost: MAGIC_TREE_RULES.skillPointCostByTier[tier - 1],
    prerequisiteId: index > 0 ? skillId(school, branch, index - 1) : null,
  };
}

/** Returns the complete 75-node tree structure for a school. */
export function getMagicSkillTree(school, progression = createMagicProgression()) {
  if (!isSchool(school)) return null;
  const state = sanitizeMagicProgression(progression).schools[school];
  const nodes = [];
  for (const branch of Object.keys(MAGIC_BRANCHES)) {
    for (let index = 0; index < MAGIC_BRANCHES[branch]; index++) {
      const definition = getMagicSkillDefinition(school, branch, index);
      const masteryXp = state.skillMasteryXp[definition.id] || 0;
      const masteryLevel = MAGIC_TREE_RULES.masteryUseThresholds.filter(t => masteryXp >= t).length;
      nodes.push({
        ...definition,
        unlocked: state.unlockedSkills.includes(definition.id),
        masteryXp,
        masteryLevel,
        nextMasteryUses: MAGIC_TREE_RULES.masteryUseThresholds[masteryLevel] ?? 0,
      });
    }
  }
  return { school, schoolLevel: state.level, schoolXp: state.xp, nodes };
}

/**
 * Checks unlock conditions. Ultimate nodes require all four non-ultimate
 * capstones (the final node of each regular branch) to be unlocked.
 */
export function canUnlockMagicSkill(progression, school, branch, index) {
  if (!isSchool(school)) return { canUnlock: false, reason: 'unknown-school' };
  const definition = getMagicSkillDefinition(school, branch, index);
  if (!definition) return { canUnlock: false, reason: 'unknown-skill' };
  const state = sanitizeMagicProgression(progression);
  const schoolState = state.schools[school];
  if (schoolState.unlockedSkills.includes(definition.id)) return { canUnlock: false, reason: 'already-unlocked', definition };
  if (schoolState.level < definition.requiredSchoolLevel) return { canUnlock: false, reason: 'school-level', required: definition.requiredSchoolLevel, definition };
  if (definition.prerequisiteId && !schoolState.unlockedSkills.includes(definition.prerequisiteId)) {
    return { canUnlock: false, reason: 'prerequisite', prerequisiteId: definition.prerequisiteId, definition };
  }
  if (branch === 'ultimate' && MAGIC_TREE_RULES.ultimateRequiresAllCapstones) {
    const capstones = ['offense','defense','control','support'].map(key =>
      skillId(school, key, MAGIC_BRANCHES[key] - 1));
    const missing = capstones.filter(id => !schoolState.unlockedSkills.includes(id));
    if (missing.length) return { canUnlock: false, reason: 'ultimate-capstones', missing, definition };
  }
  if (state.unspentSkillPoints < definition.pointCost) {
    return { canUnlock: false, reason: 'insufficient-points', required: definition.pointCost, definition };
  }
  return { canUnlock: true, definition };
}

/** Unlocks a node after validating every prerequisite. */
export function unlockMagicSkill(progression, school, branch, index) {
  const state = sanitizeMagicProgression(progression);
  const check = canUnlockMagicSkill(state, school, branch, index);
  if (!check.canUnlock) return { unlocked: false, reason: check.reason, details: check, progression: state };
  const schoolState = state.schools[school];
  schoolState.unlockedSkills.push(check.definition.id);
  state.unspentSkillPoints -= check.definition.pointCost;
  return { unlocked: true, skill: check.definition, progression: state };
}

/** Adds points from a server-awarded character progression event. */
export function grantMagicSkillPoints(progression, amount) {
  const state = sanitizeMagicProgression(progression);
  const points = clampInt(amount, 0, 1000);
  state.unspentSkillPoints = Math.min(100000, state.unspentSkillPoints + points);
  return { granted: points, unspentSkillPoints: state.unspentSkillPoints, progression: state };
}

/** Adds school XP only from a trusted server progression event. */
export function grantMagicSchoolXp(progression, school, amount) {
  const state = sanitizeMagicProgression(progression);
  if (!isSchool(school)) return { granted: 0, reason: 'unknown-school', progression: state };
  const granted = clampInt(amount, 0, 100000);
  const schoolState = state.schools[school];
  schoolState.xp = Math.min(100000000, schoolState.xp + granted);
  schoolState.level = getMagicSchoolLevel(schoolState.xp).level;
  return { granted, school, schoolXp: schoolState.xp, schoolLevel: schoolState.level, progression: state };
}

/** Records only a successful cast of a previously unlocked skill. */
export function recordMagicSkillUse(progression, school, skill) {
  const state = sanitizeMagicProgression(progression);
  if (!isSchool(school)) return { recorded: false, reason: 'unknown-school', progression: state };
  const knownSkill = Object.keys(MAGIC_BRANCHES).some(branch =>
    Array.from({ length: MAGIC_BRANCHES[branch] }, (_, index) => skillId(school, branch, index)).includes(skill));
  if (!knownSkill || !state.schools[school].unlockedSkills.includes(skill)) {
    return { recorded: false, reason: 'skill-locked-or-unknown', progression: state };
  }
  const schoolState = state.schools[school];
  schoolState.skillMasteryXp[skill] = Math.min(1000000, (schoolState.skillMasteryXp[skill] || 0) + MAGIC_TREE_RULES.masteryXpPerSuccessfulUse);
  schoolState.successfulCasts++;
  const xp = schoolState.xp + 1;
  schoolState.xp = xp;
  schoolState.level = getMagicSchoolLevel(xp).level;
  const masteryXp = schoolState.skillMasteryXp[skill];
  const masteryLevel = MAGIC_TREE_RULES.masteryUseThresholds.filter(t => masteryXp >= t).length;
  return { recorded: true, school, skill, schoolXp: schoolState.xp, schoolLevel: schoolState.level, masteryXp, masteryLevel, progression: state };
}
