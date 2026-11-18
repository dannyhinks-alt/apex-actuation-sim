/**
 * Engineering Assumptions Register — single source of truth for all
 * calibrated baseline figures referenced in engines and UI.
 * Every entry has a traceability reference to SPEC v3.4.
 */
export interface Assumption {
  id: string;
  parameter: string;
  baselineValue: number | string;
  unit: string;
  specRef: string;
  rationale: string;
}

export const ASSUMPTIONS: Assumption[] = [
  {
    id: 'AR-001',
    parameter: 'Rolled Factory RFT (baseline)',
    baselineValue: 0.8756,
    unit: 'fraction',
    specRef: 'SPEC v3.4 §1',
    rationale: 'Four-stage composite: 0.996 × 0.980 × 0.970 × 0.927 = 0.8756',
  },
  {
    id: 'AR-002',
    parameter: 'OEE (baseline Mill B)',
    baselineValue: 0.7091,
    unit: 'fraction',
    specRef: 'SPEC v3.4 §2 Engine 2',
    rationale: 'A=0.78 × P=0.91 × Q=1.00 = 0.7098 ≈ 70.91%',
  },
  {
    id: 'AR-003',
    parameter: 'TEEP (baseline)',
    baselineValue: 0.5455,
    unit: 'fraction',
    specRef: 'SPEC v3.4 §2 Engine 2',
    rationale: 'OEE × (80h scheduled / 104h calendar) = 0.7091 × 0.7692 = 0.5455',
  },
  {
    id: 'AR-004',
    parameter: 'Internal LBR (baseline)',
    baselineValue: 0.8246,
    unit: 'fraction',
    specRef: 'SPEC v3.4 §2 Engine 4',
    rationale: 'Sum manual content / (stations × max station time) across 3-station split 1.40/1.90/1.40',
  },
  {
    id: 'AR-005',
    parameter: 'CapEx budget (Scenarios A/B/D)',
    baselineValue: 800_000,
    unit: 'GBP',
    specRef: 'SPEC v3.4 §1',
    rationale: 'Board-approved capital envelope for Scenarios A, B, D.',
  },
  {
    id: 'AR-006',
    parameter: 'CapEx budget (Scenario C)',
    baselineValue: 740_000,
    unit: 'GBP',
    specRef: 'SPEC v3.4 §1',
    rationale: 'Reduced envelope for footprint consolidation scenario.',
  },
  {
    id: 'AR-007',
    parameter: 'Customer takt (standard)',
    baselineValue: 4.30,
    unit: 'min/unit',
    specRef: 'SPEC v3.4 §1',
    rationale: 'Available cell time / demand — Scenarios A/B/C.',
  },
  {
    id: 'AR-008',
    parameter: 'Customer takt (ramp-up)',
    baselineValue: 3.40,
    unit: 'min/unit',
    specRef: 'SPEC v3.4 §1 Scenario D',
    rationale: 'Tightened takt requiring E6/E7 waste removal.',
  },
  {
    id: 'AR-009',
    parameter: 'Shadow-board OEE availability penalty',
    baselineValue: 0.035,
    unit: 'fraction',
    specRef: 'SPEC v3.4 §2 Engine 2',
    rationale: '-16 min/shift lost to tool search = -3.5% availability.',
  },
  {
    id: 'AR-010',
    parameter: 'Night-shift OpEx penalty',
    baselineValue: 185_000,
    unit: 'GBP/yr',
    specRef: 'SPEC v3.4 §2 Engine 2',
    rationale: '+£185k/yr labour + -1.2% quality variance for 3rd night shift.',
  },
  {
    id: 'AR-011',
    parameter: 'NPV discount rate',
    baselineValue: 0.10,
    unit: 'fraction/yr',
    specRef: 'SPEC v3.4 §2 Engine 5',
    rationale: '10% WACC per Board treasury policy.',
  },
  {
    id: 'AR-012',
    parameter: 'NPV horizon',
    baselineValue: 36,
    unit: 'months',
    specRef: 'SPEC v3.4 §2 Engine 5',
    rationale: '3-year programme horizon.',
  },
];

/** Look up a single assumption by ID (throws if not found). */
export function getAssumption(id: string): Assumption {
  const a = ASSUMPTIONS.find(x => x.id === id);
  if (!a) throw new Error(`Assumption ${id} not found in register`);
  return a;
}
