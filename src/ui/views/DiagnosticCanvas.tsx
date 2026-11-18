import { useState } from 'react';
import { WorkstationResult } from '../../domain/engines/flowEngine';
import { CpmNode } from '../../domain/engines/programmeFinanceEngine';
import { RftResult } from '../../domain/engines/qualityYamazumiEngine';
import { MonteCarloResult } from '../../domain/governance/monteCarlo';

type ViewId = 'flow' | 'oee' | 'yamazumi' | 'cpm' | 'finance';

interface Props {
  flowStations: WorkstationResult[];
  systemLeadTimeDays: number;
  oee: number;
  teep: number;
  rft: RftResult;
  cpmNodes: CpmNode[];
  monteCarlo: MonteCarloResult;
  targetGoLiveWeeks: number;
  npv: number;
  paybackMonths: number;
  operatorCount: number;
  cellFurniture: boolean;
  fullMES: boolean;
  customerTaktMin: number;
  stationTimes: number[];
}

const VIEW_LABELS: Record<ViewId, string> = {
  flow: 'Flow & Constraint',
  oee: 'OEE / TEEP / RFT',
  yamazumi: 'Yamazumi',
  cpm: 'CPM & Monte Carlo',
  finance: 'Financial',
};

function Bar({ label, value, max, colour }: { label: string; value: number; max: number; colour: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-slate-400 truncate">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right font-mono tabular-nums text-slate-300">{(value * 100).toFixed(1)}%</span>
    </div>
  );
}

function FlowView({ stations, leadTimeDays }: { stations: WorkstationResult[]; leadTimeDays: number }) {
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Plant Flow & Constraint Migration</h3>
      <div className="text-xs text-slate-400">System lead time: <span className={`font-mono tabular-nums font-semibold ${leadTimeDays <= 5 ? 'text-emerald-400' : 'text-rose-400'}`}>{leadTimeDays.toFixed(1)} days</span></div>
      <div className="space-y-2">
        {stations.map((s, i) => {
          const utilPct = s.utilisation * 100;
          const colour = s.isBottleneck ? 'bg-rose-500' : utilPct > 80 ? 'bg-amber-400' : 'bg-emerald-500';
          return (
            <div key={s.id} className={`flex items-center gap-3 p-2 rounded border ${s.isBottleneck ? 'border-rose-500/50 bg-rose-900/10' : 'border-slate-700 bg-slate-800/50'}`}>
              <span className="w-4 text-xs text-slate-500 font-mono">{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className={s.isBottleneck ? 'text-rose-300 font-semibold' : 'text-slate-300'}>{s.id}{s.isBottleneck ? ' ⚠ BOTTLENECK' : ''}</span>
                  <span className="font-mono tabular-nums text-slate-400">Wq: {s.wqMin.toFixed(1)} min</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${colour}`} style={{ width: `${Math.min(100, utilPct)}%` }} />
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono tabular-nums">Utilisation: {utilPct.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OeeView({ oee, teep, rft }: { oee: number; teep: number; rft: RftResult }) {
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">OEE / TEEP & Rolled RFT Waterfall</h3>
      <div className="space-y-2">
        <Bar label="OEE" value={oee} max={1} colour={oee >= 0.85 ? 'bg-emerald-500' : oee >= 0.70 ? 'bg-amber-400' : 'bg-rose-500'} />
        <Bar label="TEEP" value={teep} max={1} colour="bg-blue-500" />
      </div>
      <div className="border-t border-slate-700 pt-2 space-y-2 mt-2">
        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">RFT Waterfall</div>
        <Bar label="Machining FPY" value={rft.fpyMachining} max={1} colour="bg-indigo-400" />
        <Bar label="Special Process FPY" value={rft.fpySpecial} max={1} colour="bg-indigo-500" />
        <Bar label="Assembly FPY" value={rft.fpyAssembly} max={1} colour="bg-indigo-600" />
        <Bar label="Test FPY" value={rft.fpyTest} max={1} colour="bg-indigo-700" />
        <div className={`flex justify-between text-xs font-semibold pt-1 border-t border-slate-700 ${rft.rolledRFT >= 0.990 ? 'text-emerald-400' : rft.rolledRFT >= 0.950 ? 'text-amber-400' : 'text-rose-400'}`}>
          <span>Rolled RFT</span>
          <span className="font-mono tabular-nums">{(rft.rolledRFT * 100).toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

function YamazumiView({ operatorCount, stationTimes, customerTaktMin }: { operatorCount: number; stationTimes: number[]; customerTaktMin: number }) {
  const maxTime = Math.max(...stationTimes, customerTaktMin);
  const colours = ['bg-blue-500','bg-indigo-500','bg-purple-500','bg-violet-500','bg-fuchsia-500'];
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Multi-Operator Yamazumi ({operatorCount} operators)</h3>
      <div className="flex items-end gap-3 h-40 mt-2">
        {stationTimes.map((t, i) => {
          const h = (t / maxTime) * 100;
          const over = t > customerTaktMin;
          return (
            <div key={i} className="flex flex-col items-center flex-1">
              <span className={`text-[10px] font-mono tabular-nums mb-1 ${over ? 'text-rose-400' : 'text-slate-400'}`}>{t.toFixed(2)}m</span>
              <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                <div className={`w-full rounded-t ${colours[i % colours.length]} ${over ? 'ring-1 ring-rose-400' : ''}`} style={{ height: `${h}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 mt-1">S{i + 1}</span>
            </div>
          );
        })}
        {/* Takt line */}
      </div>
      <div className="text-xs text-slate-400">
        Customer takt: <span className="font-mono tabular-nums text-amber-400">{customerTaktMin.toFixed(2)} min</span>
      </div>
    </div>
  );
}

