# Final Certification — Mjölnir 2.0 Blueprint Execution

**Date:** 2026-09-06 · **Report:** QA/reports/remediation/final-certification-2026-09-06.md
**Plan:** `.kilo/plans/1788597687393-mjolnir-2-0-strategic-blueprint.md` (hardened v3)
**Machine:** Windows (local execution) · CI: GitHub Actions ubuntu/macos/windows × node 22/24

---

## Verdict: 🟡 CONDITIONAL — one gate intentionally open

Everything executable without human adjudication is shipped, merged, and
CI-verified across 6 releases (v0.5.5 → v0.5.9). The single open gate is
the §19 measurement close-out (99/99 measured), which is **human-bounded
by design** — the §19 anti-Goodhart invariant forbids the only
programmatic shortcut that would close it (bulk-auto-classification), and
this certification does not take that shortcut.

---

## Shipped and merged (all CI-verified on 4 platforms × node 22/24)

| Release | PR  | Blueprint scope                                                                                                                                                                                              | Verification class |
| ------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| v0.5.5  | #36 | Phase 0+1: audit remediation rebase (C1/C5 correctness), trust boundary (C2 gate, S1/S2/S3/S7), exit-code contract, atomic writes, M6 scan-pipeline extraction, D-A/D-D/D-E fixes, Lane A prep               | VERIFIED IN CI     |
| v0.5.6  | #39 | CI-family trust repair: QA-CI-001..010 detectorRevision-2 re-adjudication + corpus lane; QA-CI-008 dead enforcement-arm BUG FIX (found by the coverage floor)                                                | VERIFIED IN CI     |
| v0.5.7  | #40 | §12 Machine Verification Contract (additive `contract` field, deterministic digest), §13 `Finding.detectorRevision`, §15 lifecycle resolution, §17 baseline revision awareness, §25 semantic-integrity suite | VERIFIED IN CI     |
| v0.5.8  | #41 | §21 MCP stdio transport (pure transport over the machine contract; 3 tools; strict validation; serialization; spawned-session test)                                                                          | VERIFIED IN CI     |
| v0.5.9  | #42 | §10 Lane A: hard-sleep JV/CS family → QA-model substrate (dossier, parity, rev-2)                                                                                                                            | VERIFIED IN CI     |

Also merged pre-blueprint (this session): PR #38 agent-handoff+reporting (v0.5.4).

## Verification-class detail

### VERIFIED LOCALLY (all gates green at commit time, every PR)

- 6,121+ tests green on every merged PR; coverage floor 100% per-file on
  all four axes (istanbul, per-file enforcement) — 0 violations at merge.
- typecheck · lint · build (dual entry: dist/cli.mjs + dist/mcp/stdio.mjs)
  · self-scan 99/100 WORTHY · generated-docs-drift green.
- §25 semantic-integrity suite: identity stability, table-driven
  resolution fixtures (one per disappearance cause), contract parity,
  revision inconclusiveness, epistemic no-upgrade.
- Lane A parity: 14 tests proving QA-model re-expression is
  finding-identical to the lexical baseline, with grammar-precision
  gains pinned by must-not-fire fixtures.

### VERIFIED AGAINST RDS

**Not applicable to this repository.** The RDS/Oracle authorization
(`Sergey_local` / BIST) was evaluated and found to belong to a different
project — this repo (Mjölnir) contains no Oracle/JDBC surface, no
datasource configuration, and no database-dependent tests. No database
operation was executed (the §1/§13 safety rules were applied and the
mismatch was surfaced before any mutation).

### VERIFIED IN CI

- build-test × 4 platforms × 2 node versions: PASS on every merged PR.
- generated-docs-drift: PASS (docs/rules/*, capability matrix, machine
  contract doc, count-lock, FP-AUDIT all regenerated and drift-locked).
- self-scan (the product scanning itself): 99/100 WORTHY, exit 0.
- security lanes: CodeQL, Socket, OSV, Snyk, workflow-lint: PASS.

### BLOCKED BY EXTERNAL ENVIRONMENT

- **Corpus regression lane (count lock, nightly CI job by design):**
  locally environment-blocked — fresh-clone directory locking on Windows
  produces `dir-unreadable` skips, and a loaded machine trips the 120 s
  per-repo budget on large repos (the lock itself refuses `--update`
  from partial scans, per its 2026-09-01 review-fix contract). A
  rerun-once policy was added to the §20 stress benchmark for the same
  noise class. **QA-JV-105/QA-CS-105 produced ZERO count drift on every
  corpus repo that completed a full scan**; the authoritative
  reconciliation runs in the nightly CI lane on quiet Linux runners.
- **Story lanes / Stryker / repository rulesets:** belong to a different
  project (see VERIFIED AGAINST RDS note).

### REQUIRES PRODUCT DECISION

- **§19 measurement close-out — 76/99 → 99/99.** Precisely audited in
  `docs/MEASUREMENT-CLOSEOUT-2026-09-06.json`:
  - 13 rules have partial verdicts (2–9 classified) needing top-up to
    n ≥ 10;
  - 9 rules have no verdicts at all (full sampling needed);
  - 29 sampled findings were generated this session into review sheets
    and **left unclassified on purpose** — §19's anti-Goodhart invariant
    forbids bulk-auto-classification, and the committed
    unclassified/UNSURE ceilings (0) enforce it mechanically.
  - Classification effort: ~176 additional hand adjudications
    (23×10 − 54 already classified), each with 5-line source context in
    `tests/corpus/review/*.md` ready for review.

## Blueprint scope closure

| Phase      | Scope                                                                                                          | Status                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 0          | 1.0 consolidation & correctness release (audit rebase, D-fixes)                                                | ✅ shipped v0.5.5                                                                        |
| 1          | M6 pipeline extraction, benchmark artifact schema, SARIF SRCROOT, lazy grammars (verified existing), scan verb | ✅ shipped v0.5.5                                                                        |
| 2          | Machine contract, detectorRevision, lifecycle resolution, semantic-integrity                                   | ✅ shipped v0.5.7                                                                        |
| 3          | Resolution algorithm, baseline revision awareness, rendering law                                               | ✅ shipped v0.5.7                                                                        |
| 4          | MCP pure transport                                                                                             | ✅ shipped v0.5.8                                                                        |
| 5          | Ecosystem (reporter publish, seed plugins)                                                                     | ⏳ out of scope this pass — contract substrate shipped                                   |
| 6          | Hardening + 1.0.0 cut                                                                                          | 🟡 everything programmatic done; 1.0.0 blocked by §19 Required gate (human adjudication) |
| §10 Lane A | QA-model substrate migration, first family + dossier                                                           | ✅ shipped v0.5.9                                                                        |
| §19        | Measurement close-out                                                                                          | 🟡 eligibility audit + harvest done; adjudication is the designed human gate             |

## Remaining path to 1.0.0 (honest, minimal)

1. Hand-adjudicate ~176 verdict rows across 22 rules (review sheets
   ready; effort is the plan's designed human bottleneck).
2. Re-run `npm run corpus:regression --update` on a quiet Linux runner
   (nightly lane) to re-baseline the count lock over the merged
   detector changes.
3. Cut 1.0.0 through the label-driven release pipeline (`release:major`).

Everything else in the 2.0 blueprint is merged, CI-verified, and
drift-locked.
