import { describe, it, expect } from 'vitest';
import { assessGateExit } from '../domain/governance/gateStateMachine';
import { encodeFingerprint, areDuplicateDecisions } from '../domain/governance/decisionFingerprint';
import { runMonteCarlo } from '../domain/governance/monteCarlo';

const GOOD_INPUT = {
  gateId: 2 as const,
  oee: 0.88,
  rolledRFT: 0.996,
  capexCommittedGBP: 645_000,
  capexBudgetGBP: 800_000,
  npv: 50_000,
  paybackMonths: 11,
  leadTimeDays: 4.5,
  lbr: 0.87,
  allStationsWithinTakt: true,
  projectDurationWeeks: 20,
  targetGoLiveWeeks: 24,
};

describe('gateStateMachine', () => {
  it('all SQCDP criteria met → Green', () => {
    const r = assessGateExit(GOOD_INPUT);
    expect(r.status).toBe('Green');
    expect(r.rebaselinePenaltyWeeks).toBe(0);
  });

  it('rolled RFT below 99% at Gate 2 → Red', () => {
    const r = assessGateExit({ ...GOOD_INPUT, rolledRFT: 0.985 });
    expect(r.status).toBe('Red');
    expect(r.redBlockReasons.length).toBeGreaterThan(0);
  });

  it('station exceeds takt → Red', () => {
    const r = assessGateExit({ ...GOOD_INPUT, allStationsWithinTakt: false });
    expect(r.status).toBe('Red');
  });

  it('negative NPV → Red', () => {
    const r = assessGateExit({ ...GOOD_INPUT, npv: -10_000 });
    expect(r.status).toBe('Red');
  });

  it('LBR below 85% → Amber', () => {
    const r = assessGateExit({ ...GOOD_INPUT, lbr: 0.83 });
    expect(r.status).toBe('Amber');
    expect(r.amberActions.length).toBeGreaterThan(0);
  });

  it('Gate 0 ignores quality/people checks', () => {
    const r = assessGateExit({ ...GOOD_INPUT, gateId: 0 as const, rolledRFT: 0.80, allStationsWithinTakt: false });
    // Gate 0 only checks cost/NPV
    expect(r.status).toBe('Green');
  });
});

describe('decisionFingerprint', () => {
  it('same decisions produce identical fingerprint', () => {
    const state = { scenarioId: 'A', charterId: 1, machineId: 'UKR', cellFurniture: true, pokaYoke: false, fullMES: true, automatedTestRig: false, fatExpediting: false, operatorCount: 3, nightShiftActive: false, shadowBoardAbsent: false };
    expect(encodeFingerprint(state)).toBe(encodeFingerprint({ ...state }));
  });

  it('different decisions produce different fingerprints', () => {
    const a = encodeFingerprint({ scenarioId: 'A', charterId: 1, machineId: 'UKR', cellFurniture: true, pokaYoke: false, fullMES: true, automatedTestRig: false, fatExpediting: false, operatorCount: 3, nightShiftActive: false, shadowBoardAbsent: false });
    const b = encodeFingerprint({ scenarioId: 'A', charterId: 1, machineId: 'FRS', cellFurniture: true, pokaYoke: false, fullMES: true, automatedTestRig: false, fatExpediting: false, operatorCount: 3, nightShiftActive: false, shadowBoardAbsent: false });
    expect(areDuplicateDecisions(a, b)).toBe(false);
  });
});

describe('monteCarlo', () => {
  it('returns 500 iterations', () => {
    const r = runMonteCarlo({ baseDurationWeeks: 20, durationCv: 0.1, baseRolledRFT: 0.996, baseOEE: 0.88, redGateCount: 0 });
    expect(r.iterations).toBe(500);
  });

  it('P10 <= P50 <= P90', () => {
    const r = runMonteCarlo({ baseDurationWeeks: 20, durationCv: 0.1, baseRolledRFT: 0.996, baseOEE: 0.88, redGateCount: 0 });
    expect(r.p10Weeks).toBeLessThanOrEqual(r.p50Weeks);
    expect(r.p50Weeks).toBeLessThanOrEqual(r.p90Weeks);
  });

  it('same seed gives identical results (determinism)', () => {
    const params = { baseDurationWeeks: 20, durationCv: 0.1, baseRolledRFT: 0.996, baseOEE: 0.88, redGateCount: 0, seed: 42 };
    const r1 = runMonteCarlo(params);
    const r2 = runMonteCarlo(params);
    expect(r1.p50Weeks).toBe(r2.p50Weeks);
    expect(r1.sqPassProbability).toBe(r2.sqPassProbability);
  });

  it('P50 close to base duration', () => {
    const r = runMonteCarlo({ baseDurationWeeks: 20, durationCv: 0.1, baseRolledRFT: 0.996, baseOEE: 0.88, redGateCount: 0 });
    expect(r.p50Weeks).toBeGreaterThan(16);
    expect(r.p50Weeks).toBeLessThan(26);
  });

  it('high RFT/OEE gives high SQ pass probability', () => {
    const r = runMonteCarlo({ baseDurationWeeks: 20, durationCv: 0.05, baseRolledRFT: 0.999, baseOEE: 0.95, redGateCount: 0 });
    expect(r.sqPassProbability).toBeGreaterThan(0.7);
  });

  it('red gates increase P90 duration variance', () => {
    const noRed = runMonteCarlo({ baseDurationWeeks: 20, durationCv: 0.1, baseRolledRFT: 0.996, baseOEE: 0.88, redGateCount: 0, seed: 1 });
    const withRed = runMonteCarlo({ baseDurationWeeks: 20, durationCv: 0.1, baseRolledRFT: 0.996, baseOEE: 0.88, redGateCount: 3, seed: 1 });
    expect(withRed.p90Weeks).toBeGreaterThanOrEqual(noRed.p90Weeks);
  });
});
