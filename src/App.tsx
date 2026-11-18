import { useState } from 'react';
import { useSimState } from './ui/hooks/useSimState';
import { SqcdpStrip } from './ui/components/SqcdpStrip';
import { DecisionPanel } from './ui/components/DecisionPanel';
import { FloorplanSVG } from './ui/views/FloorplanSVG';
import { CellLayoutSVG } from './ui/views/CellLayoutSVG';
import { YamazumiChart } from './ui/views/YamazumiChart';
import { OeeWaterfallChart } from './ui/views/OeeWaterfallChart';
import { CpmMonteCarloChart } from './ui/views/CpmMonteCarloChart';
import { FacilitatorTower } from './ui/views/FacilitatorTower';
import { PrintReportView } from './ui/views/PrintReportView';
import { TecnomatixExport } from './ui/views/TecnomatixExport';

type CanvasTab = 'floorplan' | 'celllayout' | 'yamazumi' | 'oee' | 'cpm';
type RightTab = 'decisions' | 'facilitator' | 'export';

export function App() {
  const { decisions, computed, update } = useSimState();
  const [canvasTab, setCanvasTab] = useState<CanvasTab>('floorplan');
  const [rightTab, setRightTab] = useState<RightTab>('decisions');
  const [showPrint, setShowPrint] = useState(false);
  const [roleLens, setRoleLens] = useState<number>(0);

  const { scenario, machine, committed, capacity, rft, yamazumi, cpm, finance, flow, gateAssessment, monteCarlo, fingerprint, demand } = computed;

  const sqcdpTiles = [
    { letter: 'S', label: 'Safety',   value: gateAssessment.status === 'Red' && gateAssessment.redBlockReasons.some(r => r.includes('aisle') || r.includes('takt')) ? 'BLOCK' : 'OK',  status: (gateAssessment.redBlockReasons.some(r => r.includes('takt')) ? 'red' : 'green') as 'green'|'amber'|'red' },
    { letter: 'Q', label: 'Quality',  value: `${(rft.rolledRFT * 100).toFixed(1)}%`, status: (rft.rolledRFT >= 0.990 ? 'green' : rft.rolledRFT >= 0.950 ? 'amber' : 'red') as 'green'|'amber'|'red' },
    { letter: 'C', label: 'Cost',     value: `£${(committed / 1000).toFixed(0)}k`,   status: (committed <= scenario.capexBudgetGBP ? 'green' : committed <= scenario.capexBudgetGBP * 1.05 ? 'amber' : 'red') as 'green'|'amber'|'red' },
    { letter: 'D', label: 'Delivery', value: `P50 Wk${monteCarlo.p50Weeks.toFixed(0)}`, status: (monteCarlo.p50Weeks <= scenario.goLiveWeeks ? 'green' : monteCarlo.p50Weeks <= scenario.goLiveWeeks + 2 ? 'amber' : 'red') as 'green'|'amber'|'red' },
    { letter: 'P', label: 'People',   value: `LBR ${(yamazumi.lbr * 100).toFixed(0)}%`, status: (yamazumi.lbr >= 0.85 ? 'green' : yamazumi.lbr >= 0.80 ? 'amber' : 'red') as 'green'|'amber'|'red' },
  ];

  const ROLE_LENSES = ['All', 'Programme & Finance', 'Manufacturing Systems', 'Quality & Safety', 'People & Operations'];

  const canvasTabs: { id: CanvasTab; label: string }[] = [
    { id: 'floorplan',  label: '1 Floorplan' },
    { id: 'celllayout', label: '2 Cell Layout' },
    { id: 'yamazumi',   label: '3 Yamazumi' },
    { id: 'oee',        label: '4 OEE/RFT' },
    { id: 'cpm',        label: '5 CPM/MC' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {/* Top Command Strip */}
      <header className="border-b border-slate-800 px-3 py-2 flex-shrink-0">
        <SqcdpStrip
          tiles={sqcdpTiles}
          capexRemaining={scenario.capexBudgetGBP - committed}
          goLiveForecastWeeks={monteCarlo.p50Weeks}
          targetGoLiveWeeks={scenario.goLiveWeeks}
          fingerprint={fingerprint}
        />
        {/* Role lens selector */}
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {ROLE_LENSES.map((r, i) => (
            <button key={r} onClick={() => setRoleLens(i)}
              className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${roleLens === i ? 'bg-blue-700 border-blue-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
              {r}
            </button>
          ))}
          <button onClick={() => setShowPrint(true)}
            className="ml-auto text-[10px] px-2 py-0.5 rounded font-medium border border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-300 transition-colors">
            Print / PDF
          </button>
        </div>
      </header>

      {/* Main 2-panel body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left Diagnostic Canvas */}
        <div className="flex flex-col border-r border-slate-800" style={{ width: '58%', minWidth: 0 }}>
          {/* Canvas tab bar */}
          <div className="flex border-b border-slate-800 flex-shrink-0">
            {canvasTabs.map(t => (
              <button key={t.id} onClick={() => setCanvasTab(t.id)}
                className={`text-[10px] font-medium px-3 py-1.5 border-r border-slate-800 transition-colors ${canvasTab === t.id ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Canvas content */}
          <div className="flex-1 overflow-hidden">
            {canvasTab === 'floorplan' && (
              <FloorplanSVG
                flowStations={flow.stations}
                cellFurniture={decisions.cellFurniture}
                fullMES={decisions.fullMES}
                machineInstalled={decisions.machineId !== 'UKR' || decisions.cellFurniture}
              />
            )}
            {canvasTab === 'celllayout' && <CellLayoutSVG />}
            {canvasTab === 'yamazumi' && (
              <YamazumiChart
                operatorCount={decisions.operatorCount}
                cellFurnitureInstalled={decisions.cellFurniture}
                fullMESInstalled={decisions.fullMES}
                customerTaktMin={scenario.cellTaktMin}
                stationTimes={yamazumi.stations.map(s => s.cycleTimeMin)}
                lbr={yamazumi.lbr}
                onUpdateOps={n => update({ operatorCount: n })}
              />
            )}
            {canvasTab === 'oee' && (
              <OeeWaterfallChart
                oee={capacity.oee}
                teep={capacity.teep}
                rft={rft}
                utilisation={capacity.oee * 100}
              />
            )}
            {canvasTab === 'cpm' && (
              <CpmMonteCarloChart
                nodes={cpm.nodes}
                monteCarlo={monteCarlo}
                targetGoLiveWeeks={scenario.goLiveWeeks}
              />
            )}
          </div>
        </div>

        {/* Right Decision Panel */}
        <div className="flex flex-col" style={{ width: '42%', minWidth: 0 }}>
          {/* Right tab bar */}
          <div className="flex border-b border-slate-800 flex-shrink-0">
            {([['decisions', 'Decisions'], ['facilitator', 'Control Tower'], ['export', 'Tecnomatix Export']] as [RightTab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setRightTab(id)}
                className={`text-[10px] font-medium px-3 py-1.5 border-r border-slate-800 transition-colors ${rightTab === id ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {rightTab === 'decisions' && (
              <DecisionPanel
                decisions={decisions}
                update={update}
                committed={committed}
                budget={scenario.capexBudgetGBP}
                gateStatus={gateAssessment.status}
                amberActions={gateAssessment.amberActions}
                redReasons={gateAssessment.redBlockReasons}
              />
            )}
            {rightTab === 'facilitator' && <FacilitatorTower />}
            {rightTab === 'export' && (
              <TecnomatixExport
                decisions={decisions}
                scenarioId={scenario.id}
                scenarioGoLive={scenario.goLiveWeeks}
                scenarioCapex={scenario.capexBudgetGBP}
                machineId={machine.id}
                machineCostGBP={machine.costGBP}
                committed={committed}
                capacity={capacity}
                rft={rft}
                yamazumi={yamazumi}
                demand={demand}
                flow={flow}
                fingerprint={fingerprint}
              />
            )}
          </div>
        </div>
      </div>

      {/* Print/PDF modal */}
      {showPrint && (
        <PrintReportView
          decisions={decisions}
          scenarioLabel={scenario.id}
          scenarioCapex={scenario.capexBudgetGBP}
          scenarioGoLive={scenario.goLiveWeeks}
          machineId={machine.id}
          committed={committed}
          capacity={capacity}
          rft={rft}
          yamazumi={yamazumi}
          finance={finance}
          cpm={cpm}
          monteCarlo={monteCarlo}
          gateAssessment={gateAssessment}
          fingerprint={fingerprint}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}
