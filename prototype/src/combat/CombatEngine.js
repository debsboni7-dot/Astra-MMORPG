/**
 * ASTREA Combat Engine — deterministic, data-driven combat rules.
 *
 * IMPORTANT:
 * - Formula coefficients are provisional balance configuration, not approved game values.
 * - Character level is deliberately not used as a substitute for physical attributes.
 * - Elemental status application is separate from shield damage absorption.
 * - Hostile attack absorption/intensification is FIRE ONLY and requires defender fire
 *   mastery to be strictly greater than the attacker's fire mastery.
 */
export const ENGINE_VERSION = '0.1.0';

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const DEFAULT_BALANCE = Object.freeze({
  defenseK: 100,
  maxResistance: 0.9,
  maxWeakness: 1.0,
  baseCriticalChance: 0,
  criticalMultiplier: 1.5,
  minExecutionMultiplier: 0.75,
  maxExecutionMultiplier: 1.25,
  healingReceivedMultiplier: 1,
});

export function calculateCritical({ chance = 0, multiplier = DEFAULT_BALANCE.criticalMultiplier, rng = Math.random } = {}) {
  const probability = clamp(chance, 0, 1);
  const critical = rng() < probability;
  return { critical, probability, multiplier: critical ? Math.max(1, finite(multiplier, 1)) : 1 };
}

export function calculatePhysicalDamage({ base = 0, strength = 0, strengthCoefficient = 0, weaponPower = 0, techniqueMultiplier = 1, executionQuality = 1, criticalChance = 0, criticalMultiplier, defense = 0, armor = 0, resistance = 0, balance = {}, rng = Math.random } = {}) {
  const cfg = { ...DEFAULT_BALANCE, ...balance };
  const raw = Math.max(0, (finite(base) + finite(strength) * finite(strengthCoefficient) + finite(weaponPower)) * Math.max(0, finite(techniqueMultiplier, 1)) * clamp(executionQuality, cfg.minExecutionMultiplier, cfg.maxExecutionMultiplier));
  return mitigateDamage({ raw, defense, armor, resistance, criticalChance, criticalMultiplier, cfg, rng, type: 'physical' });
}

export function calculateMagicDamage({ base = 0, relevantPower = 0, powerCoefficient = 0, techniqueMultiplier = 1, schoolMasteryMultiplier = 1, executionQuality = 1, criticalChance = 0, criticalMultiplier, defense = 0, resistance = 0, balance = {}, rng = Math.random, element = null } = {}) {
  const cfg = { ...DEFAULT_BALANCE, ...balance };
  const raw = Math.max(0, (finite(base) + finite(relevantPower) * finite(powerCoefficient)) * Math.max(0, finite(techniqueMultiplier, 1)) * Math.max(0, finite(schoolMasteryMultiplier, 1)) * clamp(executionQuality, cfg.minExecutionMultiplier, cfg.maxExecutionMultiplier));
  return mitigateDamage({ raw, defense, armor: 0, resistance, criticalChance, criticalMultiplier, cfg, rng, type: 'magic', element });
}

function mitigateDamage({ raw, defense, armor, resistance, criticalChance, criticalMultiplier, cfg, rng, type, element = null }) {
  const crit = calculateCritical({ chance: criticalChance, multiplier: criticalMultiplier ?? cfg.criticalMultiplier, rng });
  const afterCrit = raw * crit.multiplier;
  const effectiveDefense = Math.max(0, finite(defense) + finite(armor));
  const defenseFactor = cfg.defenseK <= 0 ? 1 : cfg.defenseK / (cfg.defenseK + effectiveDefense);
  const boundedResistance = clamp(resistance, -cfg.maxWeakness, cfg.maxResistance);
  const afterDefense = afterCrit * defenseFactor;
  const finalDamage = Math.max(0, afterDefense * (1 - boundedResistance));
  return {
    type, element, rawDamage: raw, critical: crit.critical, criticalChance: crit.probability,
    criticalMultiplier: crit.multiplier, defenseFactor, resistance: boundedResistance,
    damage: finalDamage,
  };
}

