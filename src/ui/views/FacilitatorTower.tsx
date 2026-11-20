import { useState } from 'react';
import { SimDecisions } from '../hooks/useSimState';
import { MACHINE_OPTIONS, ANCILLARY_PACKAGES } from '../../domain/baseline/charters';
import { computeRolledRFT } from '../../domain/engines/qualityYamazumiEngine';
import { computeCapacity } from '../../domain/engines/capacityEngine';
import { MILL_B } from '../../domain/baseline/plantConstants';
import { GATE_DEFINITIONS } from '../../domain/governance/gateStateMachine';

const CORRECT_PIN = '4321';

type TeamEntry = {
  id: number;
  fingerprint: string;
  decisions: Partial<SimDecisions>;
  rft: number;
  oee: number;
  capex: number;
  gate: number;
  submittedAt: Date;
};

/** Engine-computed charter benchmarks using correct package costs from charters.ts. */
const CHARTER_BENCHMARKS = [
  { charterId: 1, label: 'Programme & Finance',      minRFT: 0.990, minOEE: 0.80, maxCapex: 800_000, description: 'GER + Full MES £145k + Test Rig £90k' },
  { charterId: 2, label: 'Manufacturing Systems',    minRFT: 0.990, minOEE: 0.85, maxCapex: 780_000, description: 'JPN + Cell Furn £95k + Poka-Yoke £45k' },
  { charterId: 3, label: 'Quality & Safety',         minRFT: 0.990, minOEE: 0.80, maxCapex: 760_000, description: 'GER + Poka-Yoke £45k + Full MES £145k' },
  { charterId: 4, label: 'People & Operations',      minRFT: 0.995, minOEE: 0.85, maxCapex: 800_000, description: 'GER + full suite (Zero-Defect ≥99.5%)' },
];

const GATE_IDEAL_ANSWERS: Record<number, { title: string; expectedAnswers: string[]; commonErrors: string[]; idealDecisions: Partial<SimDecisions> }> = {
  0: {
    title: 'Gate 0: Mandate',
    expectedAnswers: [
      'Scenario A selected (Margin & Mix Squeeze) — Budget £800k, Takt 4.30min',
      'Service buffer ≤ 10% to avoid demand risk amber',
      'Charter aligns with team primary KPI (e.g. T4 → Zero-Defect)',
    ],
    commonErrors: [
      'Using Scenario D Takt (3.40min) in a Scenario A run — wrong demand model',
      'Service buffer >10% left unnoticed, triggering amber at every gate',
      'Charter mismatch with team KPI target',
    ],
    idealDecisions: { scenarioId: 'A', charterId: 1, serviceBufferPct: 0 },
  },
  1: {
    title: 'Gate 1: Define',
    expectedAnswers: [
      'Standardisation ≥ 80% — removes shadow-board OEE penalty',
      'Batch transfer size ≤ 10 units — reduces queue length',
      'Single shift baseline (double shift = +£185k/yr operating cost)',
    ],
    commonErrors: [
      'Leaving standardisation at 60% default — shadow boards absent → −3.5% OEE',
      'Large batch size ignored — WIP and lead time not improved',
      'Enabling double shift without calculating operating cost impact on NPV',
    ],
    idealDecisions: { standardisationPct: 85, batchTransferSize: 5, shiftPolicy: 'single', nightShiftActive: false },
  },
  2: {
    title: 'Gate 2: Evaluate',
    expectedAnswers: [
      'GER or JPN machine — ≥99.0% machining FPY; UK OEM retrofit insufficient',
      'Scenario C: civil prep ≥ £45k (or ≥ £60k for heavy GER/JPN machine)',
      'Full MES £145k + Poka-Yoke £45k → achieves ≥99.0% Rolled RFT',
      'TPM interval ≤ 4 weeks maintains availability',
    ],
    commonErrors: [
      'UKR retrofit selected — only 98.8% base FPY, cannot reach ≥99.0% RFT alone',
      'Scenario C civil prep underfunded — red block at Gate 2 exit',
      'MES cost understood as £95k (Cell Furniture) — actual MES cost is £145k',
    ],
    idealDecisions: { machineId: 'GER', cellFurniture: true, pokaYoke: true, fullMES: true, automatedTestRig: false, civilPrepGBP: 45_000 },
  },
  3: {
    title: 'Gate 3: Concept',
    expectedAnswers: [
      'Spaghetti travel ≤ 26m — drag assets to reduce travel',
      'Heat Treat & NDT is immovable Monument — do not block aisle perimeter',
      'Scenario C High-Temp Exclusion Zone (x:150–190, y:105–175) must remain clear',
      'Packages committed (Cell Furniture, Poka-Yoke, MES, Test Rig) — CONCEPT FREEZE',
    ],
    commonErrors: [
      'Default asset positions give ~27m spaghetti — teams must drag to reduce',
      'Placing 5-Axis Cell into HT exclusion zone — aisle hazard red block',
      'Changing machine choice after concept freeze requires ECR (+£15k +1w)',
    ],
    idealDecisions: { bayPositions: [{ id: 'cell5ax', x: 10, y: 10 }, { id: 'ucell', x: 80, y: 10 }, { id: 'kitting', x: 160, y: 10 }, { id: 'testrig', x: 10, y: 70 }] },
  },
  4: {
    title: 'Gate 4: Detail',
    expectedAnswers: [
      '3–4 operators achieves LBR ≥ 85% with Cell Furniture + MES',
      'PFD allowance 10–12% — standard aerospace value',
      'All stations ≤ Customer Takt (4.30min or 3.40min for Scenario D)',
    ],
    commonErrors: [
      '2 operators: stations exceed takt — station E1/E2/E5 overflow',
      '5 operators: LBR drops below 85% — overcapacity',
      'Forgetting E6 walk eliminated by Cell Furniture, E7 paper check by MES',
    ],
    idealDecisions: { operatorCount: 3, pfdAllowancePct: 10, pokaYokeFixtureGBP: 5_000 },
  },
  5: {
    title: 'Gate 5: Implement & Prove',
    expectedAnswers: [
      'P50 go-live ≤ target weeks (Scenario A: Wk24)',
      'Rolled RFT ≥ 99.0% over 4-week run',
      'Payback ≤ 15 months; LBR ≥ 85%',
      'Commissioning buffer 2–4 weeks typical',
    ],
    commonErrors: [
      'No commissioning buffer — P90 risk exceeds target go-live',
      'Open amber actions each add +5% MC duration CV — resolve before Gate 5',
      'Tecnomatix export not generated before close-out',
    ],
    idealDecisions: { commissioningBufferWeeks: 2 },
  },
};

