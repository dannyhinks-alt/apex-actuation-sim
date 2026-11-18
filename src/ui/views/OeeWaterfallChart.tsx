
import { RftResult } from '../../domain/engines/qualityYamazumiEngine';

interface Props {
  oee: number;
  teep: number;
  rft: RftResult;
  utilisation: number;
}

function WaterfallBar({ label, value, cumulative, maxVal, colour, dashed }: {
  label: string; value: number; cumulative: number; maxVal: number; colour: string; dashed?: boolean;
}) {
  const offsetX = (cumulative / maxVal) * 180;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-32 text-slate-400 text-right truncate">{label}</span>
      <div className="relative h-5 w-48 bg-slate-800 rounded">
        <div
          className={`absolute top-0 h-full rounded flex items-center justify-end pr-1 text-[10px] font-mono text-white ${dashed ? 'border border-dashed border-slate-500' : ''}`}
          style={{ left: 0, width: `${(value / maxVal) * 100}%`, background: colour }}
        />
        <span className="absolute right-1 top-0.5 text-[10px] font-mono tabular-nums text-slate-300">{(value * 100).toFixed(2)}%</span>
      </div>
      {offsetX > 0 && <span className="text-[10px] text-slate-500 font-mono tabular-nums">-{((1 - value) * 100).toFixed(2)}pp</span>}
    </div>
  );
}

export function OeeWaterfallChart({ oee, teep, rft, utilisation }: Props) {
  const baseline_oee = 0.7098;
  const baseline_rft = 0.8756;

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">OEE / TEEP & Rolled RFT Waterfall</div>

      {/* OEE section */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Machine Effectiveness</div>
        <WaterfallBar label="Availability (A)" value={utilisation / 100} cumulative={0} maxVal={1} colour="#3b82f6" />
        <WaterfallBar label="OEE = A×P×Q" value={oee} cumulative={0} maxVal={1} colour={oee >= 0.85 ? '#10b981' : oee >= 0.70 ? '#f59e0b' : '#f43f5e'} />
        <WaterfallBar label="TEEP (÷104h cal)" value={teep} cumulative={0} maxVal={1} colour="#6366f1" />
        <div className="text-[10px] text-slate-500 ml-34 pl-34">
          Baseline OEE: {(baseline_oee * 100).toFixed(2)}% →
          <span className={`ml-1 font-semibold ${oee > baseline_oee ? 'text-emerald-400' : 'text-rose-400'}`}>
            {oee > baseline_oee ? '+' : ''}{((oee - baseline_oee) * 100).toFixed(2)}pp
          </span>
        </div>
      </div>

      {/* RFT waterfall */}
      <div className="space-y-1.5 border-t border-slate-700 pt-3">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Rolled RFT Waterfall</div>
        <WaterfallBar label="Machining FPY" value={rft.fpyMachining} cumulative={0} maxVal={1} colour="#818cf8" />
        <WaterfallBar label="× Special Process" value={rft.fpySpecial} cumulative={0} maxVal={1} colour="#6366f1" />
        <WaterfallBar label="× Assembly FPY" value={rft.fpyAssembly} cumulative={0} maxVal={1} colour="#4f46e5" />
        <WaterfallBar label="× Test FPY" value={rft.fpyTest} cumulative={0} maxVal={1} colour="#4338ca" />
        <div className={`flex justify-between text-xs font-semibold pt-2 border-t border-slate-700 ${rft.rolledRFT >= 0.990 ? 'text-emerald-400' : rft.rolledRFT >= 0.950 ? 'text-amber-400' : 'text-rose-400'}`}>
          <span>= Rolled Factory RFT</span>
          <span className="font-mono tabular-nums">{(rft.rolledRFT * 100).toFixed(2)}%</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Baseline: {(baseline_rft * 100).toFixed(2)}% →
          <span className={`ml-1 font-semibold ${rft.rolledRFT > baseline_rft ? 'text-emerald-400' : 'text-rose-400'}`}>
            {rft.rolledRFT > baseline_rft ? '+' : ''}{((rft.rolledRFT - baseline_rft) * 100).toFixed(2)}pp
          </span>
        </div>
        {rft.rolledRFT >= 0.995 && <div className="text-[10px] text-emerald-400">✅ Zero-Defect Charter threshold ≥ 99.5% achieved</div>}
        {rft.rolledRFT >= 0.990 && rft.rolledRFT < 0.995 && <div className="text-[10px] text-emerald-400">✅ Gate 5 quality target ≥ 99.0% achieved</div>}
        {rft.rolledRFT < 0.990 && <div className="text-[10px] text-rose-400">🔴 Gate 5 target ≥ 99.0% not yet achieved</div>}
      </div>
    </div>
  );
}
