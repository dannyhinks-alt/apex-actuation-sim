import { useState } from 'react';
import { BayPosition } from '../hooks/useSimState';
import { ScenarioId } from '../../domain/baseline/scenarios';

interface Asset {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  moveable: boolean;
  colour: string;
}

interface Props {
  bayPositions: BayPosition[];
  scenarioId: ScenarioId;
  onBayPositionsChange: (positions: BayPosition[]) => void;
}

const ASSET_DEFAULTS: Omit<Asset, 'x' | 'y'>[] = [
  { id: 'cell5ax',  label: '5-Axis Cell',         w: 70, h: 50, moveable: true,  colour: '#1D4ED8' },
  { id: 'ucell',    label: 'U-Cell Sub-Asm',       w: 60, h: 40, moveable: true,  colour: '#0891b2' },
  { id: 'kitting',  label: 'Kitting Racks',        w: 50, h: 30, moveable: true,  colour: '#059669' },
  { id: 'testrig',  label: 'Endurance Test Rig',   w: 70, h: 50, moveable: true,  colour: '#7c3aed' },
];

const MONUMENT: Asset = { id: 'ht', label: '🔒 Heat Treat & NDT', x: 90, y: 110, w: 90, h: 60, moveable: false, colour: '#92400e' };

/** High-Temp / Heavy Foundation Exclusion Zone (Scenario C). */
const EXCLUSION_ZONE = { x: 150, y: 105, w: 40, h: 70, label: 'High-Temp / Heavy Foundation Zone' };

const BAY_W = 240;
const BAY_H = 180;

function travelDistance(movableAssets: Asset[]): number {
  const pts = movableAssets.map(a => ({ x: a.x + a.w / 2, y: a.y + a.h / 2 }));
  let dist = 0;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!;
    const q = pts[i]!;
    dist += Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2);
  }
  // SVG 240×180 represents 30m×20m → scale = 0.125 m/px
  return dist * 0.125;
}

