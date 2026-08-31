/**
 * `--tone blunt` — Sprint 9 Task 40 (Master-Stabilization-Plan.md).
 *
 * Opt-in only, never default. Score-neutral: no change to exit codes,
 * scores, the JSON schema, or the SARIF contract. Only affects the
 * terminal `message` text a human reads — every other surface (json,
 * sarif, mermaid, machine-parseable) is untouched.
 *
 * HARD CONSTRAINT from the plan: "mock the pattern, never the person
 * or the repo's authors." Every blunt message targets the code smell
 * itself, not a developer. An enterprise QA lead can still use this
 * without it mocking someone's file or commit.
 */

import type { Finding } from "../types.js";

/**
 * Static blunt messages keyed by rule ID. A simple string lookup
 * (no per-entry closures) so coverage is not artificially fragmented
 * across 30 arrow functions that never use their argument.
 *
 * Bug-audit M8: this map was stale vs the rule registry — QA-PW-104
 * mocked "test.only" while the rule detects trial:true clicks,
 * QA-PW-105/QA-PW-112/QA-PW-119/QA-TEST-006/QA-PW-140 described other
 * rules' defects, QA-TQUAL-001/002 texts were swapped, and several keys
 * named rules that never existed. Every entry is now aligned with the
 * rule's actual defect, dead keys are gone, and
 * tests/roast.spec.ts locks every key to a registered rule ID.
 */
