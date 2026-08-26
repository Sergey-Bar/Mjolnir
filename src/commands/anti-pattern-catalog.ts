/**
 * Anti-pattern catalog content — Sprint 7 Task 30
 * (Master-Stabilization-Plan.md).
 *
 * Extends Task 27's generated rule pages with a fuller "why this fails
 * in production" explanation for every error-severity rule (22 as of
 * Sprint 7 — the plan's own "top 20" framing, exceeded because every
 * one of them earns a real, distinct explanation) — the mechanism by
 * which the anti-pattern actually causes a real incident, grounded in
 * how CI/test infrastructure works, not a single sentence.
 *
 * HONESTY CONSTRAINT: the plan's own source material (Tier 1 #4) also
 * lists "link to GitHub discussions where users argue severity" and a
 * "video/GIF for top 20 rules" as further ideas for this feature. Both
 * are deliberately NOT implemented here: there are no real GitHub
 * Discussions threads to link to for a pre-launch product (inventing
 * one would be a fabricated citation), and a video/GIF is a production
 * asset outside an agent's ability to record truthfully. What ships
 * here is the part that can be 100% true without invention: a longer,
 * still fully accurate explanation of the real mechanism, for the
 * rules where the single-sentence `why` most under-explains the actual
 * production impact.
 *
 * Deliberately data, not logic: a plain Record so the "richer content"
 * concern stays separate from the generator plumbing in rule-docs.ts,
 * and so it's obvious at a glance which rules have this content and
 * which fall back to the rule's own honest `why` field.
 */

/** All 22 error-severity rules as of Sprint 7 — exceeds the plan's "top
 * 20" bar because every error-severity rule genuinely earns a real,
 * distinct explanation (the deduplication considered for cross-language
 * "no assertions" siblings was rejected: each language's actual
 * detection regex differs enough — Java's assert/fail/verify calls,
 * C#'s Assert./Should()/Verify(), Python's bare `assert` keyword — that
 * a shared paragraph would either be too vague to be useful or subtly
 * wrong for at least one of them). */
