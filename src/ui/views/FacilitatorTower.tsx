import { useState } from 'react';
import { SimDecisions } from '../hooks/useSimState';
import { MACHINE_OPTIONS } from '../../domain/baseline/charters';
import { computeRolledRFT } from '../../domain/engines/qualityYamazumiEngine';
import { computeCapacity } from '../../domain/engines/capacityEngine';
import { MILL_B } from '../../domain/baseline/plantConstants';

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

const CHARTER_BENCHMARKS = [
  { charterId: 1, label: 'Programme & Finance',      minRFT: 0.990, minOEE: 0.80, maxCapex: 800_000, description: 'GER machine + Full MES + Test Rig' },
  { charterId: 2, label: 'Manufacturing Systems',    minRFT: 0.990, minOEE: 0.85, maxCapex: 780_000, description: 'JPN machine + Cell Furniture + Poka-Yoke' },
  { charterId: 3, label: 'Quality & Safety',         minRFT: 0.990, minOEE: 0.80, maxCapex: 760_000, description: 'GER machine + all quality packages' },
  { charterId: 4, label: 'People & Operations',      minRFT: 0.995, minOEE: 0.85, maxCapex: 800_000, description: 'GER machine + Full suite (Zero-Defect)' },
];

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
    shadowBoardAbsent: d.shadowBoardAbsent ?? true,
    nightShiftActive: d.nightShiftActive ?? false,
  });
  const ancillaryCost = (d.cellFurniture ? 28_000 : 0) + (d.pokaYoke ? 22_000 : 0) + (d.fullMES ? 95_000 : 0) + (d.automatedTestRig ? 65_000 : 0) + (d.fatExpediting ? 35_000 : 0);
  const capex = 100_000 + machine.costGBP + ancillaryCost + 35_000;
  return { rft: rft.rolledRFT, oee: cap.oee, capex };
}

