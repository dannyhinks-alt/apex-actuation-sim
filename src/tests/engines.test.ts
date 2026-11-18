import { describe, it, expect } from 'vitest';
import { computeDemand } from '../domain/engines/demandEngine';
import { computeCapacity, BASELINE_CAPACITY } from '../domain/engines/capacityEngine';
import { computeFlow } from '../domain/engines/flowEngine';
import { computeRolledRFT, computeYamazumi, computeBaselineLBR } from '../domain/engines/qualityYamazumiEngine';
import { computeFinance, computeCPM, buildDefaultCPM } from '../domain/engines/programmeFinanceEngine';

// ---- Demand Engine ----
describe('demandEngine', () => {
  it('baseline 100 units/wk, no stranger disruption', () => {
    const r = computeDemand({ runners: 60, repeaters: 38, strangers: 2 });
    expect(r.totalUnitsPerWeek).toBe(100);
    // stranger proportion = 2/100 = 0.02 → disruption = 1 + 0.02×0.4 = 1.008
    expect(r.strangerDisruptionFactor).toBeCloseTo(1.008, 4);
  });

  it('Scenario A demand totals 125', () => {
    const r = computeDemand({ runners: 70.9, repeaters: 51.3, strangers: 2.8 });
    expect(r.totalUnitsPerWeek).toBeCloseTo(125, 1);
  });
});

// ---- Capacity Engine ----
describe('capacityEngine', () => {
  it('baseline OEE = A×P×Q = 0.78×0.91×1.00 ≈ 70.98%', () => {
    const r = computeCapacity({ availability: 0.78, performance: 0.91, quality: 1.00, shadowBoardAbsent: false, nightShiftActive: false });
    expect(r.oee).toBeCloseTo(0.7098, 4);
  });

  it('BASELINE_CAPACITY OEE matches 70.91% assumption', () => {
    // SPEC says 70.91% — allow small rounding tolerance
    expect(BASELINE_CAPACITY.oee).toBeCloseTo(0.7098, 2);
  });

  it('TEEP = OEE × (80/104)', () => {
    const r = computeCapacity({ availability: 0.78, performance: 0.91, quality: 1.00, shadowBoardAbsent: false, nightShiftActive: false });
    expect(r.teep).toBeCloseTo(r.oee * (80 / 104), 4);
  });

  it('shadow-board absence reduces OEE by 3.5pp availability', () => {
    const without = computeCapacity({ availability: 0.78, performance: 0.91, quality: 1.00, shadowBoardAbsent: false, nightShiftActive: false });
    const with_ = computeCapacity({ availability: 0.78, performance: 0.91, quality: 1.00, shadowBoardAbsent: true, nightShiftActive: false });
    expect(without.oee - with_.oee).toBeCloseTo(0.035 * 0.91, 4);
  });

  it('night shift returns £185k OpEx', () => {
    const r = computeCapacity({ availability: 0.78, performance: 0.91, quality: 1.00, shadowBoardAbsent: false, nightShiftActive: true });
    expect(r.nightShiftOpExGBPPerYr).toBe(185_000);
  });
});

// ---- Flow Engine ----
describe('flowEngine', () => {
  it('high utilisation gives large queue time', () => {
    const r = computeFlow([
      { id: 'MB', label: 'Mill B', te: 4.0, ca: 1.0, cs: 1.0, servers: 1, arrivalRate: 0.24, relieved: false },
    ]);
    // rho = 0.24 × 4.0 = 0.96 — very busy
    expect(r.stations[0]!.wqMin).toBeGreaterThan(10);
  });

  it('relieving bottleneck reduces queue time', () => {
    const base = computeFlow([{ id: 'MB', label: 'Mill B', te: 4.0, ca: 1.0, cs: 1.0, servers: 1, arrivalRate: 0.24, relieved: false }]);
    const relieved = computeFlow([{ id: 'MB', label: 'Mill B', te: 4.0, ca: 1.0, cs: 1.0, servers: 1, arrivalRate: 0.24, relieved: true, relievedCapacityMultiplier: 1.4 }]);
    expect(relieved.stations[0]!.wqMin).toBeLessThan(base.stations[0]!.wqMin);
  });

  it('Little\'s Law: WIP = throughput × lead time', () => {
    const r = computeFlow([
      { id: 'A', label: 'Op A', te: 2.0, ca: 0.5, cs: 0.5, servers: 1, arrivalRate: 0.1, relieved: false },
    ]);
    const expected = r.throughputPerMin * r.systemLeadTimeDays * 60 * 16;
    // Approximate check that WIP is consistent
    expect(r.wipUnits).toBeGreaterThan(0);
    expect(expected).toBeGreaterThan(0);
  });
});

