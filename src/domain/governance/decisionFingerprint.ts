/**
 * Deterministic Decision Fingerprint — encodes the full set of investment
 * decisions into a compact hex string for duplicate-team detection.
 */

export interface DecisionState {
  scenarioId: string;
  charterId: number;
  machineId: string;
  cellFurniture: boolean;
  pokaYoke: boolean;
  fullMES: boolean;
  automatedTestRig: boolean;
  fatExpediting: boolean;
  operatorCount: number;
  nightShiftActive: boolean;
  shadowBoardAbsent: boolean;
}

/** Encode decisions to a compact deterministic hex fingerprint. */
export function encodeFingerprint(state: DecisionState): string {
  const flags =
    (state.cellFurniture    ? 0x01 : 0) |
    (state.pokaYoke         ? 0x02 : 0) |
    (state.fullMES          ? 0x04 : 0) |
    (state.automatedTestRig ? 0x08 : 0) |
    (state.fatExpediting    ? 0x10 : 0) |
    (state.nightShiftActive ? 0x20 : 0) |
    (state.shadowBoardAbsent? 0x40 : 0);

  const parts = [
    state.scenarioId,
    String(state.charterId),
    state.machineId,
    flags.toString(16).padStart(2, '0'),
    String(state.operatorCount),
  ];
  return parts.join('-').toUpperCase();
}

/** Check whether two fingerprints represent identical decision sets. */
export function areDuplicateDecisions(a: string, b: string): boolean {
  return a === b;
}
