
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
    <div className="p-4 space-y-4 h-full overflow-y-auto" style={{ background: '#FFFFFF' }}>
      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#334155' }}>7-Node CPM Gantt & Monte Carlo Distribution</div>

      {/* Gantt bars */}
      <div className="space-y-1">
        {nodes.map(n => {
          const leftPct = (n.es / maxEF) * 100;
          const widthPct = Math.max((n.durationWeeks / maxEF) * 100, 2);
          const isCrit = n.onCriticalPath;
          return (
            <div key={n.id} className="flex items-center gap-2 text-[10px]">
              <span className="w-6 font-mono font-bold" style={{ color: isCrit ? '#DC2626' : '#94A3B8' }}>{n.id}</span>
              <div className="flex-1 h-5 relative rounded overflow-hidden" style={{ background: '#F1F5F9' }}>
                {/* Target line */}
                <div className="absolute top-0 h-full" style={{ left: `${(targetGoLiveWeeks / maxEF) * 100}%`, borderLeft: '1px dashed #D97706' }} />
                <div
                  className="absolute top-0 h-full rounded flex items-center px-1 text-[9px] font-semibold text-white"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: isCrit ? '#DC2626' : '#94A3B8' }}
                >
                  {n.durationWeeks}w
                </div>
              </div>
              <div className="flex gap-1 text-[9px] font-mono" style={{ color: '#94A3B8' }}>
                <span>ES{n.es}</span>
                <span>EF{n.ef}</span>
                <span style={{ color: n.float === 0 ? '#DC2626' : '#94A3B8' }}>f={n.float}</span>
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-2 text-[10px] mt-1 ml-8">
          <div className="flex-1 relative h-3">
            <div className="absolute top-0 h-full" style={{ left: `${(targetGoLiveWeeks / maxEF) * 100}%`, borderLeft: '2px dashed #D97706' }}>
              <span className="absolute -top-3 left-1 text-[9px] whitespace-nowrap" style={{ color: '#D97706' }}>Target Wk{targetGoLiveWeeks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monte Carlo P10/P50/P90 */}
      <div className="pt-3 space-y-2" style={{ borderTop: '1px solid #E2E8F0' }}>
        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>Monte Carlo (500 iterations) — Go-Live Forecast</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'P10 (optimistic)', val: monteCarlo.p10Weeks, colour: '#059669' },
            { label: 'P50 (median)',     val: monteCarlo.p50Weeks, colour: '#1D4ED8' },
            { label: 'P90 (risk)',       val: monteCarlo.p90Weeks, colour: '#D97706' },
          ].map(({ label, val, colour }) => {
            const over = val > targetGoLiveWeeks;
            return (
              <div key={label} className="rounded p-2" style={{ border: `1px solid ${over ? '#FCA5A5' : '#E2E8F0'}`, background: over ? '#FFF5F5' : '#F8FAFC' }}>
                <div className="text-[9px] mb-0.5" style={{ color: '#64748B' }}>{label}</div>
                <div className="font-mono tabular-nums font-bold text-sm" style={{ color: over ? '#DC2626' : colour }}>
                  Wk {val.toFixed(1)}
                </div>
                {over && <div className="text-[9px]" style={{ color: '#DC2626' }}>▲ {(val - targetGoLiveWeeks).toFixed(1)}w late</div>}
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
              <span className="w-28" style={{ color: '#475569' }}>{label}</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                <div className="h-full rounded-full" style={{
                  width: `${val * 100}%`,
                  background: val >= 0.8 ? '#059669' : val >= 0.6 ? '#D97706' : '#DC2626',
                }} />
              </div>
              <span className="font-mono tabular-nums w-10 text-right" style={{ color: '#334155' }}>{(val * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
