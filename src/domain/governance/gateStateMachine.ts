/** 6-Gate lifecycle: Gate 0 Mandate → Gate 5 Implement & Prove. */
export type GateId = 0 | 1 | 2 | 3 | 4 | 5;
export type ExitStatus = 'Green' | 'Amber' | 'Red';

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
    label: 'Investigate',
    sqCriteria: 'OEE root-cause verified ≥ 70.91%, RFT waterfall baselined at 87.56%',
    cCriteria: 'Business case NPV positive at 10% discount',
    dCriteria: 'CPM network drafted, critical path identified',
    pCriteria: 'Yamazumi baseline complete, LBR measured',
  },
  {
    gateId: 2,
    label: 'Design',
    sqCriteria: 'Target state OEE ≥ 85%, RFT ≥ 99.0% demonstrated on paper',
    cCriteria: 'CapEx committed ≤ approved budget',
    dCriteria: 'Civil scope and monument constraints confirmed',
    pCriteria: 'All stations ≤ customer takt, LBR ≥ 85%',
  },
  {
    gateId: 3,
    label: 'Develop',
    sqCriteria: 'PPAP plan approved, traceability architecture designed',
    cCriteria: 'Purchase orders raised, spend to plan ± 5%',
    dCriteria: 'Supplier FAT schedule confirmed',
    pCriteria: 'Cross-training plan approved',
  },
  {
    gateId: 4,
    label: 'Trial',
    sqCriteria: 'First-off parts inspected, Cpk ≥ 1.33',
    cCriteria: 'Remaining CapEx reconciled',
    dCriteria: 'Go-Live date reconfirmed within ± 2 weeks',
    pCriteria: 'Operators signed off on new cell procedures',
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
}

/** Assess gate exit status — returns Green / Amber / Red with actions. */
export function assessGateExit(input: GateAssessmentInput): GateExitResult {
  const amber: string[] = [];
  const red: string[] = [];

  // Cost checks
  if (input.capexCommittedGBP > input.capexBudgetGBP) {
    red.push(`CapEx overrun: £${(input.capexCommittedGBP - input.capexBudgetGBP).toLocaleString('en-GB')} over budget`);
  }
  if (input.npv < 0) {
    red.push('Negative 36-month NPV — business case fails');
  }
  if (input.paybackMonths > 15) {
    amber.push(`Payback ${input.paybackMonths.toFixed(1)} months exceeds 15-month target`);
  }

  // Quality checks (Gate ≥ 2)
  if (input.gateId >= 2) {
    if (input.rolledRFT < 0.990) {
      red.push(`Rolled RFT ${(input.rolledRFT * 100).toFixed(2)}% below Gate ${input.gateId} target ≥ 99.0%`);
    }
    if (input.oee < 0.85) {
      amber.push(`OEE ${(input.oee * 100).toFixed(2)}% below target 85%`);
    }
  }

  // Delivery checks (Gate ≥ 2)
  if (input.gateId >= 2) {
    if (input.leadTimeDays > 5.0) {
      amber.push(`Factory lead time ${input.leadTimeDays.toFixed(1)} days exceeds 5.0-day target`);
    }
    if (input.projectDurationWeeks > input.targetGoLiveWeeks) {
      amber.push(`CPM forecast ${input.projectDurationWeeks}w vs target ${input.targetGoLiveWeeks}w`);
    }
  }

  // People checks (Gate ≥ 2)
  if (input.gateId >= 2) {
    if (!input.allStationsWithinTakt) {
      red.push('One or more stations exceed customer takt');
    }
    if (input.lbr < 0.85) {
      amber.push(`LBR ${(input.lbr * 100).toFixed(1)}% below 85.0% target`);
    }
  }

  let status: ExitStatus;
  if (red.length > 0) {
    status = 'Red';
  } else if (amber.length > 0) {
    status = 'Amber';
  } else {
    status = 'Green';
  }

  return {
    gateId: input.gateId,
    status,
    amberActions: amber,
    redBlockReasons: red,
    rebaselinePenaltyWeeks: status !== 'Green' ? REBASELINE_PENALTIES[input.gateId] : 0,
  };
}
