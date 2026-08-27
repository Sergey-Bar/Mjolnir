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
 */
const BLUNT_MESSAGES: Readonly<Record<string, string>> = {
  // Hard sleeps
  "QA-PW-101":
    "A hard sleep in a test is a prayer, not a synchronization strategy.",
  "QA-TEST-004":
    "A hard sleep in a test is a prayer, not a synchronization strategy.",
  "QA-JV-102":
    "Thread.sleep() in a test is a prayer. The JVM doesn't negotiate with timeouts.",
  "QA-CS-105":
    "WaitForTimeoutAsync is the C# version of closing your eyes and hoping.",

  // Focused tests (.only)
  "QA-TEST-001":
    ".only() committed to main. Every other test in this file? Doesn't exist anymore.",
  "QA-PW-104":
    "test.only() shipped. Congratulations — the suite now tests exactly one thing.",

  // Skipped tests
  "QA-TEST-002":
    "A skipped test is a lie. It says 'this is tested' to anyone reading the green checkmark.",

  // Empty test bodies
  "QA-TEST-006":
    "This test has no body. It's a placeholder that reports 'passed' forever.",

  // Tautological assertions
  "QA-TQUAL-003":
    "expect(true).toBe(true) — congratulations, you've proven that JavaScript works.",

  // No assertions
  "QA-TQUAL-001":
    "This test runs code but checks nothing. A test without assertions is a script with extra steps.",
  "QA-PW-140":
    "No assertion after UI interaction. This test watches the page and says 'looks fine to me.'",
  "QA-PW-145":
    "UI test with zero accessibility checks. Users with screen readers? Apparently not a thing.",

  // Retry abuse
  "QA-TEST-005":
    "Retry configured on a flaky test is duct tape on a broken pipe — it'll hold until it won't.",
  "QA-JV-109":
    "retryAnalyzer won't fix flaky tests. It just retries them until the build times out.",
  "QA-CS-109": "[Retry(n)] hides flakes instead of fixing them.",

  // Shared state
  "QA-PW-119":
    "Shared page across tests. When one test's leftover state breaks another, good luck debugging.",
  "QA-JV-104":
    "static Page — browser state from test A bleeds into test B. Enjoy the Heisenbug.",

  // Brittle selectors
  "QA-PW-112":
    "CSS class selector in a test. One design refactor and this locator is dead.",
  "QA-JV-106":
    "Brittle selector: one frontend refactor and this test stops finding anything.",
  "QA-CS-106":
    "Brittle CSS selector in .NET test. QuerySelectorAsync is one redesign away from null.",

  // networkidle
  "QA-PW-102":
    "WaitForLoadState('networkidle') — hoping the network goes quiet is not a strategy.",
  "QA-JV-107":
    "NETWORKIDLE: 'wait for the network to stop' is a race condition with extra steps.",
  "QA-CS-107":
    "NetworkIdle: the browser doesn't promise silence. The test shouldn't depend on it.",

  // Hardcoded URLs
  "QA-PW-105":
    "Hardcoded URL in a test. When staging rotates, this test points at nothing.",
  "QA-JV-108":
    "Hardcoded URL: works on your machine, breaks on every other machine.",
  "QA-CS-108":
    "Hardcoded URL: works on one dev's machine, breaks on CI, confuses everyone else.",

  // CI: swallowed exit codes
  "QA-CI-002":
    "|| true after a test command. Tests can now fail silently. The green badge is a lie.",
  "QA-CI-001":
    "continue-on-error on a test step. If you can't trust the check, why run it?",

  // Mock-only tests
  "QA-TQUAL-002":
    "This test mocks everything and asserts the mock. It proves the mock works, not the code.",
};

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