export function applyDamage(target, damage, { shields = [], element = null, damageType = 'physical' } = {}) {
  let remaining = Math.max(0, finite(damage));
  const shieldResults = [];
  for (const shield of shields) {
    if (!shield || shield.remaining <= 0) continue;
    const matches = !shield.protectionType || shield.protectionType === 'all' ||
      shield.protectionType === damageType || (element && shield.protectionType === element);
    if (!matches) continue;
    const absorbed = Math.min(remaining, Math.max(0, shield.remaining));
    shield.remaining -= absorbed;
    remaining -= absorbed;
    shieldResults.push({ shieldId: shield.id, absorbed, remainingCapacity: shield.remaining });
    if (remaining <= 0) break;
  }
  const before = Math.max(0, finite(target.hp));
  const hpLost = Math.min(before, remaining);
  target.hp = Math.max(0, before - hpLost);
  return { hpLost, hpRemaining: target.hp, overflowDamage: Math.max(0, remaining - hpLost), shieldResults };
}

export function applyHealing(target, amount, { healingReceivedMultiplier = DEFAULT_BALANCE.healingReceivedMultiplier } = {}) {
  const before = Math.max(0, finite(target.hp));
  const maxHp = Math.max(0, finite(target.maxHp, before));
  const requested = Math.max(0, finite(amount)) * Math.max(0, finite(healingReceivedMultiplier, 1));
  const restored = Math.min(Math.max(0, maxHp - before), requested);
  target.hp = Math.min(maxHp, before + restored);
  return { restored, overheal: Math.max(0, requested - restored), hpRemaining: target.hp };
}

export function createShield({ id, capacity, protectionType = 'all', sourceId = null, durationMs = null } = {}) {
  if (!id) throw new Error('A shield requires a stable id.');
  return { id, remaining: Math.max(0, finite(capacity)), protectionType, sourceId, durationMs };
}

/**
 * Applies a timed status. Reapplying a duration-extending status (e.g. burn/freeze)
 * adds duration without increasing its intensity.
 */
export function applyStatus(target, incoming, now = Date.now()) {
  if (!incoming?.id) throw new Error('A status effect requires an id.');
  target.statusEffects ||= [];
  const current = target.statusEffects.find(effect => effect.id === incoming.id);
  const duration = Math.max(0, finite(incoming.durationMs));
  const intensity = Math.max(0, finite(incoming.intensity, 1));
  if (!current) {
    const effect = { ...incoming, intensity, expiresAt: now + duration, appliedAt: now, nextTickAt: now + Math.max(1, finite(incoming.tickIntervalMs, 1000)) };
    target.statusEffects.push(effect);
    return { applied: true, effect, refreshed: false };
  }
  const policy = incoming.reapplyPolicy || 'extend-duration';
  if (policy === 'extend-duration') {
    current.expiresAt = Math.max(current.expiresAt, now) + duration;
  } else if (policy === 'refresh') {
    current.expiresAt = now + duration;
  } else if (policy === 'strongest') {
    current.intensity = Math.max(current.intensity, intensity);
    current.expiresAt = Math.max(current.expiresAt, now + duration);
  }
  return { applied: true, effect: current, refreshed: true };
}

export function tickDamageOverTime(target, now = Date.now()) {
  target.statusEffects ||= [];
  let total = 0;
  const active = [];
  for (const effect of target.statusEffects) {
    if (effect.expiresAt <= now) continue;
    active.push(effect);
    if (effect.tickDamage > 0 && effect.nextTickAt <= now) {
      const ticks = Math.max(1, Math.floor((now - effect.nextTickAt) / Math.max(1, effect.tickIntervalMs || 1000)) + 1);
      const damage = Math.max(0, effect.tickDamage * effect.intensity * ticks);
      target.hp = Math.max(0, finite(target.hp) - damage);
      total += damage;
      effect.nextTickAt += ticks * Math.max(1, effect.tickIntervalMs || 1000);
    }
  }
  target.statusEffects = active;
  return { damage: total, hpRemaining: target.hp };
}

