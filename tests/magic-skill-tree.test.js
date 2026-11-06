import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAGIC_SCHOOLS, MAGIC_BRANCHES, MAGIC_RACE_RULES, createMagicProgression,
  sanitizeMagicProgression, getMagicSkillTree, getMagicSkillDefinition,
  recordMagicSkillUse, equipMagicTechnique, getMagicSchoolLevel, getMagicCastMultiplier, getMagicRaceStatModifiers,
} from '../prototype/src/magic/MagicSkillTree.js';

test('only the nine approved magic schools exist', () => {
  assert.deepEqual(MAGIC_SCHOOLS, ['fire','water','wind','earth','ice','lightning','nature','light','demonic']);
  assert.equal(MAGIC_SCHOOLS.length, 9);
  for (const school of MAGIC_SCHOOLS) assert.equal(getMagicSkillTree(school).nodes.length, 75);
});

test('each school has the approved branches and stable skill identifiers', () => {
  const tree = getMagicSkillTree('fire');
  assert.deepEqual(MAGIC_BRANCHES, { offense:20, defense:20, control:20, support:10, ultimate:5 });
  for (const [branch, count] of Object.entries(MAGIC_BRANCHES)) assert.equal(tree.nodes.filter(n => n.branch === branch).length, count);
  assert.equal(getMagicSkillDefinition('fire','offense',0).id, 'fire:offense:1');
  assert.equal(getMagicSkillDefinition('unknown','offense',0), null);
});

test('magic progression has no skill points and starts with five empty technique slots', () => {
  const state = createMagicProgression('human');
  assert.equal('unspentSkillPoints' in state, false);
  assert.deepEqual(state.equippedTechniques, { normal:[null,null,null], ultimate:[null,null] });
});

test('race restrictions and affinities follow ASTREA rules', () => {
  assert.equal(MAGIC_RACE_RULES.elf.allowed.includes('demonic'), false);
  assert.equal(getMagicCastMultiplier('elf','nature'), 1.10);
  assert.equal(getMagicCastMultiplier('demon','demonic'), 1.20);
  assert.equal(getMagicCastMultiplier('angel','light'), 1.20);
  assert.equal(getMagicCastMultiplier('orc','fire'), 1.14);
  assert.equal(getMagicCastMultiplier('orc','nature'), 0);
  assert.equal(getMagicCastMultiplier('dwarf','fire'), 1);
  assert.equal(getMagicCastMultiplier('dwarf','nature'), 0);
  assert.equal(getMagicCastMultiplier('draconoid','fire','offense'), 1.15);
  assert.equal(getMagicCastMultiplier('human','demonic'), 1);
  assert.equal(getMagicRaceStatModifiers('orc').physicalStrength,1.14);
  assert.equal(getMagicRaceStatModifiers('dwarf').defense,1.15);
});

test('only successful casts increase the matching school progression and unlock skills automatically', () => {
  let state = createMagicProgression('human');
  const first = recordMagicSkillUse(state, 'human', 'fire');
  assert.equal(first.recorded, true);
  assert.equal(first.schoolXp, 1);
  assert.equal(first.schoolLevel, 0);
  assert.equal(first.newlyUnlocked.length, 0);
  assert.equal(first.progression.schools.water.successfulCasts, 0);
  state = first.progression;
  let unlocked = [];
  for (let i=0;i<19;i++) { const result = recordMagicSkillUse(state, 'human', 'fire'); state = result.progression; unlocked.push(...result.newlyUnlocked); }
  assert.equal(state.schools.fire.level, 1);
  assert.ok(unlocked.includes('fire:offense:1'));
  assert.ok(state.schools.fire.unlockedSkills.includes('fire:offense:1'));
});

test('race cannot progress a forbidden school', () => {
  const result = recordMagicSkillUse(createMagicProgression('elf'), 'elf', 'demonic');
  assert.equal(result.recorded, false);
  assert.equal(result.reason, 'race-school-restriction');
  assert.equal(result.progression.schools.demonic.xp, 0);
});

test('school levels are bounded and sanitization rejects unknown data', () => {
  const clean = sanitizeMagicProgression({ race:'orc', schools:{ hacked:{xp:999}, fire:{xp:999999999, unlockedSkills:['fire:offense:1','fire:fake:3']} } });
  assert.equal(clean.race, 'orc');
  assert.equal(clean.schools.fire.level, 100);
  assert.deepEqual(clean.schools.fire.unlockedSkills, ['fire:offense:1']);
  assert.equal(clean.schools.hacked, undefined);
  assert.equal(getMagicSchoolLevel(20).level, 1);
});

test('three normal and two ultimate slots accept only unlocked techniques of matching category', () => {
  let state = createMagicProgression('human');
  for (let i=0;i<20;i++) state = recordMagicSkillUse(state,'human','fire').progression;
  const skill = 'fire:offense:1';
  const equipped = equipMagicTechnique(state,'fire',skill,'normal',0);
  assert.equal(equipped.equipped,true);
  assert.equal(equipped.progression.equippedTechniques.normal[0],skill);
  assert.equal(equipMagicTechnique(state,'fire',skill,'ultimate',0).reason,'wrong-slot-category');
  assert.equal(equipMagicTechnique(state,'fire',skill,'normal',3).reason,'invalid-slot-index');
});
