import { SimDecisions } from '../hooks/useSimState';
import { SCENARIOS, ScenarioId } from '../../domain/baseline/scenarios';
import { CHARTERS, CharterId } from '../../domain/baseline/charters';
import { MACHINE_OPTIONS, ANCILLARY_PACKAGES } from '../../domain/baseline/charters';
import { GateExitResult } from '../../domain/governance/gateStateMachine';

interface Props {
  decisions: SimDecisions;
  update: (patch: Partial<SimDecisions>) => void;
  committed: number;
  budget: number;
  gateAssessment: GateExitResult;
  spaghettiDistanceM: number;
  shadowBoardAbsent: boolean;
}

function Slider({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-mono font-semibold text-slate-800 tabular-nums">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step ?? 1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-blue-600 cursor-pointer" />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium border transition-colors w-full text-left ${
        value ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`w-3 h-3 rounded-sm border flex-shrink-0 ${value ? 'bg-emerald-500 border-emerald-400' : 'border-slate-300'}`} />
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded border border-slate-200 p-3 space-y-2 shadow-sm">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      {children}
    </section>
  );
}

function GateG0({ decisions, update }: Pick<Props, 'decisions' | 'update'>) {
  return (
    <>
      <Section title="Scenario Selection">
        <div className="grid grid-cols-2 gap-1">
          {(['A','B','C','D'] as ScenarioId[]).map(id => (
            <button key={id} onClick={() => update({ scenarioId: id })}
              className={`text-left px-2 py-1.5 rounded text-xs border transition-colors ${decisions.scenarioId === id ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <span className="font-bold mr-1">{id}:</span>{SCENARIOS[id].title.replace(/^The /, '')}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-slate-500 mt-1">Budget: £{(SCENARIOS[decisions.scenarioId].capexBudgetGBP/1000).toFixed(0)}k · Go-live: Wk{SCENARIOS[decisions.scenarioId].goLiveWeeks} · Takt: {SCENARIOS[decisions.scenarioId].cellTaktMin}min</div>
      </Section>
      <Section title="Team Charter">
        <div className="grid grid-cols-2 gap-1">
          {([1,2,3,4] as CharterId[]).map(id => (
            <button key={id} onClick={() => update({ charterId: id })}
              className={`text-left px-2 py-1.5 rounded text-xs border transition-colors ${decisions.charterId === id ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              T{id}: {CHARTERS[id].title}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Service Buffer">
        <Slider label="Demand service buffer" value={decisions.serviceBufferPct} min={0} max={15}
          format={v => `${v}%`} onChange={v => update({ serviceBufferPct: v })} />
        <p className="text-[10px] text-slate-500">Buffer above 10% raises demand risk amber. Locks Scenario / Charter / Takt / Budget at Gate 0 exit.</p>
      </Section>
    </>
  );
}

function GateG1({ decisions, update, shadowBoardAbsent }: Pick<Props, 'decisions' | 'update' | 'shadowBoardAbsent'>) {
  return (
    <>
      <Section title="5S Standardisation">
        <Slider label="Standardisation %" value={decisions.standardisationPct} min={0} max={100}
          format={v => `${v}%`} onChange={v => update({ standardisationPct: v })} />
        <div className={`text-[10px] font-medium mt-1 ${shadowBoardAbsent ? 'text-amber-600' : 'text-emerald-600'}`}>
          {shadowBoardAbsent ? '🟡 Shadow boards absent → −3.5% OEE penalty active' : '✅ Shadow boards installed — OEE penalty removed'}
        </div>
      </Section>
      <Section title="Flow & Shift Policy">
        <Slider label="Batch transfer size" value={decisions.batchTransferSize} min={1} max={20}
          format={v => `${v} units`} onChange={v => update({ batchTransferSize: v })} />
        <div className="flex gap-2 mt-1">
          {(['single','double'] as const).map(policy => (
            <button key={policy} onClick={() => update({ shiftPolicy: policy })}
              className={`flex-1 px-2 py-1 rounded text-xs border transition-colors ${decisions.shiftPolicy === policy ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {policy === 'single' ? 'Single Shift' : 'Double Shift (+£185k/yr)'}
            </button>
          ))}
        </div>
        <Toggle label="Night shift (+£185k/yr)" value={decisions.nightShiftActive}
          onChange={v => update({ nightShiftActive: v, shiftPolicy: v ? 'double' : 'single' })} />
        <p className="text-[10px] text-slate-500 mt-1">Locks Operating Calendar at Gate 1 exit.</p>
      </Section>
    </>
  );
}

function GateG2({ decisions, update }: Pick<Props, 'decisions' | 'update'>) {
  const scenario = SCENARIOS[decisions.scenarioId];
  const isScenarioC = scenario.id === 'C';
  const isHeavy = decisions.machineId === 'GER' || decisions.machineId === 'JPN';
  const civilMin = isHeavy ? (scenario.civilPrepMinHeavyGBP ?? 45_000) : (scenario.civilPrepMinGBP ?? 0);
  const civilOk = !isScenarioC || decisions.civilPrepGBP >= civilMin;

  return (
    <>
      <Section title="Machine Provenance">
        <div className="flex flex-col gap-1">
          {MACHINE_OPTIONS.map(m => (
            <button key={m.id} onClick={() => update({ machineId: m.id })}
              className={`flex justify-between px-2 py-1.5 rounded text-xs border transition-colors ${decisions.machineId === m.id ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <span>{m.label}</span>
              <span className="font-mono tabular-nums">£{(m.costGBP/1000).toFixed(0)}k · {((m.baseMachiningFPY ?? 0)*100).toFixed(1)}%</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">GER/JPN = heavy foundation (high-temp extraction). Locks Provenance at Gate 2 exit.</p>
      </Section>
      <Section title="Civil / Power / Extraction Prep">
        <Slider label="Civil prep spend" value={decisions.civilPrepGBP} min={0} max={80_000} step={5_000}
          format={v => `£${(v/1000).toFixed(0)}k`} onChange={v => update({ civilPrepGBP: v })} />
        {isScenarioC && (
          <div className={`text-[10px] font-medium mt-1 ${civilOk ? 'text-emerald-600' : 'text-rose-600'}`}>
            {civilOk
              ? `✅ Civil prep ≥ £${(civilMin/1000).toFixed(0)}k minimum met`
              : `🔴 Scenario C requires ≥ £${(civilMin/1000).toFixed(0)}k civil prep${isHeavy ? ' (heavy machine)' : ''}`}
          </div>
        )}
      </Section>
      <Section title="TPM Programme">
        <Slider label="TPM interval" value={decisions.tpmIntervalWeeks} min={1} max={8}
          format={v => `${v}w`} onChange={v => update({ tpmIntervalWeeks: v })} />
        <p className="text-[10px] text-slate-500 mt-1">Shorter intervals improve availability. Locks Provenance / Civil at Gate 2 exit.</p>
      </Section>
    </>
  );
}

function GateG3({ decisions, update, spaghettiDistanceM }: Pick<Props, 'decisions' | 'update' | 'spaghettiDistanceM'>) {
  const distOk = spaghettiDistanceM <= 26;
  return (
    <>
      <Section title="Investment Packages">
        <div className="flex flex-col gap-1">
          {ANCILLARY_PACKAGES.map(p => {
            const field = p.cellFurniture ? 'cellFurniture' : p.pokaYoke ? 'pokaYoke' : p.fullMES ? 'fullMES' : p.automatedTestRig ? 'automatedTestRig' : 'fatExpediting';
            const val = decisions[field as keyof SimDecisions] as boolean;
            return (
              <Toggle key={p.id} label={`${p.label} · £${(p.costGBP/1000).toFixed(0)}k`}
                value={val} onChange={v => update({ [field]: v } as Partial<SimDecisions>)} />
            );
          })}
        </div>
      </Section>
      <Section title="Cell Layout Concept">
        <div className={`flex items-center gap-2 p-2 rounded border text-xs ${distOk ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          <span className="text-base">{distOk ? '✅' : '🟡'}</span>
          <div>
            <div className="font-semibold">Spaghetti travel: {spaghettiDistanceM.toFixed(1)} m</div>
            <div className="text-[10px]">{distOk ? 'Within 26m Concept Freeze target' : 'Drag assets on Cell Layout canvas to reach ≤ 26m'}</div>
          </div>
        </div>
        <p className="text-[10px] text-slate-500">Select Canvas tab 2 to drag assets. CONCEPT FREEZE locks bay coordinates, machine choice, and packages.</p>
      </Section>
    </>
  );
}

function GateG4({ decisions, update }: Pick<Props, 'decisions' | 'update'>) {
  return (
    <>
      <Section title="Operator Balancing">
        <Slider label="Operator count" value={decisions.operatorCount} min={2} max={5}
          format={v => `${v} operators`} onChange={v => update({ operatorCount: v })} />
        <p className="text-[10px] text-slate-500">Select Canvas tab 3 to view Yamazumi chart. All stations must be ≤ Customer Takt.</p>
      </Section>
      <Section title="Standard Work Parameters">
        <Slider label="PFD allowance" value={decisions.pfdAllowancePct} min={5} max={15}
          format={v => `${v}%`} onChange={v => update({ pfdAllowancePct: v })} />
        <Slider label="Poka-Yoke fixture (additional)" value={decisions.pokaYokeFixtureGBP} min={0} max={15_000} step={1_000}
          format={v => `£${(v/1000).toFixed(0)}k`} onChange={v => update({ pokaYokeFixtureGBP: v })} />
        <p className="text-[10px] text-slate-500 mt-1">Locks Standard Work / LBR / RFT at Gate 4 exit.</p>
      </Section>
    </>
  );
}

function GateG5({ decisions, update }: Pick<Props, 'decisions' | 'update'>) {
  return (
    <>
      <Section title="Commissioning Programme">
        <Slider label="Commissioning buffer" value={decisions.commissioningBufferWeeks} min={0} max={8}
          format={v => `${v}w`} onChange={v => update({ commissioningBufferWeeks: v })} />
        <p className="text-[10px] text-slate-500">Buffer adds to CPM project duration. See CPM/MC canvas (tab 5) for P10/P50/P90 forecast.</p>
      </Section>
      <Section title="Prove-Out">
        <p className="text-xs text-slate-600">Select Canvas tab 5 (CPM/MC) for 500-iteration Monte Carlo forecast. Use Tecnomatix Export tab for Siemens Plant Simulation handoff.</p>
        <p className="text-[10px] text-slate-500 mt-1">Gate 5 exit: Rolled RFT ≥ 99.0% over 4-week run · Payback ≤ 15 months · LBR ≥ 85%.</p>
      </Section>
    </>
  );
}

export function DecisionPanel({ decisions, update, committed, budget, gateAssessment, spaghettiDistanceM, shadowBoardAbsent }: Props) {
  const remaining = budget - committed;
  const { readinessPct, status: gateStatus, amberActions, redBlockReasons } = gateAssessment;
  const gate = decisions.activeGate;

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto text-sm p-3">
      {/* Gate-specific panel */}
      {gate === 0 && <GateG0 decisions={decisions} update={update} />}
      {gate === 1 && <GateG1 decisions={decisions} update={update} shadowBoardAbsent={shadowBoardAbsent} />}
      {gate === 2 && <GateG2 decisions={decisions} update={update} />}
      {gate === 3 && <GateG3 decisions={decisions} update={update} spaghettiDistanceM={spaghettiDistanceM} />}
      {gate === 4 && <GateG4 decisions={decisions} update={update} />}
      {gate === 5 && <GateG5 decisions={decisions} update={update} />}

      {/* CapEx summary */}
      <section className="bg-white rounded border border-slate-200 p-3 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">CapEx Summary</h3>
        <div className="space-y-0.5 font-mono tabular-nums text-xs">
          <div className="flex justify-between text-slate-600"><span>Committed</span><span>£{committed.toLocaleString('en-GB')}</span></div>
          <div className="flex justify-between text-slate-600"><span>Budget</span><span>£{budget.toLocaleString('en-GB')}</span></div>
          <div className={`flex justify-between font-semibold border-t border-slate-200 pt-0.5 mt-0.5 ${remaining >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            <span>Remaining</span><span>£{remaining.toLocaleString('en-GB')}</span>
          </div>
        </div>
      </section>

      {/* Gate Exit Ruling */}
      <section className="bg-white rounded border border-slate-200 p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gate {gate} Exit Ruling</h3>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${gateStatus === 'Green' ? 'bg-emerald-100 text-emerald-700' : gateStatus === 'Amber' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
              {gateStatus}
            </span>
            <span className="text-[10px] font-mono tabular-nums text-slate-500">{readinessPct}% ready</span>
          </div>
        </div>
        {redBlockReasons.map((r, i) => <div key={i} className="text-[11px] text-rose-600 mb-0.5">🔴 {r}</div>)}
        {amberActions.map((a, i) => <div key={i} className="text-[11px] text-amber-600 mb-0.5">🟡 {a}</div>)}
        {gateStatus === 'Green' && <div className="text-[11px] text-emerald-600">✅ All exit criteria met — advance gate to proceed</div>}
        {gateStatus === 'Amber' && readinessPct < 75 && <div className="text-[11px] text-amber-600 mt-1">⚠ Readiness below 75% minimum — resolve amber items</div>}
      </section>
    </div>
  );
}