const BLUNT_MESSAGES: Readonly<Record<string, string>> = {
  // Hard sleeps (JS/TS + cross-language family)
  "QA-PW-101":
    "A hard sleep in a test is a prayer, not a synchronization strategy.",
  "QA-TEST-004":
    "A hard sleep in a test is a prayer, not a synchronization strategy.",
  "QA-PY-005":
    "time.sleep() in a test is a prayer. Python doesn't negotiate with timeouts either.",
  "QA-PY-102":
    "time.sleep() inside a Playwright test — the browser doesn't pause because you asked nicely.",
  "QA-PY-103":
    "wait_for_timeout() as synchronization — the Playwright-Python edition of hoping.",
  "QA-JV-102":
    "Thread.sleep() in a test is a prayer. The JVM doesn't negotiate with timeouts.",
  "QA-JV-105":
    "waitForTimeout is the Java version of closing your eyes and hoping.",
  "QA-CS-102":
    "A hard sleep in a .NET test is a prayer, not a synchronization strategy.",
  "QA-CS-105":
    "WaitForTimeoutAsync is the C# version of closing your eyes and hoping.",

  // Focused tests (.only)
  "QA-TEST-001":
    ".only() committed to main. Every other test in this file? Doesn't exist anymore.",
  "QA-PY-001":
    "A focused test committed to the repo. The other tests in this file? Skipped by design.",

  // Skipped tests
  "QA-TEST-002":
    "A skipped test is a lie. It says 'this is tested' to anyone reading the green checkmark.",
  "QA-PY-002":
    "A skipped test is a lie. It says 'this is tested' to anyone reading the green checkmark.",
  "QA-JV-101":
    "A @Disabled test is a lie. It says 'this is tested' to anyone reading the green checkmark.",
  "QA-CS-101":
    "An [Ignore]/[Skip] test is a lie. It says 'this is tested' to anyone reading the green checkmark.",

  // Empty test bodies
  "QA-TEST-010":
    "This test has no body. It's a placeholder that reports 'passed' forever.",
  "QA-PY-006": "An empty test body — `pass` with a green checkmark attached.",

  // Tautological assertions
  "QA-TQUAL-002":
    "expect(true).toBe(true) — congratulations, you've proven that JavaScript works.",
  "QA-PY-012":
    "assert True — congratulations, you've proven that Python executes.",

  // Mock-only verification
  "QA-TQUAL-001":
    "This test mocks everything and asserts the mock. It proves the mock works, not the code.",
  "QA-PY-008":
    "This test mocks everything and asserts the mock. It proves the mock works, not the code.",

  // No assertions
  "QA-TEST-003":
    "This test runs code but checks nothing. A test without assertions is a script with extra steps.",
  "QA-PY-003":
    "This test runs code but checks nothing. A test without assertions is a script with extra steps.",
  "QA-JV-103":
    "No assertions in a JUnit test. It watches the code run and says 'looks fine to me.'",
  "QA-CS-103":
    "No assertions in this test. It watches the code run and says 'looks fine to me.'",
  "QA-PW-140":
    "A screenshot check with no maxDiffPixelRatio bound — any pixel garbage passes. That's not a visual assertion.",

  // Accessibility
  "QA-PW-145":
    "UI test with zero accessibility checks. Users with screen readers? Apparently not a thing.",
  "QA-JV-110":
    "No accessibility assertions in a UI test — a11y regressions ship silently.",
  "QA-CS-110":
    "No accessibility assertions in a UI test — a11y regressions ship silently.",

  // Retry abuse
  "QA-TEST-006":
    "Retry configured on a flaky test is duct tape on a broken pipe — it'll hold until it won't.",
  "QA-PW-121":
    "Retry/worker config abuse — flakiness absorbed by infrastructure, never fixed.",
  "QA-PW-141":
    "Retries without a flake-triage loop: failures vanish into re-runs instead of tickets.",
  "QA-JV-109":
    "retryAnalyzer won't fix flaky tests. It just retries them until the build times out.",
  "QA-CS-109": "[Retry(n)] hides flakes instead of fixing them.",

  // Flaky interaction / polling
  "QA-PW-104":
    "A trial click with no follow-up assertion — you verified that clicking doesn't throw, not that anything happened.",
  "QA-PW-105":
    "expect.poll with no timeout bound — it either passes instantly or hangs the worker until the default eats your CI minutes.",

  // Shared state
  "QA-PW-115":
    "Shared page across tests. When one test's leftover state breaks another, good luck debugging.",
  "QA-JV-104":
    "static Page — browser state from test A bleeds into test B. Enjoy the Heisenbug.",
  "QA-CS-104":
    "Static browser state — what test A did leaks into test B. Enjoy the Heisenbug.",
  "QA-PY-106":
    "Module-level page/context — browser state from test A bleeds into test B.",

  // Order dependence
  "QA-PW-119":
    "This test only passes when another test runs first. Tests are not a conga line.",

  // Brittle selectors / conventions
  "QA-PW-112":
    "A data-testid that breaks the naming convention — the contract your selectors rely on is eroding.",
  "QA-JV-106":
    "Brittle selector: one frontend refactor and this test stops finding anything.",
  "QA-CS-106":
    "Brittle CSS selector in .NET test. QuerySelectorAsync is one redesign away from null.",

  // networkidle / load waits
  "QA-PW-102":
    "Waiting for a load event instead of asserting on a web-first locator — hoping is not asserting.",
  "QA-PW-118":
    "Waiting for network idle is a race condition with extra steps. The network never promises silence.",
  "QA-JV-107":
    "NETWORKIDLE: 'wait for the network to stop' is a race condition with extra steps.",
  "QA-CS-107":
    "NetworkIdle: the browser doesn't promise silence. The test shouldn't depend on it.",
  "QA-PY-107":
    "waitForLoadState('networkidle') — the network never promises silence.",

  // Hardcoded URLs
  "QA-PW-123":
    "Hardcoded environment URL in a spec. When staging rotates, this test points at nothing.",
  "QA-JV-108":
    "Hardcoded URL: works on your machine, breaks on every other machine.",
  "QA-CS-108":
    "Hardcoded URL: works on one dev's machine, breaks on CI, confuses everyone else.",
  "QA-PY-108":
    "Hardcoded URL: works on your machine, breaks on every other machine.",

  // CI: swallowed failures
  "QA-CI-002":
    "|| true after a test command. Tests can now fail silently. The green badge is a lie.",
  "QA-CI-001":
    "continue-on-error on a test step. If you can't trust the check, why run it?",
  "QA-CI-008":
    "An always-success step masking failures — the pipeline now reports fiction.",
  "QA-CI-009":
    "The test command's exit code goes nowhere. A failing suite passes the job.",
  "QA-CI-010":
    "Tests skipped where they must block — a check nobody waits for is decoration.",
};

/** Registered-rule-ID keys of the blunt map (exported for registry tests). */
export const BLUNT_RULE_IDS: readonly string[] = Object.keys(BLUNT_MESSAGES);

/**
 * Returns a blunt-toned version of a finding's message. Pure function,
 * never mutates the finding. Callers display the return value instead of
 * `f.message` when `--tone blunt` is active.
 */
export function bluntMessage(f: Finding): string {
  const msg = BLUNT_MESSAGES[f.ruleId];
  if (msg !== undefined) return msg;
  // Default fallback: wraps the original message with a direct prod,
  // never naming any author or person.
  return `${f.message} — fix it or suppress it; ignoring it is worse than either.`;
}
