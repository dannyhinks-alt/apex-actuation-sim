
import { SimDecisions } from '../hooks/useSimState';
import { SCENARIOS, ScenarioId } from '../../domain/baseline/scenarios';
import { MACHINE_OPTIONS, ANCILLARY_PACKAGES } from '../../domain/baseline/charters';
import { GateId } from '../../domain/governance/gateStateMachine';

interface Props {
  decisions: SimDecisions;
  update: (patch: Partial<SimDecisions>) => void;
  committed: number;
  budget: number;
  gateStatus: 'Green' | 'Amber' | 'Red';
  amberActions: string[];
  redReasons: string[];
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${value ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
    >
      <span className={`w-3 h-3 rounded-sm border ${value ? 'bg-emerald-500 border-emerald-400' : 'border-slate-500'}`} />
      {label}
    </button>
  );
}

export function DecisionPanel({ decisions, update, committed, budget, gateStatus, amberActions, redReasons }: Props) {
  const remaining = budget - committed;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto text-sm">
      {/* Scenario selector */}
      <section className="bg-slate-900 rounded border border-slate-800 p-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Scenario</h3>
        <div className="grid grid-cols-2 gap-1">
          {(['A','B','C','D'] as ScenarioId[]).map(id => (
            <button key={id} onClick={() => update({ scenarioId: id })}
              className={`text-left px-2 py-1.5 rounded text-xs border transition-colors ${decisions.scenarioId === id ? 'bg-blue-900/40 border-blue-500/50 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
              <span className="font-bold mr-1">{id}:</span>{SCENARIOS[id].title.split(' ')[1]}
            </button>
          ))}
        </div>
      </section>

      {/* Machine selection */}
      <section className="bg-slate-900 rounded border border-slate-800 p-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">5-Axis Cell</h3>
        <div className="flex flex-col gap-1">
          {MACHINE_OPTIONS.map(m => (
            <button key={m.id} onClick={() => update({ machineId: m.id })}
              className={`flex justify-between px-2 py-1.5 rounded text-xs border transition-colors ${decisions.machineId === m.id ? 'bg-indigo-900/40 border-indigo-500/50 text-indigo-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
              <span>{m.label}</span>
              <span className="font-mono tabular-nums">£{(m.costGBP / 1000).toFixed(0)}k · {((m.baseMachiningFPY ?? 0) * 100).toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </section>

      {/* Ancillary packages */}
      <section className="bg-slate-900 rounded border border-slate-800 p-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Investment Packages</h3>
        <div className="flex flex-col gap-1">
          {ANCILLARY_PACKAGES.map(p => {
            const field = p.cellFurniture ? 'cellFurniture' : p.pokaYoke ? 'pokaYoke' : p.fullMES ? 'fullMES' : p.automatedTestRig ? 'automatedTestRig' : 'fatExpediting';
            const val = decisions[field as keyof SimDecisions] as boolean;
            return (
              <Toggle key={p.id} label={`${p.label} · £${(p.costGBP/1000).toFixed(0)}k`} value={val} onChange={v => update({ [field]: v } as Partial<SimDecisions>)} />
            );
          })}
        </div>
      </section>

      {/* Operator count */}
      <section className="bg-slate-900 rounded border border-slate-800 p-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Operators: {decisions.operatorCount}</h3>
        <input type="range" min={2} max={5} value={decisions.operatorCount} onChange={e => update({ operatorCount: Number(e.target.value) })}
          className="w-full accent-emerald-500" />
        <div className="flex justify-between text-[10px] text-slate-500 mt-0.5"><span>2</span><span>5</span></div>
      </section>

      {/* Operations toggles */}
      <section className="bg-slate-900 rounded border border-slate-800 p-3 flex flex-col gap-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Operations</h3>
        <Toggle label="Night shift (+£185k/yr)" value={decisions.nightShiftActive} onChange={v => update({ nightShiftActive: v })} />
        <Toggle label="Shadow boards absent (−3.5% OEE)" value={decisions.shadowBoardAbsent} onChange={v => update({ shadowBoardAbsent: v })} />
      </section>

      {/* CapEx summary */}
      <section className="bg-slate-900 rounded border border-slate-800 p-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">CapEx Summary</h3>
        <div className="space-y-0.5 font-mono tabular-nums text-xs">
          <div className="flex justify-between text-slate-400"><span>Committed</span><span>£{committed.toLocaleString('en-GB')}</span></div>
          <div className="flex justify-between text-slate-400"><span>Budget</span><span>£{budget.toLocaleString('en-GB')}</span></div>
          <div className={`flex justify-between font-semibold border-t border-slate-700 pt-0.5 mt-0.5 ${remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span>Remaining</span><span>£{remaining.toLocaleString('en-GB')}</span>
          </div>
        </div>
      </section>

      {/* Gate exit ruling */}
      <section className="bg-slate-900 rounded border border-slate-800 p-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Gate Exit — Gate {decisions.currentGate}</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${gateStatus === 'Green' ? 'bg-emerald-900/60 text-emerald-300' : gateStatus === 'Amber' ? 'bg-amber-900/60 text-amber-300' : 'bg-rose-900/60 text-rose-300'}`}>
            {gateStatus}
          </span>
          <div className="flex gap-1">
            {([0,1,2,3,4,5] as GateId[]).map(g => (
              <button key={g} onClick={() => update({ currentGate: g })}
                className={`w-6 h-6 rounded text-xs font-mono ${decisions.currentGate === g ? 'bg-blue-700 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{g}</button>
            ))}
          </div>
        </div>
        {redReasons.map((r, i) => <div key={i} className="text-[11px] text-rose-300 mb-0.5">🔴 {r}</div>)}
        {amberActions.map((a, i) => <div key={i} className="text-[11px] text-amber-300 mb-0.5">🟡 {a}</div>)}
        {gateStatus === 'Green' && <div className="text-[11px] text-emerald-300">✅ All exit criteria met</div>}
      </section>
    </div>
  );
}
