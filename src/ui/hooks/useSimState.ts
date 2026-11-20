import { useState, useMemo } from 'react';
import { ScenarioId, SCENARIOS } from '../../domain/baseline/scenarios';
import { CharterId } from '../../domain/baseline/charters';
import { computeDemand } from '../../domain/engines/demandEngine';
import { computeCapacity } from '../../domain/engines/capacityEngine';
import { computeRolledRFT, computeYamazumi, computeBaselineLBR } from '../../domain/engines/qualityYamazumiEngine';
import { computeFinance, computeCPM, buildDefaultCPM } from '../../domain/engines/programmeFinanceEngine';
import { computeFlow } from '../../domain/engines/flowEngine';
import { assessGateExit, GateId, ECR_COST_GBP, ECR_SCHEDULE_SLIP_WEEKS, MAX_ECRS } from '../../domain/governance/gateStateMachine';
import { encodeFingerprint } from '../../domain/governance/decisionFingerprint';
import { runMonteCarlo } from '../../domain/governance/monteCarlo';
import { MACHINE_OPTIONS, ANCILLARY_PACKAGES, GATE_COSTS } from '../../domain/baseline/charters';
import { MILL_B } from '../../domain/baseline/plantConstants';

/** Position of a movable bay asset (SVG coordinate space, 240×180 → 30m×20m). */
export interface BayPosition {
  id: string;
  x: number;
  y: number;
}

export interface SimDecisions {
  scenarioId: ScenarioId;
  charterId: CharterId;
  machineId: string;
  cellFurniture: boolean;
  pokaYoke: boolean;
  fullMES: boolean;
  automatedTestRig: boolean;
  fatExpediting: boolean;
  operatorCount: number;
  nightShiftActive: boolean;
  /** Derived from standardisationPct < 80; kept for backward-compat with existing components. */
  shadowBoardAbsent: boolean;
  /** Alias for activeGate; kept for backward-compat. */
  currentGate: GateId;
  useReducedGateCost: boolean;

  // v3.5 gate-specific params
  serviceBufferPct: number;        // G0: 0–15%
  standardisationPct: number;      // G1: 0–100%
  batchTransferSize: number;       // G1: 1–20
  shiftPolicy: 'single' | 'double'; // G1
  civilPrepGBP: number;            // G2: £25k–£80k
  tpmIntervalWeeks: number;        // G2: 1–8 weeks
  bayPositions: BayPosition[];     // G3: movable asset positions
  pfdAllowancePct: number;         // G4: 5–15%
  pokaYokeFixtureGBP: number;      // G4: £0–£15k additional fixture spend
  commissioningBufferWeeks: number; // G5: 0–8 weeks

  // v3.5 gate governance
  activeGate: GateId;
  passedGates: GateId[];
  ecrCount: number;  // 0–3
}

/** Default movable bay positions (excluding HT monument). */
const DEFAULT_BAY_POSITIONS: BayPosition[] = [
  { id: 'cell5ax',  x: 10,  y: 10  },
  { id: 'ucell',    x: 10,  y: 70  },
  { id: 'kitting',  x: 90,  y: 70  },
  { id: 'testrig',  x: 150, y: 10  },
];

const DEFAULT_DECISIONS: SimDecisions = {
  scenarioId: 'A',
  charterId: 1,
  machineId: 'UKR',
  cellFurniture: false,
  pokaYoke: false,
  fullMES: false,
  automatedTestRig: false,
  fatExpediting: false,
  operatorCount: 3,
  nightShiftActive: false,
  shadowBoardAbsent: true,
  currentGate: 0,
  useReducedGateCost: false,
  serviceBufferPct: 0,
  standardisationPct: 60,
  batchTransferSize: 10,
  shiftPolicy: 'single',
  civilPrepGBP: 0,
  tpmIntervalWeeks: 4,
  bayPositions: DEFAULT_BAY_POSITIONS,
  pfdAllowancePct: 10,
  pokaYokeFixtureGBP: 0,
  commissioningBufferWeeks: 2,
  activeGate: 0,
  passedGates: [],
  ecrCount: 0,
};

/** Asset sizes for spaghetti calculation (must match CellLayoutSVG INITIAL_ASSETS). */
const ASSET_DIMS: Record<string, { w: number; h: number }> = {
  cell5ax: { w: 70, h: 50 },
  ucell:   { w: 60, h: 40 },
  kitting: { w: 50, h: 30 },
  testrig: { w: 70, h: 50 },
};

