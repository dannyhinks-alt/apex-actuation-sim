
import { SimDecisions } from '../hooks/useSimState';
import { GateExitResult } from '../../domain/governance/gateStateMachine';
import { FinanceResult } from '../../domain/engines/programmeFinanceEngine';
import { RftResult, YamazumiResult } from '../../domain/engines/qualityYamazumiEngine';
import { CapacityResult } from '../../domain/engines/capacityEngine';
import { MonteCarloResult } from '../../domain/governance/monteCarlo';
import { CpmResult } from '../../domain/engines/programmeFinanceEngine';

interface Props {
  decisions: SimDecisions;
  scenarioLabel: string;
  scenarioCapex: number;
  scenarioGoLive: number;
  machineId: string;
  committed: number;
  capacity: CapacityResult;
  rft: RftResult;
  yamazumi: YamazumiResult;
  finance: FinanceResult;
  cpm: CpmResult;
  monteCarlo: MonteCarloResult;
  gateAssessment: GateExitResult;
  fingerprint: string;
  onClose: () => void;
}

export function PrintReportView({
  decisions, scenarioLabel, scenarioCapex, scenarioGoLive, machineId,
  committed, capacity, rft, yamazumi, finance, cpm, monteCarlo,
  gateAssessment, fingerprint, onClose,
}: Props) {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const ragColour = (s: 'Green' | 'Amber' | 'Red') => s === 'Green' ? '#10b981' : s === 'Amber' ? '#f59e0b' : '#f43f5e';

  function handlePrint() { window.print(); }

  const allVerdicts = [
    ...gateAssessment.amberActions.map(a => `⚠ ${a}`),
    ...gateAssessment.redBlockReasons.map(r => `🔴 ${r}`),
    ...(gateAssessment.status === 'Green' ? ['✅ All gate exit criteria passed'] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white text-slate-900 w-[210mm] min-h-[297mm] p-10 shadow-2xl rounded" id="print-report">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Apex Actuation Systems</h1>
            <h2 className="text-base font-semibold text-slate-600">Manufacturing Investment Gate Review Report</h2>
            <p className="text-xs text-slate-500 mt-1">
              Generated: {dateStr} | Fingerprint: <span className="font-mono font-bold">{fingerprint}</span>
            </p>
          </div>
          <div className="px-3 py-1 rounded text-white text-sm font-bold" style={{ background: ragColour(gateAssessment.status) }}>
            Gate {decisions.currentGate} — {gateAssessment.status}
          </div>
        </div>

        {/* Programme Context */}
        <section className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1 mb-3">Programme Context</h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              ['Scenario',         scenarioLabel],
              ['Machine',          machineId],
              ['Approved Budget',  `£${(scenarioCapex/1000).toFixed(0)}k`],
              ['Committed CapEx',  `£${(committed/1000).toFixed(0)}k`],
              ['Target Go-Live',   `Week ${scenarioGoLive}`],
              ['CPM Forecast',     `Week ${cpm.projectDurationWeeks}`],
            ].map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded p-2">
                <div className="text-slate-500 text-[10px]">{k}</div>
                <div className="font-mono font-bold text-sm">{v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Gate Exit */}
        <section className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1 mb-3">Gate Exit Criteria</h3>
          <div className="space-y-1 text-xs">
            {allVerdicts.map((v, i) => (
              <div key={i} className="flex items-start gap-2">
                <span>{v.startsWith('⚠') ? '⚠️' : v.startsWith('🔴') ? '🔴' : '✅'}</span>
                <span className="text-slate-700">{v.replace(/^[✅⚠🔴]\s*/, '')}</span>
              </div>
            ))}
          </div>
          {gateAssessment.rebaselinePenaltyWeeks > 0 && (
            <div className="mt-2 text-xs text-amber-700 font-semibold">
              Rebaseline Penalty: +{gateAssessment.rebaselinePenaltyWeeks} week(s) if re-opened
            </div>
          )}
        </section>

        {/* KPIs */}
        <section className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1 mb-3">Key Performance Indicators</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-2 font-semibold text-slate-600">Metric</th>
                <th className="text-right p-2 font-semibold text-slate-600">Baseline</th>
                <th className="text-right p-2 font-semibold text-slate-600">Current</th>
                <th className="text-right p-2 font-semibold text-slate-600">Target</th>
                <th className="text-right p-2 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { m: 'OEE',           base: '70.91%', cur: `${(capacity.oee*100).toFixed(2)}%`,       tgt: '≥80.0%',  pass: capacity.oee >= 0.80 },
                { m: 'TEEP',          base: '54.55%', cur: `${(capacity.teep*100).toFixed(2)}%`,      tgt: '≥60.0%',  pass: capacity.teep >= 0.60 },
                { m: 'Rolled RFT',    base: '87.56%', cur: `${(rft.rolledRFT*100).toFixed(2)}%`,     tgt: '≥99.0%',  pass: rft.rolledRFT >= 0.990 },
                { m: 'Internal LBR',  base: '82.46%', cur: `${(yamazumi.lbr*100).toFixed(2)}%`,       tgt: '≥85.0%',  pass: yamazumi.lbr >= 0.85 },
                { m: '36-Month NPV',  base: '—',      cur: `£${(finance.npv36MonthGBP/1000).toFixed(0)}k`, tgt: '>£0', pass: finance.npv36MonthGBP > 0 },
                { m: 'P50 Go-Live',   base: '—',      cur: `Wk ${monteCarlo.p50Weeks.toFixed(1)}`,   tgt: `≤Wk ${scenarioGoLive}`, pass: monteCarlo.p50Weeks <= scenarioGoLive },
              ].map(row => (
                <tr key={row.m} className="border-t border-slate-200">
                  <td className="p-2 font-semibold text-slate-700">{row.m}</td>
                  <td className="p-2 text-right font-mono text-slate-500">{row.base}</td>
                  <td className="p-2 text-right font-mono font-bold">{row.cur}</td>
                  <td className="p-2 text-right font-mono text-slate-500">{row.tgt}</td>
                  <td className="p-2 text-right">{row.pass
                    ? <span className="text-emerald-600 font-semibold">PASS</span>
                    : <span className="text-rose-600 font-semibold">FAIL</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Decisions */}
        <section className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1 mb-3">Decisions Taken</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {([
              ['Machine Provenance',   machineId],
              ['Cell Furniture',        decisions.cellFurniture ? 'Installed' : 'Not installed'],
              ['Poka-Yoke',             decisions.pokaYoke ? 'Installed' : 'Not installed'],
              ['Full MES',              decisions.fullMES ? 'Installed' : 'Not installed'],
              ['Automated Test Rig',    decisions.automatedTestRig ? 'Installed' : 'Not installed'],
              ['FAT Expediting',        decisions.fatExpediting ? 'Active' : 'Standard'],
              ['Night Shift',           decisions.nightShiftActive ? 'Active' : 'Day shift only'],
              ['Shadow Board',          decisions.shadowBoardAbsent ? 'Absent' : 'Present'],
              ['Operators',             `${decisions.operatorCount}`],
              ['Current Gate',          `Gate ${decisions.currentGate}`],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between bg-slate-50 px-2 py-1 rounded">
                <span className="text-slate-500">{k}</span>
                <span className="font-mono font-semibold text-slate-700">{v}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-slate-300 pt-3 text-[10px] text-slate-400 flex justify-between">
          <span>Apex Actuation Systems — Confidential Investment Gate Review</span>
          <span>{fingerprint}</span>
        </div>
      </div>

      {/* Print controls */}
      <div className="fixed top-4 right-4 flex gap-2 no-print z-60">
        <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded shadow">
          Print / Save PDF
        </button>
        <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2 rounded shadow">
          Close
        </button>
      </div>
    </div>
  );
}
