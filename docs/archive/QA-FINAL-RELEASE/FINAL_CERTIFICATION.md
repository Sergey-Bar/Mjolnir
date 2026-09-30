# FINAL_CERTIFICATION.md — Mjölnir Final-Release Certification · Cycle 0

> Independent Certification Authority report. Authority: plan
> `1788804968910` (C1–C7); implementation authority remains plan
> `1788771091931`. Evidence: `QA/FINAL-RELEASE/evidence/151186b/**`.
> RC: `151186b1c9c964b237f494acbebe44537525847` (tag `v0.5.18`).

---

# 🔴 NOT RELEASE READY (for the 1.0.0 cut)

**Report order follows the C7 evidence hierarchy: kill-switch checklist →
contract gates → product promise → rule quality → ecosystem → security/scale →
docs/UX.**

This is the expected cycle-0 verdict **by construction** (plan §6): release-scope
items from owner-approved plans are open and, per C4, cannot be reclassified.
The verdict is not a claim of product failure — it is the honest gap between
the shipped v0.5.18 and the promised 1.0.0 scope. Remediation flows to the
implementation track; Cycle N re-certifies the final merged SHA (D12 END-state
rule).

## Kill-switch checklist (C5) — all ten conditions probed

| #   | Condition                                                                      | Result                                           | Probe evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | False-green for a scanner failure                                              | **NOT TRIGGERED**                                | False-green battery: `\|\| true`→QA-CI-002 error exit 1; `.only`→QA-PW-003/QA-PY-001 error exit 1; corrupt reports → diff/summary exit 2, never green. Residual honesty concern F4 (quarantine-tier flagship rules silent by default, README-vs-behavior contradiction) recorded as P1 finding — it is a documented-demotion transparency defect, not a hidden false-green: the tier cap is loud in doctor/rules/FP-AUDIT and the machine contract's completeness fields describe what ran. |
| 2   | A documented release feature does not actually work                            | **NOT TRIGGERED**                                | 27-verb surface + formats + MCP + packaging all exercised live (help/exit/hostile/parity batteries). One robustness defect F1 (summary on schema-incomplete input crashes) — an input-edge defect in one verb, honestly failing (exit 1 + stack, not a false success), P1 remediation noted.                                                                                                                                                                                                |
| 3   | A release contract is violated                                                 | **NOT TRIGGERED**                                | Exit-code matrix 0/1/2/10 verified live (20 unit-proven); JSON/SARIF/mermaid purity; digest formula independently reproduced; ANNOTATIONS_LIMIT honored.                                                                                                                                                                                                                                                                                                                                    |
| 4   | A claimed deterministic operation is nondeterministic                          | **NOT TRIGGERED** (with a specification finding) | Two-run self-scan: findings identity, score, and contract digest identical; only `durationMs` (wall-clock, deliberately excluded from the digest) differs. The **G5 raw byte-equality gate as currently specified would fail** on `durationMs` — F2, P1 for PR 4/5's spec, not a C5 determinism violation.                                                                                                                                                                                  |
| 5   | A security vulnerability can compromise the host under normal documented usage | **NOT TRIGGERED**                                | Hostile battery 8/8 safe; plugin code execution opt-in + loud gate (default OFF, markers absent); ReDoS ratchet error-level; MCP loop survives malformed frames; no network surface in the scan path.                                                                                                                                                                                                                                                                                       |
| 6   | A shipped rule can bypass its required fixture firewall                        | **NOT TRIGGERED AT RC / UNKNOWN for rev-lock**   | Firewall completeness + harness controls green; every rule has must-fire AND must-not-fire. The QA-PW-124-class metadata-edit rev-lock guard ships with PR 3/5 (in flight) → UNKNOWN at this RC by C4, probed at Cycle N.                                                                                                                                                                                                                                                                   |
| 7   | The npm artifact does not reproduce repository behavior                        | **NOT TRIGGERED**                                | `npm pack` → pristine install → version correct, scan parity **IDENTICAL**, MCP boots, tree-sitter WASM loads offline, no `src/` leak, `engines` claim intact.                                                                                                                                                                                                                                                                                                                              |
| 8   | A release-scope requirement falsely represented as complete                    | **NOT TRIGGERED**                                | Matrix records 21 UNMEASURED rules, missing Wave-1/2 surfaces, UNKNOWN rev-lock — none represented as complete anywhere.                                                                                                                                                                                                                                                                                                                                                                    |
| 9   | Evidence fabricated/mocked/inferred                                            | **NOT TRIGGERED**                                | Every claim cites a captured command+output under `evidence/151186b/`; probes were live CLI/API runs; no test-only or mocked channel backs a critical claim.                                                                                                                                                                                                                                                                                                                                |
| 10  | Auditor cannot independently reproduce a critical claim                        | **NOT TRIGGERED**                                | Digest recompute, determinism diff, packaging parity, MCP parity — all reproduced by independent scripts in this audit (C6 two-channel rule observed throughout).                                                                                                                                                                                                                                                                                                                           |

## Level 2 — Contract gates summary

All Level-2 gates PASS except: C-18 byte-equality-as-specified (BROKEN spec →
F2, remediation in PR 4/5), C-20 `doctor --json` (MISSING → planned), C-21
byte-replay CI (MISSING → planned), C-22 revision-integrity (UNKNOWN → in
flight), C-23 Wave-2 surfaces (MISSING → planned). Details:
MASTER-REQUIREMENTS-MATRIX.md §2-L2; gates table: RELEASE_READINESS.md §3.

