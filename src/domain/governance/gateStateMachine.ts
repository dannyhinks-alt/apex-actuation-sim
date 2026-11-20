/** 6-Gate lifecycle: Gate 0 Mandate → Gate 5 Implement & Prove. */
export type GateId = 0 | 1 | 2 | 3 | 4 | 5;
export type ExitStatus = 'Green' | 'Amber' | 'Red';

/** Engineering Change Request constants (v3.5). */
export const ECR_COST_GBP = 15_000;
export const ECR_SCHEDULE_SLIP_WEEKS = 1;
export const MAX_ECRS = 3;

export interface GateExitCriteria {
  gateId: GateId;
  label: string;
  sqCriteria: string;
  cCriteria: string;
  dCriteria: string;
  pCriteria: string;
}

export interface GateExitResult {
  gateId: GateId;
  status: ExitStatus;
  amberActions: string[];
  redBlockReasons: string[];
  rebaselinePenaltyWeeks: number;
  /** Gate Exit Readiness 0–100%: 100 − red×25 − amber×8, clamped [0,100]. */
  readinessPct: number;
  /** Number of open amber actions (drives +5% duration CV risk per action in Gate 5 MC). */
  openActionCount: number;
}

export const GATE_DEFINITIONS: GateExitCriteria[] = [
  {
    gateId: 0,
    label: 'Mandate',
    sqCriteria: 'Problem statement signed, baseline RFT documented',
    cCriteria: 'CapEx envelope approved by Board',
    dCriteria: 'Go-Live date committed',
    pCriteria: 'Sponsor named, team charters issued',
  },
  {
    gateId: 1,
    label: 'Define',
    sqCriteria: 'OEE root-cause verified ≥ 70.91%, RFT waterfall baselined at 87.56%',
    cCriteria: 'Business case NPV positive at 10% discount',
    dCriteria: 'CPM network drafted, critical path identified',
    pCriteria: 'Yamazumi baseline complete, LBR measured',
  },
  {
    gateId: 2,
    label: 'Evaluate',
    sqCriteria: 'Target state OEE ≥ 85%, RFT ≥ 99.0% demonstrated on paper',
    cCriteria: 'CapEx committed ≤ approved budget; civil & extraction prep funded',
    dCriteria: 'Civil scope and monument constraints confirmed',
    pCriteria: 'All stations ≤ customer takt, LBR ≥ 85%',
  },
  {
    gateId: 3,
    label: 'Concept',
    sqCriteria: 'PPAP plan approved, traceability architecture designed',
    cCriteria: 'Purchase orders raised, spend to plan ± 5%',
    dCriteria: 'Cell layout concept frozen; spaghetti travel ≤ 26m',
    pCriteria: 'Cross-training plan approved',
  },
  {
    gateId: 4,
    label: 'Detail',
    sqCriteria: 'First-off parts inspected, Cpk ≥ 1.33',
    cCriteria: 'Remaining CapEx reconciled',
    dCriteria: 'Go-Live date reconfirmed within ± 2 weeks',
    pCriteria: 'Operators signed off on new cell procedures; standard work frozen',
  },
  {
    gateId: 5,
    label: 'Implement & Prove',
    sqCriteria: 'Rolled RFT ≥ 99.0% over 4-week run, traceability live',
    cCriteria: 'Payback trajectory confirmed ≤ 15 months',
    dCriteria: 'Factory lead time ≤ 5 days (Little\'s Law verified)',
    pCriteria: 'LBR ≥ 85%, all operators cross-trained, ergonomic ≥ 70%',
  },
];

/** Rebaseline penalties per gate (weeks added to programme). */
const REBASELINE_PENALTIES: Record<GateId, number> = {
  0: 1, 1: 2, 2: 3, 3: 4, 4: 2, 5: 1,
};

export interface GateAssessmentInput {
  gateId: GateId;
  oee: number;
  rolledRFT: number;
  capexCommittedGBP: number;
  capexBudgetGBP: number;
  npv: number;
  paybackMonths: number;
  leadTimeDays: number;
  lbr: number;
  allStationsWithinTakt: boolean;
  projectDurationWeeks: number;
  targetGoLiveWeeks: number;
  /** G0: service buffer percentage applied to demand (0–15%). */
  serviceBufferPct?: number;
  /** G1: 5S standardisation percentage (0–100%); <80% triggers Amber. */
  standardisationPct?: number;
  /** G2: civil/power/extraction preparation spend in £. */
  civilPrepGBP?: number;
  /** G2: minimum civil prep required for this scenario (standard machines). */
  civilPrepMinGBP?: number;
  /** G2: minimum civil prep required for heavy/large machines (GER or JPN). */
  civilPrepMinHeavyGBP?: number;
  /** G2: true if selected machine is GER or JPN provenance (heavy foundation). */
  machineProvenanceIsHeavy?: boolean;
  /** G3: spaghetti travel distance in metres; must be ≤ 26m for Concept Freeze. */
  spaghettiDistanceM?: number;
}