export function CellLayoutSVG({ bayPositions, scenarioId, onBayPositionsChange }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });

  // Merge bay positions from parent state with asset defaults
  const movableAssets: Asset[] = ASSET_DEFAULTS.map(def => {
    const pos = bayPositions.find(p => p.id === def.id) ?? { id: def.id, x: 0, y: 0 };
    return { ...def, x: pos.x, y: pos.y };
  });

  const dist = travelDistance(movableAssets);
  const aisleOk = movableAssets.every(a => Math.abs(a.x - 90) > 8 || Math.abs(a.y - 110) > 8);
  const distOk = dist <= 26;
  const showExclusionZone = scenarioId === 'C';

  function onMouseDown(e: React.MouseEvent<SVGRectElement>, id: string) {
    const a = movableAssets.find(x => x.id === id)!;
    const svgEl = (e.currentTarget.ownerSVGElement as SVGSVGElement);
    const rect = svgEl.getBoundingClientRect();
    const scaleX = BAY_W / rect.width;
    const scaleY = BAY_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    setDragging(id);
    setDragOffset({ dx: mx - a.x, dy: my - a.y });
    e.preventDefault();
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragging) return;
    const svgEl = e.currentTarget as SVGSVGElement;
    const rect = svgEl.getBoundingClientRect();
    const scaleX = BAY_W / rect.width;
    const scaleY = BAY_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const def = ASSET_DEFAULTS.find(a => a.id === dragging)!;
    const newX = Math.max(0, Math.min(BAY_W - def.w, mx - dragOffset.dx));
    const newY = Math.max(0, Math.min(BAY_H - def.h, my - dragOffset.dy));
    const updated = movableAssets.map(a =>
      a.id === dragging ? { ...a, x: newX, y: newY } : a
    );
    onBayPositionsChange(updated.map(a => ({ id: a.id, x: a.x, y: a.y })));
  }

  function onMouseUp() { setDragging(null); }

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#334155' }}>
        Cell Layout Canvas (30m × 20m) — Drag to reposition assets
      </div>
      <div className="flex gap-4 text-xs mb-2 flex-wrap">
        <span style={{ color: '#475569' }}>Spaghetti dist:
          <span className="font-mono font-semibold ml-1 tabular-nums" style={{ color: distOk ? '#059669' : dist <= 32 ? '#D97706' : '#DC2626' }}>
            {dist.toFixed(1)} m {distOk ? '✅ ≤26m target' : dist <= 32 ? '🟡 reduce to ≤26m' : '🔴 too long'}
          </span>
        </span>
        <span style={{ color: aisleOk ? '#059669' : '#DC2626' }}>{aisleOk ? '✅ Aisle clearance OK' : '🔴 Aisle hazard — HT perimeter violated'}</span>
        {showExclusionZone && <span style={{ color: '#D97706' }}>⚠ High-Temp Exclusion Zone active (Scenario C)</span>}
      </div>
      <svg
        viewBox={`0 0 ${BAY_W} ${BAY_H}`}
        className="flex-1 w-full rounded cursor-default select-none"
        style={{ border: '1px solid #E2E8F0', background: '#FFFFFF' }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Light grid */}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={BAY_H} stroke="#E2E8F0" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 45} x2={BAY_W} y2={i * 45} stroke="#E2E8F0" strokeWidth="0.5" />
        ))}

        {/* Scenario C: High-Temp / Heavy Foundation Exclusion Zone (hatched) */}
        {showExclusionZone && (
          <g>
            <defs>
              <pattern id="excl-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#D97706" strokeWidth="1.5" opacity="0.4" />
              </pattern>
            </defs>
            <rect x={EXCLUSION_ZONE.x} y={EXCLUSION_ZONE.y} width={EXCLUSION_ZONE.w} height={EXCLUSION_ZONE.h}
              fill="url(#excl-hatch)" stroke="#D97706" strokeWidth="1.5" strokeDasharray="5 3" rx="2" opacity="0.8" />
            <text x={EXCLUSION_ZONE.x + EXCLUSION_ZONE.w / 2} y={EXCLUSION_ZONE.y + EXCLUSION_ZONE.h / 2 - 5}
              fontSize="5.5" textAnchor="middle" fill="#D97706" pointerEvents="none" fontWeight="600">High-Temp</text>
            <text x={EXCLUSION_ZONE.x + EXCLUSION_ZONE.w / 2} y={EXCLUSION_ZONE.y + EXCLUSION_ZONE.h / 2 + 4}
              fontSize="5.5" textAnchor="middle" fill="#D97706" pointerEvents="none">Exclusion Zone</text>
          </g>
        )}

        {/* Spaghetti path (movable assets only, cobalt dashed) */}
        <polyline
          points={movableAssets.map(a => `${a.x + a.w / 2},${a.y + a.h / 2}`).join(' ')}
          fill="none" stroke="#1D4ED8" strokeWidth="1" strokeDasharray="4 3" opacity="0.6"
        />

        {/* Monument: Heat Treat & NDT */}
        <g>
          <defs>
            <pattern id="hatch-ht" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#b45309" strokeWidth="1" opacity="0.4" />
            </pattern>
          </defs>
          <rect x={MONUMENT.x - 4} y={MONUMENT.y - 4} width={MONUMENT.w + 8} height={MONUMENT.h + 8}
            fill="none" stroke="#DC2626" strokeWidth="1" strokeDasharray="4 2" rx="2" opacity="0.6" />
          <rect x={MONUMENT.x} y={MONUMENT.y} width={MONUMENT.w} height={MONUMENT.h}
            fill="url(#hatch-ht)" stroke="#92400e" strokeWidth="1.5" rx="2" />
          <text x={MONUMENT.x + MONUMENT.w / 2} y={MONUMENT.y + MONUMENT.h / 2}
            fontSize="7" textAnchor="middle" dominantBaseline="middle" fill="#78350f" pointerEvents="none">{MONUMENT.label}</text>
        </g>

        {/* Movable assets */}
        {movableAssets.map(a => (
          <g key={a.id}>
            <rect
              x={a.x} y={a.y} width={a.w} height={a.h}
              fill={`${a.colour}18`} stroke={a.colour} strokeWidth="1.5" rx="3"
              style={{ cursor: dragging === a.id ? 'grabbing' : 'grab' }}
              onMouseDown={e => onMouseDown(e, a.id)}
            />
            <text x={a.x + a.w / 2} y={a.y + a.h / 2} fontSize="7" textAnchor="middle" dominantBaseline="middle"
              fill={a.colour} pointerEvents="none" fontWeight="600">{a.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
