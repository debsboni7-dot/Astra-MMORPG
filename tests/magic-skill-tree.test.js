import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAGIC_SCHOOLS, MAGIC_BRANCHES, createMagicProgression, sanitizeMagicProgression,
  getMagicSkillTree, getMagicSkillDefinition, canUnlockMagicSkill, unlockMagicSkill,
  grantMagicSkillPoints, recordMagicSkillUse, getMagicSchoolLevel,
} from '../prototype/src/magic/MagicSkillTree.js';

test('all 16 schools expose exactly 75 nodes in the required branch split', () => {
  assert.equal(MAGIC_SCHOOLS.length, 16);
  for (const school of MAGIC_SCHOOLS) {
    const tree = getMagicSkillTree(school);
    assert.equal(tree.nodes.length, 75);
    for (const [branch, count] of Object.entries(MAGIC_BRANCHES)) {
      assert.equal(tree.nodes.filter(node => node.branch === branch).length, count);
    }
  }
});

test('skill definitions have stable ids, tier levels and branch prerequisites', () => {
  const first = getMagicSkillDefinition('fire', 'offense', 0);
  const second = getMagicSkillDefinition('fire', 'offense', 1);
  assert.equal(first.id, 'fire:offense:1');
  assert.equal(first.prerequisiteId, null);
  assert.equal(second.prerequisiteId, first.id);
  assert.equal(getMagicSkillDefinition('unknown', 'offense', 0), null);
});

test('a skill cannot be unlocked without school level, points and prerequisites', () => {
  const state = createMagicProgression();
  assert.equal(canUnlockMagicSkill(state, 'fire', 'offense', 0).reason, 'school-level');
  state.schools.fire.level = 1;
  assert.equal(canUnlockMagicSkill(state, 'fire', 'offense', 0).reason, 'insufficient-points');
  state.unspentSkillPoints = 1;
  const unlocked = unlockMagicSkill(state, 'fire', 'offense', 0);
  assert.equal(unlocked.unlocked, true);
  assert.equal(unlocked.progression.unspentSkillPoints, 0);
});

test('branch progression requires the previous node', () => {
  const state = createMagicProgression();
  state.schools.water.level = 1;
  state.unspentSkillPoints = 20;
  assert.equal(canUnlockMagicSkill(state, 'water', 'defense', 1).reason, 'prerequisite');
});

test('ultimate requires the four non-ultimate branch capstones', () => {
  const state = createMagicProgression();
  state.schools.wind.level = 100;
  state.unspentSkillPoints = 1000;
  assert.equal(canUnlockMagicSkill(state, 'wind', 'ultimate', 0).reason, 'prerequisite');
});

test('successful uses improve only the unlocked skill and its school', () => {
  const state = createMagicProgression();
  state.schools.ice.level = 1;
  state.unspentSkillPoints = 1;
  const unlocked = unlockMagicSkill(state, 'ice', 'offense', 0);
  const result = recordMagicSkillUse(unlocked.progression, 'ice', 'ice:offense:1');
  assert.equal(result.recorded, true);
  assert.equal(result.masteryXp, 1);
  assert.equal(result.schoolXp, undefined);
  assert.equal(result.progression.schools.ice.successfulCasts, 1);
});

test('unknown skills and locked skills cannot gain mastery', () => {
  const result = recordMagicSkillUse(createMagicProgression(), 'nature', 'nature:offense:1');
  assert.equal(result.recorded, false);
  assert.equal(result.reason, 'skill-locked-or-unknown');
});

test('sanitization discards unknown schools, branches and negative values', () => {
  const clean = sanitizeMagicProgression({
    unspentSkillPoints: -20,
    schools: {
      fire: { level: 999, xp: -1, unlockedSkills: ['fire:offense:1', 'fire:unknown:99'], skillMasteryXp: { 'fire:offense:1': -3 } },
      hacked: { level: 100 },
    },
  });
  assert.equal(clean.unspentSkillPoints, 0);
  assert.equal(clean.schools.fire.level, 100);
  assert.deepEqual(clean.schools.fire.unlockedSkills, ['fire:offense:1']);
  assert.equal(clean.schools.fire.skillMasteryXp['fire:offense:1'], 0);
  assert.equal(clean.schools.hacked, undefined);
});

test('school level curve is monotonic and capped', () => {
  assert.equal(getMagicSchoolLevel(0).level, 0);
  assert.equal(getMagicSchoolLevel(20).level, 1);
  assert.equal(getMagicSchoolLevel(99999999).level, 100);
});

test('server-awarded skill points are bounded', () => {
  const result = grantMagicSkillPoints(createMagicProgression(), 500000);
  assert.equal(result.granted, 1000);
  assert.equal(result.unspentSkillPoints, 1000);
});
