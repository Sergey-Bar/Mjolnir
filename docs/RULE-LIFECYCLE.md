# Rule Lifecycle & Deprecation Policy

This is distinct from the **anti-creep law**
([`docs/archive/plans/Master-Stabilization-Plan.md` §2](archive/plans/Master-Stabilization-Plan.md#2-laws-in-force-unchanged-and-how-this-plan-respects-them)),
which governs _adding_ to the launch rule set. This document governs
_removing or weakening_ a rule that has already shipped and is found to
be conceptually wrong — not just noisy, but wrong: it flags a pattern
that turns out not to indicate a real problem, or its detection logic
cannot be made honest about its false-positive rate.

A tunable false-positive _rate_ is not grounds for deprecation — that's
ordinary maintenance (adjust the regex/AST match, add a fixture,
re-run the corpus audit). This policy is for a rule whose entire
premise turned out to be wrong.

## Frozen contract, unaffected by this policy

Per the frozen contracts law, rule IDs are **never reused**, whether a
rule is deprecated, downgraded, or fully removed. `QA-TEST-042` means
the same thing forever, or it means nothing (removed) — it never means
something different tomorrow than it did yesterday.

## The path

1. **Severity downgrade, not deletion, as the default move.** Set
   `RuleMeta.severity` to `"info"` and, if the rule should stop running
   by default, disable it (`mjolnir.config.json`'s `ignore` list can
   suppress a rule globally with a `reason` explaining the deprecation —
   see `src/config/config.ts`'s `IgnoreEntry`). The rule's code and
   fixtures stay in the repo; its ID stays valid; a user who has
   suppressed or overridden it explicitly keeps working exactly as
   before.
2. **Never repurpose the ID.** If the underlying detection idea is
   salvageable under different logic, ship it as a **new** rule ID with
   its own fixture pairs. The old ID stays retired, forever meaning what
   it always meant.
3. **Mandatory `CHANGELOG.md` entry**, under a `### Deprecated` heading
   for the release, stating: the rule ID, why it's wrong (not just "too
   noisy" — the actual conceptual flaw), what a user with it enabled
   should do, and whether a successor rule exists.
4. **One minor version of visible deprecation before removal is
   considered.** In practice, given `RuleMeta.severity`
   downgrade already makes it non-blocking, most deprecated rules can
   simply stay at `info`/disabled indefinitely — full removal from the
   registry is reserved for rules that are actively misleading if left
   present at any severity (e.g. a rule whose _existence_ implies a
   guarantee the tool no longer makes).
5. **Full removal** (only after step 4's deprecation window, and only
   for the "actively misleading" case above): delete the rule's source
   file and its fixtures, remove it from `src/rules/index.ts`'s `RULES`
   array, and add the ID to that same file's `RETIRED_RULE_IDS` array.
   `tests/rules.registry.spec.ts` enforces both halves of the promise:
   a retired ID can never simultaneously be an active rule ID, and
   `RETIRED_RULE_IDS` itself can't have duplicates.

## Worked example

Suppose `QA-PW-999` ("flags any `page.click()` not preceded by a
`page.waitForSelector()`") shipped, and a false-positive audit later
shows Playwright's own auto-waiting makes the pattern meaningless —
the rule's entire premise is wrong, not just its regex.

1. Open a PR that:
   - Sets `severity: "info"` and adds `falsePositiveRisk: "high"` on
     `QA-PW-999`'s `RuleMeta`, with a code comment explaining why
     (linking the audit finding).
   - Adds a `mjolnir.config.json`-style suppression example to the
     rule's own doc comment (not the repo's own config — that's for
     _this_ repo's self-scan, not a template for consumers) showing how
     a user can fully silence it.
   - Adds a `CHANGELOG.md` entry:

     ```markdown
     ### Deprecated

     - **QA-PW-999** (`click-without-wait`): downgraded from `warning`
       to `info`, `falsePositiveRisk` set to `high`. Playwright's
       auto-waiting makes this pattern harmless in the vast majority of
       real code (see FP audit run on <date>, <N> false positives out
       of <M> real-repo findings). If you had this rule's findings
       gating CI, they no longer do at `info` severity by default; add
       an explicit `severityOverrides` entry in `mjolnir.config.json`
       if you want the old blocking behavior. The ID is retired — no
       successor rule.
     ```

   - Leaves the rule's fixtures in place (they still prove the rule
     detects what it says it detects — the problem was never detection
     accuracy, it was relevance).
2. The **standing gate**, including the golden lock, runs as normal.
   A severity downgrade legitimately changes scores wherever
   `QA-PW-999` fired — run `npm run golden:update`, read the diff,
   confirm every changed line is explained by this one rule's severity
   change, and include that diff in the PR.
3. No ID reuse: `QA-PW-999` is never reassigned to a different rule,
   even years later.

## Phase 2 quarantine-cluster triage (Verification Trust Evolution Plan §12.2)

Every rule measured at 100% FP (zero TPs at n ≥ 10, `docs/FP-AUDIT.md`)
received an evidence-based decision by clustering its hand-classified
verdict notes (`tests/corpus/verdicts/*.jsonl`): **retune** (one fixable
root cause), **retire** (premise wrong, §1 above), or — for the remaining
quarantine rules above 30% but below 100% — document the deferral. All
21 retires were executed with severity downgrades + CHANGELOG entries;
retunes are EVIDENCE-BACKED detector changes with `detectorRevision` 2,
must-not-fire fixtures for the measured FP shapes, and re-measurement.

| Rule         | n (all FP) | Decision               | Root-cause evidence (verdict notes)                                                                                                                                                                                                                                                                                                                          |
| ------------ | ---------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| QA-PW-005    | 17         | RETIRE                 | evaluate() bodies are browser-only instrumentation or the API under test — "the logic must run in the page"; no static discriminator vs business logic                                                                                                                                                                                                       |
| QA-PW-102    | 20         | RETUNE (rev 2)         | one cause: waits are reload synchronization before real assertions, or consumed by `expect(...).rejects`; detector now requires the wait to be terminal. **Wave-2 re-measure: 0 findings on the previously-20/20-FP corpus slice — cleared.**                                                                                                                |
| QA-PW-103    | 20         | RETIRE                 | one cause: bare `goto()` to the app under test is the universal navigation idiom ("baseURL styling, not drift")                                                                                                                                                                                                                                              |
| QA-PW-105    | 20         | RETIRE                 | one cause: `expect.poll`'s default timeout is a hard bound that fails visibly — the claimed harm cannot occur                                                                                                                                                                                                                                                |
| QA-PW-107    | 20         | RETIRE                 | `toBeVisible` on overlays asserts presence/auto-retry — the intent; 18/20 notes reject the viewport diagnosis                                                                                                                                                                                                                                                |
| QA-PW-108    | 20         | RETIRE                 | `toHaveText` on self-owned markup is a legitimate strong assertion; "whose markup" is not statically decidable                                                                                                                                                                                                                                               |
| QA-PW-112    | 20         | RETIRE                 | kebab-case hardcoded as _the_ convention — repo-consistent camelCase flagged; style enforcement, not a defect (successor idea = mixed-convention check, NEW ID)                                                                                                                                                                                              |
| QA-PW-114    | 20         | RETIRE                 | handle-then-immediate-read on loaded pages has no race window; existence checks are legitimate                                                                                                                                                                                                                                                               |
| QA-PW-118    | 20         | RETIRE                 | the flake source (background traffic) is environmental, absent by construction in fixture apps; harm not code-detectable                                                                                                                                                                                                                                     |
| QA-PW-119    | 24         | RETIRE (was error)     | FPs scatter across ≥5 legitimate infrastructure idioms (teardown harnesses, counters, vi.hoisted, memoized infra) — no one fixable cause; a dataflow check needs a NEW ID                                                                                                                                                                                    |
| QA-PW-120    | 20         | RETIRE                 | file-level keyword co-occurrence ≠ engine dependence; even e2e specs are engine-agnostic                                                                                                                                                                                                                                                                     |
| QA-PW-145    | 20         | RETIRE                 | absence of optional a11y coverage is not a defect; fires on every UI spec by construction                                                                                                                                                                                                                                                                    |
| QA-TQUAL-001 | 26         | RETIRE                 | spies observe real output ("the mock call IS the observable contract"); stand-in vs observer not statically decidable                                                                                                                                                                                                                                        |
| QA-PY-003    | 20         | RETUNE (rev 2)         | vocabulary missed pytest.warns/deprecated_call/fail (14/20) + pytester data functions (6/20); both added. **Wave-2 re-measure (rev 3): helper-name verification (`expect_*`/`_expect_*`/`wait_for_*`) and module-level collection scoping added from the 20-sample delta (12 FP / 7 TP / 1 UNSURE); accepted residue: pytest doc-example artifacts.**        |
| QA-PY-004    | 20         | RETUNE (rev 2, 45% FP) | isinstance type guards + startswith predicates are real checks; predicate-call skip added. **Wave-2 re-measure (rev 3): path predicates, `any()`/`all()` aggregates, mock `.called`, and guard-then-precise-assert shapes added from the 20-sample delta.**                                                                                                  |
| QA-PY-006    | 20         | RETIRE                 | 18/20 pytester test-data scripts; real empty tests don't occur in the corpus                                                                                                                                                                                                                                                                                 |
| QA-PY-007    | 20         | RETUNE (rev 2, 65% FP) | excinfo assertion after `raises ... as` verifies the message without match= (8/13 FPs); skip added. **Wave-2 re-measure (rev 3): window widened to multi-line assert chains + assignment-then-assert (`msg = str(exc_info.value)`) from the 20-sample delta (20/20 FP at rev 2).**                                                                           |
| QA-PY-008    | 20         | RETIRE                 | boundary mocking and real-output spies are contract testing (17/20); header concedes it                                                                                                                                                                                                                                                                      |
| QA-PY-010    | 10         | RETIRE                 | wall-clock IS the test subject (9/10 timing/throttle tests); time-as-input vs time-as-mechanism not statically decidable                                                                                                                                                                                                                                     |
| QA-PY-104    | 12         | RETUNE (rev 2)         | all FPs predate Bug Map M-06's pattern removal — the measured detector no longer ships; revision bumped, re-measure pending                                                                                                                                                                                                                                  |
| QA-PY-105    | 20         | RETUNE (rev 2)         | one cause: assertions in imported helpers (`assert_snapshot`, `expect_*`); helper-name idiom recognized. **Wave-2 re-measure: 0 findings on the previously-20/20-FP corpus slice — cleared.**                                                                                                                                                                |
| QA-ENV-001   | 20         | RETUNE (rev 2)         | one cause: loopback endpoints are the suite's own fixture containers; loopback dropped from the fixed-port pattern. **Wave-2 re-measure (rev 3): the 20-sample delta showed NO host shape works (mock hosts, fake domains, private IPs in snapshot strings) — the fixed-port sub-pattern is dropped entirely; OS-path/locale/local-time sub-patterns stay.** |
| QA-JV-106    | 20         | RETUNE (rev 2)         | all FPs were the M-06-removed querySelector pattern; revision bumped, re-measure pending                                                                                                                                                                                                                                                                     |
| QA-CS-106    | 20         | RETUNE (rev 2)         | same as QA-JV-106 (QuerySelectorAsync)                                                                                                                                                                                                                                                                                                                       |
| QA-JV-108    | 20         | RETIRE                 | HAR-replay + proxy fixture targets scatter across legitimate classes; the M-06 header concedes no provable exclusion                                                                                                                                                                                                                                         |
| QA-CS-108    | 20         | RETIRE                 | same as QA-JV-108 (+ route-mocked origins)                                                                                                                                                                                                                                                                                                                   |
| QA-JV-110    | 20         | RETIRE                 | same absence-heuristic premise failure as QA-PW-145                                                                                                                                                                                                                                                                                                          |
| QA-CS-110    | 20         | RETIRE                 | same absence-heuristic premise failure as QA-PW-145                                                                                                                                                                                                                                                                                                          |
| QA-JV-111    | 20         | RETIRE                 | route-API self-tests + fixture setup; no mechanically discriminable pattern                                                                                                                                                                                                                                                                                  |
| QA-CS-111    | 20         | RETIRE                 | same as QA-JV-111                                                                                                                                                                                                                                                                                                                                            |

**Exit-gate accounting (plan §12):** 28 of 28 cluster rules resolved —
21 retired with lifecycle entries, 7 retuned in EVIDENCE-BACKED mode
(revision 2, fixtures both directions, re-measurement pending or landed).
The ≥50% bar is met by the retirements alone (75%).

**Re-measurement status (§07 loop closure, 2026-09-02):** the rev-2/3
detectors were re-run over the corpus slices that produced the original
verdicts and the verdict corpus was reconciled (rows whose findings no
longer fire removed; new findings adjudicated per
tests/corpus/verdicts/README.md with a 20/rule quota sample):
QA-PW-102 and QA-PY-105 are **fully cleared** (0 findings on their
previously-20/20-FP slices); QA-PY-003 82% FP (n=17), QA-PY-004 76%
(n=21), QA-PY-007 79% (n=34) — all three stay quarantine with their
remaining FP causes documented above as accepted residue (pytest doc
examples / collection fixtures; pytest predicate-idiom families;
single-possible-exception API contracts). QA-PY-104, QA-ENV-001,
QA-JV-106, QA-CS-106 fell below n=10 after reconciliation and are
unmeasured at their current revisions (sidecar entries removed);
QA-ENV-001's fixed-port sub-pattern was dropped entirely at rev 3.

**Deferred wave (quarantine rules above 30% but not at 100%):**
QA-PY-012 (60%). This
keeps its quarantine caps (severity/info, E0, --strict-only) and is the
next triage wave; it already has a concrete candidate retune named
here so the follow-up is mechanical, not exploratory. The other three
members of this wave — QA-JV-103, QA-CS-103, QA-CS-102 — were resolved
by the Phase 3 L2 migration (below).

## Phase 3 L2 migration (Verification Trust Evolution Plan §13)

The three highest-ROI JV/CS rules from the deferred wave migrated to
tree-sitter L2 structural analysis over the Phase 0.5 parse stage
(`src/engine/jv-cs-ast.ts`; optional `astQuery` hook on the rule
contract with a MANDATORY regex fallback, §13.2). All three are
EVIDENCE-BACKED migrations: `detectorRevision` 2, verdict corpus
reconciled (superseded rows removed, new findings adjudicated from
source), count-lock refreshed, fixtures both directions.

| Rule      | rev 1 → rev 2                   | Oracle additions (evidence)                                                                                                                                                                         | Tier                      |
| --------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| QA-JV-103 | 50% FP (n=20) → 25.9% FP (n=58) | throwing waits are assertions (`waitFor*` except `waitForTimeout`: 6 rev-1 + delta rows); helper idiom `verify*/check*/assert*` (4 rev-1 rows)                                                      | quarantine → **extended** |
| QA-CS-103 | 95% FP (n=20) → 0% FP (n=9)     | Shouldly extension chains (17/19 rev-1 FPs, spectre-console); Assert receivers; Verify snapshot framework; PascalCase helper idiom; C# throwing waits; conditional `throw new *Assertion*Exception` | quarantine → **core**     |
| QA-CS-102 | 65% FP (n=20) → 8.3% FP (n=24)  | route/expose/server delegate scoping (10 rev-1 FPs + SetRoute delta); infinite/negative blocks; WhenAny races; runner payload fixtures                                                              | quarantine → **core**     |

Known L2 boundaries (documented, honest — plan §13.4, no type/symbol
semantics promised): assertions behind arbitrarily-named helpers
(keycloak's `testValidationValid`, playwright-java's `testEnterKey`,
appsmith's `check` — the dominant remaining JV-103 FP class), and
one CS-102 TP trade-off (a sub-second artificial-timing delay inside a
route delegate is no longer flagged; the structural boundary cannot
read that intent). QA-JV-102 stays LEXICAL rev 1 — no migration for
symmetry (plan §12.4).
