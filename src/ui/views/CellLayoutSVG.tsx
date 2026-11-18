import { useState } from 'react';

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

const INITIAL_ASSETS: Asset[] = [
  { id: 'cell5ax',  label: '5-Axis Cell',         x: 10,  y: 10,  w: 70, h: 50, moveable: true,  colour: '#4f46e5' },
  { id: 'ucell',    label: 'U-Cell Sub-Asm',       x: 10,  y: 70,  w: 60, h: 40, moveable: true,  colour: '#0891b2' },
  { id: 'kitting',  label: 'Kitting Racks',        x: 90,  y: 70,  w: 50, h: 30, moveable: true,  colour: '#059669' },
  { id: 'testrig',  label: 'Endurance Test Rig',   x: 150, y: 10,  w: 70, h: 50, moveable: true,  colour: '#7c3aed' },
  { id: 'ht',       label: '🔒 Heat Treat & NDT',  x: 90,  y: 110, w: 90, h: 60, moveable: false, colour: '#92400e' },
];

const BAY_W = 240;
const BAY_H = 180;

function travelDistance(assets: Asset[]): number {
  const pts = assets.map(a => ({ x: a.x + a.w / 2, y: a.y + a.h / 2 }));
  let dist = 0;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!;
    const q = pts[i]!;
    dist += Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2);
  }
  // Scale: SVG 240x180 represents 30m×20m → 1px ≈ 0.125m
  return dist * 0.125;
}

export function CellLayoutSVG() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });

  const dist = travelDistance(assets);
  const aisleOk = assets.every(a => {
    if (a.id === 'ht') return true;
    return Math.abs(a.x - 90) > 8 || Math.abs(a.y - 110) > 8;
  });

  function onMouseDown(e: React.MouseEvent<SVGRectElement>, id: string) {
    const a = assets.find(x => x.id === id)!;
    if (!a.moveable) return;
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
    setAssets(prev => prev.map(a => {
      if (a.id !== dragging) return a;
      return { ...a, x: Math.max(0, Math.min(BAY_W - a.w, mx - dragOffset.dx)), y: Math.max(0, Math.min(BAY_H - a.h, my - dragOffset.dy)) };
    }));
  }

  function onMouseUp() { setDragging(null); }

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Cell Layout Canvas (30m × 20m) — Drag to reposition</div>
      <div className="flex gap-4 text-xs mb-2">
        <span className="text-slate-400">Spaghetti dist: <span className={`font-mono tabular-nums font-semibold ${dist < 20 ? 'text-emerald-400' : dist < 35 ? 'text-amber-400' : 'text-rose-400'}`}>{dist.toFixed(1)} m</span></span>
        <span className={aisleOk ? 'text-emerald-400' : 'text-rose-400'}>{aisleOk ? '✅ Aisle clearance OK' : '🔴 Aisle hazard'}</span>
      </div>
      <svg
        viewBox={`0 0 ${BAY_W} ${BAY_H}`}
        className="flex-1 w-full border border-slate-700 rounded bg-slate-900 cursor-default select-none"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Grid */}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={BAY_H} stroke="#1e293b" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 45} x2={BAY_W} y2={i * 45} stroke="#1e293b" strokeWidth="0.5" />
        ))}

        {/* Spaghetti path */}
        <polyline
          points={assets.map(a => `${a.x + a.w / 2},${a.y + a.h / 2}`).join(' ')}
          fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" opacity="0.5"
        />

        {/* Assets */}
        {assets.map(a => (
          <g key={a.id}>
            {!a.moveable && (
              <>
                <defs>
                  <pattern id={`hatch-${a.id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#b45309" strokeWidth="1" opacity="0.4" />
                  </pattern>
                </defs>
                <rect x={a.x - 4} y={a.y - 4} width={a.w + 8} height={a.h + 8} fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" rx="2" opacity="0.6" />
                <rect x={a.x} y={a.y} width={a.w} height={a.h} fill={`url(#hatch-${a.id})`} stroke={a.colour} strokeWidth="1.5" rx="2" />
              </>
            )}
            {a.moveable && (
              <rect
                x={a.x} y={a.y} width={a.w} height={a.h}
                fill={`${a.colour}22`} stroke={a.colour} strokeWidth="1.5" rx="3"
                style={{ cursor: 'grab' }}
                onMouseDown={e => onMouseDown(e, a.id)}
              />
            )}
            <text x={a.x + a.w / 2} y={a.y + a.h / 2} fontSize="7" textAnchor="middle" dominantBaseline="middle" fill="#e2e8f0" pointerEvents="none">{a.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