## Overall Completion Percentages (denominator = promised set, never "everything conceivable")

| Axis                                           | %                                                                         | Denominator definition                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Requirements                                   | 82% (45 of 55 rows VERIFIED/VERIFIED DEEPLY)                              | matrix rows at L2–L7                                                           |
| Features (verb surface)                        | 96% (33/34 VERIFIED+; 1 PARTIAL F1; `doctor --json` counted in Contracts) | 27 dispatchable verbs + formats + config + plugin surface                      |
| Rules                                          | 79% (78/99 MEASURED; 99/99 fixture-firewalled)                            | 99-rule promised registry                                                      |
| Commands (verb coverage of help registry)      | 100%                                                                      | help-registry verbs                                                            |
| Contracts (exit codes, machine purity, schema) | 88%                                                                       | contract invariants incl. planned-but-absent machine surfaces                  |
| Languages (C3)                                 | 100% of promised set                                                      | TS/JS, Python, Java, C#, YAML-CI, plugin API                                   |
| Fixtures                                       | 100% firewalled / adversarial deep-matrix deferred                        | 154 rule dirs, 415 fixture files                                               |
| Tests+CI                                       | 92%                                                                       | suite green (6431), CI lanes green, corpus BLOCKED locally, byte-replay absent |
| Docs                                           | 95% (F3 stamp drift; F4 README-tier wording)                              | generated docs drift-locked                                                    |
| Packaging                                      | 100%                                                                      | six-check replay                                                               |

## Release Blockers (P0/P1 with remediation path)

- **P1 F1** — `summary` crash on schema-incomplete report (uncaught TypeError,
  exit 1 + raw stack). Fix + exit-2 message. Evidence: `false-green/fg-partial-summary.out`.
- **P1 F2** — G5 byte-equality gate spec vs `durationMs` incompatibility; gate
  cannot pass as written. Fix in PR 4/5 canonicalization. Evidence:
  `determinism/_diff-classification.json`.
- **P1 F4** — README advertises flagship false-green detections (`continue-on-error`,
  `.only`) that are quarantine-tier (silent by default; info-capped under
  `--strict`). Owner decision required: README honesty fix or measured tier
  re-elevation. C4 forbids silent reinterpretation of either side. Evidence:
  `false-green/fg2-*.out` vs README:218,320.
- **P2 F7** — Open release-scope plan work: 21/99 UNMEASURED (§19), Wave-1 PRs
  3/5 (in flight), 4/5, 5/5, Wave-2 surfaces, doctor check-numbering drift.
  Remediation: plan `1788771091931`.

## Residual Risk

RESIDUAL_RISK.md — accepted P2/P3 (R1–R7) and honest UNKNOWN rows. No waivers
requested; none needed for a 🔴 cycle-0 determination.

## Cycle protocol

1. Remediate F1/F2/F4 + remaining waves of plan `1788771091931`.
2. Freeze a new RC (immutable SHA on `main`, clean worktree) recorded in
   RELEASE_READINESS.md.
3. **Cycle N**: delta re-verify every changed row + re-run ALL gates + the full
   C5 probe set (≈70% of probe scripts are reusable as-is). Only that cycle's
   evidence set backs the shipped verdict.

---

> ### 📦 The Ultimate Question — "If I publish the current Mjölnir package today (v0.5.18), is there any known reason I should NOT trust it?"
>
> **v0.5.18 is already on npm; this answer is evidence-bound, not an
> endorsement of further publishing.**
>
> **No kill-switch condition applies to the shipped artifact.** The package
> reproduces repository behavior exactly (parity IDENTICAL, six checks), its
> machine contract is honest and independently reproducible (digest matched),
> determinism holds semantically, hostile inputs are handled safely, the
> plugin execution boundary holds by default, and the test suite is green
> (6431/0) across the CI matrix classes.
>
> **Known reasons to temper trust (all documented, none hidden):**
>
> 1. Quarantine tier: 54/99 rules (incl. flagship `continue-on-error`/`.only`
>    detectors) are capped info/E0 and excluded from default scans — their
>    measured FP is unproven or proven bad. A green default scan is therefore
>    NOT a claim that those anti-patterns are absent. Read `rules --json` /
>    `doctor` and, for the strongest surface, run `--strict`.
> 2. 21/99 rules have no measured FP rate (§19 open) — their trust metadata is
>    author-estimate, not measurement.
> 3. F1: don't feed `summary` hand-written or truncated-but-parseable reports.
> 4. Java/C# precision is regex-adapter grade (documented).
> 5. Corpus regression authority is the nightly Linux lane, not Windows-local.
>
> **Answer: YES — trust it for what it honestly claims (a local-first,
> zero-network, deterministic scan whose default findings are measured and
> machine-contract-backed), PROVIDED you treat quarantine-tier absence as
> "not measured", not "not present". No evidence-based reason blocks the
> package itself today; the 1.0.0 _release certification_ remains 🔴 for the
> open scope above.**

---

_Audit self-integrity (plan §12): 10-row sample re-runs and C6 two-channel
verification were performed inline during evidence gathering (digest recompute,
determinism diff-classifier, packaging parity, MCP parity are all independent
implementations). Kill-switch checklist executed to completion; no probe was
skipped. All auditor writes confined to `QA/FINAL-RELEASE/**` + temp scratch;
the RC worktree was restored to pristine (`git status` clean) after the drift
probe._
