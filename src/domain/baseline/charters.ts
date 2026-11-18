/** Four asymmetric team charters — SPEC v3.4 §1. */
export type CharterId = 1 | 2 | 3 | 4;
export type ScenarioGroup = 'ABD' | 'C';

export interface CharterDefinition {
  id: CharterId;
  title: string;
  primaryKpi: string;
  primaryKpiTarget: string;
}

export const CHARTERS: Record<CharterId, CharterDefinition> = {
  1: { id: 1, title: 'Capital Efficiency',         primaryKpi: 'Payback',   primaryKpiTarget: '< 12.0 months' },
  2: { id: 2, title: 'Accelerated Go-Live',         primaryKpi: 'Go-Live',   primaryKpiTarget: '≤ 22 weeks' },
  3: { id: 3, title: 'Volume Surge',                primaryKpi: 'Demand',    primaryKpiTarget: '+30% OEM surge' },
  4: { id: 4, title: 'Zero-Defect Traceability',    primaryKpi: 'Rolled RFT',primaryKpiTarget: '≥ 99.5%' },
};

/** Equipment packages available for purchase. */
export interface EquipmentPackage {
  id: string;
  label: string;
  costGBP: number;
  /** Base machining FPY boost (if applicable). */
  baseMachiningFPY?: number;
  cellFurniture?: boolean;
  pokaYoke?: boolean;
  fullMES?: boolean;
  automatedTestRig?: boolean;
  fatExpediting?: boolean;
}

export const MACHINE_OPTIONS: EquipmentPackage[] = [
  { id: 'JPN',  label: 'Japanese 5-Axis Cell',       costGBP: 260_000, baseMachiningFPY: 0.996 },
  { id: 'GER',  label: 'German 5-Axis Cell',          costGBP: 280_000, baseMachiningFPY: 0.997 },
  { id: 'FRS',  label: 'French/Spanish 5-Axis Cell',  costGBP: 265_000, baseMachiningFPY: 0.995 },
  { id: 'UKR',  label: 'UK OEM Retrofit',             costGBP: 225_000, baseMachiningFPY: 0.988 },
];

export const ANCILLARY_PACKAGES: EquipmentPackage[] = [
  { id: 'FURN', label: 'Cell Furniture & Jib Cranes', costGBP:  95_000, cellFurniture: true },
  { id: 'POKA', label: 'Poka-Yoke Assembly Fixtures', costGBP:  45_000, pokaYoke: true },
  { id: 'MES',  label: 'Full MES Integration',        costGBP: 145_000, fullMES: true },
  { id: 'TRIG', label: 'Automated Endurance Test Rig',costGBP:  90_000, automatedTestRig: true },
  { id: 'FATX', label: 'FAT Expediting',              costGBP:  25_000, fatExpediting: true },
];

/** Fixed gate programme costs (Gates 0–2 diligence + Gate 5 commissioning). */
export const GATE_COSTS = {
  gates02Standard: 100_000,
  gates02Reduced: 95_000,
  gate5: 35_000,
} as const;
