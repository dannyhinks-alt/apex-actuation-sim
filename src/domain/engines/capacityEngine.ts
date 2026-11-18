import { CALENDAR, MILL_B } from '../baseline/plantConstants';

export interface CapacityInput {
  /** Machine availability fraction (0–1). */
  availability: number;
  /** Machine performance fraction (0–1). */
  performance: number;
  /** Machine quality fraction (0–1). */
  quality: number;
  /** Whether shadow boards / tool control are absent (-3.5% availability penalty). */
  shadowBoardAbsent: boolean;
  /** Whether a 3rd night shift is running. */
  nightShiftActive: boolean;
}

export interface CapacityResult {
  oee: number;
  teep: number;
  utilisationPct: number;
  nightShiftOpExGBPPerYr: number;
  nightShiftQualityVariancePct: number;
}

const NIGHT_SHIFT_OPEX_GBP_YR = 185_000;
const NIGHT_SHIFT_QUALITY_VARIANCE = 0.012;

/**
 * Engine 2 — Capacity, OEE & TEEP.
 *
 * OEE = Availability × Performance × Quality
 * TEEP = OEE × (scheduledHours / calendarHours)
 * shadowBoard penalty: -3.5% availability if absent
 */
export function computeCapacity(input: CapacityInput): CapacityResult {
  const effectiveA = input.shadowBoardAbsent
    ? Math.max(0, input.availability - MILL_B.shadowBoardAvailabilityPenaltyPct)
    : input.availability;

  const oee = effectiveA * input.performance * input.quality;
  const calendarRatio = CALENDAR.operatingHoursPerWeek / CALENDAR.calendarHoursPerWeek;
  const teep = oee * calendarRatio;
  const utilisationPct = effectiveA * 100;

  return {
    oee,
    teep,
    utilisationPct,
    nightShiftOpExGBPPerYr: input.nightShiftActive ? NIGHT_SHIFT_OPEX_GBP_YR : 0,
    nightShiftQualityVariancePct: input.nightShiftActive ? NIGHT_SHIFT_QUALITY_VARIANCE : 0,
  };
}

/** Baseline Mill B capacity (shadow boards absent). */
export const BASELINE_CAPACITY: CapacityResult = computeCapacity({
  availability: MILL_B.baseAvailabilityPct,
  performance: MILL_B.basePerformancePct,
  quality: MILL_B.baseQualityPct,
  shadowBoardAbsent: false,
  nightShiftActive: false,
});
