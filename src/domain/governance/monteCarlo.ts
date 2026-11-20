/**
 * Deterministic Mulberry32 500-iteration × 52-week Monte Carlo engine.
 * Returns P10/P50/P90 programme durations and SQCDP pass probabilities.
 */

/** Mulberry32 PRNG — deterministic, seedable. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
  };
}

export interface MonteCarloInput {
  /** Expected programme duration in weeks (from CPM). */
  baseDurationWeeks: number;
  /** Coefficient of variation for activity durations. */
  durationCv: number;
  /** Baseline rolled RFT. */
  baseRolledRFT: number;
  /** Baseline OEE. */
  baseOEE: number;
  /** Gate exit status (Red gates increase variance). */
  redGateCount: number;
  /** Open amber actions from gate assessment; each adds +5% duration CV (v3.5). */
  openActionCount?: number;
  seed?: number;
}

export interface MonteCarloResult {
  p10Weeks: number;
  p50Weeks: number;
  p90Weeks: number;
  sqPassProbability: number;
  cdPassProbability: number;
  pPassProbability: number;
  iterations: number;
}

const ITERATIONS = 500;
const DEFAULT_SEED = 0xDEADBEEF;

/** Normal approximation using Box-Muller. */
function randNormal(rand: () => number, mean: number, cv: number): number {
  const u1 = rand();
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12))) * Math.cos(2 * Math.PI * u2);
  return Math.max(mean * 0.5, mean + z * mean * cv);
}

/**
 * Run deterministic Monte Carlo simulation.
 * Each iteration samples programme duration and SQCDP outcomes.
 */
export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const seed = input.seed ?? DEFAULT_SEED;
  const rand = mulberry32(seed);

  const durations: number[] = [];
  let sqPass = 0, cdPass = 0, pPass = 0;

  const redPenaltyCv = 0.05 * input.redGateCount;
  const amberPenaltyCv = 0.05 * (input.openActionCount ?? 0);
  const effectiveCv = input.durationCv + redPenaltyCv + amberPenaltyCv;

  for (let i = 0; i < ITERATIONS; i++) {
    const dur = randNormal(rand, input.baseDurationWeeks, effectiveCv);
    durations.push(dur);

    const rft = randNormal(rand, input.baseRolledRFT, 0.015);
    const oee = randNormal(rand, input.baseOEE, 0.02);
    if (rft >= 0.990 && oee >= 0.85) sqPass++;
    if (dur <= input.baseDurationWeeks * 1.1) cdPass++;
    if (rft >= 0.990) pPass++;
  }

  durations.sort((a, b) => a - b);
  const p10 = durations[Math.floor(ITERATIONS * 0.10)]!;
  const p50 = durations[Math.floor(ITERATIONS * 0.50)]!;
  const p90 = durations[Math.floor(ITERATIONS * 0.90)]!;

  return {
    p10Weeks: p10,
    p50Weeks: p50,
    p90Weeks: p90,
    sqPassProbability: sqPass / ITERATIONS,
    cdPassProbability: cdPass / ITERATIONS,
    pPassProbability: pPass / ITERATIONS,
    iterations: ITERATIONS,
  };
}
