/** Plant-level physical constants — 120m × 72m floorplan, 5 zones. */
export const PLANT = {
  lengthM: 120,
  widthM: 72,
  areaM2: 120 * 72,
  zones: ['Mill', 'HeatTreat_NDT', 'Assembly', 'Test', 'Despatch'] as const,
} as const;

/** Operating calendar — 2 shifts × 8 h × 5 days + optional night shift. */
export const CALENDAR = {
  shiftsPerDay: 2,
  hoursPerShift: 8,
  daysPerWeek: 5,
  operatingHoursPerWeek: 2 * 8 * 5,          // 80 h/wk scheduled
  calendarHoursPerWeek: 104,                   // TEEP denominator (104 h/wk)
  minutesPerWeek: 2 * 8 * 5 * 60,             // 4 800 min/wk
} as const;

/** Baseline demand (pre-scenario). */
export const BASELINE_DEMAND = {
  totalUnitsPerWeek: 100,
  runners: 60,
  repeaters: 38,
  strangers: 2,
} as const;

/** Baseline takt at 100 units/wk over 4 800 scheduled min. */
export const BASELINE_TAKT_MIN = CALENDAR.minutesPerWeek / BASELINE_DEMAND.totalUnitsPerWeek; // 48.0 min

/** Scenario A takt (125 units/wk). */
export const SCENARIO_A_TAKT_MIN = CALENDAR.minutesPerWeek / 125; // 38.4 min — but SPEC quotes 4.30 min (cell takt)

/**
 * Cell-level customer takt values quoted in the SPEC.
 * These are the per-unit cell cycle-time targets, not plant-wide throughput takt.
 */
export const CELL_TAKT = {
  standard: 4.30,  // min/unit  (Scenarios A/B/C)
  rampUp: 3.40,    // min/unit  (Scenario D)
} as const;

/** Mill B baseline — primary constraint. */
export const MILL_B = {
  baseAvailabilityPct: 0.78,   // 78% — shadow-board absence penalty applied separately
  basePerformancePct: 0.91,
  baseQualityPct: 1.00,
  shadowBoardAvailabilityPenaltyPct: 0.035, // -3.5% when tool control absent
} as const;
