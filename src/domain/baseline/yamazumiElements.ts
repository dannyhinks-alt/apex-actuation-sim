/**
 * E1–E8 Yamazumi work elements.
 * durationMin: baseline cycle-time contribution per unit (minutes).
 * automatic: true when the machine runs unattended (E4).
 * eliminatedBy: investment package that removes this waste element.
 */
export interface YamazumiElement {
  id: 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8';
  label: string;
  durationMin: number;
  automatic: boolean;
  eliminatedBy?: 'CellFurniture' | 'MES';
}

export const YAMAZUMI_ELEMENTS: YamazumiElement[] = [
  { id: 'E1', label: 'Load & clamp component',      durationMin: 0.65, automatic: false },
  { id: 'E2', label: 'Set datum & tool call',        durationMin: 0.45, automatic: false },
  { id: 'E3', label: 'In-process inspection',        durationMin: 0.50, automatic: false },
  { id: 'E4', label: 'Machining cycle (auto)',        durationMin: 0.30, automatic: true  },
  { id: 'E5', label: 'Deburr & clean',               durationMin: 0.50, automatic: false },
  { id: 'E6', label: 'Walk to tool crib',            durationMin: 0.55, automatic: false, eliminatedBy: 'CellFurniture' },
  { id: 'E7', label: 'Paper check / revision lookup',durationMin: 0.40, automatic: false, eliminatedBy: 'MES' },
  { id: 'E8', label: 'Handover & sign-off',          durationMin: 0.35, automatic: false },
];

/** Sum of all manual (non-automatic) element durations — baseline total content. */
export const TOTAL_MANUAL_CONTENT_MIN = YAMAZUMI_ELEMENTS
  .filter(e => !e.automatic)
  .reduce((s, e) => s + e.durationMin, 0);

/** Baseline 3-station split (pre-balancing). */
export const BASELINE_STATION_SPLIT = [1.40, 1.90, 1.40] as const;
