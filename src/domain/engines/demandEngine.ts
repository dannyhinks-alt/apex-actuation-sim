import { CALENDAR } from '../baseline/plantConstants';

export interface DemandInput {
  runners: number;
  repeaters: number;
  strangers: number;
}

export interface DemandResult {
  totalUnitsPerWeek: number;
  strangerDisruptionFactor: number;
  effectiveUnitsPerWeek: number;
  cellTaktMin: number;
}

/**
 * Engine 1 — Demand & Mix.
 *
 * strangerDisruptionFactor = 1 + (strangers / total) × 0.4
 * Strangers consume disproportionate set-up time; factor inflates effective demand.
 *
 * cellTaktMin = scheduledMinutes / effectiveUnitsPerWeek
 */
export function computeDemand(input: DemandInput): DemandResult {
  const totalUnitsPerWeek = input.runners + input.repeaters + input.strangers;
  const strangerProportion = input.strangers / totalUnitsPerWeek;
  const strangerDisruptionFactor = 1 + strangerProportion * 0.4;
  const effectiveUnitsPerWeek = totalUnitsPerWeek * strangerDisruptionFactor;
  const cellTaktMin = CALENDAR.minutesPerWeek / effectiveUnitsPerWeek;
  return { totalUnitsPerWeek, strangerDisruptionFactor, effectiveUnitsPerWeek, cellTaktMin };
}
