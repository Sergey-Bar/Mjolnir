/**
 * P8 depth-adjudication applier (master plan P8, plan 1788853205786 —
 * flag 6, decision 9).
 *
 * Patches `strategyJustification` into every file declaring LEXICAL
 * rules, from the FILE_ADJUDICATIONS record — the written verdicts of
 * the P8 depth sweep (each entry authored by reading the detector's
 * actual shape). Deterministic: same table + same sources → same bytes.
 * Idempotent: the block is generator-owned and replaced on re-run.
 *
 * One file = one adjudication: helper-generated variant families share
 * the helper's defineRule body, so every variant in the file carries
 * the same record (their detector shapes are the same by construction).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { isMainModule } from "./lib/is-main-module.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const RULES_DIR = join(ROOT, "src", "rules");

export interface Adjudication {
  reasonCode: string;
  detail: string;
}

/**
 * The P8 depth sweep record: repo-relative rule-source file → the
 * adjudication applied to every LEXICAL rule that file declares.
 */
export const FILE_ADJUDICATIONS: Readonly<Record<string, Adjudication>> = {
  "src/rules/ci/qa-ci-002-swallowed-exit.ts": {
    reasonCode: "shell-string-in-config",
    detail:
      "exit-code swallowing lives inside workflow run: strings (shell " +
      "scripts embedded in YAML); the YAML statement IS a string " +
      "literal — a shell syntax tree of a YAML value adds parsing " +
      "without adding classification power",
  },
  "src/rules/ci/qa-ci-005-report-never-generated.ts": {
    reasonCode: "runner-semantic",
    detail:
      "report generation is a runner side effect of the workflow step " +
      "sequence, not a syntax tree property; the detector reads the " +
      "workflow step graph, whose statements are already literal text",
  },
  "src/rules/ci/qa-ci-007-retry-masking.ts": {
    reasonCode: "runner-semantic",
    detail:
      "retry masking is defined by the runner's retry semantics, which " +
      "no language syntax tree represents; the detector matches the " +
      "runner's own retry keys in workflow YAML where statements are " +
      "shell strings",
  },
  "src/rules/ci/qa-ci-008-always-success.ts": {
    reasonCode: "runner-semantic",
    detail:
      "always()-success is a workflow-step outcome contract, not a code " +
      "construct; the detector matches the step's run/if keys, which " +
      "are string fields of the YAML config surface",
  },
  "src/rules/csharp/qa-cs-101-skipped-test.ts": {
    reasonCode: "exact-key-match",
    detail:
      "[Ignore]/[Fact(Skip=…)] are exact xUnit/NUnit/MSTest attribute " +
      "tokens; the detector matches the attribute identifiers — " +
      "closed token sets where lexical precision equals structural",
  },
  "src/rules/cypress/qa-cyp-001-cy-wait.ts": {
    reasonCode: "runner-semantic",
    detail:
      "cy.wait(numeric) is a Cypress runner wait contract; the detector " +
      "matches the member-call token with a numeric-literal argument " +
      "on the code-only text — alias waits (cy.wait('@…')) are " +
      "structurally distinct and excluded by the argument shape",
  },
  "src/rules/cypress/qa-cyp-002-focused-test.ts": {
    reasonCode: "runner-semantic",
    detail:
      "Cypress .only is the runner's focus token; the detector matches " +
      "the it/describe/context .only member-call shape on the " +
      "code-only text — exact-key precision",
  },
  "src/rules/cypress/qa-cyp-003-config-security.ts": {
    reasonCode: "exact-key-match",
    detail:
      "chromeWebSecurity:false is an exact config key/value pair inside " +
      "cypress.config.*; the detector matches the key and value " +
      "literally — the config surface's statements are the finding",
  },
  "src/rules/quality/qa-env-001-env-coupling.ts": {
    reasonCode: "absence-aggregate",
    detail:
      "environment-guard absence over the suite is an aggregate " +
      "property; the detector aggregates the suite's guard shapes — " +
      "the defect is what the suite lacks, not a node it has",
  },
  "src/rules/playwright/qa-pw-004-brittle-selectors.ts": {
    reasonCode: "string-content-defect",
    detail:
      "brittle selectors ARE string arguments (css=/xpath=/nth-child " +
      "shapes) — the code-text masking that protects other rules " +
      "deliberately excludes string content here; the detector reads " +
      "the string shapes directly (inside-string oracle)",
  },
  "src/rules/playwright/qa-pw-101-wait-for-timeout.ts": {
    reasonCode: "family-fallback-lockstep",
    detail:
      "the hard-sleep family's §13.2 structural path (AST hook) " +
      "carries the depth where a tree is available; this lexical path " +
      "is the mandatory deterministic fallback kept in lockstep — the " +
      "family's depth is real, the regex is its degraded mode",
  },
  "src/rules/playwright/qa-pw-102-wait-load.ts": {
    reasonCode: "exact-key-match",
    detail:
      "waitForLoadState('load') is an exact Playwright token plus a " +
      "closed argument enum; the detector matches the call plus its " +
      "argument — the AST re-derives the same call shape",
  },
  "src/rules/playwright/qa-pw-103-missing-timeout.ts": {
    reasonCode: "exact-key-match",
    detail:
      "waitForURL/load-state navigation waits are exact Playwright API " +
      "tokens on the code-only text; the token set is closed and " +
      "unambiguous — structural parsing re-derives the same call " +
      "identifier",
  },
  "src/rules/playwright/qa-pw-104-trial-click.ts": {
    reasonCode: "exact-key-match",
    detail:
      "the trial-click shape is an exact Playwright API token pair; " +
      "the detector matches the call identifier on the code-only " +
      "text — the token is closed and unique to the defect",
  },
  "src/rules/playwright/qa-pw-105-poll-timeout.ts": {
    reasonCode: "exact-key-match",
    detail:
      "expect.poll without an options argument is an exact API shape; " +
      "the detector matches the call plus its argumentless form — the " +
      "AST call-shape is the same predicate the regex encodes",
  },
  "src/rules/playwright/qa-pw-107-viewport.ts": {
    reasonCode: "exact-key-match",
    detail:
      "toBeVisible vs toBeInViewport is an exact assertion-method " +
      "token distinction; the detector matches the assertion call " +
      "identifier on the code-only text — closed token set",
  },
  "src/rules/playwright/qa-pw-108-text-coupling.ts": {
    reasonCode: "exact-key-match",
    detail:
      "textContent/innerText assertions are exact assertion-method " +
      "tokens; the detector matches the call identifier on the " +
      "code-only text — closed token set, unique to the defect",
  },
  "src/rules/playwright/qa-pw-112-testid-convention.ts": {
    reasonCode: "string-content-defect",
    detail:
      "data-testid naming is a convention over string attribute " +
      "values; the detector reads the attribute-name token plus the " +
      "value shape — the convention lives in the string, not the tree",
  },
  "src/rules/playwright/qa-pw-113-deep-frames.ts": {
    reasonCode: "exact-key-match",
    detail:
      "frameLocator chaining depth is an exact Playwright token " +
      "sequence; the detector matches the frameLocator call chains — " +
      "the token sequence is closed and unique to the defect",
  },
  "src/rules/playwright/qa-pw-114-legacy-handles.ts": {
    reasonCode: "exact-key-match",
    detail:
      "page.$/$$ legacy handle APIs are exact Playwright tokens; the " +
      "detector matches the member-call identifiers on the " +
      "code-only text — closed deprecated-API token set",
  },
  "src/rules/playwright/qa-pw-115-shared-page.ts": {
    reasonCode: "runner-semantic",
    detail:
      "page reuse across tests is runner fixture-lifecycle semantics; " +
      "the detector matches the page-consumption shapes against the " +
      "test boundaries — the lifecycle is runner behavior",
  },
  "src/rules/playwright/qa-pw-116-storage-state.ts": {
    reasonCode: "exact-key-match",
    detail:
      "storageState is an exact Playwright config/use option token; " +
      "the detector matches the option key and its value shapes — " +
      "closed config surface",
  },
  "src/rules/playwright/qa-pw-117-serial.ts": {
    reasonCode: "runner-semantic",
    detail:
      "fullyParallel/serial are runner scheduling keys on the config " +
      "and describe blocks; the detector matches the runner's exact " +
      "API tokens — the semantics are scheduling, not syntax",
  },
  "src/rules/playwright/qa-pw-118-network-idle.ts": {
    reasonCode: "exact-key-match",
    detail:
      "waitForLoadState('networkidle') is an exact Playwright token " +
      "plus its closed argument enum; the detector matches the call " +
      "plus argument — the networkidle value is unique to the defect",
  },
  "src/rules/playwright/qa-pw-119-order-dependence.ts": {
    reasonCode: "runner-semantic",
    detail:
      "order dependence (test.describe.serial / sequential) is a runner " +
      "scheduling annotation; the detector matches the runner's own " +
      "API tokens — exact-key precision, structural depth would only " +
      "re-derive the same call",
  },
  "src/rules/playwright/qa-pw-120-env-guard.ts": {
    reasonCode: "exact-key-match",
    detail:
      "browser engine selection (firefox/webkit) without a guard is an " +
      "exact config-token shape; the detector matches the engine " +
      "tokens — closed browser-name set",
  },
  "src/rules/playwright/qa-pw-121-config-retries.ts": {
    reasonCode: "runner-semantic",
    detail:
      "retries in playwright.config.* is a runner top-level option, not " +
      "a syntax node; the detector reads the config surface whose " +
      "statements are object-literal keys — exact-key precision",
  },
  "src/rules/playwright/qa-pw-122-no-trace.ts": {
    reasonCode: "runner-semantic",
    detail:
      "trace/reporter capture is runner lifecycle state set in the " +
      "config file; the detector reads the config surface's keys and " +
      "enum values, which are exact matches — a syntax tree adds no " +
      "semantic the config text lacks",
  },
  "src/rules/playwright/qa-pw-123-hardcoded-url.ts": {
    reasonCode: "string-content-defect",
    detail:
      "hardcoded environment URLs are string literals (http(s):// " +
      "shapes); the detector reads the string-content shapes the " +
      "code-text mask preserves for exactly this defect class",
  },
  "src/rules/playwright/qa-pw-124-project-split.ts": {
    reasonCode: "runner-semantic",
    detail:
      "project split is a runner config concept (projects array " +
      "arrangement); the detector reads playwright.config.* keys " +
      "(adapter-gated), whose object-literal shape is exact-match text",
  },
  "src/rules/playwright/qa-pw-125-global-setup.ts": {
    reasonCode: "runner-semantic",
    detail:
      "globalSetup/globalTeardown are runner lifecycle hooks declared " +
      "in the config file; the detector matches those exact keys — the " +
      "defect is the runner's execution order, not a code shape",
  },
  "src/rules/playwright/qa-pw-140.ts": {
    reasonCode: "exact-key-match",
    detail:
      "the detector matches a closed, exact runner API token on the " +
      "code-only text; the token identifies the defect uniquely",
  },
  "src/rules/playwright/qa-pw-141-retry-no-triage.ts": {
    reasonCode: "runner-semantic",
    detail:
      "retry triage is the runner's retry loop interacting with the " +
      "reporter config; the detector reads both config keys and the " +
      "triage call shape — the semantics live in runner behavior",
  },
  "src/rules/playwright/qa-pw-142-blanket-route.ts": {
    reasonCode: "absence-aggregate",
    detail:
      "blanket route interception is an aggregate of route calls " +
      "across the suite; the detector aggregates the route-call " +
      "shapes — the finding is the pattern's breadth, not one call",
  },
  "src/rules/playwright/qa-pw-143-no-artifacts.ts": {
    reasonCode: "absence-aggregate",
    detail:
      "artifact-capture absence (no trace/video/screenshot anywhere in " +
      "the suite) is a directory-level aggregate; the detector " +
      "aggregates over the suite's shapes — absence, not presence",
  },
  "src/rules/playwright/qa-pw-144-single-browser.ts": {
    reasonCode: "absence-aggregate",
    detail:
      "single-browser coverage absence is a config/projects aggregate " +
      "property; the detector reads the projects arrangement across " +
      "the config — no single node constitutes the finding",
  },
  "src/rules/playwright/qa-pw-145-no-a11y.ts": {
    reasonCode: "absence-aggregate",
    detail:
      "accessibility-assertion absence is a property of the SUITE " +
      "(no a11y assertion anywhere in the directory), not of any " +
      "single syntax node; the detector aggregates the directory's " +
      "shapes — the plan's absence-heuristic class",
  },
  "src/rules/playwright/qa-pw-146-css-locator.ts": {
    reasonCode: "string-content-defect",
    detail:
      "CSS/XPath string selectors are string-argument shapes " +
      "(css=/xpath= engines, bare id/class/attr CSS, nth-child); the " +
      "detector classifies the string shapes directly",
  },
  "src/rules/playwright/qa-pw-147-codegen-artifact.ts": {
    reasonCode: "lexical-artifact",
    detail:
      "the codegen recorder's default title ('test', 'test 1', …) " +
      "committed is a recording artifact — the default-title string " +
      "is the finding; the detector matches the recorder's exact " +
      "title shapes",
  },
  "src/rules/python/qa-py-001-focused-test.ts": {
    reasonCode: "runner-semantic",
    detail:
      "pytest.skip/xfail/parametrize marks are runner decorators and " +
      "module-level calls; the detector matches those exact tokens on " +
      "the code-only text — the semantics are runner skip state",
  },
  "src/rules/python/qa-py-002-skipped-test.ts": {
    reasonCode: "runner-semantic",
    detail:
      "pytest.mark.skip/xfail are runner marker decorators — exact " +
      "runner tokens; a syntax tree re-derives the same call shape " +
      "with no added classification power",
  },
  "src/rules/python/qa-py-003-no-assertions.ts": {
    reasonCode: "runner-semantic",
    detail:
      "assertion-less pytest bodies are runner-outcome semantics (the " +
      "runner reports a pass that proves nothing); the detector " +
      "matches the test-def plus body shapes on the code-only text " +
      "— pytest's pass contract is runner behavior",
  },
  "src/rules/python/qa-py-004-bare-truthiness.ts": {
    reasonCode: "runner-semantic",
    detail:
      "bare truthiness asserts (assert obj) are assertion-semantics " +
      "on the code-only text; the detector matches the bare-assert " +
      "shapes — the AST re-derives the same call",
  },
  "src/rules/python/qa-py-005-hard-sleep.ts": {
    reasonCode: "exact-key-match",
    detail:
      "time.sleep(n) is an exact stdlib token with a numeric argument; " +
      "the detector matches the call identifier on the code-only " +
      "text — closed token, unique to the defect",
  },
  "src/rules/python/qa-py-006-empty-body.ts": {
    reasonCode: "runner-semantic",
    detail:
      "pass-only test bodies are runner-outcome semantics; the " +
      "detector matches the def-plus-pass shape on the code-only " +
      "text — the AST body-shape is the same predicate",
  },
  "src/rules/python/qa-py-007-raises-without-match.ts": {
    reasonCode: "runner-semantic",
    detail:
      "pytest.raises without match is a runner exception-contract " +
      "semantic; the detector matches the raises-call plus its " +
      "argumentless form — the runner's exception contract, not a " +
      "syntax property",
  },
  "src/rules/python/qa-py-008-mock-only.ts": {
    reasonCode: "runner-semantic",
    detail:
      "mock-only verification in Python tests is runner-interaction " +
      "semantics; the detector matches the mock-API shapes on the " +
      "code-only text — retained in quarantine until measured otherwise",
  },
  "src/rules/python/qa-py-009-commented-out.ts": {
    reasonCode: "lexical-artifact",
    detail:
      "commented-out test code is a lexical artifact by definition — " +
      "the text IS the finding (comment-wrapped test bodies); the " +
      "detector matches the commented shapes on the raw text, which " +
      "is where the artifact lives",
  },
  "src/rules/python/qa-py-010-random-time.ts": {
    reasonCode: "runner-semantic",
    detail:
      "random/time dependence (random.seed, time.time in test bodies) " +
      "is runtime-behavior semantics; the detector matches the " +
      "module-call tokens — closed stdlib token set",
  },
  "src/rules/python/qa-py-011-mutable-fixture.ts": {
    reasonCode: "runner-semantic",
    detail:
      "pytest fixture mutation is fixture-lifecycle semantics " +
      "(autouse/scope keys plus mutation calls); the detector matches " +
      "the runner's fixture decorator tokens plus the mutation shapes",
  },
  "src/rules/python/qa-py-012-tautological.ts": {
    reasonCode: "runner-semantic",
    detail:
      "tautological assertions in Python (assert x == x) are " +
      "assertion-semantics on the code-only text; the detector " +
      "matches the tautology shapes — the AST re-derives the same " +
      "comparison",
  },
  "src/rules/python/qa-py-101-sync-async-mix.ts": {
    reasonCode: "family-fallback-lockstep",
    detail:
      "the hard-sleep family's Python sync/async variant: the " +
      "family's structural path carries the depth; this variant's " +
      "lexical path is the lockstep fallback (async-mix shapes " +
      "across the sync/async boundary)",
  },
  "src/rules/python/qa-py-102-pw-hard-sleep.ts": {
    reasonCode: "family-fallback-lockstep",
    detail:
      "the hard-sleep family's Python Playwright variant: the " +
      "family's structural path carries the depth; this variant's " +
      "lexical path is the lockstep fallback (tree-sitter python " +
      "availability varies by runner)",
  },
  "src/rules/python/qa-py-103-wait-for-timeout.ts": {
    reasonCode: "exact-key-match",
    detail:
      "page.waitForTimeout is an exact Playwright token in Python " +
      "tests; the detector matches the call identifier — closed " +
      "token, same predicate the AST would encode",
  },
  "src/rules/python/qa-py-105-pw-no-assertions.ts": {
    reasonCode: "runner-semantic",
    detail:
      "Playwright test bodies without assertions are runner-outcome " +
      "semantics; the detector matches the test-def plus body shapes " +
      "on the code-only text",
  },
  "src/rules/quality/qa-tqual-001-mock-only.ts": {
    reasonCode: "runner-semantic",
    detail:
      "mock-only verification is a runner-interaction semantics " +
      "question (the test exercises mocks, not the SUT); the " +
      "detector matches the mock-API call shapes on the code-only " +
      "text — the runner-semantic boundary this lexical heuristic " +
      "approximates, retained in quarantine until measured otherwise",
  },
  "src/rules/quality/qa-tqual-002-tautological.ts": {
    reasonCode: "runner-semantic",
    detail:
      "tautological assertions (x === x, expect(true)) are " +
      "assertion-semantics on the code-only text; the detector " +
      "matches the tautology shapes after comment stripping — the " +
      "AST call-shape is the same predicate",
  },
  "src/rules/quality/qa-tqual-009-promise-assertion.ts": {
    reasonCode: "runner-semantic",
    detail:
      "un-awaited promise assertions are runner async semantics; the " +
      "detector matches the assertion-call shapes inside promise " +
      "chains on the code-only text — the async contract is runner " +
      "behavior",
  },
  "src/rules/quality/qa-tqual-011-commented-out.ts": {
    reasonCode: "lexical-artifact",
    detail:
      "commented-out assertions are lexical artifacts — the " +
      "comment-wrapped assertion text is the finding itself; the " +
      "detector matches the shapes on the raw text",
  },
  "src/rules/test/qa-test-001-focused-test.ts": {
    reasonCode: "runner-semantic",
    detail:
      ".only/focus is runner skip-scheduling state; the detector " +
      "matches the runner's own member-call tokens (.only/.fit/" +
      "fdescribe) on the code-only text — lexical precision equals " +
      "the AST call-shape here, and the §13.2 fallback keeps parity",
  },
  "src/rules/test/qa-test-002-skipped-test.ts": {
    reasonCode: "runner-semantic",
    detail:
      "skip/xfail/ignore are runner skip-state annotations whose " +
      "forms are runner API tokens (it.skip, xit, t.skip, " +
      "@unittest.skip); the detector matches those exact tokens on " +
      "the code-only text",
  },
  "src/rules/test/qa-test-003-no-assertions.ts": {
    reasonCode: "runner-semantic",
    detail:
      "assertion-less test bodies are runner-outcome semantics (the " +
      "runner reports a pass that proves nothing); the detector " +
      "matches the test-def plus body shapes on the code-only text",
  },
  "src/rules/test/qa-test-004-hard-sleep.ts": {
    reasonCode: "runner-semantic",
    detail:
      "hard-sleep is behavioral wait-shape matching (the wait call " +
      "plus its interaction context), not a single node; the " +
      "detector's pattern+wait-shape oracle is the recorded design " +
      "(§12.1), and the hard-sleep family's structural path carries " +
      "the depth where available",
  },
  "src/rules/test/qa-test-006-retry-abuse.ts": {
    reasonCode: "runner-semantic",
    detail:
      "retry abuse is the runner's retry contract (jest.retries, " +
      "vitest retry, playwright retries); the detector matches the " +
      "runner's retry API tokens across runners — each an exact key",
  },
  "src/rules/test/qa-test-010-empty-body.ts": {
    reasonCode: "runner-semantic",
    detail:
      "empty test bodies are runner-outcome semantics; the detector " +
      "matches the test-def plus empty-body shapes on the code-only " +
      "text — the AST body-shape is the same predicate",
  },
  "src/rules/java/qa-jv-101-disabled-test.ts": {
    reasonCode: "exact-key-match",
    detail:
      "@Disabled/@Ignore are exact JUnit/TestNG annotation tokens; the " +
      "detector matches the annotation identifier — annotation shapes " +
      "are closed token sets where lexical and structural match " +
      "coincide",
  },
  "src/rules/families/hard-sleep.ts": {
    reasonCode: "family-fallback-lockstep",
    detail:
      "the hard-sleep family's Java variant (QA-JV-102): the family's " +
      "structural path carries the depth where a tree is available; " +
      "this lexical path is the mandatory deterministic fallback kept " +
      "in lockstep (§13.2)",
  },
  "src/rules/families/brittle-selectors.ts": {
    reasonCode: "string-content-defect",
    detail:
      "the brittle-selector family's variants (QA-JV-106/QA-CS-106/" +
      "QA-PY-104): selector defects are string-argument shapes " +
      "(xpath=/nth-child/absolute-path); the detector classifies the " +
      "string shapes the code-text mask preserves for this class",
  },
  "src/rules/families/network-idle.ts": {
    reasonCode: "runner-semantic",
    detail:
      "the network-idle family's variants (QA-JV-107/QA-CS-107/" +
      "QA-PY-107): networkidle waits are runner timing semantics; " +
      "the detector matches the runner's wait tokens — exact keys",
  },
  "src/rules/families/shared-page.ts": {
    reasonCode: "runner-semantic",
    detail:
      "the shared-page family's variants (QA-JV-104/QA-CS-104/" +
      "QA-PY-106): page/fixture reuse across tests is runner " +
      "fixture-lifecycle semantics; the detector matches the " +
      "consumption shapes against test boundaries",
  },
  "src/rules/families/retry-masking.ts": {
    reasonCode: "runner-semantic",
    detail:
      "the retry-masking family's variants (QA-JV-109/QA-CS-109): " +
      "retry masking is the runner's retry contract; the detector " +
      "matches the runner's retry tokens on the code-only text",
  },
  "src/rules/families/no-a11y.ts": {
    reasonCode: "absence-aggregate",
    detail:
      "the no-a11y family's variants (QA-JV-110/QA-CS-110): " +
      "accessibility-assertion absence is an aggregate property of " +
      "the test file — no single node constitutes the finding",
  },
  "src/rules/families/blanket-route.ts": {
    reasonCode: "runner-semantic",
    detail:
      "the blanket-route family's variants (QA-JV-111/QA-CS-111): " +
      "blanket route mocking is the runner's network-interception " +
      "contract; the detector matches the route API tokens",
  },
  "src/rules/playwright/qa-pw-003-debug-artifacts.ts": {
    reasonCode: "exact-key-match",
    detail:
      "page.pause() and test.only() are exact Playwright runner tokens; " +
      "the detector matches the member-call identifiers on the " +
      "code-only text — closed token set, unique to the defect",
  },
  "src/rules/selenium/qa-se-sleep-lookup.ts": {
    reasonCode: "runner-semantic",
    detail:
      "the Selenium family's variants (QA-SE-001/002/003): the defect is " +
      "the SEQUENCE sleep-then-interact — runner timing semantics, not a " +
      "single node; the detector matches the sleep token followed by a " +
      "lookup within the recorded window",
  },
  "src/rules/families/hardcoded-url.ts": {
    reasonCode: "string-content-defect",
    detail:
      "the hardcoded-url family's variants (QA-JV-108/QA-CS-108/" +
      "QA-PY-108): hardcoded URLs are string literals; the detector " +
      "matches the http(s):// string shapes — the URL lives in the " +
      "string, not the syntax tree",
  },
};

