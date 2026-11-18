
import { WorkstationResult } from '../../domain/engines/flowEngine';

interface Props {
  flowStations: WorkstationResult[];
  cellFurniture: boolean;
  fullMES: boolean;
  machineInstalled: boolean;
}

const ZONES = [
  { id: 'Mill',        x: 10,  y: 10, w: 160, h: 100, label: 'Mill & Machining' },
  { id: 'HeatTreat',  x: 10,  y: 120, w: 100, h: 80,  label: 'Heat Treat & NDT ⚠' },
  { id: 'Assembly',   x: 120, y: 120, w: 110, h: 80,  label: 'Assembly Cell' },
  { id: 'Test',       x: 10,  y: 210, w: 160, h: 60,  label: 'Endurance Test Bay' },
  { id: 'Despatch',   x: 10,  y: 280, w: 160, h: 40,  label: 'Despatch' },
] as const;

const FLOW_PATH = 'M 90,110 L 60,120 L 60,200 L 90,210 L 90,270 L 90,280';

function ragColour(util: number, isBottleneck: boolean) {
  if (isBottleneck) return '#f43f5e';
  if (util > 0.80) return '#fbbf24';
  return '#34d399';
}

export function FloorplanSVG({ flowStations, machineInstalled }: Props) {
  const stationMap = Object.fromEntries(flowStations.map(s => [s.id, s]));
  const millB = stationMap['MillB'];
  const ht = stationMap['HeatTreat'];
  const asm = stationMap['Assembly'];
  const tst = stationMap['TestBay'];

  return (
    <div className="p-3 h-full">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Whole-Plant Flow & Constraint Map (120m × 72m)</div>
      <svg viewBox="0 0 240 340" className="w-full h-[calc(100%-28px)]" style={{ fontFamily: 'monospace' }}>
        {/* Zone rectangles */}
        {ZONES.map(z => {
          let fill = '#1e293b';
          let stroke = '#334155';
          if (z.id === 'HeatTreat') { fill = '#1c1917'; stroke = '#78350f'; }
          return (
            <g key={z.id}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={fill} stroke={stroke} strokeWidth="1" rx="3" />
              <text x={z.x + 4} y={z.y + 12} fontSize="7" fill="#64748b">{z.label}</text>
            </g>
          );
        })}

        {/* Heat Treat monument hatch */}
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#78350f" strokeWidth="1" opacity="0.4" />
          </pattern>
        </defs>
        <rect x="10" y="120" width="100" height="80" fill="url(#hatch)" rx="3" />
        <text x="12" y="162" fontSize="6" fill="#f59e0b">🔒 MONUMENT</text>

        {/* Animated flow path */}
        <path d={FLOW_PATH} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6">
          <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite" />
        </path>

        {/* Mill B utilisation badge */}
        {millB && (
          <g>
            <circle cx="90" cy="60" r="22" fill="#0f172a" stroke={ragColour(millB.utilisation, millB.isBottleneck)} strokeWidth="2" />
            <text x="90" y="56" fontSize="7" textAnchor="middle" fill={ragColour(millB.utilisation, millB.isBottleneck)} fontWeight="bold">Mill B</text>
            <text x="90" y="66" fontSize="8" textAnchor="middle" fill={ragColour(millB.utilisation, millB.isBottleneck)} fontWeight="bold">{(millB.utilisation * 100).toFixed(0)}%</text>
            {millB.isBottleneck && (
              <circle cx="90" cy="60" r="26" fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.5">
                <animate attributeName="r" values="22;28;22" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            {machineInstalled && (
              <text x="90" y="78" fontSize="6" textAnchor="middle" fill="#818cf8">NEW CELL ✓</text>
            )}
          </g>
        )}

        {/* Heat Treat badge */}
        {ht && (
          <g>
            <circle cx="60" cy="162" r="16" fill="#1c1917" stroke={ragColour(ht.utilisation, ht.isBottleneck)} strokeWidth="1.5" />
            <text x="60" y="158" fontSize="6" textAnchor="middle" fill={ragColour(ht.utilisation, ht.isBottleneck)}>HT/NDT</text>
            <text x="60" y="168" fontSize="7" textAnchor="middle" fill={ragColour(ht.utilisation, ht.isBottleneck)} fontWeight="bold">{(ht.utilisation * 100).toFixed(0)}%</text>
            {ht.isBottleneck && (
              <circle cx="60" cy="162" r="20" fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.5">
                <animate attributeName="r" values="16;22;16" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        )}

        {/* Assembly badge */}
        {asm && (
          <g>
            <circle cx="175" cy="162" r="16" fill="#0f172a" stroke={ragColour(asm.utilisation, asm.isBottleneck)} strokeWidth="1.5" />
            <text x="175" y="158" fontSize="6" textAnchor="middle" fill={ragColour(asm.utilisation, asm.isBottleneck)}>Asm</text>
            <text x="175" y="168" fontSize="7" textAnchor="middle" fill={ragColour(asm.utilisation, asm.isBottleneck)} fontWeight="bold">{(asm.utilisation * 100).toFixed(0)}%</text>
          </g>
        )}

        {/* Test badge */}
        {tst && (
          <g>
            <circle cx="90" cy="241" r="16" fill="#0f172a" stroke={ragColour(tst.utilisation, tst.isBottleneck)} strokeWidth="1.5" />
            <text x="90" y="237" fontSize="6" textAnchor="middle" fill={ragColour(tst.utilisation, tst.isBottleneck)}>Test</text>
            <text x="90" y="247" fontSize="7" textAnchor="middle" fill={ragColour(tst.utilisation, tst.isBottleneck)} fontWeight="bold">{(tst.utilisation * 100).toFixed(0)}%</text>
            {tst.isBottleneck && (
              <circle cx="90" cy="241" r="20" fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.5">
                <animate attributeName="r" values="16;22;16" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        )}

        {/* Legend */}
        <g transform="translate(170,290)">
          <circle cx="6" cy="6" r="4" fill="#34d399" />
          <text x="13" y="9" fontSize="6" fill="#94a3b8">OK</text>
          <circle cx="6" cy="17" r="4" fill="#fbbf24" />
          <text x="13" y="20" fontSize="6" fill="#94a3b8">&gt;80%</text>
          <circle cx="6" cy="28" r="4" fill="#f43f5e" />
          <text x="13" y="31" fontSize="6" fill="#94a3b8">BN</text>
        </g>
      </svg>
    </div>
  );
}
