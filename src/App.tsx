import { useState } from 'react';
import { useSimState } from './ui/hooks/useSimState';
import { SqcdpStrip } from './ui/components/SqcdpStrip';
import { GateRail } from './ui/components/GateRail';
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
  const { decisions, computed, update, advanceGate, raiseECR, resetRun } = useSimState();
  const [canvasTab, setCanvasTab] = useState<CanvasTab>('floorplan');
  const [rightTab, setRightTab] = useState<RightTab>('decisions');
  const [showPrint, setShowPrint] = useState(false);

  const { scenario, machine, committed, capacity, rft, yamazumi, cpm, finance, flow, gateAssessment, monteCarlo, fingerprint, demand, spaghettiDistanceM, shadowBoardAbsent } = computed;

  const sqcdpTiles = [
    { letter: 'S', label: 'Safety',   value: gateAssessment.status === 'Red' && gateAssessment.redBlockReasons.some(r => r.includes('takt')) ? 'BLOCK' : 'OK', status: (gateAssessment.redBlockReasons.some(r => r.includes('takt')) ? 'red' : 'green') as 'green'|'amber'|'red' },
    { letter: 'Q', label: 'Quality',  value: `${(rft.rolledRFT * 100).toFixed(1)}%`, status: (rft.rolledRFT >= 0.990 ? 'green' : rft.rolledRFT >= 0.950 ? 'amber' : 'red') as 'green'|'amber'|'red' },
    { letter: 'C', label: 'Cost',     value: `£${(committed / 1000).toFixed(0)}k`,   status: (committed <= scenario.capexBudgetGBP ? 'green' : committed <= scenario.capexBudgetGBP * 1.05 ? 'amber' : 'red') as 'green'|'amber'|'red' },
    { letter: 'D', label: 'Delivery', value: `P50 Wk${monteCarlo.p50Weeks.toFixed(0)}`, status: (monteCarlo.p50Weeks <= scenario.goLiveWeeks ? 'green' : monteCarlo.p50Weeks <= scenario.goLiveWeeks + 2 ? 'amber' : 'red') as 'green'|'amber'|'red' },
    { letter: 'P', label: 'People',   value: `LBR ${(yamazumi.lbr * 100).toFixed(0)}%`, status: (yamazumi.lbr >= 0.85 ? 'green' : yamazumi.lbr >= 0.80 ? 'amber' : 'red') as 'green'|'amber'|'red' },
  ];

  const canvasTabs: { id: CanvasTab; label: string }[] = [
    { id: 'floorplan',  label: '1 Floorplan' },
    { id: 'celllayout', label: '2 Cell Layout' },
    { id: 'yamazumi',   label: '3 Yamazumi' },
    { id: 'oee',        label: '4 OEE/RFT' },
    { id: 'cpm',        label: '5 CPM/MC' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8FAFC', color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
      {/* Top Command Strip */}
      <header className="border-b px-3 py-2 flex-shrink-0 bg-white shadow-sm" style={{ borderColor: '#E2E8F0' }}>
        <SqcdpStrip
          tiles={sqcdpTiles}
          capexRemaining={scenario.capexBudgetGBP - committed}
          goLiveForecastWeeks={monteCarlo.p50Weeks}
          targetGoLiveWeeks={scenario.goLiveWeeks}
          fingerprint={fingerprint}
        />
        {/* Single-Active-Gate Rail */}
        <GateRail
          activeGate={decisions.activeGate}
          passedGates={decisions.passedGates}
          ecrCount={decisions.ecrCount}
          readinessPct={gateAssessment.readinessPct}
          gateStatus={gateAssessment.status}
          onAdvanceGate={advanceGate}
          onRaiseECR={raiseECR}
          onResetRun={resetRun}
        />
        <div className="flex justify-end mt-1">
          <button onClick={() => setShowPrint(true)}
            className="text-[10px] px-2 py-0.5 rounded font-medium border transition-colors"
            style={{ borderColor: '#CBD5E1', color: '#64748B' }}>
            Print / PDF
          </button>
        </div>
      </header>

      {/* Main 2-panel body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left Diagnostic Canvas */}
        <div className="flex flex-col border-r" style={{ width: '58%', minWidth: 0, borderColor: '#E2E8F0' }}>
          {/* Canvas tab bar */}
          <div className="flex border-b bg-white flex-shrink-0" style={{ borderColor: '#E2E8F0' }}>
            {canvasTabs.map(t => (
              <button key={t.id} onClick={() => setCanvasTab(t.id)}
                className="text-[10px] font-medium px-3 py-1.5 border-r transition-colors"
                style={{
                  borderColor: '#E2E8F0',
                  background: canvasTab === t.id ? '#EFF6FF' : 'transparent',
                  color: canvasTab === t.id ? '#1D4ED8' : '#64748B',
                  fontWeight: canvasTab === t.id ? 600 : 400,
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Canvas content */}
          <div className="flex-1 overflow-hidden" style={{ background: '#F8FAFC' }}>
            {canvasTab === 'floorplan' && (
              <FloorplanSVG
                flowStations={flow.stations}
                cellFurniture={decisions.cellFurniture}
                fullMES={decisions.fullMES}
                machineInstalled={decisions.machineId !== 'UKR' || decisions.cellFurniture}
              />
            )}
            {canvasTab === 'celllayout' && (
              <CellLayoutSVG
                bayPositions={decisions.bayPositions}
                scenarioId={decisions.scenarioId}
                onBayPositionsChange={pos => update({ bayPositions: pos })}
              />
            )}
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
          <div className="flex border-b bg-white flex-shrink-0" style={{ borderColor: '#E2E8F0' }}>
            {([['decisions', 'Decisions'], ['facilitator', 'Control Tower'], ['export', 'Tecnomatix Export']] as [RightTab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setRightTab(id)}
                className="text-[10px] font-medium px-3 py-1.5 border-r transition-colors"
                style={{
                  borderColor: '#E2E8F0',
                  background: rightTab === id ? '#EFF6FF' : 'transparent',
                  color: rightTab === id ? '#1D4ED8' : '#64748B',
                  fontWeight: rightTab === id ? 600 : 400,
                }}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden" style={{ background: '#F8FAFC' }}>
            {rightTab === 'decisions' && (
              <DecisionPanel
                decisions={decisions}
                update={update}
                committed={committed}
                budget={scenario.capexBudgetGBP}
                gateAssessment={gateAssessment}
                spaghettiDistanceM={spaghettiDistanceM}
                shadowBoardAbsent={shadowBoardAbsent}
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
