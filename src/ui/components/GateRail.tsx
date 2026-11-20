import { GateId, ExitStatus, GATE_DEFINITIONS, ECR_COST_GBP, MAX_ECRS } from '../../domain/governance/gateStateMachine';

interface GateRailProps {
  activeGate: GateId;
  passedGates: GateId[];
  ecrCount: number;
  readinessPct: number;
  gateStatus: ExitStatus;
  onAdvanceGate: () => void;
  onRaiseECR: (gateId: GateId) => void;
  onResetRun: () => void;
}

function ReadinessBar({ pct, status }: { pct: number; status: ExitStatus }) {
  const colour = status === 'Green' ? '#059669' : status === 'Amber' ? '#D97706' : '#DC2626';
  const label = status === 'Green' ? '✅ Green — Exit Ready' : status === 'Amber' ? '🟡 Amber — Conditional' : '🔴 Red — Blocked';
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: colour }} />
      </div>
      <span className="text-[10px] font-semibold tabular-nums" style={{ color: colour }}>{pct}%</span>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}

export function GateRail({ activeGate, passedGates, ecrCount, readinessPct, gateStatus, onAdvanceGate, onRaiseECR, onResetRun }: GateRailProps) {
  const canAdvance = gateStatus !== 'Red' && readinessPct >= 75 && activeGate < 5;
  const canRaiseECR = ecrCount < MAX_ECRS;

  return (
    <div className="flex items-center gap-2 flex-wrap mt-1.5">
      {/* Gate buttons */}
      {GATE_DEFINITIONS.map(def => {
        const gId = def.gateId;
        const isPassed = passedGates.includes(gId);
        const isActive = gId === activeGate;
        const isFuture = !isPassed && !isActive;

        let className = 'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ';
        if (isActive) {
          className += 'bg-blue-600 border-blue-500 text-white';
        } else if (isPassed) {
          className += 'bg-emerald-50 border-emerald-300 text-emerald-700 cursor-pointer hover:bg-emerald-100';
        } else {
          className += 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed';
        }

        return (
          <button
            key={gId}
            className={className}
            disabled={isFuture}
            onClick={isPassed && canRaiseECR ? () => onRaiseECR(gId) : undefined}
            title={isPassed && canRaiseECR ? `Raise ECR — reopen Gate ${gId} (+£${(ECR_COST_GBP/1000).toFixed(0)}k +1w)` : isFuture ? `Gate ${gId} locked` : undefined}
          >
            {isPassed ? '✅' : isFuture ? '🔒' : '▶'}
            <span>G{gId}: {def.label}</span>
          </button>
        );
      })}

      {/* Separator */}
      <div className="w-px h-5 bg-slate-300 mx-1 flex-shrink-0" />

      {/* Readiness bar */}
      <ReadinessBar pct={readinessPct} status={gateStatus} />

      {/* Advance / Reset buttons */}
      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        {ecrCount > 0 && (
          <span className="text-[10px] text-amber-600 font-medium border border-amber-300 rounded px-1.5 py-0.5 bg-amber-50">
            ECR ×{ecrCount}/{MAX_ECRS} (+£{(ecrCount * ECR_COST_GBP / 1000).toFixed(0)}k)
          </span>
        )}
        <button
          onClick={onAdvanceGate}
          disabled={!canAdvance}
          className={`text-[10px] font-semibold px-3 py-0.5 rounded border transition-colors ${
            canAdvance
              ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
              : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
          }`}
          title={!canAdvance ? (gateStatus === 'Red' ? 'Red block — resolve all red items first' : readinessPct < 75 ? 'Readiness below 75% minimum' : 'At final gate') : `Advance to Gate ${(activeGate + 1) as GateId}`}
        >
          Advance Gate →
        </button>
        <button
          onClick={onResetRun}
          className="text-[10px] px-2 py-0.5 rounded border border-slate-300 text-slate-500 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Reset entire run to Gate 0 defaults"
        >
          Reset Run
        </button>
      </div>
    </div>
  );
}
