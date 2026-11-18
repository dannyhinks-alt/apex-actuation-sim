
import { CpmNode } from '../../domain/engines/programmeFinanceEngine';
import { MonteCarloResult } from '../../domain/governance/monteCarlo';

interface Props {
  nodes: CpmNode[];
  monteCarlo: MonteCarloResult;
  targetGoLiveWeeks: number;
}

export function CpmMonteCarloChart({ nodes, monteCarlo, targetGoLiveWeeks }: Props) {
  const maxEF = Math.max(...nodes.map(n => n.ef), 1);

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">7-Node CPM Gantt & Monte Carlo Distribution</div>

      {/* Gantt bars */}
      <div className="space-y-1">
        {nodes.map(n => {
          const leftPct = (n.es / maxEF) * 100;
          const widthPct = Math.max((n.durationWeeks / maxEF) * 100, 2);
          const isCrit = n.onCriticalPath;
          return (
            <div key={n.id} className="flex items-center gap-2 text-[10px]">
              <span className={`w-6 font-mono font-bold ${isCrit ? 'text-rose-300' : 'text-slate-500'}`}>{n.id}</span>
              <div className="flex-1 h-5 relative bg-slate-800 rounded overflow-hidden">
                {/* Target line */}
                <div className="absolute top-0 h-full border-l border-dashed border-amber-500/60" style={{ left: `${(targetGoLiveWeeks / maxEF) * 100}%` }} />
                <div
                  className={`absolute top-0 h-full rounded flex items-center px-1 text-[9px] font-semibold text-white ${isCrit ? 'bg-rose-600' : 'bg-slate-600'}`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  {n.durationWeeks}w
                </div>
              </div>
              <div className="flex gap-1 text-[9px] text-slate-600 font-mono">
                <span>ES{n.es}</span>
                <span>EF{n.ef}</span>
                <span className={n.float === 0 ? 'text-rose-400' : 'text-slate-500'}>f={n.float}</span>
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-2 text-[10px] mt-1 ml-8">
          <div className="flex-1 relative h-3">
            <div className="absolute top-0 h-full border-l-2 border-dashed border-amber-500" style={{ left: `${(targetGoLiveWeeks / maxEF) * 100}%` }}>
              <span className="absolute -top-3 left-1 text-amber-400 text-[9px] whitespace-nowrap">Target Wk{targetGoLiveWeeks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monte Carlo P10/P50/P90 */}
      <div className="border-t border-slate-700 pt-3 space-y-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Monte Carlo (500 iterations) — Go-Live Forecast</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'P10 (optimistic)', val: monteCarlo.p10Weeks, colour: 'emerald' },
            { label: 'P50 (median)',     val: monteCarlo.p50Weeks, colour: 'blue' },
            { label: 'P90 (risk)',       val: monteCarlo.p90Weeks, colour: 'amber' },
          ].map(({ label, val, colour }) => {
            const over = val > targetGoLiveWeeks;
            return (
              <div key={label} className={`rounded bg-slate-800 border p-2 ${over ? 'border-rose-500/40' : `border-${colour}-500/30`}`}>
                <div className="text-[9px] text-slate-500 mb-0.5">{label}</div>
                <div className={`font-mono tabular-nums font-bold text-sm ${over ? 'text-rose-400' : `text-${colour}-400`}`}>
                  Wk {val.toFixed(1)}
                </div>
                {over && <div className="text-[9px] text-rose-400">▲ {(val - targetGoLiveWeeks).toFixed(1)}w late</div>}
              </div>
            );
          })}
        </div>

        {/* SQCDP pass probability bars */}
        <div className="space-y-1 mt-2">
          {[
            { label: 'S+Q pass prob', val: monteCarlo.sqPassProbability },
            { label: 'C+D pass prob', val: monteCarlo.cdPassProbability },
            { label: 'P pass prob',   val: monteCarlo.pPassProbability },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-2 text-[10px]">
              <span className="w-28 text-slate-400">{label}</span>
              <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${val >= 0.8 ? 'bg-emerald-500' : val >= 0.6 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${val * 100}%` }} />
              </div>
              <span className="font-mono tabular-nums text-slate-300 w-10 text-right">{(val * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
