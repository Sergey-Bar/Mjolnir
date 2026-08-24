/**
 * Rule registry — single source of truth for active rules.
 * Adding a rule here requires: fixtures (both directions) + docs page.
 */

import type { QADoctorRule } from './rule.js';
import { focusedTestCommitted } from './test/qa-test-001-focused-test.js';
import { skippedTest } from './test/qa-test-002-skipped-test.js';
import { noAssertions } from './test/qa-test-003-no-assertions.js';
import { hardSleep } from './test/qa-test-004-hard-sleep.js';
import { emptyTestBody } from './test/qa-test-010-empty-body.js';
import { tautologicalAssertion } from './quality/qa-tqual-002-tautological.js';
import { unawaitedPromiseAssertion } from './quality/qa-tqual-009-promise-assertion.js';
import { mockOnlyVerification } from './quality/qa-tqual-001-mock-only.js';
import { commentedOutTest } from './quality/qa-tqual-011-commented-out.js';
import { unawaitedLocatorAssertion } from './playwright/qa-pw-002-unawaited-assertion.js';
import { committedDebugArtifacts } from './playwright/qa-pw-003-debug-artifacts.js';
import { brittleSelectors } from './playwright/qa-pw-004-brittle-selectors.js';
import { evaluateBusinessLogic } from './playwright/qa-pw-005-evaluate-logic.js';
import { continueOnError } from './ci/qa-ci-001-continue-on-error.js';
import { swallowedExitCode } from './ci/qa-ci-002-swallowed-exit.js';
import { reportNeverGenerated } from './ci/qa-ci-005-report-never-generated.js';
import { alwaysSuccessStep } from './ci/qa-ci-008-always-success.js';

export const RULES: readonly QADoctorRule[] = [
  focusedTestCommitted,
  skippedTest,
  noAssertions,
  hardSleep,
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
  reportNeverGenerated,
  alwaysSuccessStep,
];

export function getRule(id: string): QADoctorRule | undefined {
  return RULES.find((r) => r.id === id);
}
