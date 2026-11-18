import { ASSUMPTIONS } from '../baseline/assumptionsRegister';

/** 7 CPM activity nodes A1–A7. */
export interface CpmActivity {
  id: string;
  label: string;
  durationWeeks: number;
  predecessors: string[];
}

export interface CpmNode {
  id: string;
  label: string;
  durationWeeks: number;
  es: number; ef: number;
  ls: number; lf: number;
  float: number;
  onCriticalPath: boolean;
}

export interface CpmResult {
  nodes: CpmNode[];
  projectDurationWeeks: number;
  criticalPathIds: string[];
}

export interface FinanceInput {
  approvedBudgetGBP: number;
  committedExpenditureGBP: number;
  annualBenefitGBP: number;
  investmentGBP: number;
}

export interface FinanceResult {
  remainingCapexGBP: number;
  npv36MonthGBP: number;
  paybackMonths: number;
}

const DISCOUNT_RATE_ANNUAL = Number(ASSUMPTIONS.find(a => a.id === 'AR-011')!.baselineValue);
const MONTHLY_RATE = DISCOUNT_RATE_ANNUAL / 12;

/**
 * Engine 5a — CapEx reconciliation & NPV.
 *
 * NPV = Σ(t=1..36) [monthlyBenefit / (1+r)^t] − investment
 * Payback = investment / monthlyBenefit  (simple, then verified with cumulative DCF)
 */
export function computeFinance(input: FinanceInput): FinanceResult {
  const remainingCapexGBP = input.approvedBudgetGBP - input.committedExpenditureGBP;
  const monthlyBenefit = input.annualBenefitGBP / 12;

  let npv = -input.investmentGBP;
  let cumulativeDCF = 0;
  let paybackMonths = Infinity;

  for (let t = 1; t <= 36; t++) {
    const pv = monthlyBenefit / Math.pow(1 + MONTHLY_RATE, t);
    npv += pv;
    cumulativeDCF += pv;
    if (paybackMonths === Infinity && cumulativeDCF >= input.investmentGBP) {
      paybackMonths = t;
    }
  }

  // Fallback simple payback
  if (paybackMonths === Infinity && monthlyBenefit > 0) {
    paybackMonths = input.investmentGBP / monthlyBenefit;
  }

  return { remainingCapexGBP, npv36MonthGBP: npv, paybackMonths };
}

/**
 * Engine 5b — 7-node CPM precedence network solver.
 * Forward pass: ES, EF. Backward pass: LS, LF, Float.
 */
export function computeCPM(activities: CpmActivity[]): CpmResult {
  const map = new Map<string, CpmNode>();
  for (const a of activities) {
    map.set(a.id, { id: a.id, label: a.label, durationWeeks: a.durationWeeks, es: 0, ef: 0, ls: 0, lf: 0, float: 0, onCriticalPath: false });
  }

  // Topological sort (simple iterative)
  const sorted: string[] = [];
  const visited = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    const act = activities.find(a => a.id === id)!;
    for (const p of act.predecessors) visit(p);
    visited.add(id);
    sorted.push(id);
  }
  for (const a of activities) visit(a.id);

  // Forward pass
  for (const id of sorted) {
    const node = map.get(id)!;
    const act = activities.find(a => a.id === id)!;
    node.es = act.predecessors.length === 0 ? 0 : Math.max(...act.predecessors.map(p => map.get(p)!.ef));
    node.ef = node.es + node.durationWeeks;
  }

  const projectDuration = Math.max(...[...map.values()].map(n => n.ef));

  // Backward pass
  for (const id of [...sorted].reverse()) {
    const node = map.get(id)!;
    const successors = activities.filter(a => a.predecessors.includes(id));
    node.lf = successors.length === 0 ? projectDuration : Math.min(...successors.map(s => map.get(s.id)!.ls));
    node.ls = node.lf - node.durationWeeks;
    node.float = node.ls - node.es;
    node.onCriticalPath = node.float === 0;
  }

  const nodes = [...map.values()];
  const criticalPathIds = nodes.filter(n => n.onCriticalPath).map(n => n.id);
  return { nodes, projectDurationWeeks: projectDuration, criticalPathIds };
}

/** Default 7-node network. Machine manufacture duration is variable. */
export function buildDefaultCPM(a3DurationWeeks: number): CpmActivity[] {
  return [
    { id: 'A1', label: 'Mandate & Define',                    durationWeeks: 3,                predecessors: [] },
    { id: 'A2', label: 'Civil, Power & Monument Prep',        durationWeeks: 4,                predecessors: ['A1'] },
    { id: 'A3', label: 'Machine Manufacture & Supplier FAT',  durationWeeks: a3DurationWeeks,  predecessors: ['A1'] },
    { id: 'A4', label: 'MES Architecture & Cell Tooling',     durationWeeks: 4,                predecessors: ['A1'] },
    { id: 'A5', label: 'Site Installation & Commissioning',   durationWeeks: 2,                predecessors: ['A2', 'A3'] },
    { id: 'A6', label: 'MES Integration & Tooling Build',     durationWeeks: 3,                predecessors: ['A4', 'A5'] },
    // A7 depends on A5 per SPEC path: A1(3w)→A3(12w)→A5(2w)→A7(3w) = 20w
    // A6 completes in parallel; both A6 and A7 end at week 20 for a 20w project
    { id: 'A7', label: 'Validation, PPAP & Gate 5',           durationWeeks: 3,                predecessors: ['A5'] },
  ];
}
