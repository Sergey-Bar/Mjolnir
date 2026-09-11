/**
 * Rule registry — single source of truth for active rules.
 * Adding a rule here requires: fixtures (both directions) + docs page.
 *
 * RETIREMENT RECONCILIATION (owner ruling 2026-09-08, E-1 of the MVP
 * recon audit .kilo/plans/1788891015969-mvp-recon-audit.md): rules
 * explicitly marked RETIRED per docs/RULE-LIFECYCLE.md's Phase 2
 * quarantine-cluster triage are no longer registered. RETIRED_RULE_IDS
 * below is the canonical retirement record; the census counts ACTIVE
 * rules only (quarantine ≠ retirement). Retired detection modules,
 * fixtures and verdict evidence are preserved in-tree as historical
 * artifacts (verdict rows: tests/corpus/verdicts/archive/). The frozen
 * IDs are never reused.
 */

import type { QADoctorRule } from "./rule.js";
import { focusedTestCommitted } from "./test/qa-test-001-focused-test.js";
import { skippedTest } from "./test/qa-test-002-skipped-test.js";
import { noAssertions } from "./test/qa-test-003-no-assertions.js";
import { hardSleep } from "./test/qa-test-004-hard-sleep.js";
import { retryAbuse } from "./test/qa-test-006-retry-abuse.js";
import { emptyTestBody } from "./test/qa-test-010-empty-body.js";
import { tautologicalAssertion } from "./quality/qa-tqual-002-tautological.js";
import { unawaitedPromiseAssertion } from "./quality/qa-tqual-009-promise-assertion.js";
import { commentedOutTest } from "./quality/qa-tqual-011-commented-out.js";
import { unawaitedLocatorAssertion } from "./playwright/qa-pw-002-unawaited-assertion.js";
import { committedDebugArtifacts } from "./playwright/qa-pw-003-debug-artifacts.js";
import { brittleSelectors } from "./playwright/qa-pw-004-brittle-selectors.js";
import { continueOnError } from "./ci/qa-ci-001-continue-on-error.js";
import { swallowedExitCode } from "./ci/qa-ci-002-swallowed-exit.js";
import { retryMasking } from "./ci/qa-ci-007-retry-masking.js";
import { reportNeverGenerated } from "./ci/qa-ci-005-report-never-generated.js";
import { alwaysSuccessStep } from "./ci/qa-ci-008-always-success.js";
import { exitCodeNotPropagated } from "./ci/qa-ci-009-exit-code.js";
import { nonBlockingTestJob } from "./ci/qa-ci-010-non-blocking.js";
import { canNeverFailGate } from "./ci/qa-ci-013-can-never-fail.js";
import { swallowedVerificationFailure } from "./ci/qa-ci-014-swallowed-verification.js";
import { pyNoAssertions } from "./python/qa-py-003-no-assertions.js";
import { pyHardSleep } from "./python/qa-py-005-hard-sleep.js";
import { pySkippedTest } from "./python/qa-py-002-skipped-test.js";
import { pyTautological } from "./python/qa-py-012-tautological.js";
import { pyFocusedTest } from "./python/qa-py-001-focused-test.js";
import { pyRaisesWithoutMatch } from "./python/qa-py-007-raises-without-match.js";
import { pyCommentedOutTest } from "./python/qa-py-009-commented-out.js";
import { pyBareTruthinessAssert } from "./python/qa-py-004-bare-truthiness.js";
import { pyMutableFixture } from "./python/qa-py-011-mutable-fixture.js";
import { pwWaitForTimeout } from "./playwright/qa-pw-101-wait-for-timeout.js";
import { pwWaitForLoadEvent } from "./playwright/qa-pw-102-wait-load.js";
import { pwDeepFrameLocator } from "./playwright/qa-pw-113-deep-frames.js";
import { pwSerialNoJustification } from "./playwright/qa-pw-117-serial.js";
import { pwConfigRetryAbuse } from "./playwright/qa-pw-121-config-retries.js";
import { pwNoTraceOnRetry } from "./playwright/qa-pw-122-no-trace.js";
import { pwNoProjectSplit } from "./playwright/qa-pw-124-project-split.js";
import { pwTrialMisuse } from "./playwright/qa-pw-104-trial-click.js";
import { pwStorageStateNoExpiry } from "./playwright/qa-pw-116-storage-state.js";
import { pwGlobalSetupSharedState } from "./playwright/qa-pw-125-global-setup.js";
import { pwSharedPage } from "./playwright/qa-pw-115-shared-page.js";
import { qaPw140 } from "./playwright/qa-pw-140.js";
import { hardcodedBaseUrl } from "./playwright/qa-pw-123-hardcoded-url.js";
import { envCoupling } from "./quality/qa-env-001-env-coupling.js";
import { pwRetryMaskingNoForensics } from "./playwright/qa-pw-141-retry-no-triage.js";
import { pwBlanketRouteMock } from "./playwright/qa-pw-142-blanket-route.js";
import { pwNoFailureArtifacts } from "./playwright/qa-pw-143-no-artifacts.js";
import { pwSingleBrowserMatrix } from "./playwright/qa-pw-144-single-browser.js";
import { pwLocatorNormalize } from "./playwright/qa-pw-146-css-locator.js";
import { pwCodegenArtifact } from "./playwright/qa-pw-147-codegen-artifact.js";
import { pyPwSyncAsyncMix } from "./python/qa-py-101-sync-async-mix.js";
import { pyPwWaitForTimeout } from "./python/qa-py-103-wait-for-timeout.js";
import { pyPwNoAssertions } from "./python/qa-py-105-pw-no-assertions.js";
import { jvDisabledTest } from "./java/qa-jv-101-disabled-test.js";
import { jvNoAssertions } from "./java/qa-jv-103-no-assertions.js";
import { jvWaitForTimeout } from "./java/qa-jv-105-wait-for-timeout.js";
import { csSkippedTest } from "./csharp/qa-cs-101-skipped-test.js";
import { csNoAssertions } from "./csharp/qa-cs-103-no-assertions.js";
import { csWaitForTimeout } from "./csharp/qa-cs-105-wait-for-timeout.js";
import { cypCyWait } from "./cypress/qa-cyp-001-cy-wait.js";
import { cypFocusedTest } from "./cypress/qa-cyp-002-focused-test.js";
import { cypConfigSecurity } from "./cypress/qa-cyp-003-config-security.js";
import {
  seJavaSleepLookup,
  seCSharpSleepLookup,
  sePythonSleepLookup,
} from "./selenium/qa-se-sleep-lookup.js";
import { hardSleepFamily } from "./families/hard-sleep.js";
import { networkIdleFamily } from "./families/network-idle.js";
import { hardcodedUrlFamily } from "./families/hardcoded-url.js";
import { sharedPageFamily } from "./families/shared-page.js";
import { brittleSelectorsFamily } from "./families/brittle-selectors.js";
import { retryMaskingFamily } from "./families/retry-masking.js";

