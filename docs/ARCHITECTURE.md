# Architecture — canonical reference

> This document is the **canonical map of the implemented system** as of
> the 0.6.x line (Mega MVP Master Plan v3.1, workstream A). Every claim
> here names its source-of-truth module; where a capability is _planned_
> rather than implemented, the doc says so explicitly (docs must follow
> reality — never the reverse).

## The spine

```text
Test Execution
      ↓ (run reports next to the scan target — never fetched)
Raw Evidence            forensics/{run,parse-playwright-json,parse-junit}.ts
      ↓
Evidence Ingestion      engine/scan-pipeline.ts · discoverRuntimeReport (discovery/evidence-discovery.ts)
      ↓
Canonical Evidence Core src/engine/evidence-core.ts   — EvidenceRecord, deterministic ordering
      ↓
Correlation             engine/runtime-corroboration.ts  — file → test → defect-class matching
      ↓
Trust Engine            rules/* (detection) → engine/tier-policy.ts → types.ts (E0–E2, L0–L5)
      ↓
Canonical Trust Result  types.ts:ScanResult (+ trustSummary, machine contract)
      ↓
Surfaces                CLI · GitHub Action · MCP · Playwright reporter · Trust Artifact
```

One scan path: `runScan` (`src/engine/scan-pipeline.ts`). Surfaces render;
they never re-derive semantics (plan §18 parity law).

## Module map (implemented)

| Module                                                  | Role                                                                                                                                                                       | Source of truth for                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `src/engine/scan-pipeline.ts`                           | the one scan path: discovery → rules → runtime ingestion → tier policy → boundary check → scoring                                                                          | orchestration, exit-code contract inputs                |
| `src/engine/evidence-core.ts`                           | normalized `EvidenceRecord` (source, artifact, test identity, status facts, retries, duration, errors/attachments slots, provenance), deterministic ordering, `findTestAt` | runtime evidence normalization (WI-2)                   |
| `src/engine/runtime-corroboration.ts`                   | stamps `RuntimeCorroboration` + `trustLevel` (L0–L5) on findings from the evidence core                                                                                    | trust ladder derivation                                 |
| `src/engine/trust-summary.ts`                           | scan-level `trustSummary` metrics with hard incompleteness ceilings                                                                                                        | trust measurement (WI-3; formulas in `docs/SCORING.md`) |
| `src/engine/machine-contract.ts`                        | `MachineContract` v1 — summary digest, annotations, completeness, trustSummary, provenance, reserved forensicVerdicts slot                                                 | the machine representation (WI-4)                       |
| `src/rules/index.ts`                                    | the registry: 78 active rules + `RETIRED_RULE_IDS` (canonical retirement record)                                                                                           | registry census, ID-immutability                        |
| `src/rules/measurement.ts` + `measured-fp.generated.ts` | measurement status per rule (MEASURED-*/PROVISIONAL/UNMEASURED), tier from the measured envelope                                                                           | measurement honesty (plan §11)                          |
| `src/discovery/*`                                       | framework detection (honest `unknown`), ignores, zero-config evidence discovery (depth ≤ 2)                                                                                | discovery (WI-11)                                       |
| `src/forensics/*`                                       | run-report ingestion (Playwright JSON, JUnit XML), TRUE-FLAKE/FAILING analysis, guided triage workflow                                                                     | runtime forensics                                       |
| `src/commands/*`                                        | consumption verbs — render/derive, never re-derive trust                                                                                                                   | CLI surface                                             |
| `src/reporter/*`                                        | Trust Report (`trust-report.ts`), classic terminal, SARIF, score state                                                                                                     | presentation                                            |
| `src/mcp/*`                                             | stdio MCP server: scan/explain/diff tools, one-scan-in-flight                                                                                                              | MCP surface                                             |
| `packages/playwright-reporter`                          | Playwright reporter wrapper — writes `mjolnir.report.json` (the ingestion contract)                                                                                        | reporter package (unpublished)                          |
| `action.yml`                                            | composite GitHub Action: scan → SARIF → annotations → PR comment (upsert by marker) → artifact                                                                             | Action surface (WI-9)                                   |
| `scripts/check-changelog.ts`                            | release-blocking CHANGELOG integrity gate                                                                                                                                  | release integrity (WI-12A)                              |
| `scripts/check-reporter-version.ts`                     | reporter version-sync gate (advisory ramp)                                                                                                                                 | distribution (WI-10)                                    |

## Canonical semantics (frozen)

- **Evidence ladder** E0 (observation) · E1 (pattern, half weight) ·
  E2 (deterministic proof, full weight) — `src/types.ts`.
- **Trust ladder** L0–L5 — L3–L5 structurally require runtime
  corroboration; static-only scans cap at L2 — `src/types.ts`,
  `engine/runtime-corroboration.ts`.
- **Exit codes** 0 clean · 1 findings-at-gate · 2 partial (never blocks)
  · 10 usage · 20 internal — `src/cli.ts`, `src/commands/help.ts`.
- **`schemaVersion: 1`** additive-only JSON; machine contract
  `contractVersion: 1` additive-only — `src/types.ts`,
  `engine/machine-contract.ts`.
- **Retirement** is canonical via `RETIRED_RULE_IDS`; quarantine ≠
  retirement; retired IDs are never reused — `src/rules/index.ts`,
  `docs/RULE-LIFECYCLE.md`.
- **Zero network** inside a scan; provenance is metadata, never trust —
  `src/plugins/*`, `docs/CERTIFICATION-POLICY.md`.

## Planned, not implemented (honesty ledger)

- `trust.zip` forensics, forensic verdict taxonomy
  (REAL/ENVIRONMENTAL/…), runtime network/console correlation,
  Selector-Health runtime correlation, per-capability product matrix —
  **1.1.x** (WI-17–20).
- MCP forensics/triage/pw-report/verify tools, Agent Skill — **1.2.x**
  (WI-21–22).
- Complete Trust Artifact (HTML), share loops, canonical demo —
  **1.3.x** (WI-23–24).
- `RETIRED_RULE_IDS` contains 21 retired IDs; the active census is
  **78 rules (57 measured / 21 PROVISIONAL)** — the measurement
  closeout to 78/78 is the 1.0.0 gate (WI-14) and will not be
  simulated.

## Where the docs live

- Trust formulas: `docs/SCORING.md` (§ Trust summary formulas v1)
- Certification law: `docs/CERTIFICATION-POLICY.md`
- Measurement law: `docs/FP-AUDIT.md`, `docs/COUNT-LOCK.md`
- Rule lifecycle: `docs/RULE-LIFECYCLE.md`
- Terminology: `docs/TERMINOLOGY.md`
- Versioning: `docs/VERSIONING.md`
