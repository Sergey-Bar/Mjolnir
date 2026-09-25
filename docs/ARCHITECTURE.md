# Architecture — canonical reference

> This document is the **canonical map of the implemented system** for the
> 3.0.0 line and its post-3.0 working candidate. Every claim names its
> source-of-truth module; provisional frontier contracts are labeled as
> non-promoting rather than presented as shipped certification.

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
| `src/rules/index.ts`                                    | the registry: 79 active rules + 22 retired historical IDs                                                                                                                  | registry census, ID immutability                        |
| `src/rules/measurement.ts` + `measured-fp.generated.ts` | measurement status per rule (MEASURED-*/PROVISIONAL/UNMEASURED), tier from the measured envelope                                                                           | measurement honesty (plan §11)                          |
| `src/discovery/*`                                       | framework detection (honest `unknown`), ignores, zero-config evidence discovery (depth ≤ 2)                                                                                | discovery (WI-11)                                       |
| `src/forensics/*`                                       | run-report ingestion (Playwright JSON, JUnit XML), TRUE-FLAKE/FAILING analysis, guided triage workflow                                                                     | runtime forensics                                       |
| `src/commands/*`                                        | consumption verbs — render/derive, never re-derive trust                                                                                                                   | CLI surface                                             |
| `src/reporter/*`                                        | Trust Report (`trust-report.ts`), classic terminal, SARIF, score state                                                                                                     | presentation                                            |
| `src/mcp/*`                                             | stdio MCP server: scan/explain/diff/verify/forensics/triage/pw-report tools, one-scan-in-flight                                                                            | MCP surface                                             |
| `packages/playwright-reporter`                          | Playwright reporter wrapper — writes `mjolnir.report.json` (the ingestion contract); post-MVP unpublished/source-only                                                      | reporter package (unpublished)                          |
| `action.yml`                                            | composite GitHub Action: scan → SARIF → annotations → PR comment (upsert by marker) → artifact                                                                             | Action surface (WI-9)                                   |
| `scripts/check-changelog.ts`                            | release-blocking CHANGELOG integrity gate                                                                                                                                  | release integrity (WI-12A)                              |
| `scripts/check-reporter-version.ts`                     | reporter version-sync gate (advisory ramp)                                                                                                                                 | distribution (WI-10)                                    |

## Canonical semantics (frozen)

- **Evidence ladder** E0 (observation) · E1 (pattern, half weight) ·
  E2 (deterministic proof, full weight) — `src/types.ts`.
- **Trust ladder** L0–L5 — L3–L5 structurally require runtime
  corroboration; static-only scans cap at L2 — `src/types.ts`,
  `engine/runtime-corroboration.ts`.
- **Exit codes** scan/CI: 0 clean · 1 findings-at-gate · 2 partial
  · 10 usage · 20 internal. Release commands have command-specific exits —
  see `docs/RELEASE-TRUST-CONTRACT.md`.
- **`schemaVersion: 1`** additive-only JSON; machine contract
  `contractVersion: 1` additive-only — `src/types.ts`,
  `engine/machine-contract.ts`.
- **Retirement** is canonical via `RETIRED_RULE_IDS`; quarantine ≠
  retirement; retired IDs are never reused — `src/rules/index.ts`,
  `docs/RULE-LIFECYCLE.md`.
- **Zero network** inside a scan; provenance is metadata, never trust —
  `src/plugins/*`, `docs/CERTIFICATION-POLICY.md`.

## Provisional and external-only work

- Hosted team/enterprise control-plane, enterprise recovery, and marketplace
  surfaces remain local, non-promoting contracts until external evidence and
  human authority exist — `src/governance/`, `docs/M26-EXTERNAL-VALIDATION.json`.
- M36–M50 evidence contracts (mutation sensitivity, simulation, research,
  benchmark, scale, UX parity, and Trust OS) are not enabled by the default
  scan/release path; they are tracked in `docs/ROADMAP.yaml`.
- The current registry contains 79 active rules: 74 measured and 5 explicitly
  unmeasured. Five active unmeasured rules do not enter effective core.
- External Trust certification, protected-holdout, real-world, platform,
  consumer, and remote-workflow evidence is not synthesized by local tests.

## Where the docs live

- Trust formulas: `docs/SCORING.md` (§ Trust summary formulas v1)
- Certification law: `docs/CERTIFICATION-POLICY.md`
- Measurement law: `docs/FP-AUDIT.md`, `docs/COUNT-LOCK.md`
- Rule lifecycle: `docs/RULE-LIFECYCLE.md`
- Terminology: `docs/TERMINOLOGY.md`
- Versioning: `docs/VERSIONING.md`