export const RULES: readonly QADoctorRule[] = [
  focusedTestCommitted,
  skippedTest,
  noAssertions,
  hardSleep,
  retryAbuse,
  emptyTestBody,
  tautologicalAssertion,
  unawaitedPromiseAssertion,
  commentedOutTest,
  unawaitedLocatorAssertion,
  committedDebugArtifacts,
  brittleSelectors,
  continueOnError,
  swallowedExitCode,
  retryMasking,
  reportNeverGenerated,
  alwaysSuccessStep,
  exitCodeNotPropagated,
  nonBlockingTestJob,
  // P3b (plan 1789009691197): Azure DevOps can-never-fail gates — born
  // quarantine (§15.5) until measured. Introduced 1.1.0.
  canNeverFailGate,
  // P3c: Jenkins try/catch verification swallow — born quarantine (§15.5).
  // Introduced 1.1.1.
  swallowedVerificationFailure,
  pyNoAssertions,
  pyHardSleep,
  pySkippedTest,
  pyTautological,
  pyFocusedTest,
  pyRaisesWithoutMatch,
  pyCommentedOutTest,
  pyBareTruthinessAssert,
  pyMutableFixture,
  pwWaitForTimeout,
  pwWaitForLoadEvent,
  pwDeepFrameLocator,
  pwSerialNoJustification,
  pwConfigRetryAbuse,
  pwNoTraceOnRetry,
  pwNoProjectSplit,
  pwTrialMisuse,
  pwStorageStateNoExpiry,
  pwGlobalSetupSharedState,
  pwSharedPage,
  qaPw140,
  hardcodedBaseUrl,
  envCoupling,
  pwRetryMaskingNoForensics,
  pwBlanketRouteMock,
  pwNoFailureArtifacts,
  pwSingleBrowserMatrix,
  // Phase 7 — Agentic QA Trust (plan §17.3): framework-standards rules
  // aligned with Playwright's locator.normalize() standard + provenance
  // detection. BORN QUARANTINE until measured.
  pwLocatorNormalize,
  pwCodegenArtifact,
  pyPwSyncAsyncMix,
  pyPwWaitForTimeout,
  pyPwNoAssertions,
  ...sharedPageFamily,
  ...networkIdleFamily,
  ...hardcodedUrlFamily,
  jvDisabledTest,
  ...hardSleepFamily,
  jvNoAssertions,
  jvWaitForTimeout,
  ...brittleSelectorsFamily,
  ...retryMaskingFamily,
  csSkippedTest,
  csNoAssertions,
  csWaitForTimeout,
  // Phase 5 — Framework Expansion (plan §15): Cypress first, Selenium
  // cross-language via the JV/CS/Py adapters. Every rule BORN QUARANTINE
  // (§15.5) until measured.
  cypCyWait,
  cypFocusedTest,
  cypConfigSecurity,
  seJavaSleepLookup,
  seCSharpSleepLookup,
  sePythonSleepLookup,
];

