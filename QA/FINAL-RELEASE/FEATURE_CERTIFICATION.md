# FEATURE_CERTIFICATION.md — Cycle 0 · RC `151186b`

Per-feature verdicts (C1 statuses). Evidence: `evidence/151186b/**`.

| Feature                                              | Status                             | Corroboration channels             | Notes                                                                             |
| ---------------------------------------------------- | ---------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| `scan` (full-repo, `--json`)                         | VERIFIED DEEPLY                    | CLI + JSON.parse + hostile battery | 8/8 hostile inputs valid JSON, honest partial on symlink loop                     |
| `scan --scope changed`                               | VERIFIED                           | CLI + suite (`tests/scope/*`)      | git-resolve suite green; CI canary covers Linux                                   |
| `scan --strict` (quarantine inclusion + info/E0 cap) | VERIFIED                           | CLI + code + doctor                | fg2 evidence; tier-policy unit                                                    |
| `scan --staged`                                      | VERIFIED                           | suite (`staged-blocking.spec`)     | surface exercised in suite; local probe deferred                                  |
| `scan --format sarif`                                | VERIFIED (F5 SRCROOT residual)     | CLI + parse                        | valid SARIF; base-id absent at CLI surface                                        |
| `scan --format mermaid`                              | VERIFIED                           | CLI                                | pure stdout                                                                       |
| `scan --score`                                       | VERIFIED                           | help + suite                       | numeric-only surface                                                              |
| `suppressions`                                       | VERIFIED                           | CLI + suite                        | governance transparency                                                           |
| `forensics`                                          | VERIFIED                           | CLI + suite                        | runtime evidence: retries/flakes/durations                                        |
| `triage`                                             | VERIFIED                           | CLI + suite                        | exit-2 graceful no-op path suite-proven                                           |
| `badge`                                              | VERIFIED                           | CLI + suite                        | shields endpoint JSON                                                             |
| `debt`                                               | VERIFIED                           | CLI + suite                        | test-debt register                                                                |
| `impact`                                             | VERIFIED                           | CLI + suite                        | introduced/resolved since baseline                                                |
| `baseline`                                           | VERIFIED                           | CLI + suite                        | snapshot semantics                                                                |
| `diff`                                               | VERIFIED DEEPLY                    | CLI + parse                        | corrupt report → exit 2 (fg-corrupt-diff)                                         |
| `pr-comment`                                         | VERIFIED                           | CLI                                | fresh-scan based (corrupt-report attack N/A by design); advisory-only             |
| `summary`                                            | PARTIAL (F1)                       | CLI                                | corrupt → exit 2 ✓; schema-incomplete-but-parseable → uncaught TypeError exit 1 ✗ |
| `stats`                                              | VERIFIED                           | CLI + suite                        | all-time counters                                                                 |
| `fix`                                                | VERIFIED                           | CLI + suite                        | proof-by-rescan; `--dry-run`                                                      |
| `create-rule`                                        | VERIFIED                           | CLI + suite                        | scaffold w/ TODO placeholder is the feature's design                              |
| `handover`                                           | VERIFIED                           | CLI + suite                        | onboarding map                                                                    |
| `init`                                               | VERIFIED                           | CLI + suite                        | never-overwrites contract                                                         |
| `pw-report`                                          | VERIFIED                           | CLI                                | binary/dir input → honest exit 2                                                  |
| `doctor` (8 checks)                                  | VERIFIED                           | CLI                                | 8/8 PASS, WORTHY                                                                  |
| `doctor --json`                                      | MISSING (PR 4/5)                   | CLI probe                          | exit 10 today                                                                     |
| `rules` (`--md`/`--json`/`unmeasured`)               | VERIFIED                           | CLI + parse                        | 99-entry catalog captured                                                         |
| `explain`                                            | VERIFIED                           | CLI + suite                        | per-rule FP/context                                                               |
| `why`                                                | VERIFIED                           | CLI                                | evidence + measured-FP rendering                                                  |
| `doctor:playwright`                                  | VERIFIED                           | CLI + suite                        | Selector Health report                                                            |
| `mcp` (stdio)                                        | VERIFIED DEEPLY                    | API + CLI parity                   | tools: scan/explain/diff                                                          |
| `ci install`                                         | VERIFIED                           | CLI + suite                        | PR workflow generator                                                             |
| `handoff`                                            | VERIFIED                           | CLI + suite                        | deterministic artifact from report                                                |
| `install` (agents/hooks)                             | VERIFIED (F3 stamp drift residual) | CLI + suite                        | managed surfaces                                                                  |
| `--version`                                          | VERIFIED                           | CLI + package                      | 0.5.18 both                                                                       |
| Plugin API (`--enable-plugins`, JSON manifests)      | VERIFIED DEEPLY                    | security battery + code            | default-off loud skip                                                             |
| Config `.mjolnirignore` excludes-everything          | VERIFIED                           | suite + hostile variants           | honest completeness                                                               |

Denominator: the 27-verb surface actually registered/dispatchable in the RC
(`SUBCOMMANDS` 22 + summary/why/handoff/install/help dispatch + two-word `ci
install`, `doctor:playwright`) — promised set per help registry, never
"everything conceivable".
