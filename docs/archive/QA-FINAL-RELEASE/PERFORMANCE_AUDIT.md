# PERFORMANCE_AUDIT.md — Cycle 0 · RC `151186b`

## In-repo scale evidence (suite-run at RC, Windows, Node 26.3.1)

| Probe                                                          | Result                                                             | Evidence                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------- |
| 3k synthetic files, wall-budget suite                          | PASS (budget honored; noise policy rerun-once documented in-suite) | `tests/stress/scale-benchmark.spec.ts`  |
| 10x-files scaling linearity (≈10x time, not 50x+)              | PASS in-suite                                                      | same spec                               |
| O(n²) hunt (file-list construction, repeated whole-file reads) | guarded by budget assertions + per-file pipeline design            | spec header rationale                   |
| Finding-heavy scan determinism under load                      | digest stable (durationMs excluded)                                | `determinism/_diff-classification.json` |

## Live truncation honesty (hostile battery)

- Symlink loop: `partial: true` + `truncationReasons: ["symlink-skipped"]`,
  machine-readable — the machine contract's completeness fields carry the
  incompleteness instead of hiding it. Evidence: `hostile/hostile-symlink-loop.out`.
- Zero-test dirs: `score: null` (R2 honesty) rather than a fake 100 —
  `hostile/hostile-empty.out`, `hostile-no-tests.out`.

## Known environment caveats (recorded, per prior certification)

- The audit host is a loaded Windows machine; wall-clock numbers are NOT
  comparable across machines and are treated as hygiene evidence only.
- Windows-local corpus regression remains dir-lock/120s-budget BLOCKED; the
  nightly Linux CI lane (corpus-audit.yml) is the authoritative performance +
  regression surface.
- 10k+ file / RSS-curve profiling deferred to the Cycle-N battery on the final
  RC (plan §14: deep expensive work repeats on the shipped END state).

## Complexity findings

None new. Per-file linear pipeline + skip-budget accounting observed live
(19–33 ms scans on small fixtures; 2.9 s self-scan of the full repo).