/** Patches the strategyJustification block into a rule source file.
 * EVERY `detectionStrategy: "LEXICAL",` occurrence in the file gets one
 * generator-owned block right after it (helper-generated files declare
 * several rules; each rule's defineRule needs the record). Existing
 * blocks are replaced — the applier is idempotent. */
export function patchRuleSource(source: string, adj: Adjudication): string {
  const needle = 'detectionStrategy: "LEXICAL",';
  if (!source.includes(needle)) {
    throw new Error(
      "no LEXICAL declaration found — the applier only patches LEXICAL rules",
    );
  }
  const block = renderBlock(adj);
  const out: string[] = [];
  let cursor = 0;
  let count = 0;
  for (;;) {
    const idx = source.indexOf(needle, cursor);
    if (idx === -1) {
      out.push(source.slice(cursor));
      break;
    }
    // Keep everything up to and INCLUDING the needle line.
    const nl = source.indexOf("\n", idx + needle.length);
    const through = nl === -1 ? source.length : nl + 1;
    out.push(source.slice(cursor, through));
    // An existing generator-owned block right after the needle is
    // replaced (idempotent re-run), not duplicated.
    const rest = source.slice(through);
    const m = rest.match(/^\s*strategyJustification: \{\n(?:.*\n)*?\s*\},\n/);
    if (m) {
      cursor = through + m[0].length;
    } else {
      cursor = through;
    }
    out.push(block + "\n");
    count++;
  }
  if (count === 0) {
    throw new Error("no LEXICAL declaration patched — unreachable");
  }
  return out.join("");
}

