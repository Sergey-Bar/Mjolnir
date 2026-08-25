/**
 * Rule registry — single source of truth for active rules.
 * Adding a rule here requires: fixtures (both directions) + docs page.
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
import { mockOnlyVerification } from "./quality/qa-tqual-001-mock-only.js";
import { commentedOutTest } from "./quality/qa-tqual-011-commented-out.js";
import { unawaitedLocatorAssertion } from "./playwright/qa-pw-002-unawaited-assertion.js";
import { committedDebugArtifacts } from "./playwright/qa-pw-003-debug-artifacts.js";
import { brittleSelectors } from "./playwright/qa-pw-004-brittle-selectors.js";
import { evaluateBusinessLogic } from "./playwright/qa-pw-005-evaluate-logic.js";
import { continueOnError } from "./ci/qa-ci-001-continue-on-error.js";
import { swallowedExitCode } from "./ci/qa-ci-002-swallowed-exit.js";
import { retryMasking } from "./ci/qa-ci-007-retry-masking.js";
import { reportNeverGenerated } from "./ci/qa-ci-005-report-never-generated.js";
import { alwaysSuccessStep } from "./ci/qa-ci-008-always-success.js";
import { exitCodeNotPropagated } from "./ci/qa-ci-009-exit-code.js";
import { nonBlockingTestJob } from "./ci/qa-ci-010-non-blocking.js";
import { pyNoAssertions } from "./python/qa-py-003-no-assertions.js";
import { pyHardSleep } from "./python/qa-py-005-hard-sleep.js";
import { pyEmptyBody } from "./python/qa-py-006-empty-body.js";
import { pySkippedTest } from "./python/qa-py-002-skipped-test.js";
import { pyTautological } from "./python/qa-py-012-tautological.js";
import { pyRandomTimeDependence } from "./python/qa-py-010-random-time.js";
import { pyFocusedTest } from "./python/qa-py-001-focused-test.js";
import { pyMockOnly } from "./python/qa-py-008-mock-only.js";
import { pyRaisesWithoutMatch } from "./python/qa-py-007-raises-without-match.js";
import { pyCommentedOutTest } from "./python/qa-py-009-commented-out.js";
import { pyBareTruthinessAssert } from "./python/qa-py-004-bare-truthiness.js";
import { pyMutableFixture } from "./python/qa-py-011-mutable-fixture.js";
import { pwWaitForTimeout } from "./playwright/qa-pw-101-wait-for-timeout.js";
import { pwWaitForLoadEvent } from "./playwright/qa-pw-102-wait-load.js";
import { pwPollNoTimeout } from "./playwright/qa-pw-105-poll-timeout.js";
import { pwDeepFrameLocator } from "./playwright/qa-pw-113-deep-frames.js";
import { pwSerialNoJustification } from "./playwright/qa-pw-117-serial.js";
import { pwConfigRetryAbuse } from "./playwright/qa-pw-121-config-retries.js";
import { pwNoTraceOnRetry } from "./playwright/qa-pw-122-no-trace.js";
import { pwNoProjectSplit } from "./playwright/qa-pw-124-project-split.js";
import { pwTrialMisuse } from "./playwright/qa-pw-104-trial-click.js";
import { pwVisibleNotInViewport } from "./playwright/qa-pw-107-viewport.js";
import { pwTextContentCoupling } from "./playwright/qa-pw-108-text-coupling.js";
import { pwTestIdConvention } from "./playwright/qa-pw-112-testid-convention.js";
import { pwStorageStateNoExpiry } from "./playwright/qa-pw-116-storage-state.js";
import { pwOrderDependence } from "./playwright/qa-pw-119-order-dependence.js";
import { pwGlobalSetupSharedState } from "./playwright/qa-pw-125-global-setup.js";
import { pwMissingTimeout } from "./playwright/qa-pw-103-missing-timeout.js";
import { pwSharedPage } from "./playwright/qa-pw-115-shared-page.js";
import { pwNoEnvGuard } from "./playwright/qa-pw-120-env-guard.js";
import { qaPw140 } from "./playwright/qa-pw-140.js";
import { networkIdleWait } from "./playwright/qa-pw-118-network-idle.js";
import { legacyElementHandles } from "./playwright/qa-pw-114-legacy-handles.js";
import { hardcodedBaseUrl } from "./playwright/qa-pw-123-hardcoded-url.js";
import { envCoupling } from "./quality/qa-env-001-env-coupling.js";

export const RULES: readonly QADoctorRule[] = [
  focusedTestCommitted,
  skippedTest,
  noAssertions,
  hardSleep,
  retryAbuse,
  emptyTestBody,
  tautologicalAssertion,
  unawaitedPromiseAssertion,
  mockOnlyVerification,
  commentedOutTest,
  unawaitedLocatorAssertion,
  committedDebugArtifacts,
  brittleSelectors,
  evaluateBusinessLogic,
  continueOnError,
  swallowedExitCode,
  retryMasking,
  reportNeverGenerated,
  alwaysSuccessStep,
  exitCodeNotPropagated,
  nonBlockingTestJob,
  pyNoAssertions,
  pyHardSleep,
  pyEmptyBody,
  pySkippedTest,
  pyTautological,
  pyRandomTimeDependence,
  pyFocusedTest,
  pyMockOnly,
  pyRaisesWithoutMatch,
  pyCommentedOutTest,
  pyBareTruthinessAssert,
  pyMutableFixture,
  pwWaitForTimeout,
  pwWaitForLoadEvent,
  pwPollNoTimeout,
  pwDeepFrameLocator,
  pwSerialNoJustification,
  pwConfigRetryAbuse,
  pwNoTraceOnRetry,
  pwNoProjectSplit,
  pwTrialMisuse,
  pwVisibleNotInViewport,
  pwTextContentCoupling,
  pwTestIdConvention,
  pwStorageStateNoExpiry,
  pwOrderDependence,
  pwGlobalSetupSharedState,
  pwMissingTimeout,
  pwSharedPage,
  pwNoEnvGuard,
  qaPw140,
  networkIdleWait,
  legacyElementHandles,
  hardcodedBaseUrl,
  envCoupling,
];

export function getRule(id: string): QADoctorRule | undefined {
  return RULES.find((r) => r.id === id);
}
