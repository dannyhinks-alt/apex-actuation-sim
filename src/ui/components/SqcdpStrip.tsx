

interface SqcdpTile {
  letter: string;
  label: string;
  value: string;
  status: 'green' | 'amber' | 'red';
}

interface Props {
  tiles: SqcdpTile[];
  capexRemaining: number;
  goLiveForecastWeeks: number;
  targetGoLiveWeeks: number;
  fingerprint: string;
}

function ragClass(status: 'green' | 'amber' | 'red') {
  if (status === 'green') return 'text-emerald-400 border-emerald-500/40';
  if (status === 'amber') return 'text-amber-400 border-amber-400/40';
  return 'text-rose-400 border-rose-500/40';
}

export function SqcdpStrip({ tiles, capexRemaining, goLiveForecastWeeks, targetGoLiveWeeks, fingerprint }: Props) {
  const goLiveStatus: 'green' | 'amber' | 'red' =
    goLiveForecastWeeks <= targetGoLiveWeeks ? 'green' :
    goLiveForecastWeeks <= targetGoLiveWeeks + 2 ? 'amber' : 'red';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {tiles.map(t => (
        <div key={t.letter} className={`flex flex-col items-center px-3 py-1 rounded border bg-slate-900 min-w-[72px] ${ragClass(t.status)}`}>
          <span className="text-xs font-bold tracking-wider opacity-70">{t.letter}</span>
          <span className="text-sm font-mono tabular-nums font-semibold leading-tight">{t.value}</span>
          <span className="text-[10px] opacity-60 leading-none mt-0.5">{t.label}</span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-4 text-xs font-mono tabular-nums">
        <span className="text-slate-400">CapEx remaining:</span>
        <span className={`font-semibold ${capexRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          £{Math.abs(capexRemaining).toLocaleString('en-GB')}
          {capexRemaining < 0 ? ' OVER' : ''}
        </span>
        <span className="text-slate-400">Go-Live forecast:</span>
        <span className={`font-semibold ${goLiveStatus === 'green' ? 'text-emerald-400' : goLiveStatus === 'amber' ? 'text-amber-400' : 'text-rose-400'}`}>
          Wk {goLiveForecastWeeks}
        </span>
        <span className="text-slate-600 text-[10px]">FP:{fingerprint}</span>
      </div>
    </div>
  );
}