export function FacilitatorTower() {
  const [pinInput, setPinInput] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [addForm, setAddForm] = useState<Partial<SimDecisions & { teamId: number; fp: string }>>({});

  function tryUnlock() {
    if (pinInput === CORRECT_PIN) {
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  }

  function addTeam() {
    const id = (addForm.teamId ?? teams.length + 1);
    const decisions: Partial<SimDecisions> = { ...addForm };
    const { rft, oee, capex } = computeTeamMetrics(decisions);
    const fp = addForm.fp ?? `TEAM${id}-${Date.now().toString(16).slice(-4).toUpperCase()}`;
    const dupe = teams.find(t => t.id !== id && t.fingerprint === fp);
    if (dupe) { alert(`⚠ Duplicate fingerprint detected — matches Team ${dupe.id}`); return; }
    setTeams(prev => {
      const without = prev.filter(t => t.id !== id);
      return [...without, { id, fingerprint: fp, decisions, rft, oee, capex, gate: decisions.currentGate ?? 0, submittedAt: new Date() }].sort((a, b) => a.id - b.id);
    });
    setAddForm({});
  }

  function removeTeam(id: number) { setTeams(prev => prev.filter(t => t.id !== id)); }

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Facilitator Control Tower</div>
        <div className="text-slate-500 text-xs">Enter facilitator PIN to access multi-team view</div>
        <div className="flex gap-2">
          <input
            type="password"
            maxLength={4}
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-center font-mono text-lg text-slate-100 focus:outline-none focus:border-blue-500"
            placeholder="••••"
          />
          <button onClick={tryUnlock} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-1 rounded">Unlock</button>
        </div>
        {pinError && <div className="text-rose-400 text-xs">Incorrect PIN — please try again</div>}
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Facilitator Control Tower — {teams.length} Team(s) Active</div>
        <button onClick={() => setUnlocked(false)} className="text-[10px] text-slate-500 hover:text-slate-300">Lock</button>
      </div>

      {/* Charter Benchmarks */}
      <div className="bg-slate-800/50 rounded border border-slate-700 p-3">
        <div className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Engine-Computed Charter Benchmarks</div>
        <div className="space-y-1">
          {CHARTER_BENCHMARKS.map(b => (
            <div key={b.charterId} className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-500 w-4">{b.charterId}</span>
              <span className="text-slate-300 w-32 truncate">{b.label}</span>
              <span className="text-emerald-400 font-mono w-14">≥{(b.minRFT*100).toFixed(1)}% RFT</span>
              <span className="text-blue-400 font-mono w-14">≥{(b.minOEE*100).toFixed(0)}% OEE</span>
              <span className="text-amber-400 font-mono w-16">≤£{(b.maxCapex/1000).toFixed(0)}k</span>
              <span className="text-slate-500 truncate">{b.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team status grid */}
      <div className="bg-slate-800/50 rounded border border-slate-700 p-3">
        <div className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Team Status Board</div>
        {teams.length === 0 && <div className="text-[10px] text-slate-600">No teams registered yet</div>}
        <div className="space-y-1.5">
          {teams.map(t => {
            const bench = CHARTER_BENCHMARKS.find(b => b.charterId === (t.decisions.charterId ?? 1));
            const rftPass = bench ? t.rft >= bench.minRFT : t.rft >= 0.990;
            const oeePass = bench ? t.oee >= bench.minOEE : t.oee >= 0.80;
            const capexPass = bench ? t.capex <= bench.maxCapex : t.capex <= 800_000;
            const allPass = rftPass && oeePass && capexPass;
            return (
              <div key={t.id} className={`flex items-center gap-2 text-[10px] p-1.5 rounded ${allPass ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-rose-900/20 border border-rose-700/30'}`}>
                <span className={`font-bold w-6 ${allPass ? 'text-emerald-400' : 'text-rose-400'}`}>T{t.id}</span>
                <span className="text-slate-400 font-mono w-32 truncate text-[9px]">{t.fingerprint}</span>
                <span className={`font-mono w-14 ${rftPass ? 'text-emerald-400' : 'text-rose-400'}`}>{(t.rft*100).toFixed(2)}%</span>
                <span className={`font-mono w-12 ${oeePass ? 'text-emerald-400' : 'text-rose-400'}`}>{(t.oee*100).toFixed(1)}%</span>
                <span className={`font-mono w-14 ${capexPass ? 'text-emerald-400' : 'text-rose-400'}`}>£{(t.capex/1000).toFixed(0)}k</span>
                <span className="text-slate-500 w-10">Gate {t.gate}</span>
                <span className={`font-semibold ${allPass ? 'text-emerald-300' : 'text-rose-300'}`}>{allPass ? '✅ PASS' : '🔴 FAIL'}</span>
                <button onClick={() => removeTeam(t.id)} className="ml-auto text-slate-600 hover:text-rose-400 text-[9px]">✕</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add team form */}
      <div className="bg-slate-800/50 rounded border border-slate-700 p-3">
        <div className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Register Team Submission</div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <label className="flex flex-col gap-0.5">
            <span className="text-slate-500">Team #</span>
            <input type="number" min={1} max={4} value={addForm.teamId ?? ''} onChange={e => setAddForm(f => ({ ...f, teamId: +e.target.value }))}
              className="bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-slate-100 font-mono" />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-slate-500">Charter</span>
            <select value={addForm.charterId ?? 1} onChange={e => setAddForm(f => ({ ...f, charterId: +e.target.value as 1|2|3|4 }))}
              className="bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-slate-100">
              {[1,2,3,4].map(c => <option key={c} value={c}>Team {c} Charter</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-slate-500">Machine</span>
            <select value={addForm.machineId ?? 'UKR'} onChange={e => setAddForm(f => ({ ...f, machineId: e.target.value }))}
              className="bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-slate-100">
              {MACHINE_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.id} — £{(m.costGBP/1000).toFixed(0)}k</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-slate-500">Fingerprint</span>
            <input type="text" maxLength={12} value={addForm.fp ?? ''} onChange={e => setAddForm(f => ({ ...f, fp: e.target.value.toUpperCase() }))}
              className="bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-slate-100 font-mono uppercase" placeholder="A1B2C3D4" />
          </label>
        </div>
        <div className="flex gap-3 mt-2">
          {(['cellFurniture','pokaYoke','fullMES','automatedTestRig'] as const).map(k => (
            <label key={k} className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
              <input type="checkbox" checked={!!(addForm as Record<string,boolean>)[k]}
                onChange={e => setAddForm(f => ({ ...f, [k]: e.target.checked }))} className="accent-blue-500" />
              {k === 'cellFurniture' ? 'Furn' : k === 'pokaYoke' ? 'P-Y' : k === 'fullMES' ? 'MES' : 'Rig'}
            </label>
          ))}
        </div>
        <button onClick={addTeam} className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold px-3 py-1 rounded">
          Register Team
        </button>
      </div>
    </div>
  );
}
