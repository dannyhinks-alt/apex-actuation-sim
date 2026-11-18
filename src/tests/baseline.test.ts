import { describe, it, expect } from 'vitest';
import { BASELINE_DEMAND, CALENDAR, CELL_TAKT } from '../domain/baseline/plantConstants';
import { YAMAZUMI_ELEMENTS, BASELINE_STATION_SPLIT, TOTAL_MANUAL_CONTENT_MIN } from '../domain/baseline/yamazumiElements';
import { SCENARIOS } from '../domain/baseline/scenarios';
import { getAssumption } from '../domain/baseline/assumptionsRegister';

describe('Baseline constants', () => {
  it('calendar gives 4800 scheduled minutes/week', () => {
    expect(CALENDAR.minutesPerWeek).toBe(4_800);
  });

  it('baseline demand totals 100 units/week', () => {
    expect(BASELINE_DEMAND.totalUnitsPerWeek).toBe(100);
  });

  it('cell takt standard is 4.30 min', () => {
    expect(CELL_TAKT.standard).toBe(4.30);
  });

  it('cell takt ramp-up is 3.40 min', () => {
    expect(CELL_TAKT.rampUp).toBe(3.40);
  });

  it('eight Yamazumi elements defined', () => {
    expect(YAMAZUMI_ELEMENTS).toHaveLength(8);
  });

  it('E4 is automatic', () => {
    const e4 = YAMAZUMI_ELEMENTS.find(e => e.id === 'E4');
    expect(e4?.automatic).toBe(true);
  });

  it('E6 eliminated by CellFurniture', () => {
    const e6 = YAMAZUMI_ELEMENTS.find(e => e.id === 'E6');
    expect(e6?.eliminatedBy).toBe('CellFurniture');
  });

  it('E7 eliminated by MES', () => {
    const e7 = YAMAZUMI_ELEMENTS.find(e => e.id === 'E7');
    expect(e7?.eliminatedBy).toBe('MES');
  });

  it('baseline station split sums to 4.70 min', () => {
    const sum = BASELINE_STATION_SPLIT.reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(4.70, 2);
  });

  it('total manual content equals 3.40 min (excl. E4)', () => {
    expect(TOTAL_MANUAL_CONTENT_MIN).toBeCloseTo(3.40, 2);
  });

  it('Scenario A CapEx budget is £800k', () => {
    expect(SCENARIOS.A.capexBudgetGBP).toBe(800_000);
  });

  it('Scenario C CapEx budget is £740k', () => {
    expect(SCENARIOS.C.capexBudgetGBP).toBe(740_000);
  });

  it('Scenario A weekly demand is 125', () => {
    expect(SCENARIOS.A.weeklyDemand).toBe(125);
  });

  it('Assumption AR-001 baseline RFT is 0.8756', () => {
    const a = getAssumption('AR-001');
    expect(Number(a.baselineValue)).toBeCloseTo(0.8756, 4);
  });
});