function renderBlock(adj: Adjudication, indent = "      "): string {
  return [
    `${indent}strategyJustification: {`,
    `${indent}  reasonCode: "${adj.reasonCode}",`,
    `${indent}  detail:`,
    ...joinDetailLines(adj.detail, indent),
    `${indent}},`,
  ].join("\n");
}

function joinDetailLines(detail: string, indent: string): string[] {
  const words = detail.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 66 && cur.length > 0) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur.length > 0) lines.push(cur);
  const inner = indent + "    ";
  return lines.map((l, i) => {
    const text = `${inner}"${l}${i === lines.length - 1 ? "" : " "}"`;
    return i === lines.length - 1 ? `${text},` : `${text} +`;
  });
}

/** Recursively collects rule source files under src/rules. */
export function collectRuleFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f.endsWith(".ts")) out.push(p);
    }
  };
  walk(RULES_DIR);
  return out.map((p) => relative(ROOT, p).split("\\").join("/"));
}

function main(): number {
  const files = collectRuleFiles().filter(
    (f) => FILE_ADJUDICATIONS[f] !== undefined,
  );
  let patched = 0;
  const unmapped = collectRuleFiles().filter((f) => {
    if (f.endsWith("index.ts") || f.endsWith("rule.ts")) return false;
    const text = readFileSync(join(ROOT, f), "utf8");
    return (
      text.includes('detectionStrategy: "LEXICAL"') && !FILE_ADJUDICATIONS[f]
    );
  });
  for (const rel of files.sort()) {
    const adj = FILE_ADJUDICATIONS[rel];
    if (adj === undefined) continue; // filtered above; satisfies the checker
    const path = join(ROOT, rel);
    const before = readFileSync(path, "utf8");
    const after = patchRuleSource(before, adj);
    if (after !== before) {
      writeFileSync(path, after);
      patched++;
    }
  }
  console.log(
    `patched ${patched} rule file(s); unmapped LEXICAL files: ` +
      `${unmapped.length === 0 ? "none" : unmapped.join(", ")}`,
  );
  return unmapped.length === 0 ? 0 : 1;
}

if (isMainModule(import.meta.url)) {
  process.exitCode = main();
}
