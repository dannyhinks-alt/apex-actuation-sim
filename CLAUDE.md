# CLAUDE.md — Apex Actuation Systems (`apex-actuation-sim`)

## 1. Project Mission & Domain Guardrails
- **Application Name:** **Apex Actuation Systems** (`apex-actuation-sim`) — a postgraduate-grade interactive 6-Gate Manufacturing Investment & Operational-Readiness Simulator (`Gate 0: Mandate` -> `Gate 5: Implement & Prove`).
- **Strict British English:** Use UK spelling, terminology, and currency (`£`) everywhere in UI copy, comments, reports, and exports (`utilisation`, `optimisation`, `programme`, `standardised`, `serialised`, `colour`, `behaviour`, `analyse`, `modelling`, `practise/practice`).
- **Zero Legacy Contamination:** Never reference legacy slide packs, legacy client names, or unverified figures. Every baseline figure, formula, and governance rule must match `SPEC_v3.4.md` and the in-app **Engineering Assumptions Register**.

---

## 2. Clean 4-Layer Architecture & Modularity Rules
- **Strict Layer Separation:**
  1. `src/domain/baseline/` — Plant baseline constants (`120m x 72m` floorplan, 5 zones, `E1–E8` Yamazumi work elements, 4 scenarios, 4 asymmetric team charters, and the structured **Engineering Assumptions Register**).
  2. `src/domain/engines/` — Five pure TypeScript calculation engines:
     - `demandEngine.ts` (Product mix `Runners/Repeaters/Strangers`, Stranger disruption factor, Customer Takt)
     - `capacityEngine.ts` (Practical Utilisation, `OEE = A × P × Q`, `TEEP` over `104h/wk` operating calendar)
     - `flowEngine.ts` (Kingman VUT queue approximation, downstream constraint migration, Little's Law `WIP = Throughput × Lead Time` cross-check)
     - `qualityYamazumiEngine.ts` (4-stage composite Rolled RFT `87.56%` baseline, `E1–E8` multi-operator Yamazumi balancing, concurrent `E4` `0.30m` machine time, Internal LBR)
     - `programmeFinanceEngine.ts` (Single-owner CapEx reconciliation, 36-Month NPV at `10%` discount rate, cumulative cash-flow payback, 7-node parallel CPM network `A1–A7`)
  3. `src/domain/governance/` — 6-Gate lifecycle state machine, `Green / Amber (Category 2 Action Register) / Red Block` exit rules, realistic gate-specific re-baseline penalties, deterministic Decision Fingerprinting, engine-computed Charter-Calibrated Best-Practice Benchmarks, and deterministic `Mulberry32` 500-iteration × 52-week Monte Carlo engine.
  4. `src/ui/` — React + TypeScript + Tailwind CSS presentation layer.
- **Zero-DOM Rule:** Files inside `src/domain/` MUST NOT import `react`, `react-dom`, `window`, `document`, or `localStorage`. Every domain function must be pure and deterministic.
- **File Size Discipline:** Keep maintainable source modules modular and focused (`<= 250 lines` per file where practical) with clear JSDoc formula contracts on every engine function.

---

## 3. Mandatory Build & Validation Sequence
Execute development in this exact order—do NOT build UI screens until Layers 1–3 pass all automated tests:
1. **Phase 1 — Baseline & Assumptions Register:** Implement `src/domain/baseline/` and verify exact baseline invariants (`87.56%` Rolled RFT, `70.91%` OEE, `54.55%` TEEP, `82.46%` Internal LBR, `£800k` CapEx).
2. **Phase 2 — Five Calculation Engines:** Implement `src/domain/engines/` with full cross-engine Decision-to-Consequence coupling.
3. **Phase 3 — Gate Governance, CPM & Monte Carlo:** Implement `src/domain/governance/` including the 7-node CPM solver (`A1–A7`), deterministic `Mulberry32` Monte Carlo (`500 iterations × 52 weeks`), and all 4 Scenario × 4 Charter reference solutions.
4. **Phase 4 — Unit & Regression Test Suite:** Write comprehensive Vitest/Node unit tests proving mathematical accuracy, Monte Carlo seed determinism, and zero budget/schedule deadlocks across all 16 Scenario × Charter combinations.
5. **Phase 5 — Delegate 3-Panel UI & Interactive Visuals:** Build the polished aerospace/industrial control-room interface (`src/ui/`).
6. **Phase 6 — Facilitator Control Tower (`PIN 4321`) & Exports:** Build multi-team status sync (1–4 groups + engine-computed Charter Benchmarks), duplicate-fingerprint alerts, Print/PDF report view, and documented Siemens Tecnomatix Plant Simulation `JSON/CSV` export.

---

## 4. Visual Polish & Interactive Layout Standards (`src/ui/`)
- **Aesthetic & Typography:** High-contrast aerospace/industrial digital-twin theme (`slate-950` canvas, `slate-900` elevated cards, crisp `1px slate-800` borders, `emerald-500` / `amber-400` / `rose-500` SQCDP RAG indicators). Enforce `font-variant-numeric: tabular-nums` on all KPI readouts, timers, and sliders so numbers never jitter during interaction.
- **Clean 3-Panel Delegate Layout:**
  - **Top Command Strip:** Live **SQCDP** 5-tile scoreboard, **CapEx Remaining (`£`)**, **Critical-Path Forecast Go-Live Date**, **Engineering Assumptions Register** drawer toggle, and **4 Interactive Team Role Lenses** (*Programme & Finance*, *Manufacturing Systems*, *Quality & Safety*, *People & Operations*) that highlight role-relevant metrics and risks.
  - **Left Diagnostic Canvas (5 Interactive SVG Views):**
    1. *Whole-Plant `120m × 72m` Flow & Constraint Migration Map:* Interactive SVG floorplan showing all 5 zones, animated dashed material-flow paths, live Utilisation badges, and a glowing **Bottleneck Halo** that visibly migrates downstream if Mill B is solved without preparing Heat Treat/NDT or Test.
    2. *Interactive `30m × 20m` Cell Layout & Spaghetti Canvas:* Hands-on bay relocation where teams move modular assets (**New 5-Axis Cell**, **U-Cell Sub-Assembly**, **Line-Side Kitting Racks**, **Endurance Test Rig**) across candidate bays while **Heat Treat & NDT** remains locked as an immovable **Monument** with a hazard-zone perimeter. Layout moves live-update spaghetti travel distance (`m`), Gate 2 civil/extraction cost requirements, and Safety aisle clearance alerts.
    3. *Interactive Multi-Operator Yamazumi Chart:* Stacked colour-coded bars (`E1–E8`) against a dashed **Customer Takt** line (`4.30m` or `3.40m`), showing `E6` (walk) and `E7` (paper check) shrink away when funded, and allowing click-to-reassign station balancing across `2–5` operators until all stations sit `<= Customer Takt` and Internal `LBR >= 85.0%`.
    4. *OEE / TEEP & Composite Rolled RFT Waterfall:* Stage-by-stage yield and availability breakdown.
    5. *7-Node CPM Gantt & Gate 5 Monte Carlo Distribution:* Parallel critical-path bars (`A1–A7`) plus P10/P50/P90 margin and SQCDP pass-probability bars.
  - **Right Decision Panel:** Proportional sliders, CapEx-gated equipment/package cards (clearly indicating remaining budget needed if locked), Gate Exit Ruling card, and collapsible **Living Gate-by-Gate Audit Log**.

---

## 5. Offline Build & Git Release Gate (Mandatory Before Finishing)
Before concluding your work, you MUST execute and verify every item below:
1. Run `npx tsc --noEmit` — must pass with **0 errors**.
2. Run the automated unit & scenario regression test suite — **100% passing**.
3. Build the 100% self-contained single-file offline bundle at `dist-offline/index.html` (`vite-plugin-singlefile` or equivalent inline bundle with zero external CDN fonts, scripts, or network calls).
4. Force-add `dist-offline/index.html` (`git add -f dist-offline/index.html`) along with all source files, commit cleanly, and push to `main`.
