# RESIDUAL_RISK.md — Cycle 0 · RC `151186b` · 2026-09-07

Brutally honest register of everything that remains imperfect. This document
exists so the verdict never has to be softened: every accepted residual is a
reason the final verdict is not (and must not be claimed as) 🟢.

## Accepted P2/P3 residuals (product limitations, documented)

| ID  | Risk                                                                                                                      | Why accepted at this cycle                                                                        | Owner exposure                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| R1  | Regex adapters (Java/C#) are pattern-based, not AST: exotic formatting or generated Java/C# could evade or mis-cite lines | Documented in capability matrix + idiom-mapping doc; measured FP tracked per rule                 | Lower precision on Tier B languages                 |
| R2  | `score: null` on test-less repos — "no tests" is reported as unmeasurable, not zero                                       | Contract R2; honest by design                                                                     | Users must read `completeness`, not score           |
| R3  | Windows-local corpus regression environment-blocked (dir locks, 120s budget)                                              | Nightly Linux lane is the authoritative surface (prior certification precedent)                   | Corpus evidence always ~1 night behind              |
| R4  | Plugins, when opted in (`--enable-plugins`), run with full Node privileges — no sandbox                                   | Documented threat model (`docs/VERSIONING.md:49`); zero-network brand preserved for default scans | Operator opting in accepts code execution           |
| R5  | macOS / node-24 exercised only in CI canary lane, not deep-probed locally                                                 | Local deep-dive was Windows; CI matrix covers compile+suite                                       | Unprobed OS-specific edge cases remain possible     |
| R6  | `tree-sitter-ast.ts` admitted dead code (capability-matrix defect D1)                                                     | Known, tracked in audit plan                                                                      | No runtime risk; hygiene debt                       |
| R7  | Doctor revision-integrity reports INCONCLUSIVE on installed packages (no `src/`)                                          | G4 design (honest UNKNOWN, not fake pass) — verified in packaging replay                          | Installed-package users see INCONCLUSIVE, by design |

## Unverified / UNTESTED at this cycle (UNKNOWN rows, honest)

| Item                                                                              | Why UNKNOWN                                                                                                                                                       | Clears when                    |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Byte-equality determinism CI replay (G5)                                          | PR 4/5 not shipped; gate does not exist at RC                                                                                                                     | PR 4/5 lands + Cycle N re-run  |
| Detector-revision integrity guards (QA-PW-124 rev-lock, detector-hashes manifest) | Wave-1 PR 3/5 in flight, uncommitted at RC → out of RC by C4                                                                                                      | PR 3/5 merged, Cycle N         |
| 21/99 rules' measured FP rate (n<10)                                              | §19 close-out open                                                                                                                                                | corpus sample + adjudication   |
| `doctor --json` machine surface                                                   | PR 4/5                                                                                                                                                            | implementation track           |
| Exact-SHA CI green summary                                                        | GH API returned only Socket check-run for `151186b`; nearest-commit CI green (`29ed9ec`) + tag = RC recorded instead                                              | Cycle N re-pull on the new RC  |
| Exit-20 live trigger                                                              | All crash-hunt probes were handled gracefully (exit 10/2/0); the exit-20 arm is unit-tested (`internalErrorMessage`) but no live natural trigger found this cycle | adversarial fuzzing (optional) |

## Environment constraints of this audit

- Windows host, Node v26.3.1 (above engines floor — packaging replay confirms engines claim separately), disposable worktree + temp scratch only.
- `QA/FINAL-RELEASE/**` is the only in-repo write surface; adversarial fixtures lived in `%TEMP%`; count-lock/goldens/`.mjolnir/` never touched by probes (regen drift was produced in the disposable worktree and reverted there).
- No network scanning/telemetry probes were run against third parties; plugin pwned-markers wrote only to the audit scratch dir.
