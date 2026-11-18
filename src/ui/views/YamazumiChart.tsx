
import { YAMAZUMI_ELEMENTS } from '../../domain/baseline/yamazumiElements';

interface Props {
  operatorCount: number;
  cellFurnitureInstalled: boolean;
  fullMESInstalled: boolean;
  customerTaktMin: number;
  stationTimes: number[];
  lbr: number;
  onUpdateOps: (n: number) => void;
}

const ELEMENT_COLOURS: Record<string, string> = {
  E1: '#6366f1', E2: '#8b5cf6', E3: '#a78bfa',
  E4: '#475569',
  E5: '#0ea5e9', E6: '#f59e0b', E7: '#f97316', E8: '#10b981',
};

export function YamazumiChart({ operatorCount, cellFurnitureInstalled, fullMESInstalled, customerTaktMin, stationTimes, lbr, onUpdateOps }: Props) {
  const activeElements = YAMAZUMI_ELEMENTS.filter(e => {
    if (e.automatic) return false;
    if (e.id === 'E6' && cellFurnitureInstalled) return false;
    if (e.id === 'E7' && fullMESInstalled) return false;
    return true;
  });

  const maxTime = Math.max(...stationTimes, customerTaktMin, 0.1);
  const chartH = 160;

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Multi-Operator Yamazumi — {operatorCount} Operators</div>
        <div className={`text-xs font-mono tabular-nums font-semibold ${lbr >= 0.85 ? 'text-emerald-400' : 'text-amber-400'}`}>LBR {(lbr * 100).toFixed(1)}%</div>
      </div>

      {/* Operator count stepper */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-400">Operators:</span>
        {[2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => onUpdateOps(n)}
            className={`w-7 h-7 rounded text-xs font-mono font-semibold transition-colors ${operatorCount === n ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            {n}
          </button>
        ))}
        <span className={`ml-auto text-xs ${lbr >= 0.85 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {lbr >= 0.85 ? '✅ LBR ≥ 85%' : `⚠ LBR ${(lbr * 100).toFixed(1)}% < 85%`}
        </span>
      </div>

      {/* Bar chart */}
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${Math.max(operatorCount * 55 + 20, 200)} ${chartH + 30}`} className="w-full h-full">
          {/* Takt line */}
          <line
            x1="10" y1={chartH * (1 - customerTaktMin / maxTime)}
            x2={operatorCount * 55 + 10} y2={chartH * (1 - customerTaktMin / maxTime)}
            stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="6 3"
          />
          <text x={operatorCount * 55 + 12} y={chartH * (1 - customerTaktMin / maxTime) + 4} fontSize="7" fill="#fbbf24">Takt {customerTaktMin.toFixed(2)}m</text>

          {/* Bars */}
          {stationTimes.map((t, si) => {
            const barH = (t / maxTime) * chartH;
            const barX = si * 55 + 15;
            const barY = chartH - barH;
            const over = t > customerTaktMin;

            // Approximate element contribution within station
            const totalActive = activeElements.reduce((s, e) => s + e.durationMin, 0);
            let yOff = chartH;
            return (
              <g key={si}>
                {activeElements.map((el, ei) => {
                  const segH = totalActive > 0 ? (el.durationMin / totalActive) * barH : barH / activeElements.length;
                  yOff -= segH;
                  const r = (
                    <rect key={el.id} x={barX} y={yOff} width={40} height={segH}
                      fill={ELEMENT_COLOURS[el.id] ?? '#64748b'}
                      stroke="#0f172a" strokeWidth="0.5"
                      rx={ei === activeElements.length - 1 ? '2' : '0'}
                    />
                  );
                  if (ei === activeElements.length - 1) yOff = chartH; // reset for next bar
                  return r;
                })}
                {/* Over-takt indicator */}
                {over && <rect x={barX - 1} y={barY - 1} width={42} height={barH + 2} fill="none" stroke="#f43f5e" strokeWidth="1.5" rx="2" />}
                <text x={barX + 20} y={barY - 4} fontSize="7" textAnchor="middle" fill={over ? '#f43f5e' : '#94a3b8'} fontWeight="bold">
                  {t.toFixed(2)}m
                </text>
                <text x={barX + 20} y={chartH + 10} fontSize="7" textAnchor="middle" fill="#64748b">S{si + 1}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-2">
        {YAMAZUMI_ELEMENTS.map(e => {
          const eliminated = (e.id === 'E6' && cellFurnitureInstalled) || (e.id === 'E7' && fullMESInstalled) || e.automatic;
          return (
            <div key={e.id} className={`flex items-center gap-1 text-[10px] ${eliminated ? 'opacity-30 line-through' : ''}`}>
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: ELEMENT_COLOURS[e.id] ?? '#64748b' }} />
              <span className="text-slate-400">{e.id}: {e.label.substring(0, 14)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
