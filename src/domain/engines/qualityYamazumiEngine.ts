
/** RFT factor inputs — machine origin & investment packages. */
export interface RftInput {
  baseMachiningFPY: number;       // from machine selection
  /**
   * Scenario B quality degradation — these values REPLACE the stage FPYs.
   * fixtureWear → replaces fpyMachining (0.915)
   * paperRevisionErrors → replaces fpyAssembly (0.970)
   * uncalibratedGauges → replaces fpyTest (0.963)
   * Gives: 0.915 × 0.980 × 0.970 × 0.963 = 83.80% per SPEC v3.4 §1
   */
  scenarioBDegradation?: {
    fixtureWear: number;
    paperRevisionErrors: number;
    uncalibratedGauges: number;
  };
  cellFurnitureInstalled: boolean;
  pokaYokeInstalled: boolean;
  fullMESInstalled: boolean;
  automatedTestRigInstalled?: boolean;
  nightShiftActive: boolean;
}

export interface RftResult {
  fpyMachining: number;
  fpySpecial: number;
  fpyAssembly: number;
  fpyTest: number;
  rolledRFT: number;
}

const SPECIAL_BASELINE_FPY       = 0.980;
const ASSEMBLY_BASELINE_FPY      = 0.970;
// TEST_BASELINE_FPY derived: 0.8756 / (0.996 × 0.980 × 0.970) ≈ 0.9249
const TEST_BASELINE_FPY_STD      = 0.9249;
const FURNITURE_HANDLING_BOOST   = 0.022; // +2.2% assembly FPY (jib crane eliminates handling damage)
const POKAYOKE_ASSEMBLY_BOOST    = 0.014; // +1.4% assembly FPY (mis-builds eliminated at source)
// MES eliminates all paper/tool escapes and enforces zero-fault-forward interlocks
// → special FPY raised to 1.0 (1.0 - 0.980 = 0.020)
const MES_PAPER_BOOST            = 0.020; // +2.0% → special 0.980 → 1.0
// Automated test rig enforces 100% parametric coverage → test FPY → 1.0
const TEST_RIG_BOOST             = 1.0 - TEST_BASELINE_FPY_STD; // raises fpyTest to exactly 1.0
const NIGHT_SHIFT_QUALITY_VAR    = 0.012; // -1.2% machining FPY on night shift

/**
 * Engine 4a — Composite Rolled RFT.
 * RFT = FPY_machining × FPY_special × FPY_assembly × FPY_test
 *
 * Scenario B: degradation values REPLACE stage FPYs directly (not multiplied).
 * SPEC v3.4 §1: 0.915 × 0.980 × 0.970 × 0.963 = 83.80%
 */
export function computeRolledRFT(input: RftInput): RftResult {
  let fpyMachining = input.baseMachiningFPY;
  let fpySpecial   = SPECIAL_BASELINE_FPY;
  let fpyAssembly  = ASSEMBLY_BASELINE_FPY;
  let fpyTest      = TEST_BASELINE_FPY_STD;

  // Scenario B: stage values are overridden by degradation values
  if (input.scenarioBDegradation) {
    fpyMachining = input.scenarioBDegradation.fixtureWear;
    fpyAssembly  = input.scenarioBDegradation.paperRevisionErrors;
    fpyTest      = input.scenarioBDegradation.uncalibratedGauges;
    // fpySpecial remains at baseline 0.980 (not degraded in Scenario B)
  }

  // Investment improvements
  if (input.cellFurnitureInstalled)       fpyAssembly = Math.min(1, fpyAssembly + FURNITURE_HANDLING_BOOST);
  if (input.pokaYokeInstalled)            fpyAssembly = Math.min(1, fpyAssembly + POKAYOKE_ASSEMBLY_BOOST);
  if (input.fullMESInstalled)             fpySpecial  = Math.min(1, fpySpecial  + MES_PAPER_BOOST);
  if (input.automatedTestRigInstalled)    fpyTest     = Math.min(1, fpyTest     + TEST_RIG_BOOST);
  if (input.nightShiftActive)             fpyMachining = Math.max(0, fpyMachining - NIGHT_SHIFT_QUALITY_VAR);

  const rolledRFT = fpyMachining * fpySpecial * fpyAssembly * fpyTest;
  return { fpyMachining, fpySpecial, fpyAssembly, fpyTest, rolledRFT };
}

// ---- Yamazumi balancing ----

export interface YamazumiInput {
  operatorCount: number;        // 2–5
  cellFurnitureInstalled: boolean;
  fullMESInstalled: boolean;
  customerTaktMin: number;
}

export interface StationBalance {
  stationIndex: number;
  elements: string[];
  cycleTimeMin: number;
}

export interface YamazumiResult {
  stations: StationBalance[];
  maxStationCycleMin: number;
  totalContentMin: number;
  lbr: number;
  allStationsWithinTakt: boolean;
}

/**
 * SPEC v3.4 baseline 3-station split: [1.40, 1.90, 1.40] minutes.
 * E6 (0.55 walk) and E7 (0.40 paper check) both reside in station 1 (the bottleneck).
 * LBR = Σ(station_i) / (N × max(station_i)) = 4.70 / (3 × 1.90) = 82.46%
 */
const BASELINE_STATIONS_MIN = [1.40, 1.90, 1.40] as const;
const E6_STATION_IDX = 1;  // E6 is in the bottleneck station
const E7_STATION_IDX = 1;  // E7 is in the bottleneck station
const E6_DUR = 0.55;
const E7_DUR = 0.40;

/**
 * Engine 4b — Multi-operator Yamazumi balancing.
 *
 * Starts from SPEC baseline station split [1.40, 1.90, 1.40].
 * E4 (0.30m automatic) is concurrent — station times include all operator content.
 * E6 eliminated (cell furniture installed): subtract 0.55 from its station.
 * E7 eliminated (full MES installed): subtract 0.40 from its station.
 * For N operators: total content is redistributed evenly, LBR computed.
 * LBR = Σ(station_i) / (N × max(station_i))
 */
export function computeYamazumi(input: YamazumiInput): YamazumiResult {
  // Apply eliminations to the 3-station baseline
  const baseTimes = [...BASELINE_STATIONS_MIN] as number[];
  if (input.cellFurnitureInstalled) baseTimes[E6_STATION_IDX]! -= E6_DUR;
  if (input.fullMESInstalled)       baseTimes[E7_STATION_IDX]! -= E7_DUR;

  const totalContentMin = baseTimes.reduce((s, v) => s + v, 0);
  const n = Math.max(2, Math.min(5, input.operatorCount));

  // For N operators: distribute total content evenly across N stations
  const baseContent = totalContentMin / n;
  const stations: StationBalance[] = Array.from({ length: n }, (_, i) => ({
    stationIndex: i,
    elements: [],
    cycleTimeMin: baseContent,
  }));

  const maxStationCycleMin = baseContent; // perfectly balanced for N ops
  const lbr = totalContentMin / (n * maxStationCycleMin);
  const allStationsWithinTakt = maxStationCycleMin <= input.customerTaktMin;

  return { stations, maxStationCycleMin, totalContentMin, lbr, allStationsWithinTakt };
}

/**
 * Baseline Yamazumi LBR for the SPEC 3-station split.
 * 4.70 / (3 × 1.90) = 82.46%
 */
export function computeBaselineLBR(): number {
  const sum = BASELINE_STATIONS_MIN.reduce((s, v) => s + v, 0);
  const max = Math.max(...BASELINE_STATIONS_MIN);
  return sum / (BASELINE_STATIONS_MIN.length * max);
}
