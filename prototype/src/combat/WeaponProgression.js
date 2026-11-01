export const WEAPON_MASTERY_MAX_LEVEL = 100;
export const WEAPON_MASTERY_XP = Object.freeze({
  firstLevel: 12, perLevelGrowth: 2,
  rewards: Object.freeze({ light: 1, heavy: 1.5, charged: 1.75, finisher: 2, special: 2.25, aerial: 1.5, default: 1 }),
});
export const TECHNIQUE_UNLOCK_LEVELS = Object.freeze([3, 8, 15, 25, 40, 60, 80, 100]);
export const TECHNIQUE_MASTERY_THRESHOLDS = Object.freeze([3, 8, 15, 25, 40]);
const TECHNIQUE_DATA = {
  sword: [['quick_slash','Entaille rapide'],['riposte','Riposte'],['cross_cut','Croisé tranchant'],['guard_break','Brise-garde'],['blade_dance','Danse des lames'],['piercing_thrust','Estoc précis'],['steel_tempest','Tempête d’acier'],['sword_mastery','Art du duelliste']],
  axe: [['heavy_chop','Coupe puissante'],['hooking_strike','Frappe crochetée'],['cleaving_arc','Arc dévastateur'],['armor_splitter','Brise-armure'],['execution_chop','Coupe d’exécution'],['whirlwind_axe','Tourbillon de hache'],['ravager','Dévastation'],['axe_mastery','Art du conquérant']],
  hammer: [['crushing_blow','Coup écrasant'],['ground_pound','Fracas au sol'],['staggering_bash','Heurt déstabilisant'],['fortress_breaker','Brise-forteresse'],['quake_strike','Frappe sismique'],['meteor_hammer','Marteau météore'],['cataclysm','Cataclysme'],['hammer_mastery','Art du titan']],
  polearm: [['long_thrust','Estoc allongé'],['sweeping_cut','Balayage'],['vaulting_strike','Frappe bondissante'],['pinning_thrust','Estoc immobilisant'],['spear_wall','Mur de pointes'],['whirlwind_reach','Tourbillon étendu'],['sky_piercer','Perce-ciel'],['polearm_mastery','Art du lancier']],
};
export const WEAPON_TECHNIQUES = Object.freeze(Object.fromEntries(Object.entries(TECHNIQUE_DATA).map(([category, rows]) => [category, Object.freeze(rows.map(([id,name],i) => Object.freeze({id,name,category,requiredMastery:TECHNIQUE_UNLOCK_LEVELS[i]})))])));
export function weaponMasteryXpForLevel(level) {
  const n = Math.max(0, Math.min(100, Math.floor(Number(level) || 0)));
  return n * 12 + n * (n - 1);
}
export function getWeaponMasteryFromXp(totalXp = 0) {
  const xp = Math.max(0, Number(totalXp) || 0);
  let level = 0;
  while (level < 100 && xp >= weaponMasteryXpForLevel(level + 1)) level++;
  const base = weaponMasteryXpForLevel(level), next = level === 100 ? base : weaponMasteryXpForLevel(level + 1);
  return {level,xp,currentLevelXp:base,xpIntoLevel:xp-base,xpForNextLevel:next-base,xpRemaining:Math.max(0,next-xp),progress:level===100?1:(xp-base)/(next-base),maxLevel:100};
}
export function getWeaponTechniqueList(category, masteryLevel = 0, techniqueXp = {}) {
  return (WEAPON_TECHNIQUES[category] || []).map(t => {
    const xp = Math.max(0, Number(techniqueXp[t.id]) || 0);
    const level = TECHNIQUE_MASTERY_THRESHOLDS.filter(v => xp >= v).length;
    const base = level ? TECHNIQUE_MASTERY_THRESHOLDS[level-1] : 0;
    const next = TECHNIQUE_MASTERY_THRESHOLDS[level] ?? base;
    return {...t,unlocked:masteryLevel>=t.requiredMastery,xp,techniqueMasteryLevel:level,xpIntoLevel:xp-base,xpForNextLevel:next-base,xpRemaining:Math.max(0,next-xp),powerMultiplier:1+level*.02,staminaCostMultiplier:Math.max(.9,1-level*.02)};
  });
}
export function awardWeaponMastery(combatant, category, attackType = 'light', explicitXp = null) {
  if (!combatant || !WEAPON_TECHNIQUES[category]) return {awarded:0,reason:'invalid-category'};
  combatant.weaponMasteryXpByCategory ||= {};
  combatant.weaponMasteries ||= {};
  const legacy = Math.max(0, Number(combatant.weaponMasteries[category]) || 0);
  const baseline = Math.max(Number(combatant.weaponMasteryXpByCategory[category]) || 0, weaponMasteryXpForLevel(legacy));
  combatant.weaponMasteryXpByCategory[category] = baseline;
  const before = getWeaponMasteryFromXp(baseline);
  const reward = explicitXp == null ? (WEAPON_MASTERY_XP.rewards[attackType] ?? 1) : Math.max(0,Math.min(5,Number(explicitXp)||0));
  if (before.level >= 100 || reward <= 0) return {awarded:0,before,after:before,unlocked:[]};
  const xp = Math.min(weaponMasteryXpForLevel(100),before.xp+reward);
  combatant.weaponMasteryXpByCategory[category] = xp;
  const after = getWeaponMasteryFromXp(xp);
  combatant.weaponMasteries[category] = after.level;
  return {awarded:xp-before.xp,before,after,unlocked:WEAPON_TECHNIQUES[category].filter(t=>t.requiredMastery>before.level&&t.requiredMastery<=after.level)};
}
export function recordWeaponTechniqueUse(combatant, category, techniqueId) {
  if (!combatant || !WEAPON_TECHNIQUES[category]) return {recorded:false,reason:'invalid-category'};
  const mastery = combatant.weaponMasteries?.[category] || 0;
  const technique = getWeaponTechniqueList(category,mastery,combatant.weaponTechniqueXp||{}).find(t=>t.id===techniqueId);
  if (!technique) return {recorded:false,reason:'unknown-technique'};
  if (!technique.unlocked) return {recorded:false,reason:'technique-locked',requiredMastery:technique.requiredMastery};
  combatant.weaponTechniqueXp ||= {};
  const before = technique.techniqueMasteryLevel;
  combatant.weaponTechniqueXp[techniqueId] = (combatant.weaponTechniqueXp[techniqueId]||0)+1;
  const after = getWeaponTechniqueList(category,mastery,combatant.weaponTechniqueXp).find(t=>t.id===techniqueId);
  return {recorded:true,technique:after,levelUp:after.techniqueMasteryLevel>before};
}
export function getWeaponProgression(combatant, category) {
  const xp = combatant?.weaponMasteryXpByCategory?.[category] || 0;
  const mastery = getWeaponMasteryFromXp(xp);
  const level = Math.max(mastery.level,Number(combatant?.weaponMasteries?.[category])||0);
  return {category,mastery:{...mastery,level},techniques:getWeaponTechniqueList(category,level,combatant?.weaponTechniqueXp||{})};
}
