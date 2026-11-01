const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, finite(value)));

/** A combo is a timed input chain, independent from animation playback. */
export function createComboState({ maxStage = 3, inputWindowMs = 720, resetAfterMs = 1450 } = {}) {
  return { stage: 0, lastInputAt: -Infinity, maxStage: Math.max(1, Math.floor(maxStage)), inputWindowMs: Math.max(0, inputWindowMs), resetAfterMs: Math.max(inputWindowMs, resetAfterMs), totalHits: 0 };
}

export function advanceCombo(combo, now, { inputWindowMs = combo.inputWindowMs, resetAfterMs = combo.resetAfterMs } = {}) {
  const time = finite(now);
  const elapsed = time - combo.lastInputAt;
  if (elapsed > resetAfterMs || elapsed < 0) combo.stage = 0;
  else if (elapsed > inputWindowMs) combo.stage = 0;
  combo.stage = combo.stage >= combo.maxStage ? 1 : combo.stage + 1;
  combo.lastInputAt = time;
  combo.totalHits += 1;
  const multipliers = [1, 1.12, 1.3, 1.48];
  const costs = [0, 3, 6, 10];
  return {
    stage: combo.stage,
    maxStage: combo.maxStage,
    multiplier: multipliers[Math.min(combo.stage - 1, multipliers.length - 1)],
    staminaCost: costs[Math.min(combo.stage - 1, costs.length - 1)],
    finisher: combo.stage === combo.maxStage,
    nextInputWindowMs: inputWindowMs,
    totalHits: combo.totalHits,
  };
}

export function resetCombo(combo) {
  combo.stage = 0;
  combo.lastInputAt = -Infinity;
  return combo;
}

/** Converts impact into bounded reactions; heavier/resistant targets are harder to control. */
export function resolveHitReaction({ impact = 0, targetPoise = 40, targetMass = 1, controlResistance = 0, attackType = 'light' } = {}) {
  const force = Math.max(0, finite(impact));
  const poise = Math.max(1, finite(targetPoise, 40));
  const mass = Math.max(.25, finite(targetMass, 1));
  const resistance = clamp(controlResistance, 0, .95);
  const effectiveForce = force * (1 - resistance) / Math.sqrt(mass);
  const ratio = effectiveForce / poise;
  if (ratio < .28) return { reaction: 'flinch', staggerMs: 100, knockback: 0, knockdown: false, launch: false, ratio };
  if (attackType === 'launcher' && ratio >= .72) return { reaction: 'launch', staggerMs: 520, knockback: .58, knockdown: false, launch: true, airborneMs: 720, launchHeight: 1.25, ratio };
  if (ratio < .72) return { reaction: 'stagger', staggerMs: 260 + ratio * 180, knockback: .12 + ratio * .22, knockdown: false, launch: false, ratio };
  if (ratio < 1.35) return { reaction: 'knockback', staggerMs: 480 + ratio * 120, knockback: .45 + ratio * .45, knockdown: false, launch: false, ratio };
  const heavy = attackType === 'heavy' || attackType === 'finisher' || ratio >= 1.8;
  return { reaction: heavy ? 'knockdown' : 'knockback', staggerMs: heavy ? 1050 : 650, knockback: heavy ? 1.35 : 1, knockdown: heavy, launch: false, ratio };
}


/** Tracks the grounded and get-up phases after a knockdown. */
export function createHitRecoveryState({ getUpDurationMs = 650 } = {}) {
  return { phase: 'standing', startedAt: 0, recoverAt: 0, getUpDurationMs: Math.max(1, finite(getUpDurationMs, 650)) };
}

export function beginHitRecovery(state, reaction, now, { getUpDurationMs = state.getUpDurationMs } = {}) {
  if (!state || (!reaction?.knockdown && !reaction?.launch)) return state;
  const time = finite(now);
  state.startedAt = time;
  state.getUpDurationMs = Math.max(1, finite(getUpDurationMs, 650));
  if (reaction.launch) {
    state.phase = 'airborne';
    state.airborneDurationMs = Math.max(1, finite(reaction.airborneMs, 720));
    state.launchHeight = Math.max(.1, finite(reaction.launchHeight, 1.25));
    state.recoverAt = time + state.airborneDurationMs + Math.max(0, finite(reaction.staggerMs));
  } else {
    state.phase = 'down';
    state.recoverAt = time + Math.max(0, finite(reaction.staggerMs));
  }
  return state;
}

export function updateHitRecovery(state, now) {
  if (!state) throw new Error('A hit recovery state is required.');
  const time = finite(now);
  if (state.phase === 'airborne') {
    const progress = clamp((time - state.startedAt) / state.airborneDurationMs, 0, 1);
    const height = Math.sin(Math.PI * progress) * state.launchHeight;
    if (progress >= 1) { state.phase = 'down'; state.startedAt = time; }
    return { phase: progress >= 1 ? 'down' : 'airborne', progress, height: progress >= 1 ? 0 : height, grounded: progress >= 1 };
  }
  if (state.phase === 'down' && time >= state.recoverAt) { state.phase = 'getting-up'; state.startedAt = time; }
  if (state.phase === 'getting-up') {
    const progress = clamp((time - state.startedAt) / state.getUpDurationMs, 0, 1);
    if (progress >= 1) state.phase = 'standing';
    return { phase: state.phase, progress, height: 0, grounded: progress < 1 };
  }
  return { phase: state.phase, progress: state.phase === 'standing' ? 1 : 0, height: 0, grounded: state.phase === 'down' };
}


/** Diminishes repeated crowd-control effects on the same target to prevent stun-locks. */
export function createControlDiminishingState() {
  return { count: 0, lastAppliedAt: -Infinity };
}

export function applyControlDiminishing(state, reaction, now, {
  windowMs = 4500, step = .18, maxReduction = .72, hardControlLimit = 3,
} = {}) {
  if (!state || !reaction) throw new Error('Control state and reaction are required.');
  const time = finite(now);
  if (time < state.lastAppliedAt || time - state.lastAppliedAt > Math.max(0, finite(windowMs, 4500))) state.count = 0;
  const isControl = finite(reaction.staggerMs) > 0 && reaction.reaction !== 'flinch';
  if (!isControl) return { ...reaction, controlCount: state.count, controlReduction: 0 };
  state.count += 1;
  state.lastAppliedAt = time;
  const reduction = clamp((state.count - 1) * Math.max(0, finite(step, .18)), 0, clamp(maxReduction, 0, .9));
  const adjusted = {
    ...reaction,
    staggerMs: Math.max(90, Math.round(finite(reaction.staggerMs) * (1 - reduction))),
    knockback: Math.max(0, finite(reaction.knockback) * (1 - reduction)),
    controlCount: state.count,
    controlReduction: reduction,
  };
  if (state.count >= Math.max(2, Math.floor(finite(hardControlLimit, 3)))) {
    if (adjusted.knockdown || adjusted.launch) {
      adjusted.reaction = 'stagger';
      adjusted.knockdown = false;
      adjusted.launch = false;
      adjusted.airborneMs = 0;
      adjusted.launchHeight = 0;
    }
  }
  return adjusted;
}
