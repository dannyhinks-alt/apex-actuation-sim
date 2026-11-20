
import { RftResult } from '../../domain/engines/qualityYamazumiEngine';

interface Props {
  oee: number;
  teep: number;
  rft: RftResult;
  utilisation: number;
}

function WaterfallBar({ label, value, colour }: {
  label: string; value: number; colour: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-32 text-right truncate tabular-nums" style={{ color: '#475569' }}>{label}</span>
      <div className="relative h-5 w-48 rounded overflow-hidden" style={{ background: '#F1F5F9' }}>
        <div
          className="absolute top-0 h-full rounded flex items-center"
          style={{ width: `${value * 100}%`, background: colour }}
        />
        <span className="absolute right-1 top-0.5 text-[10px] font-mono tabular-nums" style={{ color: '#1E293B' }}>{(value * 100).toFixed(2)}%</span>
      </div>
    </div>
  );
}

export function OeeWaterfallChart({ oee, teep, rft, utilisation }: Props) {
  const baseline_oee = 0.7098;
  const baseline_rft = 0.8756;

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto" style={{ background: '#FFFFFF' }}>
      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#334155' }}>OEE / TEEP & Rolled RFT Waterfall</div>

      {/* OEE section */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>Machine Effectiveness</div>
        <WaterfallBar label="Availability (A)" value={utilisation / 100} colour="#1D4ED8" />
        <WaterfallBar label="OEE = A×P×Q" value={oee} colour={oee >= 0.85 ? '#059669' : oee >= 0.70 ? '#D97706' : '#DC2626'} />
        <WaterfallBar label="TEEP (÷104h cal)" value={teep} colour="#4F46E5" />
        <div className="text-[10px] ml-36" style={{ color: '#64748B' }}>
          Baseline OEE: {(baseline_oee * 100).toFixed(2)}% →
          <span className="ml-1 font-semibold" style={{ color: oee > baseline_oee ? '#059669' : '#DC2626' }}>
            {oee > baseline_oee ? '+' : ''}{((oee - baseline_oee) * 100).toFixed(2)}pp
          </span>
        </div>
      </div>

      {/* RFT waterfall */}
      <div className="space-y-1.5 pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>Rolled RFT Waterfall</div>
        <WaterfallBar label="Machining FPY" value={rft.fpyMachining} colour="#6366F1" />
        <WaterfallBar label="× Special Process" value={rft.fpySpecial} colour="#4F46E5" />
        <WaterfallBar label="× Assembly FPY" value={rft.fpyAssembly} colour="#3730A3" />
        <WaterfallBar label="× Test FPY" value={rft.fpyTest} colour="#1D4ED8" />
        <div className="flex justify-between text-xs font-semibold pt-2" style={{ borderTop: '1px solid #E2E8F0', color: rft.rolledRFT >= 0.990 ? '#059669' : rft.rolledRFT >= 0.950 ? '#D97706' : '#DC2626' }}>
          <span>= Rolled Factory RFT</span>
          <span className="font-mono tabular-nums">{(rft.rolledRFT * 100).toFixed(2)}%</span>
        </div>
        <div className="text-[10px]" style={{ color: '#64748B' }}>
          Baseline: {(baseline_rft * 100).toFixed(2)}% →
          <span className="ml-1 font-semibold" style={{ color: rft.rolledRFT > baseline_rft ? '#059669' : '#DC2626' }}>
            {rft.rolledRFT > baseline_rft ? '+' : ''}{((rft.rolledRFT - baseline_rft) * 100).toFixed(2)}pp
          </span>
        </div>
        {rft.rolledRFT >= 0.995 && <div className="text-[10px] font-medium" style={{ color: '#059669' }}>✅ Zero-Defect Charter threshold ≥ 99.5% achieved</div>}
        {rft.rolledRFT >= 0.990 && rft.rolledRFT < 0.995 && <div className="text-[10px] font-medium" style={{ color: '#059669' }}>✅ Gate 5 quality target ≥ 99.0% achieved</div>}
        {rft.rolledRFT < 0.990 && <div className="text-[10px] font-medium" style={{ color: '#DC2626' }}>🔴 Gate 5 target ≥ 99.0% not yet achieved</div>}
      </div>
    </div>
  );
}
