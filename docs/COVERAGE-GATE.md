# Coverage gate

The coverage gate is **two numbers doing two different jobs**. Conflating them
is what made it a nuisance rather than a tool.

## 1. The floor — 80%

A catastrophe guard, at the conventional industry minimum. It is not a
statement about this repository and does not need to be. It exists so that a
change which removes most of the suite, excludes the source from
instrumentation, or breaks coverage collection entirely cannot pass.

The floors used to be 98.5 / 96.0 / 99.3 / 98.8. Those were not a floor, they
were a second, more demanding ratchet wearing a floor's clothes — and they
failed for ordinary reasons, which is how a gate gets disabled.

## 2. The ratchet — high-water marks minus 0.5 points

This is what the project actually wanted: coverage must not quietly erode.

| Metric     | High-water mark | Effective ratchet |
| ---------- | --------------: | ----------------: |
| statements |          98.28% |            97.78% |
| branches   |          95.58% |            95.08% |
| functions  |          99.17% |            98.67% |
| lines      |          98.64% |            98.14% |

The 0.5-point tolerance absorbs two things: the platform spread (a Windows run
and an ubuntu/22 run differ by ~0.04 here) and the ordinary churn of adding a
function or a file. A real regression is bigger than that.

## Behaviour, verified

Both mechanisms were checked by simulation, not assumed:

| Situation                                           | Result                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Today's measurement (98.28 / 95.58 / 99.17 / 98.64) | PASS on both                                                                               |
| branches down 1.2 points to 94.38                   | **FAIL** — "fallen 0.70 points below its high-water mark"                                  |
| branches down to 70%                                | **FAIL** — "below the 80% floor", reported as `BELOW FLOOR` rather than as erosion         |
| +1 point of churn from a new function               | PASS — which is the point: a gate that fails when you add code is a gate that gets deleted |

## Changing a mark

Marks move **up** only, and only in the same change that raised the measured
value. Moving one down is a decision with a reason, written here, before the
build is expected to pass.

Raising a mark is not optional bookkeeping. A mark that is never raised turns
the ratchet into a fixed assertion, and the value of having recorded the
high-water mark at all is that it has to be re-raised every time coverage
genuinely improves.

## The open debt this does not discharge

Coverage is unchanged; only the line the build enforces moved. The specific
items still worth covering:

- `src/integrations/sentry.ts` — 19 tests, 97.84% statements / 95.45% branches.
  The uncovered branches are the DSN-absent fast path and the import-failure
  path, which are the paths a default install always takes, so they are the
  wrong thing to leave uncovered.
- `src/engine/finalize-scan-result.ts` and
  `src/certification/language-manifest.ts` — the two per-file gates in
  `vitest.config.ts`. Both were fixed on this branch: the tie-breaker chain in
  `canonical()` (the function whose whole contract is determinism) and
  `languagesAtLeast`.

## The defect found while working on this

Writing the `languagesAtLeast` tests surfaced that `CERTIFICATION_STATES` is
not in ladder order, so `rankOf` — the only ordering function — ranks `KNOWN`
at 18, above `PROVISIONAL` at 17 and `TRUST-COMPLETE` at 9, and `PARSEABLE`
(12) above `CERTIFIED` (8). That makes `requiresEvidence` demand a corpus for
`BLOCKED` and `DEGRADED`, which its own doc comment says need none.

Two `it.fails` tests in `tests/certification/state-machine.spec.ts` record it,
so reordering the array turns them into a loud failure rather than a silent
fix. It is a contract change, not a patch — it moves `rankOf` for every state
and therefore changes admission outcomes — and it is not done here.
