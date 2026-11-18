/** Four replayable facilitator scenarios as defined in SPEC v3.4. */
export type ScenarioId = 'A' | 'B' | 'C' | 'D';

export interface Scenario {
  id: ScenarioId;
  title: string;
  capexBudgetGBP: number;
  goLiveWeeks: number;
  cellTaktMin: number;
  weeklyDemand: number;
  runners: number;
  repeaters: number;
  strangers: number;
  /** Scenario B quality degradation factors applied before investment. */
  qualityDegradation?: {
    fixtureWear: number;
    paperRevisionErrors: number;
    uncalibratedGauges: number;
  };
  civilScopeGBP?: number;
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  A: {
    id: 'A',
    title: 'The Margin & Mix Squeeze',
    capexBudgetGBP: 800_000,
    goLiveWeeks: 24,
    cellTaktMin: 4.30,
    weeklyDemand: 125,
    runners: 70.9,
    repeaters: 51.3,
    strangers: 2.8,
  },
  B: {
    id: 'B',
    title: 'The Quality & Rework Crisis',
    capexBudgetGBP: 800_000,
    goLiveWeeks: 24,
    cellTaktMin: 4.30,
    weeklyDemand: 100,
    runners: 60,
    repeaters: 38,
    strangers: 2,
    qualityDegradation: {
      fixtureWear: 0.915,
      paperRevisionErrors: 0.970,
      uncalibratedGauges: 0.963,
    },
  },
  C: {
    id: 'C',
    title: 'The Footprint Consolidation',
    capexBudgetGBP: 740_000,
    goLiveWeeks: 22,
    cellTaktMin: 4.30,
    weeklyDemand: 100,
    runners: 60,
    repeaters: 38,
    strangers: 2,
    civilScopeGBP: 45_000,
  },
  D: {
    id: 'D',
    title: 'The Takt Ramp-Up',
    capexBudgetGBP: 800_000,
    goLiveWeeks: 24,
    cellTaktMin: 3.40,
    weeklyDemand: 100,
    runners: 60,
    repeaters: 38,
    strangers: 2,
  },
};