function CpmView({ nodes, monteCarlo, targetGoLiveWeeks }: { nodes: CpmNode[]; monteCarlo: MonteCarloResult; targetGoLiveWeeks: number }) {
  const maxEF = Math.max(...nodes.map(n => n.ef));
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">7-Node CPM & Monte Carlo P10/P50/P90</h3>
      <div className="space-y-1">
        {nodes.map(n => {
          const leftPct = (n.es / maxEF) * 100;
          const widthPct = (n.durationWeeks / maxEF) * 100;
          return (
            <div key={n.id} className="flex items-center gap-2 text-xs">
              <span className="w-6 text-slate-500 font-mono">{n.id}</span>
              <div className="flex-1 h-5 relative bg-slate-800 rounded">
                <div
                  className={`absolute top-0 h-full rounded flex items-center px-1 text-[10px] text-white overflow-hidden ${n.onCriticalPath ? 'bg-rose-600' : 'bg-slate-600'}`}
                  style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                >
                  {n.durationWeeks}w
                </div>
              </div>
              <span className={`w-10 text-right font-mono tabular-nums text-[10px] ${n.float === 0 ? 'text-rose-300' : 'text-slate-500'}`}>
                f={n.float}
              </span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-slate-700 pt-2 grid grid-cols-3 gap-2 text-center">
        {[['P10', monteCarlo.p10Weeks], ['P50', monteCarlo.p50Weeks], ['P90', monteCarlo.p90Weeks]].map(([label, val]) => (
          <div key={label as string} className={`rounded bg-slate-800 p-1.5 ${Number(val) > targetGoLiveWeeks ? 'border border-amber-500/40' : 'border border-slate-700'}`}>
            <div className="text-[10px] text-slate-500">{label}</div>
            <div className="font-mono tabular-nums text-xs font-semibold text-slate-200">{Number(val).toFixed(1)}w</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-500">
        SQ pass prob: <span className="text-slate-300 font-mono">{(monteCarlo.sqPassProbability * 100).toFixed(0)}%</span> ·
        CD pass prob: <span className="text-slate-300 font-mono">{(monteCarlo.cdPassProbability * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function FinanceView({ npv, paybackMonths }: { npv: number; paybackMonths: number }) {
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Financial Analysis</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded bg-slate-800 border p-3 ${npv >= 0 ? 'border-emerald-500/40' : 'border-rose-500/40'}`}>
          <div className="text-[10px] text-slate-500 mb-1">36-Month NPV @ 10%</div>
          <div className={`font-mono tabular-nums font-semibold ${npv >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {npv >= 0 ? '+' : ''}£{Math.round(npv).toLocaleString('en-GB')}
          </div>
        </div>
        <div className={`rounded bg-slate-800 border p-3 ${paybackMonths <= 15 ? 'border-emerald-500/40' : 'border-amber-500/40'}`}>
          <div className="text-[10px] text-slate-500 mb-1">Cash-Flow Payback</div>
          <div className={`font-mono tabular-nums font-semibold ${paybackMonths <= 12 ? 'text-emerald-400' : paybackMonths <= 15 ? 'text-amber-400' : 'text-rose-400'}`}>
            {isFinite(paybackMonths) ? `${paybackMonths.toFixed(1)} months` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DiagnosticCanvas(props: Props) {
  const [view, setView] = useState<ViewId>('flow');

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded border border-slate-800">
      {/* View tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        {(Object.keys(VIEW_LABELS) as ViewId[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${view === v ? 'border-blue-500 text-blue-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
      {/* View content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'flow'    && <FlowView stations={props.flowStations} leadTimeDays={props.systemLeadTimeDays} />}
        {view === 'oee'     && <OeeView oee={props.oee} teep={props.teep} rft={props.rft} />}
        {view === 'yamazumi'&& <YamazumiView operatorCount={props.operatorCount} stationTimes={props.stationTimes} customerTaktMin={props.customerTaktMin} />}
        {view === 'cpm'     && <CpmView nodes={props.cpmNodes} monteCarlo={props.monteCarlo} targetGoLiveWeeks={props.targetGoLiveWeeks} />}
        {view === 'finance' && <FinanceView npv={props.npv} paybackMonths={props.paybackMonths} />}
      </div>
    </div>
  );
}