function computeTeamMetrics(d: Partial<SimDecisions>): { rft: number; oee: number; capex: number } {
  const machineId = d.machineId ?? 'UKR';
  const machine = MACHINE_OPTIONS.find(m => m.id === machineId) ?? MACHINE_OPTIONS[0]!;
  const rft = computeRolledRFT({
    baseMachiningFPY: machine.baseMachiningFPY ?? 0.996,
    cellFurnitureInstalled: d.cellFurniture ?? false,
    pokaYokeInstalled: d.pokaYoke ?? false,
    fullMESInstalled: d.fullMES ?? false,
    automatedTestRigInstalled: d.automatedTestRig ?? false,
    nightShiftActive: d.nightShiftActive ?? false,
  });
  const cap = computeCapacity({
    availability: MILL_B.baseAvailabilityPct,
    performance: MILL_B.basePerformancePct,
    quality: MILL_B.baseQualityPct,
    shadowBoardAbsent: (d.standardisationPct ?? 60) < 80,
    nightShiftActive: d.nightShiftActive ?? false,
  });
  // Use correct package costs from ANCILLARY_PACKAGES
  const pkgCost = ANCILLARY_PACKAGES.reduce((sum, p) => {
    const field = p.cellFurniture ? 'cellFurniture' : p.pokaYoke ? 'pokaYoke' : p.fullMES ? 'fullMES' : p.automatedTestRig ? 'automatedTestRig' : 'fatExpediting';
    return sum + ((d as Record<string,boolean>)[field] ? p.costGBP : 0);
  }, 0);
  const capex = 100_000 + machine.costGBP + pkgCost + 35_000;
  return { rft: rft.rolledRFT, oee: cap.oee, capex };
}

