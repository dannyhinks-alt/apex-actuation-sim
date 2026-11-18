import { useState, useMemo } from 'react';
import { ScenarioId, SCENARIOS } from '../../domain/baseline/scenarios';
import { CharterId } from '../../domain/baseline/charters';
import { computeDemand } from '../../domain/engines/demandEngine';
import { computeCapacity } from '../../domain/engines/capacityEngine';
import { computeRolledRFT, computeYamazumi, computeBaselineLBR } from '../../domain/engines/qualityYamazumiEngine';
import { computeFinance, computeCPM, buildDefaultCPM } from '../../domain/engines/programmeFinanceEngine';
import { computeFlow } from '../../domain/engines/flowEngine';
import { assessGateExit, GateId } from '../../domain/governance/gateStateMachine';
import { encodeFingerprint } from '../../domain/governance/decisionFingerprint';
import { runMonteCarlo } from '../../domain/governance/monteCarlo';
import { MACHINE_OPTIONS, ANCILLARY_PACKAGES, GATE_COSTS } from '../../domain/baseline/charters';
import { MILL_B } from '../../domain/baseline/plantConstants';

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
  shadowBoardAbsent: boolean;
  currentGate: GateId;
  useReducedGateCost: boolean;
}

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
};

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
    const committed = gateCost + machine.costGBP + ancillaries.reduce((s, p) => s + p.costGBP, 0) + GATE_COSTS.gate5;

    const demand = computeDemand({
      runners: scenario.runners,
      repeaters: scenario.repeaters,
      strangers: scenario.strangers,
    });

    const capacity = computeCapacity({
      availability: MILL_B.baseAvailabilityPct,
      performance: MILL_B.basePerformancePct,
      quality: MILL_B.baseQualityPct,
      shadowBoardAbsent: decisions.shadowBoardAbsent,
      nightShiftActive: decisions.nightShiftActive,
    });

    const rft = computeRolledRFT({
      baseMachiningFPY: machine.baseMachiningFPY ?? 0.996,
      scenarioBDegradation: scenario.qualityDegradation
        ? { fixtureWear: scenario.qualityDegradation.fixtureWear, paperRevisionErrors: scenario.qualityDegradation.fixtureWear, uncalibratedGauges: scenario.qualityDegradation.uncalibratedGauges }
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

    const annualBenefit = 350_000; // baseline annual saving assumption
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
      gateId: decisions.currentGate,
      oee: capacity.oee,
      rolledRFT: rft.rolledRFT,
      capexCommittedGBP: committed,
      capexBudgetGBP: scenario.capexBudgetGBP,
      npv: finance.npv36MonthGBP,
      paybackMonths: finance.paybackMonths,
      leadTimeDays: flow.systemLeadTimeDays,
      lbr: yamazumi.lbr,
      allStationsWithinTakt: yamazumi.allStationsWithinTakt,
      projectDurationWeeks: cpm.projectDurationWeeks,
      targetGoLiveWeeks: scenario.goLiveWeeks,
    });

    const monteCarlo = runMonteCarlo({
      baseDurationWeeks: cpm.projectDurationWeeks,
      durationCv: 0.1,
      baseRolledRFT: rft.rolledRFT,
      baseOEE: capacity.oee,
      redGateCount: gateAssessment.status === 'Red' ? 1 : 0,
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
      shadowBoardAbsent: decisions.shadowBoardAbsent,
    });

    return { scenario, machine, committed, demand, capacity, rft, yamazumi, baselineLBR, cpm, finance, flow, gateAssessment, monteCarlo, fingerprint };
  }, [decisions]);

  function update(patch: Partial<SimDecisions>) {
    setDecisions(d => ({ ...d, ...patch }));
  }

  return { decisions, computed, update };
}