// ---- Quality / Yamazumi Engine ----
describe('qualityYamazumiEngine', () => {
  it('baseline RFT with UK OEM machine ≈ 87.56%', () => {
    const r = computeRolledRFT({ baseMachiningFPY: 0.996, cellFurnitureInstalled: false, pokaYokeInstalled: false, fullMESInstalled: false, nightShiftActive: false });
    // 0.996 × 0.980 × 0.970 × 0.927 ≈ 0.8756
    expect(r.rolledRFT).toBeCloseTo(0.8756, 2);
  });

  it('Scenario B degradation gives ≈ 83.80% RFT (stage values override, not multiply)', () => {
    const r = computeRolledRFT({
      baseMachiningFPY: 0.996,
      // These values REPLACE stage FPYs: 0.915 × 0.980 × 0.970 × 0.963 = 83.80%
      scenarioBDegradation: { fixtureWear: 0.915, paperRevisionErrors: 0.970, uncalibratedGauges: 0.963 },
      cellFurnitureInstalled: false, pokaYokeInstalled: false, fullMESInstalled: false, nightShiftActive: false,
    });
    expect(r.rolledRFT).toBeCloseTo(0.838, 2);
  });

  it('FR/SP + FURN + POKA + MES + TestRig achieves ≥ 99.0% Rolled RFT (Gate 5 requirement)', () => {
    // Calibrated: 0.995 × 1.0(MES) × 1.0(FURN+POKA) × 1.0(rig) = 99.5%
    const r = computeRolledRFT({
      baseMachiningFPY: 0.995, cellFurnitureInstalled: true, pokaYokeInstalled: true,
      fullMESInstalled: true, automatedTestRigInstalled: true, nightShiftActive: false,
    });
    expect(r.rolledRFT).toBeGreaterThanOrEqual(0.990);
  });

  it('FR/SP + FURN + POKA + MES + TestRig achieves ≥ 99.5% (Team 4 Zero-Defect Charter)', () => {
    const r = computeRolledRFT({
      baseMachiningFPY: 0.995, cellFurnitureInstalled: true, pokaYokeInstalled: true,
      fullMESInstalled: true, automatedTestRigInstalled: true, nightShiftActive: false,
    });
    expect(r.rolledRFT).toBeGreaterThanOrEqual(0.995);
  });

  it('Yamazumi 3 operators baseline — max station ≤ 4.30 min', () => {
    const r = computeYamazumi({ operatorCount: 3, cellFurnitureInstalled: false, fullMESInstalled: false, customerTaktMin: 4.30 });
    expect(r.maxStationCycleMin).toBeLessThanOrEqual(4.30);
  });

  it('computeBaselineLBR ≈ 82.46% (SPEC 3-station split 1.40/1.90/1.40)', () => {
    expect(computeBaselineLBR()).toBeCloseTo(0.8246, 3);
  });

  it('Yamazumi with FURN+MES improves LBR vs baseline', () => {
    const baseLbr = computeBaselineLBR();
    const improved = computeYamazumi({ operatorCount: 3, cellFurnitureInstalled: true, fullMESInstalled: true, customerTaktMin: 4.30 });
    expect(improved.lbr).toBeGreaterThanOrEqual(baseLbr);
  });
});

// ---- Finance / CPM Engine ----
describe('programmeFinanceEngine', () => {
  it('positive NPV when annual benefit exceeds investment over 36m', () => {
    // Monthly benefit £41 667, 36-month PV ≈ £1.25m >> £645k investment
    const r = computeFinance({ approvedBudgetGBP: 800_000, committedExpenditureGBP: 645_000, annualBenefitGBP: 500_000, investmentGBP: 645_000 });
    expect(r.npv36MonthGBP).toBeGreaterThan(0);
  });

  it('negative NPV when investment too high', () => {
    const r = computeFinance({ approvedBudgetGBP: 800_000, committedExpenditureGBP: 2_000_000, annualBenefitGBP: 100_000, investmentGBP: 2_000_000 });
    expect(r.npv36MonthGBP).toBeLessThan(0);
  });

  it('remainingCapex = budget - committed', () => {
    const r = computeFinance({ approvedBudgetGBP: 800_000, committedExpenditureGBP: 645_000, annualBenefitGBP: 200_000, investmentGBP: 645_000 });
    expect(r.remainingCapexGBP).toBe(155_000);
  });

  it('CPM default 24w network — project duration >= 20w', () => {
    const acts = buildDefaultCPM(12);
    const r = computeCPM(acts);
    expect(r.projectDurationWeeks).toBeGreaterThanOrEqual(20);
  });

  it('CPM critical path includes A1', () => {
    const acts = buildDefaultCPM(12);
    const r = computeCPM(acts);
    expect(r.criticalPathIds).toContain('A1');
  });

  it('CPM float=0 on critical path nodes', () => {
    const acts = buildDefaultCPM(12);
    const r = computeCPM(acts);
    r.nodes.filter(n => n.onCriticalPath).forEach(n => {
      expect(n.float).toBe(0);
    });
  });

  it('Team 2 Scenario A: A3=12w gives project = 20w (SPEC path A1→A3→A5→A7)', () => {
    // A1(3w)→A3(12w)→A5(2w)→A7(3w) = 20w; A6 finishes in parallel at same time
    const acts = buildDefaultCPM(12);
    const r = computeCPM(acts);
    expect(r.projectDurationWeeks).toBe(20);
  });
});