export const ANTI_PATTERN_CONTENT: Record<string, string> = {
  "QA-CI-001":
    "A GitHub Actions job with `continue-on-error: true` reports its " +
    "conclusion as `success` in the Checks API regardless of what " +
    "actually happened inside it — this is not a UI quirk, it is " +
    "documented GitHub Actions behavior. A required-status-check branch " +
    "protection rule that gates on this job's name will pass every time, " +
    "because from GitHub's perspective the job DID succeed. The team " +
    "merges on green, the actual test run underneath may have been " +
    "failing for weeks, and nobody notices until the bug it should have " +
    "caught reaches production — at which point the CI history shows an " +
    "unbroken streak of green checkmarks and no one who reviews it will " +
    "think to suspect this specific job.",

  "QA-CI-002":
    "`command | tee file.log` inherits `tee`'s exit code, not the " +
    "command's — this is how POSIX pipelines work: the pipeline's exit " +
    "status is the last command in it, unless the shell explicitly opts " +
    "into `pipefail`. A failing test suite piped into `tee` for log " +
    "capture reports exit 0 because `tee` itself succeeded at writing the " +
    "file. Same failure mode for `command; next-command` sequencing " +
    "without a `&&`/`||` guard, or an explicit `|| true`: the shell moves " +
    "on regardless of what the command before it returned. A workflow " +
    'step written this way to "just capture the logs" silently converts ' +
    "every test failure into a green step.",

  "QA-CI-005":
    "Some report-processing steps (coverage upload, JUnit summary " +
    "annotation, artifact publishing) read a file the test run was " +
    "supposed to generate. If the test step crashed before ever writing " +
    "that file — a config error, an OOM, a timeout that killed the " +
    "process — the report step can still run and, depending on the " +
    'tool, either silently no-op or report "0 tests found" without ' +
    "failing the job. The workflow ends green with a report that quietly " +
    "represents nothing.",

  "QA-CI-008":
    "A final step that unconditionally echoes success (or any step that " +
    "always exits 0 as the LAST step in a job) determines the job's " +
    "overall conclusion in GitHub Actions — the job's status is the " +
    "status of its steps taken together, and a trailing always-succeed " +
    "step can overwrite what an earlier failing step already signaled, " +
    "depending on how the workflow is structured. Combined with any " +
    "earlier step's failure being non-fatal to the job (e.g. a missing " +
    "`if: failure()` gate), this produces the exact same effect as " +
    "QA-CI-001 by a different mechanical path: a real failure, a green " +
    "checkmark.",

  "QA-CI-009":
    "When a test runner's own exit code never reaches the shell that " +
    "invoked it — because it's piped through a formatter, wrapped in a " +
    "script that doesn't `exit $?`, or run inside a subshell whose exit " +
    "status is discarded — the CI job has no way to know a test failed. " +
    "This is mechanically identical to QA-CI-002's pipefail problem but " +
    "shows up in test-runner wrapper scripts specifically, which is why " +
    "it is tracked as its own rule: the fix (propagate `$?` explicitly, " +
    'or avoid the wrapping) is different from "add pipefail."',

  "QA-CI-010":
    'A job or step gated behind a condition that can evaluate to "skip" ' +
    "on the exact runs that matter (e.g. `if: github.event_name == " +
    "'push'` on a workflow that's supposed to gate pull requests, or a " +
    "path filter that excludes the files that actually changed) means " +
    "the test suite that's supposed to block a bad merge never actually " +
    "runs on that merge. GitHub reports a skipped required check as " +
    '"neutral," which several branch-protection configurations treat as ' +
    "passing — the PR merges having never been tested at all.",

  "QA-TEST-001":
    "`.only`/`test.only`/`it.only` restricts a test run to just the " +
    "marked test(s) — that's the entire point of the API, for local " +
    "debugging. Committed and pushed, it does the same thing in CI: the " +
    "rest of the suite silently does not run at all. The build goes " +
    "green because the one test that ran passed, while every other test " +
    "in that file (or, in some runners, the whole project) contributed " +
    "nothing to that result. This is the single easiest way to make a " +
    "CI pipeline lie, because it requires no malice — just forgetting to " +
    "remove a debugging aid before committing.",

  "QA-TEST-003":
    "A test with no assertion (`expect`/`assert` call, in any variant) " +
    "can execute every line of application code, throw zero exceptions, " +
    "and still verify nothing whatsoever. Test runners report it as " +
    '"passed" because nothing failed — but nothing was ever checked ' +
    "either. This is qualitatively worse than a missing test, because a " +
    "missing test is at least visible as a coverage gap; an assertion-" +
    "less test occupies a green checkmark's worth of false confidence " +
    "while providing none of the actual guarantee. The same mechanism " +
    "applies identically across languages — QA-PY-105, QA-JV-103, and " +
    "QA-CS-103 are this exact failure mode in pytest, JUnit, and " +
    "NUnit/xUnit respectively.",

  "QA-TEST-010":
    "An empty test body (or a body that's effectively a no-op, like a " +
    'single comment) reports "passed" for the same reason an ' +
    "assertion-less test does — nothing threw, so nothing failed. It " +
    "commonly appears as scaffolding left behind after a refactor: the " +
    "test's setup and teardown got deleted along with the code under " +
    "test, but the `it(...)` block itself stayed, quietly padding the " +
    "test count while verifying nothing.",

  "QA-TQUAL-002":
    "`expect(true).toBe(true)`, `assert 1 == 1`, and equivalent " +
    "tautologies compare a literal to itself — they can never fail, by " +
    "construction, regardless of what the code under test actually did. " +
    "This is a stronger version of the no-assertion problem: it doesn't " +
    "just fail to verify anything, it actively masquerades as " +
    "verification while providing a mathematical guarantee of always " +
    "passing. It most often survives code review specifically because " +
    "it looks like a real assertion at a glance.",

  "QA-TQUAL-009":
    "A promise-returning assertion (`expect(...).resolves...`, an async " +
    "matcher, a `.then()` chain containing an assertion) that is never " +
    "awaited or returned from the test function completes on its own " +
    "schedule, AFTER the test function has already returned and the " +
    "runner has already recorded a result. If the assertion inside that " +
    "unawaited promise later rejects, most runners either report it as " +
    "an unhandled rejection attributed to a DIFFERENT, already-finished " +
    "test, or drop it entirely — the test that actually contained the " +
    "failing check reports as passed no matter what that check found.",

  "QA-PW-002":
    "Playwright's assertions (`expect(locator)...`) and most locator " +
    "actions return Promises. A call like `expect(locator).toBeVisible()` " +
    "without `await` in front of it starts the assertion, does not wait " +
    "for its result, and the test function moves on immediately — " +
    "exactly the same unawaited-promise mechanism as QA-TQUAL-009, but " +
    "specific enough to Playwright's API shape (and common enough in " +
    "Playwright suites) to warrant its own detector and fixture pair.",

  "QA-PW-003":
    "Debug artifacts intentionally left in committed specs — a " +
    "`page.pause()` that halts execution waiting for a human at the " +
    "Playwright Inspector, a `console.log` dump of internal state, a " +
    "hard-coded `--debug`-only code path — behave differently in a " +
    "headless CI runner than they did on the developer's machine where " +
    "they were added. `page.pause()` specifically will hang the run " +
    "until a runner-level timeout kills it, which then reports as an " +
    "unrelated-looking timeout failure far from the actual cause.",

  "QA-PW-101":
    "`page.waitForTimeout(N)` waits a fixed wall-clock duration " +
    "regardless of the actual state of the page — it has no idea " +
    "whether the element it's really waiting for appeared in 50ms or " +
    "will never appear at all. Too short for a slow CI runner (shared " +
    "hardware, cold caches, resource contention under a parallel test " +
    "matrix) and the test fails intermittently; too long and the whole " +
    "suite's wall-clock time balloons for no correctness benefit. The " +
    "fix (`await expect(locator).toBeVisible()`, or an equivalent " +
    "condition-wait) is not slower in the success case and is actually " +
    "faster on average, because it proceeds the instant the condition is " +
    "true instead of always waiting the full fixed duration.",

  "QA-PW-119":
    "A test that writes to module-level mutable state which a LATER " +
    "test reads creates a hidden dependency on execution order that " +
    "nothing in either test's own code makes visible. It passes reliably " +
    "as long as the test runner happens to execute them in the order " +
    "the author had in mind. The moment anything reorders execution — " +
    "test sharding across CI workers, a runner's parallelization " +
    "strategy, someone reordering `describe` blocks, or simply upgrading " +
    "the test runner to a version with a different default ordering — " +
    "the dependent test starts failing with no code change to itself, " +
    "and the actual cause is in a completely different file.",

  "QA-PY-001":
    'A hardcoded `pytest.main([..., "-k", ...])` call or `::`-scoped ' +
    "node selection committed into source, or an `@pytest.mark.only` " +
    "marker from a focus-test plugin, restricts which tests actually " +
    "run the same way JavaScript's `.only` does — the rest of the suite " +
    "is deselected, not merely deprioritized. If that code path runs in " +
    "CI unmodified, the job reports green having executed a fraction of " +
    "the suite. This is the same mechanism as QA-TEST-001, expressed " +
    "through pytest's own selection APIs rather than a test-runner " +
    "`.only` method.",

  "QA-PY-003":
    "A pytest test function with no `assert` statement (and no call " +
    "into a helper that itself asserts) can execute every line of the " +
    "code under test and still verify nothing — pytest reports it as " +
    "passed because nothing raised `AssertionError` or any other " +
    "exception. This is the same failure mode as QA-TEST-003, in " +
    "pytest's idiom: no `expect()` API to omit, just a missing `assert` " +
    "keyword, which makes it easy to write a test that only calls the " +
    "function under test for its side effects and never checks the " +
    "result.",

  "QA-PY-006":
    "A pytest test function whose entire body is `pass` (optionally " +
    "preceded by a comment) is Python's most literal form of \"empty " +
    'test" — there is no simpler way to write a function that does ' +
    "nothing and returns normally. pytest reports it as passed for the " +
    "same reason QA-TEST-010 does in JS/TS: nothing raised, so nothing " +
    "failed. It shows up most often as a stub left behind after " +
    "`# TODO: implement` scaffolding never got filled in, quietly " +
    "inflating the pass count in the meantime.",

  "QA-PY-012":
    "`assert True` and `assert x == x` are literal tautologies in " +
    "Python exactly as `expect(true).toBe(true)` is in JS — they cannot " +
    "raise `AssertionError` by construction, so pytest reports success " +
    "regardless of what the code under test actually did. It is worth " +
    "calling out as its own rule (rather than folding into QA-PY-003) " +
    "because unlike a missing assertion, this pattern is easy to mistake " +
    "for a real check on a quick read of the diff — the word `assert` " +
    "is right there.",

  "QA-PY-105":
    "A Playwright-Python test with no assertion behaves identically to " +
    "QA-TEST-003/QA-PY-003 in the underlying failure mode — the test " +
    "can drive a real browser through every step of a user flow and " +
    "still verify nothing, because nothing in the test ever calls " +
    "`expect()`. It is tracked as its own rule because Playwright-Python " +
    "specs commonly LOOK thorough (multiple page interactions, network " +
    "waits, screenshots) while containing zero verification — the " +
    "activity is real, the checking is not.",

  "QA-JV-103":
    "A JUnit/TestNG test method with no `assertEquals`/`assertTrue`/ " +
    "AssertJ-style assertion (and no exception expected via " +
    "`@Test(expected = ...)` or equivalent) reports green for the same " +
    "structural reason as every other language's assertion-less test: " +
    "the runner only fails a test when something throws, and this test " +
    "throws nothing. Java suites often obscure this further with helper " +
    "methods and page-object indirection, which makes an assertion-less " +
    "test method read as more thorough than it is on a quick review.",

  "QA-CS-103":
    "A C# test with no `Assert.*`/FluentAssertions-style assertion " +
    "(NUnit and xUnit both follow the same throw-to-fail model as " +
    "JUnit and pytest) passes for the same underlying reason as every " +
    "other assertion-less rule in this catalog: nothing threw, so " +
    "nothing failed, regardless of what the test actually exercised. " +
    "Kept as a distinct rule from QA-TEST-003/QA-PY-003 because .NET " +
    "Playwright is async-only (`GotoAsync`, `ClickAsync`) — the fixture " +
    "shapes that trigger this rule look meaningfully different in C# " +
    "even though the underlying defect is identical.",
};

/** True when a rule has richer, hand-curated production-impact content
 * beyond its own single-sentence `why` field. */
export function hasAntiPatternContent(ruleId: string): boolean {
  return ruleId in ANTI_PATTERN_CONTENT;
}

export function getAntiPatternContent(ruleId: string): string | undefined {
  return ANTI_PATTERN_CONTENT[ruleId];
}
