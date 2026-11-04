const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function createEnemyAI({
  id = 'enemy', approachRange = 1.65, attackRange = 1.9,
  telegraphMs = 850, recoveryMs = 1050, attackCooldownMs = 350,
} = {}) {
  return {
    id, state: 'approach', stateTimeMs: 0, attackRange: Math.max(0, attackRange),
    approachRange: Math.max(0, approachRange), telegraphMs: Math.max(0, telegraphMs),
    recoveryMs: Math.max(0, recoveryMs), attackCooldownMs: Math.max(0, attackCooldownMs),
    cooldownRemainingMs: 0, attackSequence: 0,
  };
}

/** Advances a deterministic enemy state machine. Movement and damage stay with the game runtime. */
export function updateEnemyAI(ai, {
  deltaSeconds = 0, distance = Infinity, defeated = false, staggered = false,
} = {}) {
  if (!ai) throw new Error('An enemy AI state is required.');
  const dtMs = Math.max(0, finite(deltaSeconds)) * 1000;
  ai.cooldownRemainingMs = Math.max(0, ai.cooldownRemainingMs - dtMs);
  if (defeated) {
    ai.state = 'defeated'; ai.stateTimeMs = 0;
    return { state: ai.state, canMove: false, telegraph: false, attack: false };
  }
  if (staggered) {
    ai.state = 'stagger'; ai.stateTimeMs = 0;
    return { state: ai.state, canMove: false, telegraph: false, attack: false };
  }
  if (ai.state === 'stagger') { ai.state = 'approach'; ai.stateTimeMs = 0; return { state: ai.state, canMove: true, telegraph: false, attack: false }; }

  ai.stateTimeMs += dtMs;
  if (ai.state === 'approach') {
    if (distance <= ai.attackRange && ai.cooldownRemainingMs <= 0) {
      ai.state = 'telegraph'; ai.stateTimeMs = 0;
    }
  } else if (ai.state === 'telegraph') {
    if (distance > ai.attackRange * 1.5) {
      ai.state = 'approach'; ai.stateTimeMs = 0;
    } else if (ai.stateTimeMs >= ai.telegraphMs) {
      ai.state = 'attack'; ai.stateTimeMs = 0; ai.attackSequence += 1;
      ai.cooldownRemainingMs = ai.attackCooldownMs;
      return { state: ai.state, canMove: false, telegraph: false, attack: true, sequence: ai.attackSequence };
    }
  } else if (ai.state === 'attack') {
    ai.state = 'recover'; ai.stateTimeMs = 0;
  } else if (ai.state === 'recover' && ai.stateTimeMs >= ai.recoveryMs) {
    ai.state = distance <= ai.attackRange ? 'approach' : 'approach';
    ai.stateTimeMs = 0;
  }
  return {
    state: ai.state,
    canMove: ai.state === 'approach',
    telegraph: ai.state === 'telegraph',
    attack: false,
    sequence: ai.attackSequence,
  };
}

export function staggerEnemyAI(ai) {
  if (!ai || ai.state === 'defeated') return false;
  ai.state = 'stagger'; ai.stateTimeMs = 0;
  return true;
}
