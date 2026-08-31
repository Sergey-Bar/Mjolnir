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