/** Assess gate exit status — returns Green / Amber / Red with actions. */
export function assessGateExit(input: GateAssessmentInput): GateExitResult {
  const amber: string[] = [];
  const red: string[] = [];

  // Cost checks (all gates)
  if (input.capexCommittedGBP > input.capexBudgetGBP) {
    red.push(`CapEx overrun: £${(input.capexCommittedGBP - input.capexBudgetGBP).toLocaleString('en-GB')} over budget`);
  }
  if (input.npv < 0) {
    red.push('Negative 36-month NPV — business case fails');
  }
  if (input.paybackMonths > 15) {
    amber.push(`Payback ${input.paybackMonths.toFixed(1)} months exceeds 15-month target`);
  }

  // G0 — Mandate: service buffer check
  if (input.gateId >= 0 && input.serviceBufferPct !== undefined && input.serviceBufferPct > 10) {
    amber.push(`Service buffer ${input.serviceBufferPct.toFixed(0)}% exceeds 10% — elevated demand risk`);
  }

  // G1 — Define: standardisation check
  if (input.gateId >= 1 && input.standardisationPct !== undefined && input.standardisationPct < 80) {
    amber.push(`5S Standardisation ${input.standardisationPct.toFixed(0)}% below 80% — shadow boards absent`);
  }

  // G2 — Evaluate: quality, delivery, people, civil prep
  if (input.gateId >= 2) {
    if (input.rolledRFT < 0.990) {
      red.push(`Rolled RFT ${(input.rolledRFT * 100).toFixed(2)}% below Gate ${input.gateId} target ≥ 99.0%`);
    }
    if (input.oee < 0.85) {
      amber.push(`OEE ${(input.oee * 100).toFixed(2)}% below target 85%`);
    }
    if (input.leadTimeDays > 5.0) {
      amber.push(`Factory lead time ${input.leadTimeDays.toFixed(1)} days exceeds 5.0-day target`);
    }
    if (input.projectDurationWeeks > input.targetGoLiveWeeks) {
      amber.push(`CPM forecast ${input.projectDurationWeeks}w vs target ${input.targetGoLiveWeeks}w`);
    }
    if (!input.allStationsWithinTakt) {
      red.push('One or more stations exceed customer takt');
    }
    if (input.lbr < 0.85) {
      amber.push(`LBR ${(input.lbr * 100).toFixed(1)}% below 85.0% target`);
    }

    // Civil prep check for Scenario C
    if (input.civilPrepMinGBP !== undefined) {
      const isHeavy = input.machineProvenanceIsHeavy ?? false;
      const required = isHeavy ? (input.civilPrepMinHeavyGBP ?? input.civilPrepMinGBP) : input.civilPrepMinGBP;
      const funded = input.civilPrepGBP ?? 0;
      if (funded < required) {
        red.push(`Civil/extraction prep £${funded.toLocaleString('en-GB')} insufficient — Scenario C requires ≥ £${required.toLocaleString('en-GB')}`);
      }
    }
  }

  // G3 — Concept: spaghetti distance check
  if (input.gateId >= 3 && input.spaghettiDistanceM !== undefined && input.spaghettiDistanceM > 26) {
    amber.push(`Spaghetti travel ${input.spaghettiDistanceM.toFixed(1)}m exceeds 26m Concept Freeze target — relocate assets`);
  }

  let status: ExitStatus;
  if (red.length > 0) {
    status = 'Red';
  } else if (amber.length > 0) {
    status = 'Amber';
  } else {
    status = 'Green';
  }

  const readinessPct = Math.max(0, Math.min(100, 100 - red.length * 25 - amber.length * 8));

  return {
    gateId: input.gateId,
    status,
    amberActions: amber,
    redBlockReasons: red,
    rebaselinePenaltyWeeks: status !== 'Green' ? REBASELINE_PENALTIES[input.gateId] : 0,
    readinessPct,
    openActionCount: amber.length,
  };
}
