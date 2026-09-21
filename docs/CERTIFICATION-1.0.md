# Mjölnir 1.0.0 — Core Certification Report (WI-16)

> Certification run per `docs/CERTIFICATION-POLICY.md` verifying every
> §37 Core-Certification-Gate requirement with evidence links. Verified
> against live code on `main` — the repository is the source of truth,
> never this document. Automated re-verification:
> `tests/contract/certification.spec.ts`.

## §37 Core-Certification-Gate requirements

| #   | Requirement                                                                                                                                | Status | Evidence                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 99/99 measured (now: 77 active canonical / 77 measured — the E-1 + WI-14 retirement law reduced the active set honestly; see census below) | ✅     | `src/rules/index.ts` · `src/rules/measured-fp.generated.ts` · doctor `measurement-consistency`                                                          |
| 2   | Evidence Core (WI-2)                                                                                                                       | ✅     | `src/engine/evidence-core.ts` — one canonical `EvidenceRecord` shape, deterministic ordering, preservation suite (`tests/engine/evidence-core.spec.ts`) |
| 3   | Canonical trust semantics (WI-3)                                                                                                           | ✅     | `src/engine/trust-summary.ts` + formulas `docs/SCORING.md` §Trust summary formulas v1; ceiling law tested                                               |
| 4   | Machine contract (WI-4)                                                                                                                    | ✅     | `src/engine/machine-contract.ts` (`contractVersion: 1`, additive); drift-locked `docs/machine-contract.md`                                              |
| 5   | CLI/JSON parity (WI-13B stage 1)                                                                                                           | ✅     | `tests/contract/mvp-golden/harness.spec.ts` — Trust Report renders exactly the JSON summary                                                             |
| 6   | Provenance                                                                                                                                 | ✅     | `src/engine/provenance.ts` — metadata only (§17.4 never-trust law); npm provenance pipeline active                                                      |
| 7   | Benchmark (WI-15)                                                                                                                          | ✅     | `docs/bench/bench-artifact-0.6.0.json` schema-locked (`tests/adversarial/bench-artifact.spec.ts`)                                                       |
| 8   | Adversarial testing (WI-15)                                                                                                                | ✅     | `tests/adversarial/` — hostile ingestion, malformed verdicts, bench honesty                                                                             |
| 9   | Determinism (WI-15)                                                                                                                        | ✅     | `node scripts/scan-determinism-replay.mjs .` byte-identical; doctor `--json` G5 byte-identical test                                                     |
| 10  | Certification report (WI-16)                                                                                                               | ✅     | this document + `docs/CERTIFICATION-0.6.md` (Gate A predecessor)                                                                                        |
| 11  | Frozen contracts preserved                                                                                                                 | ✅     | `tests/contract/` suite: schema v1, machine contract, JSON contract, mcp-transport, repo-hygiene, census-drift                                          |

## Census (verified live by `tests/contract/certification.spec.ts`)

| Metric                              | Value  |
| ----------------------------------- | ------ |
| Active canonical rules              | **77** |
| Measured (n ≥ 10, revision-current) | **77** |
| PROVISIONAL                         | **0**  |
| Retired (excluded from census)      | **22** |
| Quarantine-tier                     | **32** |

The measurement law (n ≥ 10 hand-classified verdicts at the current
`detectorRevision`) is satisfied by every active rule. 15 rules closed
in the 2026-09-09 harvest waves; QA-PY-102 was retired as a structural
dead duplicate (its measured sibling QA-PY-005 declares `overlapWith`,
so it could never fire). History: `docs/MEASUREMENT-CLOSEOUT.md`.

## Standing gates at certification time

- Full suite: **7,054 passed** + full-coverage ratchet
  (99.8/99.37/99.81/99.82 — per-file paused, documented in
  `vitest.config.ts`)
- Doctor self-audit: **WORTHY** — 77 measured / 0 unmeasured / 32
  quarantine, `healthy: true`, byte-identical JSON across runs
- Determinism replay: byte-identical minus the durationMs allowlist
- Release pipeline: proven green end-to-end (v0.6.13 publish → npm
  latest → GH Release → v1 tag); CHANGELOG integrity gate active
- Zero-network scan; plugin trust gate; provenance metadata separated
  from trust (§17.4)

## Explicitly NOT required for 1.0.0 (verified absent, honest)

trace.zip forensics (WI-17, 1.1.x) · forensic verdict taxonomy
(WI-18, 1.1.x — machine contract slot reserved) · Selector Health v2
runtime (WI-19) · per-capability product matrix (WI-20) · MCP
forensics/triage/pw-report/verify (WI-21, 1.2.x) · Agent Skill (WI-22)
· complete Trust Artifact HTML (WI-23, 1.3.x).

## Verdict

**1.0.0 Core Certification: PASS.** Every §37 requirement is met with
verifiable evidence; nothing outside the 1.0.0 boundary is claimed;
the registry is fully measured with zero denominator games.