export function FacilitatorTower() {
  const [pinInput, setPinInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [addForm, setAddForm] = useState<Partial<SimDecisions & { teamId: number; fp: string }>>({});
  const [gateContentOpen, setGateContentOpen] = useState<number | null>(null);

  function tryUnlock() {
    if (pinInput === CORRECT_PIN) { setUnlocked(true); setPinError(false); }
    else { setPinError(true); }
  }

  function addTeam() {
    const id = (addForm.teamId ?? teams.length + 1);
    const decisions: Partial<SimDecisions> = { ...addForm };
    const { rft, oee, capex } = computeTeamMetrics(decisions);
    const fp = addForm.fp ?? `TEAM${id}-${Date.now().toString(16).slice(-4).toUpperCase()}`;
    const dupe = teams.find(t => t.id !== id && t.fingerprint === fp);
    if (dupe) { alert(`⚠ Duplicate fingerprint — matches Team ${dupe.id}`); return; }
    setTeams(prev => {
      const without = prev.filter(t => t.id !== id);
      return [...without, { id, fingerprint: fp, decisions, rft, oee, capex, gate: decisions.activeGate ?? 0, submittedAt: new Date() }].sort((a, b) => a.id - b.id);
    });
    setAddForm({});
  }

  function removeTeam(id: number) { setTeams(prev => prev.filter(t => t.id !== id)); }

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#334155' }}>Facilitator Control Tower</div>
        <div className="text-xs" style={{ color: '#64748B' }}>Enter facilitator PIN to access multi-team view</div>
        <div className="flex gap-2">
          <input
            type="password" maxLength={4} value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            className="w-24 rounded px-2 py-1 text-center font-mono text-lg focus:outline-none"
            style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A' }}
            placeholder="••••"
          />
          <button onClick={tryUnlock}
            className="rounded text-xs font-semibold px-4 py-1 text-white"
            style={{ background: '#1D4ED8' }}>
            Unlock
          </button>
        </div>
        {pinError && <div className="text-xs font-medium" style={{ color: '#DC2626' }}>Incorrect PIN — please try again</div>}
      </div>
    );
  }

  return (
    <div className="p-3 h-full overflow-y-auto space-y-3" style={{ background: '#F8FAFC' }}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#334155' }}>Facilitator Control Tower — {teams.length} Team(s)</div>
        <button onClick={() => setUnlocked(false)} className="text-[10px]" style={{ color: '#94A3B8' }}>Lock</button>
      </div>

      {/* Package cost reference (correct engine values) */}
      <div className="rounded border p-3" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: '#64748B' }}>Correct Package Costs (Engine-Verified)</div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          {ANCILLARY_PACKAGES.map(p => (
            <div key={p.id} className="flex justify-between gap-2">
              <span style={{ color: '#475569' }}>{p.id}: {p.label.split(' ').slice(0,2).join(' ')}</span>
              <span className="font-mono font-semibold tabular-nums" style={{ color: '#1D4ED8' }}>£{(p.costGBP/1000).toFixed(0)}k</span>
            </div>
          ))}
        </div>
        <div className="mt-1 text-[10px]" style={{ color: '#94A3B8' }}>Note: MES=£145k (not £95k) · Test Rig=£90k (not £65k) · FAT=£25k</div>
      </div>

      {/* Charter benchmarks */}
      <div className="rounded border p-3" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: '#64748B' }}>Charter Benchmarks</div>
        <div className="space-y-1">
          {CHARTER_BENCHMARKS.map(b => (
            <div key={b.charterId} className="flex items-center gap-2 text-[10px]">
              <span className="font-bold w-4" style={{ color: '#475569' }}>T{b.charterId}</span>
              <span className="w-28 truncate" style={{ color: '#334155' }}>{b.label}</span>
              <span className="font-mono w-14" style={{ color: '#059669' }}>≥{(b.minRFT*100).toFixed(1)}%</span>
              <span className="font-mono w-14" style={{ color: '#1D4ED8' }}>≥{(b.minOEE*100).toFixed(0)}% OEE</span>
              <span className="font-mono w-14" style={{ color: '#D97706' }}>≤£{(b.maxCapex/1000).toFixed(0)}k</span>
              <span className="truncate" style={{ color: '#94A3B8' }}>{b.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gate content accordion */}
      <div className="rounded border" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <div className="text-[10px] font-semibold uppercase p-2 pb-1" style={{ color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>Gate Expected Answers & Common Errors</div>
        {GATE_DEFINITIONS.map(def => {
          const content = GATE_IDEAL_ANSWERS[def.gateId];
          const isOpen = gateContentOpen === def.gateId;
          return (
            <div key={def.gateId} style={{ borderBottom: '1px solid #F1F5F9' }}>
              <button
                className="w-full flex items-center justify-between p-2 text-[10px] font-semibold"
                style={{ color: '#334155' }}
                onClick={() => setGateContentOpen(isOpen ? null : def.gateId)}
              >
                <span>G{def.gateId}: {def.label}</span>
                <span style={{ color: '#94A3B8' }}>{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && content && (
                <div className="px-2 pb-2 space-y-1.5">
                  <div>
                    <div className="text-[9px] font-semibold uppercase mb-0.5" style={{ color: '#059669' }}>Expected Answers</div>
                    {content.expectedAnswers.map((a, i) => (
                      <div key={i} className="text-[10px] flex gap-1" style={{ color: '#475569' }}><span>•</span><span>{a}</span></div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[9px] font-semibold uppercase mb-0.5" style={{ color: '#DC2626' }}>Common Errors</div>
                    {content.commonErrors.map((e, i) => (
                      <div key={i} className="text-[10px] flex gap-1" style={{ color: '#475569' }}><span>⚠</span><span>{e}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Team status board */}
      <div className="rounded border p-3" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: '#64748B' }}>Team Status Board</div>
        {teams.length === 0 && <div className="text-[10px]" style={{ color: '#94A3B8' }}>No teams registered yet</div>}
        <div className="space-y-1.5">
          {teams.map(t => {
            const bench = CHARTER_BENCHMARKS.find(b => b.charterId === (t.decisions.charterId ?? 1));
            const rftPass = bench ? t.rft >= bench.minRFT : t.rft >= 0.990;
            const oeePass = bench ? t.oee >= bench.minOEE : t.oee >= 0.80;
            const capexPass = bench ? t.capex <= bench.maxCapex : t.capex <= 800_000;
            const allPass = rftPass && oeePass && capexPass;
            return (
              <div key={t.id} className="flex items-center gap-2 text-[10px] p-1.5 rounded"
                style={{ background: allPass ? '#F0FDF4' : '#FFF5F5', border: `1px solid ${allPass ? '#86EFAC' : '#FCA5A5'}` }}>
                <span className="font-bold w-6" style={{ color: allPass ? '#059669' : '#DC2626' }}>T{t.id}</span>
                <span className="font-mono w-32 truncate text-[9px]" style={{ color: '#64748B' }}>{t.fingerprint}</span>
                <span className="font-mono w-14" style={{ color: rftPass ? '#059669' : '#DC2626' }}>{(t.rft*100).toFixed(2)}%</span>
                <span className="font-mono w-12" style={{ color: oeePass ? '#059669' : '#DC2626' }}>{(t.oee*100).toFixed(1)}%</span>
                <span className="font-mono w-14" style={{ color: capexPass ? '#059669' : '#DC2626' }}>£{(t.capex/1000).toFixed(0)}k</span>
                <span className="w-10" style={{ color: '#94A3B8' }}>G{t.gate}</span>
                <span className="font-semibold" style={{ color: allPass ? '#059669' : '#DC2626' }}>{allPass ? '✅ PASS' : '🔴 FAIL'}</span>
                <button onClick={() => removeTeam(t.id)} className="ml-auto text-[9px]" style={{ color: '#94A3B8' }}>✕</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Register team form */}
      <div className="rounded border p-3" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: '#64748B' }}>Register Team Submission</div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <label className="flex flex-col gap-0.5">
            <span style={{ color: '#64748B' }}>Team #</span>
            <input type="number" min={1} max={4} value={addForm.teamId ?? ''}
              onChange={e => setAddForm(f => ({ ...f, teamId: +e.target.value }))}
              className="rounded px-1.5 py-0.5 font-mono" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A' }} />
          </label>
          <label className="flex flex-col gap-0.5">
            <span style={{ color: '#64748B' }}>Charter</span>
            <select value={addForm.charterId ?? 1}
              onChange={e => setAddForm(f => ({ ...f, charterId: +e.target.value as 1|2|3|4 }))}
              className="rounded px-1.5 py-0.5" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A' }}>
              {[1,2,3,4].map(c => <option key={c} value={c}>T{c} Charter</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span style={{ color: '#64748B' }}>Machine</span>
            <select value={addForm.machineId ?? 'UKR'}
              onChange={e => setAddForm(f => ({ ...f, machineId: e.target.value }))}
              className="rounded px-1.5 py-0.5" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A' }}>
              {MACHINE_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.id} — £{(m.costGBP/1000).toFixed(0)}k</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span style={{ color: '#64748B' }}>Fingerprint</span>
            <input type="text" maxLength={12} value={addForm.fp ?? ''}
              onChange={e => setAddForm(f => ({ ...f, fp: e.target.value.toUpperCase() }))}
              className="rounded px-1.5 py-0.5 font-mono uppercase" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A' }} placeholder="A1B2C3D4" />
          </label>
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {(['cellFurniture','pokaYoke','fullMES','automatedTestRig'] as const).map(k => (
            <label key={k} className="flex items-center gap-1 text-[10px] cursor-pointer" style={{ color: '#475569' }}>
              <input type="checkbox" checked={!!(addForm as Record<string,boolean>)[k]}
                onChange={e => setAddForm(f => ({ ...f, [k]: e.target.checked }))} className="accent-blue-600" />
              {k === 'cellFurniture' ? 'Furn £95k' : k === 'pokaYoke' ? 'P-Y £45k' : k === 'fullMES' ? 'MES £145k' : 'Rig £90k'}
            </label>
          ))}
        </div>
        <button onClick={addTeam}
          className="mt-2 rounded text-[10px] font-semibold px-3 py-1 text-white"
          style={{ background: '#1D4ED8' }}>
          Register Team
        </button>
      </div>
    </div>
  );
}