export function purifyStatuses(target, { ids = null, categories = null, maxCount = Infinity } = {}) {
  target.statusEffects ||= [];
  let removed = 0;
  const kept = [];
  for (const effect of target.statusEffects) {
    const matches = (!ids || ids.includes(effect.id)) && (!categories || categories.includes(effect.category));
    if (matches && removed < maxCount) removed++;
    else kept.push(effect);
  }
  target.statusEffects = kept;
  return { removed, remaining: kept.length };
}

/** Same stat + same stacking group: strongest magnitude wins, never additive stacking. */
export function applyModifier(target, modifier, now = Date.now()) {
  if (!modifier?.id || !modifier?.stat) throw new Error('Modifier requires id and stat.');
  target.modifiers ||= [];
  const group = modifier.stackingGroup || (modifier.category ? modifier.category + ':' + modifier.stat : modifier.stat);
  const same = target.modifiers.filter(item => (item.stackingGroup || (item.category ? item.category + ':' + item.stat : item.stat)) === group && item.stat === modifier.stat);
  const candidate = { ...modifier, expiresAt: now + Math.max(0, finite(modifier.durationMs)) };
  if (!same.length) {
    target.modifiers.push(candidate);
    return { applied: true, modifier: candidate, replaced: false };
  }
  const strongest = same.reduce((best, item) => Math.abs(item.value) > Math.abs(best.value) ? item : best);
  if (Math.abs(candidate.value) > Math.abs(strongest.value)) {
    target.modifiers = target.modifiers.filter(item => !same.includes(item));
    target.modifiers.push(candidate);
    return { applied: true, modifier: candidate, replaced: true };
  }
  strongest.expiresAt = Math.max(strongest.expiresAt, candidate.expiresAt);
  return { applied: false, modifier: strongest, replaced: false };
}

export function getModifiedStat(baseValue, modifiers = [], stat, now = Date.now()) {
  const active = modifiers.filter(item => item.stat === stat && item.expiresAt > now);
  return finite(baseValue) + active.reduce((sum, item) => sum + finite(item.value), 0);
}

/**
 * The unique hostile elemental absorption mechanic in ASTREA.
 * It rejects every element except fire and requires defender mastery > caster mastery.
 */
export function absorbAndIntensifyHostileAttack({ element, defenderFireMastery, attackerFireMastery, incomingDamage, physicalStatBonus = 0 } = {}) {
  if (element !== 'fire') return { absorbed: false, reason: 'fire-only' };
  if (!(finite(defenderFireMastery) > finite(attackerFireMastery))) return { absorbed: false, reason: 'insufficient-fire-mastery' };
  return {
    absorbed: true,
    element: 'fire',
    absorbedDamage: Math.max(0, finite(incomingDamage)),
    intensifiedFire: true,
    physicalStatBonus: Math.max(0, finite(physicalStatBonus)),
  };
}

export function canUseWeapon({ physicalStrength, requiredStrength, weaponMastery, requiredMastery } = {}) {
  const strengthMet = finite(physicalStrength) >= finite(requiredStrength);
  const masteryMet = finite(weaponMastery) >= finite(requiredMastery);
  return { canUse: strengthMet && masteryMet, strengthMet, masteryMet };
}

export function resolveAttack({ attacker, target, attack, balance = {}, rng = Math.random } = {}) {
  if (!attacker || !target || !attack) throw new Error('attacker, target and attack are required.');
  if (attack.kind === 'physical') {
    const result = calculatePhysicalDamage({ ...attack, balance, rng });
    const applied = applyDamage(target, result.damage, { shields: target.shields || [], damageType: 'physical' });
    return { ...result, ...applied };
  }
  if (attack.kind === 'magic') {
    const result = calculateMagicDamage({ ...attack, balance, rng });
    const applied = applyDamage(target, result.damage, { shields: target.shields || [], element: attack.element, damageType: 'magic' });
    return { ...result, ...applied };
  }
  throw new Error(`Unsupported attack kind: ${attack.kind}`);
}