export function getRule(id: string): QADoctorRule | undefined {
  return RULES.find((r) => r.id === id);
}

/**
 * IDs of rules that have been fully removed from the registry under the
 * rule lifecycle policy (docs/RULE-LIFECYCLE.md). Frozen contracts law:
 * rule IDs are never reused. Listing a retired ID here (rather than
 * simply deleting all trace of it) is what makes that promise checkable
 * — see tests/rules.registry.spec.ts's "never reissue a retired ID"
 * test.
 *
 * OWNER RULING (2026-09-08, E-1 of the MVP recon audit): this array is
 * the CANONICAL source of retirement — a rule explicitly marked RETIRED
 * by the lifecycle policy must be reconciled into this list and
 * unregistered. Retired rules are NOT part of the active census,
 * do NOT count toward the measurement KPI, and quarantine does NOT
 * equal retirement. All 21 entries below are the Phase 2
 * quarantine-cluster triage RETIRE decisions (100% measured FP, zero
 * TPs, n ≥ 10 each — docs/RULE-LIFECYCLE.md + docs/FP-AUDIT.md).
 */
export const RETIRED_RULE_IDS: readonly string[] = [
  // Phase 2 triage, Playwright TS family — premise wrong on real code:
  "QA-PW-005", // evaluate() branching is browser-only instrumentation (n=17, 100% FP)
  "QA-PW-103", // bare goto() to the app under test is the universal idiom (n=20)
  "QA-PW-105", // expect.poll's default timeout fails visibly — claimed harm cannot occur (n=20)
  "QA-PW-107", // toBeVisible on overlays asserts presence/auto-retry — the intent (n=20)
  "QA-PW-108", // toHaveText on self-owned markup is a legitimate strong assertion (n=20)
  "QA-PW-112", // test-id case style is repo convention, not a defect (n=20; successor: QA-PW-146)
  "QA-PW-114", // page.$ existence checks on loaded pages have no race window (n=20)
  "QA-PW-118", // networkidle flake source is environmental, absent in fixture apps (n=20)
  "QA-PW-119", // module-level state is legitimate harness infra, ≥5 idioms (n=24, was error)
  "QA-PW-120", // file-level keyword co-occurrence ≠ engine dependence (n=20)
  "QA-PW-145", // absence of optional a11y coverage is not a defect (n=20)
  // Phase 2 triage, quality/python singles:
  "QA-TQUAL-001", // spies observe real output — the mock call IS the contract (n=26)
  "QA-PY-006", // 18/20 pytester test-data scripts; real empty tests don't occur (n=20)
  "QA-PY-008", // boundary mocking and real-output spies are contract testing (n=20)
  "QA-PY-010", // wall-clock IS the test subject (n=10)
  // WI-14 measurement-closeout retirement (2026-09-09): QA-PY-102 is
  // a STRUCTURAL dead duplicate — QA-PY-005 (the measured survivor)
  // declares overlapWith: ["QA-PY-102"], so every QA-PY-102 finding
  // is removed by the overlap pass and the rule can never fire, and
  // can therefore never be measured (n = 0 forever). Resolved per
  // plan §12: retire the dead duplicate; the root-cause measurement
  // lives on QA-PY-005 (docs/FP-AUDIT.md). Frozen IDs are never
  // reused.
  // Phase 2 triage, cross-language family variants:
  "QA-PY-102", // dead duplicate (overlapWith survivor: QA-PY-005)
  // — can never fire, never measured
  "QA-JV-108", // hardcoded-URL family, Java: HAR/proxy/deployed targets scatter (n=20)
  "QA-CS-108", // hardcoded-URL family, C#: same as QA-JV-108 (+ route-mocked origins) (n=20)
  "QA-JV-110", // no-a11y family, Java: same absence-heuristic premise failure as QA-PW-145 (n=20)
  "QA-CS-110", // no-a11y family, C#: same absence-heuristic premise failure as QA-PW-145 (n=20)
  "QA-JV-111", // blanket-route family, Java: route-API self-tests + fixture setup (n=20)
  "QA-CS-111", // blanket-route family, C#: same as QA-JV-111 (n=20)
];
