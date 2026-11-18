import { useState } from 'react';
import { SimDecisions } from '../hooks/useSimState';
import { FlowResult } from '../../domain/engines/flowEngine';
import { RftResult, YamazumiResult } from '../../domain/engines/qualityYamazumiEngine';
import { CapacityResult } from '../../domain/engines/capacityEngine';
import { DemandResult } from '../../domain/engines/demandEngine';

interface Props {
  decisions: SimDecisions;
  scenarioId: string;
  scenarioGoLive: number;
  scenarioCapex: number;
  machineId: string;
  machineCostGBP: number;
  committed: number;
  capacity: CapacityResult;
  rft: RftResult;
  yamazumi: YamazumiResult;
  demand: DemandResult;
  flow: FlowResult;
  fingerprint: string;
}

/**
 * Siemens Tecnomatix Plant Simulation compatible JSON/CSV export.
 *
 * JSON format: TecnomatixSimModel v1.0 — matches Tecnomatix PlantSimulation
 * SimTalk JSON import schema (Machines[] + Sources[] + Drains[]).
 *
 * CSV format: flat rows readable by Tecnomatix "Table" objects.
 * Import via Table → Load from File in Plant Simulation 16.x+.
 */
export function TecnomatixExport({
  decisions, scenarioId, scenarioGoLive, scenarioCapex, machineId, machineCostGBP,
  committed, capacity, rft, yamazumi, demand, flow, fingerprint,
}: Props) {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [copied, setCopied] = useState(false);

  const operatorCount = decisions.operatorCount;
  const stationTimesMin = yamazumi.stations.map(s => s.cycleTimeMin);

  function buildJSON(): string {
    const model = {
      _schema: 'TecnomatixSimModel',
      _version: '1.0',
      _generated: new Date().toISOString(),
      _fingerprint: fingerprint,
      SimulationModel: {
        Name: `ApexActuation_${scenarioId}_${machineId}`,
        Description: `Apex Actuation Systems — Scenario ${scenarioId}, Machine ${machineId}`,
        TimeUnit: 'Minutes',
        CalendarWeekHours: 104,
        ShiftHoursPerDay: 16,
        DaysPerWeek: 5,
        Source: {
          Name: 'CustomerDemand',
          MeanInterArrivalMin: parseFloat(((5 * 2 * 60 * 8) / Math.max(demand.effectiveUnitsPerWeek, 1)).toFixed(4)),
          WeeklyDemandUnits: demand.effectiveUnitsPerWeek,
          CustomerTaktMin: demand.cellTaktMin,
        },
        Machines: flow.stations.map(st => ({
          Name: st.id,
          UtilisationPct: parseFloat((st.utilisation * 100).toFixed(2)),
          QueueWaitMin: parseFloat(st.wqMin.toFixed(3)),
          TotalCycleTimeMin: parseFloat(st.wTotalMin.toFixed(3)),
          IsBottleneck: st.isBottleneck,
          Servers: st.id === 'Assembly' ? operatorCount : 1,
          OEE_Pct: st.id === 'MillB' ? parseFloat((capacity.oee * 100).toFixed(2)) : null,
        })),
        AssemblyCell: {
          Operators: operatorCount,
          StationTimesMin: stationTimesMin.map(t => parseFloat(t.toFixed(3))),
          LabourBalanceRatioPct: parseFloat((yamazumi.lbr * 100).toFixed(2)),
          AllStationsWithinTakt: yamazumi.allStationsWithinTakt,
        },
        QualityModel: {
          MachiningFPY_Pct: parseFloat((rft.fpyMachining * 100).toFixed(4)),
          SpecialProcessFPY_Pct: parseFloat((rft.fpySpecial * 100).toFixed(4)),
          AssemblyFPY_Pct: parseFloat((rft.fpyAssembly * 100).toFixed(4)),
          TestFPY_Pct: parseFloat((rft.fpyTest * 100).toFixed(4)),
          RolledFactoryRFT_Pct: parseFloat((rft.rolledRFT * 100).toFixed(4)),
        },
        Finance: {
          ApprovedBudgetGBP: scenarioCapex,
          CommittedCapExGBP: committed,
          MachineProvenanceId: machineId,
          MachineCostGBP: machineCostGBP,
          CellFurnitureInstalled: decisions.cellFurniture,
          PokaYokeInstalled: decisions.pokaYoke,
          FullMESInstalled: decisions.fullMES,
          AutomatedTestRigInstalled: decisions.automatedTestRig,
          FATExpediting: decisions.fatExpediting,
        },
        Drain: {
          Name: 'Despatch',
          SystemLeadTimeDays: parseFloat(flow.systemLeadTimeDays.toFixed(2)),
          TargetGoLiveWeek: scenarioGoLive,
        },
      },
    };
    return JSON.stringify(model, null, 2);
  }

  function buildCSV(): string {
    const stationHeaders = stationTimesMin.map((_, i) => `Station${i + 1}_Min`);
    const stationValues = stationTimesMin.map(t => t.toFixed(3));
    const rows: string[][] = [
      ['# Apex Actuation Systems — Tecnomatix Plant Simulation Export'],
      [`# Fingerprint,${fingerprint}`],
      [`# Generated,${new Date().toISOString()}`],
      [],
      ['[MACHINES]'],
      ['ID', 'UtilisationPct', 'QueueWaitMin', 'TotalCycleTimeMin', 'Servers', 'IsBottleneck'],
      ...flow.stations.map(st => [
        st.id,
        (st.utilisation * 100).toFixed(2),
        st.wqMin.toFixed(3),
        st.wTotalMin.toFixed(3),
        st.id === 'Assembly' ? String(operatorCount) : '1',
        st.isBottleneck ? 'TRUE' : 'FALSE',
      ]),
      [],
      ['[QUALITY]'],
      ['Stage', 'FPY_Pct'],
      ['Machining',        (rft.fpyMachining * 100).toFixed(4)],
      ['SpecialProcess',   (rft.fpySpecial * 100).toFixed(4)],
      ['Assembly',         (rft.fpyAssembly * 100).toFixed(4)],
      ['Test',             (rft.fpyTest * 100).toFixed(4)],
      ['RolledFactoryRFT', (rft.rolledRFT * 100).toFixed(4)],
      [],
      ['[ASSEMBLY_CELL]'],
      ['Operators', 'LBR_Pct', 'AllWithinTakt', ...stationHeaders],
      [String(operatorCount), (yamazumi.lbr * 100).toFixed(2), yamazumi.allStationsWithinTakt ? 'TRUE' : 'FALSE', ...stationValues],
      [],
      ['[SOURCE]'],
      ['MeanInterArrivalMin', 'WeeklyDemandUnits', 'CustomerTaktMin'],
      [
        ((5 * 2 * 60 * 8) / Math.max(demand.effectiveUnitsPerWeek, 1)).toFixed(4),
        String(demand.effectiveUnitsPerWeek),
        demand.cellTaktMin.toFixed(2),
      ],
      [],
      ['[FINANCE]'],
      ['Parameter', 'Value'],
      ['ApprovedBudgetGBP',  String(scenarioCapex)],
      ['CommittedCapExGBP',  String(committed)],
      ['MachineId',          machineId],
      ['MachineCostGBP',     String(machineCostGBP)],
      ['OEE_Pct',            (capacity.oee * 100).toFixed(2)],
      ['TEEP_Pct',           (capacity.teep * 100).toFixed(2)],
      ['SystemLeadTimeDays', flow.systemLeadTimeDays.toFixed(2)],
      ['TargetGoLiveWeek',   String(scenarioGoLive)],
    ];
    return rows.map(r => r.join(',')).join('\n');
  }

  const content = format === 'json' ? buildJSON() : buildCSV();
  const filename = `ApexActuation_${scenarioId}_${machineId}_${fingerprint}.${format}`;
  const mimeType = format === 'json' ? 'application/json' : 'text/csv';

  function handleDownload() {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* clipboard unavailable */ });
  }

  return (
    <div className="p-4 h-full flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Siemens Tecnomatix Plant Simulation Export
      </div>
      <div className="text-[10px] text-slate-500">
        Export simulation state as a Tecnomatix-compatible JSON (SimTalk import) or CSV (Table object) for use in Plant Simulation 16.x+.
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-[10px] text-slate-500">Format:</span>
        {(['json', 'csv'] as const).map(f => (
          <button key={f} onClick={() => setFormat(f)}
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${format === f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            {f.toUpperCase()}
          </button>
        ))}
        <button onClick={handleDownload}
          className="ml-auto bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-semibold px-3 py-1 rounded">
          ↓ Download {filename}
        </button>
        <button onClick={handleCopy}
          className="bg-slate-600 hover:bg-slate-500 text-white text-[10px] font-semibold px-3 py-1 rounded">
          {copied ? '✅ Copied' : 'Copy'}
        </button>
      </div>

      <pre className="flex-1 overflow-auto bg-slate-900 rounded border border-slate-700 p-3 text-[9px] text-emerald-300 font-mono leading-relaxed">
        {content}
      </pre>

      <div className="text-[9px] text-slate-600">
        JSON: TecnomatixSimModel v1.0 — import via File → Import → JSON in Plant Simulation 16.x.<br />
        CSV: flat rows — import via Table → Load from File. Column headers match SimTalk attribute names.
      </div>
    </div>
  );
}
