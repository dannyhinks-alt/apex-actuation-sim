/**
 * Engine 3 — Flow, Kingman VUT & Little's Law.
 *
 * Kingman VUT queue formula:
 *   Wq = ((ca² + cs²) / 2) × (ρ / (1 − ρ)) × te
 *
 * Little's Law cross-check:
 *   WIP = Throughput × Lead Time
 */

export interface WorkstationInput {
  id: string;
  label: string;
  /** Mean effective process time (minutes). */
  te: number;
  /** Coefficient of variation of arrival times. */
  ca: number;
  /** Coefficient of variation of service times. */
  cs: number;
  /** Number of parallel servers. */
  servers: number;
  /** Arrival rate (units/min). */
  arrivalRate: number;
  /** Whether this station has been relieved (capacity upgrade applied). */
  relieved: boolean;
  /** Capacity multiplier applied when relieved (e.g. 1.4 for new 5-axis cell). */
  relievedCapacityMultiplier?: number;
}

export interface WorkstationResult {
  id: string;
  rho: number;              // utilisation per server
  wqMin: number;            // queue wait (min)
  wTotalMin: number;        // total time in system (min)
  isBottleneck: boolean;
  utilisation: number;
}

export interface FlowResult {
  stations: WorkstationResult[];
  systemLeadTimeDays: number;
  wipUnits: number;
  throughputPerMin: number;
  bottleneckId: string | null;
}

const MINS_PER_DAY = 60 * 8 * 2; // 2-shift day

/**
 * Kingman approximate queue wait for multi-server workstation.
 * Uses Sakasegawa correction for c > 1.
 */
function kingmanWq(ca: number, cs: number, rho: number, te: number, c: number): number {
  if (rho >= 1) return Infinity;
  const cvTerm = (ca * ca + cs * cs) / 2;
  const rhoPower = Math.pow(rho, Math.sqrt(2 * (c + 1)) - 1);
  const rhoFactor = rho / (1 - rho);
  return cvTerm * rhoFactor * (te / c) * rhoPower;
}

export function computeFlow(stations: WorkstationInput[]): FlowResult {
  const results: WorkstationResult[] = stations.map(s => {
    const effectiveTe = s.relieved
      ? s.te / (s.relievedCapacityMultiplier ?? 1.4)
      : s.te;
    const rho = (s.arrivalRate * effectiveTe) / s.servers;
    const wq = rho >= 1 ? effectiveTe * 10 : kingmanWq(s.ca, s.cs, rho, effectiveTe, s.servers);
    const wTotal = wq + effectiveTe;
    return {
      id: s.id,
      rho: Math.min(rho, 1),
      wqMin: wq,
      wTotalMin: wTotal,
      isBottleneck: false,
      utilisation: Math.min(rho, 1),
    };
  });

  // Mark bottleneck as station with highest queue wait
  const maxWq = Math.max(...results.map(r => r.wqMin));
  const bottleneckResult = results.find(r => r.wqMin === maxWq) ?? null;
  if (bottleneckResult) bottleneckResult.isBottleneck = true;

  // Little's Law
  const firstStation = stations[0];
  if (!firstStation) {
    return { stations: results, systemLeadTimeDays: 0, wipUnits: 0, throughputPerMin: 0, bottleneckId: null };
  }
  const throughputPerMin = firstStation.arrivalRate;
  const systemLeadTimeMin = results.reduce((s, r) => s + r.wTotalMin, 0);
  const systemLeadTimeDays = systemLeadTimeMin / MINS_PER_DAY;
  const wipUnits = throughputPerMin * systemLeadTimeMin;

  return {
    stations: results,
    systemLeadTimeDays,
    wipUnits,
    throughputPerMin,
    bottleneckId: bottleneckResult?.id ?? null,
  };
}