/** Compute spaghetti travel distance (m) from movable bay positions only. */
function computeSpaghettiDistance(positions: BayPosition[]): number {
  const pts = positions.map(p => {
    const dims = ASSET_DIMS[p.id] ?? { w: 60, h: 40 };
    return { x: p.x + dims.w / 2, y: p.y + dims.h / 2 };
  });
  let dist = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    dist += Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
  // SVG 240×180 represents 30m×20m → scale = 30/240 = 0.125 m/px
  return dist * 0.125;
}

export function useSimState() {
  const [decisions, setDecisions] = useState<SimDecisions>(DEFAULT_DECISIONS);

  const computed = useMemo(() => {
    const scenario = SCENARIOS[decisions.scenarioId];
    const machine = MACHINE_OPTIONS.find(m => m.id === decisions.machineId) ?? MACHINE_OPTIONS[0]!;
    const ancillaries = ANCILLARY_PACKAGES.filter(p =>
      (p.cellFurniture && decisions.cellFurniture) ||
      (p.pokaYoke && decisions.pokaYoke) ||
      (p.fullMES && decisions.fullMES) ||
      (p.automatedTestRig && decisions.automatedTestRig) ||
      (p.fatExpediting && decisions.fatExpediting)
    );
    const gateCost = decisions.useReducedGateCost ? GATE_COSTS.gates02Reduced : GATE_COSTS.gates02Standard;
    const ecrCostTotal = decisions.ecrCount * ECR_COST_GBP;
    const ecrScheduleSlip = decisions.ecrCount * ECR_SCHEDULE_SLIP_WEEKS;
    const committed = gateCost
      + machine.costGBP
      + ancillaries.reduce((s, p) => s + p.costGBP, 0)
      + GATE_COSTS.gate5
      + decisions.civilPrepGBP
      + decisions.pokaYokeFixtureGBP
      + ecrCostTotal;

    // shadowBoardAbsent derived from standardisationPct (v3.5)
    const shadowBoardAbsent = decisions.standardisationPct < 80;

    const spaghettiDistanceM = computeSpaghettiDistance(decisions.bayPositions);
    const machineProvenanceIsHeavy = decisions.machineId === 'GER' || decisions.machineId === 'JPN';

    const demand = computeDemand({
      runners: scenario.runners,
      repeaters: scenario.repeaters,
      strangers: scenario.strangers,
    });

    const capacity = computeCapacity({
      availability: MILL_B.baseAvailabilityPct,
      performance: MILL_B.basePerformancePct,
      quality: MILL_B.baseQualityPct,
      shadowBoardAbsent,
      nightShiftActive: decisions.nightShiftActive,
    });

    const rft = computeRolledRFT({
      baseMachiningFPY: machine.baseMachiningFPY ?? 0.996,
      scenarioBDegradation: scenario.qualityDegradation
        ? {
            fixtureWear: scenario.qualityDegradation.fixtureWear,
            paperRevisionErrors: scenario.qualityDegradation.paperRevisionErrors, // v3.5 bug fix
            uncalibratedGauges: scenario.qualityDegradation.uncalibratedGauges,
          }
        : undefined,
      cellFurnitureInstalled: decisions.cellFurniture,
      pokaYokeInstalled: decisions.pokaYoke,
      fullMESInstalled: decisions.fullMES,
      automatedTestRigInstalled: decisions.automatedTestRig,
      nightShiftActive: decisions.nightShiftActive,
    });

    const yamazumi = computeYamazumi({
      operatorCount: decisions.operatorCount,
      cellFurnitureInstalled: decisions.cellFurniture,
      fullMESInstalled: decisions.fullMES,
      customerTaktMin: scenario.cellTaktMin,
    });

    const baselineLBR = computeBaselineLBR();

    const a3Duration = decisions.fatExpediting ? 12 : 16;
    const cpmActivities = buildDefaultCPM(a3Duration);
    const cpm = computeCPM(cpmActivities);
    // Add ECR schedule slip to project duration
    const adjustedDurationWeeks = cpm.projectDurationWeeks + ecrScheduleSlip + decisions.commissioningBufferWeeks;

    const annualBenefit = 350_000;
    const finance = computeFinance({
      approvedBudgetGBP: scenario.capexBudgetGBP,
      committedExpenditureGBP: committed,
      annualBenefitGBP: annualBenefit,
      investmentGBP: committed,
    });

    const arrivalRate = demand.effectiveUnitsPerWeek / (5 * 2 * 60 * 8);
    const flow = computeFlow([
      { id: 'MillB',      label: 'Mill B',         te: 4.0, ca: 1.0, cs: 1.0, servers: 1, arrivalRate, relieved: committed >= 400_000, relievedCapacityMultiplier: 1.4 },
      { id: 'HeatTreat',  label: 'Heat Treat/NDT', te: 2.5, ca: 0.8, cs: 0.9, servers: 1, arrivalRate, relieved: false },
      { id: 'Assembly',   label: 'Assembly',        te: yamazumi.maxStationCycleMin, ca: 0.5, cs: 0.6, servers: decisions.operatorCount, arrivalRate, relieved: false },
      { id: 'TestBay',    label: 'Test Bay',        te: 1.8, ca: 0.9, cs: 0.8, servers: 1, arrivalRate, relieved: decisions.automatedTestRig },
    ]);

    const gateAssessment = assessGateExit({
      gateId: decisions.activeGate,
      oee: capacity.oee,
      rolledRFT: rft.rolledRFT,
      capexCommittedGBP: committed,
      capexBudgetGBP: scenario.capexBudgetGBP,
      npv: finance.npv36MonthGBP,
      paybackMonths: finance.paybackMonths,
      leadTimeDays: flow.systemLeadTimeDays,
      lbr: yamazumi.lbr,
      allStationsWithinTakt: yamazumi.allStationsWithinTakt,
      projectDurationWeeks: adjustedDurationWeeks,
      targetGoLiveWeeks: scenario.goLiveWeeks,
      serviceBufferPct: decisions.serviceBufferPct,
      standardisationPct: decisions.standardisationPct,
      civilPrepGBP: decisions.civilPrepGBP,
      civilPrepMinGBP: scenario.civilPrepMinGBP,
      civilPrepMinHeavyGBP: scenario.civilPrepMinHeavyGBP,
      machineProvenanceIsHeavy,
      spaghettiDistanceM,
    });

    const monteCarlo = runMonteCarlo({
      baseDurationWeeks: adjustedDurationWeeks,
      durationCv: 0.1,
      baseRolledRFT: rft.rolledRFT,
      baseOEE: capacity.oee,
      redGateCount: gateAssessment.status === 'Red' ? 1 : 0,
      openActionCount: gateAssessment.openActionCount,
    });

    const fingerprint = encodeFingerprint({
      scenarioId: decisions.scenarioId,
      charterId: decisions.charterId,
      machineId: decisions.machineId,
      cellFurniture: decisions.cellFurniture,
      pokaYoke: decisions.pokaYoke,
      fullMES: decisions.fullMES,
      automatedTestRig: decisions.automatedTestRig,
      fatExpediting: decisions.fatExpediting,
      operatorCount: decisions.operatorCount,
      nightShiftActive: decisions.nightShiftActive,
      shadowBoardAbsent,
    });

    return {
      scenario, machine, committed, demand, capacity, rft, yamazumi, baselineLBR,
      cpm, finance, flow, gateAssessment, monteCarlo, fingerprint,
      shadowBoardAbsent, spaghettiDistanceM, machineProvenanceIsHeavy,
      adjustedDurationWeeks, ecrCostTotal, ecrScheduleSlip,
    };
  }, [decisions]);

  function update(patch: Partial<SimDecisions>) {
    setDecisions(d => {
      const next = { ...d, ...patch };
      // Keep shadowBoardAbsent in sync with standardisationPct
      if ('standardisationPct' in patch) {
        next.shadowBoardAbsent = next.standardisationPct < 80;
      }
      // Keep currentGate in sync with activeGate
      if ('activeGate' in patch) {
        next.currentGate = next.activeGate;
      }
      return next;
    });
  }

  function advanceGate() {
    setDecisions(d => {
      if (d.activeGate >= 5) return d;
      const nextGate = (d.activeGate + 1) as GateId;
      return {
        ...d,
        passedGates: [...d.passedGates, d.activeGate],
        activeGate: nextGate,
        currentGate: nextGate,
      };
    });
  }

  function raiseECR(gateId: GateId) {
    setDecisions(d => {
      if (d.ecrCount >= MAX_ECRS) return d;
      const passedWithout = d.passedGates.filter(g => g !== gateId);
      return {
        ...d,
        passedGates: passedWithout,
        activeGate: gateId,
        currentGate: gateId,
        ecrCount: d.ecrCount + 1,
      };
    });
  }

  function resetRun() {
    setDecisions(DEFAULT_DECISIONS);
  }

  return { decisions, computed, update, advanceGate, raiseECR, resetRun };
}
