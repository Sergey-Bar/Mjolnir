# Verification Trust Ecosystem Context, 2026

Date: 2026-09-20

Scope: primary and first-party sources for a QA Doctor/Mjolnir roadmap. This is
not a generic competitor list; it is a map of ecosystem contracts that a
verification trust engine can measure, normalize, and make honest.

## Executive Read

The ecosystem is converging on a simple shape: "green" is no longer enough.
Teams now have first-party mechanisms for required checks, changed-code
coverage, SARIF static-analysis interchange, flaky-test handling, mutation
testing, and test impact analysis, but each mechanism can still produce a false
sense of release safety when its evidence boundary is not explicit.

For QA Doctor/Mjolnir, the roadmap opportunity is to sit above these tools as
an evidence adjudicator:

- Treat passing CI as one evidence source, not as proof.
- Record what was run, what was skipped, what was retried, what was selected by
  impact analysis, what was merely covered, and what was behaviorally asserted.
- Preserve the existing constitution principle that non-evidence is never
  upgraded to PASS.
- Emit evidence through contracts developers already consume: GitHub checks,
  SARIF, coverage reports, machine JSON, and release gates.

## 1. Mutation Testing: Behavior Evidence, But Only If Scoped

First-party mutation-testing tools describe the same core contract: seed small
faults into production code, run the tests, and measure whether the suite kills
the mutants. PIT says line/statement/branch coverage only proves execution, not
that tests can detect faults; PIT calls mutation testing the standard against
which other coverage is measured and recommends running it frequently against
changed code.[^pit] Stryker defines mutation score as detected mutants divided
by valid mutants.[^stryker] Infection positions MSI and covered MSI as CI-
enforceable indicators, including changed-line operation through
`--git-diff-lines`.[^infection] Cosmic Ray makes the same point for Python:
coverage says code was executed, while mutation testing asks whether tests
check behavior.[^cosmic]

Roadmap implications:

- Add a mutation-evidence dimension before making any "high-confidence tests"
  claim. It should be PATCH-scoped by default, because full-suite mutation is
  too expensive for many repos and PIT/Infection both point toward changed-code
  operation.
- Do not fold mutation score into a single WORTHINESS number without exposing
  mutant states. Survived, timed out, no coverage, and equivalent/ignored
  mutants carry different trust meanings.
- Prefer adapters over native mutation engines. PIT, Stryker, Infection, and
  Cosmic Ray already own language-specific mutation semantics. QA Doctor should
  normalize their output into an evidence graph.
- For Mjolnir release-trust, a "mutation PASS" must mean "required mutants for
  the selected trust boundary were evaluated and met policy", not merely "a
  mutation tool exists in CI."

## 2. Flaky-Test Detection: Retries Are Evidence, Not Green Paint

Test runners increasingly expose retry and flake semantics directly. Playwright
documents retries, repeat-each debugging, `failOnFlakyTests`, and retry
strategies including isolated retries.[^playwright] Pytest documents flaky-test
causes and states that reruns can mitigate negative effects by giving failures
another chance to pass.[^pytest-flaky] Maven Surefire supports
`rerunFailingTestsCount` and reports flaky rerun information.[^surefire]
Gradle's Test Retry plugin is explicitly framed as mitigation for flaky
tests.[^gradle-retry]

Commercial and CI products now treat flake management as a first-class product
surface. Trunk documents flaky-test quarantine so detected flakes stop failing
CI while remaining tracked.[^trunk] Buildkite Test Engine advertises flaky-test
isolation, reliability trends, owners, and execution history.[^buildkite]
BuildPulse markets detection, quarantine, and repair without test-code
instrumentation.[^buildpulse] Harness documents a JUnit XML based flaky-test
quarantine plugin.[^harness]

Roadmap implications:

- Preserve the repo's current flake policy: retries off by default and flake
  events recorded, not hidden. The product should parse retry metadata from
  Playwright, Surefire, JUnit XML, and CI logs into a flake ledger.
- Treat "failed then passed on retry" as a non-PASS trust state unless policy
  explicitly accepts it. Playwright's `failOnFlakyTests` is strong ecosystem
  support for making flakes build-breaking in CI.
- Add a quarantine contract: quarantined tests reduce claimed verification
  scope and must be surfaced as scope loss, not as a clean pass.
- Roadmap feature: "same commit, different result" detection from CI history.
  This is more defensible than static prediction because it uses execution
  evidence.

## 3. CI Reliability And False-Green Risks

GitHub branch protection is powerful but has semantics that matter to a trust
engine. GitHub required status checks can be `successful`, `skipped`, or
`neutral` and still satisfy required checks; strict checks require the branch
to be up to date, while loose checks can pass before merge and fail after merge
because of base-branch incompatibility.[^gh-protected] GitHub also warns that
duplicate job names across workflows can make status checks ambiguous and block
merges.[^gh-protected] Merge queue exists specifically to ensure queued changes
pass checks when applied to the latest target branch and earlier queued
changes.[^gh-protected]

Skipped workflows are another trust boundary. GitHub's workflow-skip docs state
that workflows skipped by commit message, branch filtering, or path filtering
leave checks associated with that workflow in a pending state, blocking a PR
when those checks are required.[^gh-skip] Separately, job-level conditions can
skip jobs; GitHub Actions documents that skipped jobs display "This check was
skipped" and report Success, so they do not prevent merging even when required
status checks are in place.[^gh-conditions]

Roadmap implications:

- Add a GitHub trust audit that distinguishes required workflow skipped and
  pending, job skipped and success, neutral, success, cancelled, timed out, and
  missing expected context.
- Required checks should be source-bound. GitHub allows choosing the expected
  app for a required status check; QA Doctor should flag "any source" for trust
  critical checks unless deliberately accepted.
- Mjolnir should model `skipped` and `neutral` as evidence states, not boolean
  passes. A required check satisfied by skip semantics is not equivalent to
  executed verification.
- Merge queue support belongs in the release-trust roadmap for active
  repositories. It is the platform-native answer to "green on the PR head, red
  after merge."

## 4. Coverage Quality And Changed-Code Coverage

Codecov's first-party docs say it gates and reports coverage changes on the Git
diff by default, with optional project coverage status checks and patch
coverage visibility in PR comments.[^codecov] Diff-cover defines diff coverage
as coverage over new or modified lines and compares coverage XML or lcov data
with `git diff`.[^diff-cover] SonarQube's quality-gate docs emphasize new-code
conditions and a "Clean as You Code" style gate.[^sonar] GitLab's coverage
visualization annotates only files changed in the merge-request diff, using
green/red/orange line states.[^gitlab-coverage]

Roadmap implications:

- Changed-code coverage should be the default coverage trust signal. Whole-
  project coverage is useful for trend context, but it can hide risk in a PR.
- Coverage must remain lower-confidence than mutation evidence. Covered means
  executed; it does not mean asserted. That maps naturally to existing
  evidence-level vocabulary: coverage is at most execution evidence unless
  paired with assertion/mutation evidence.
- Add "changed-code unexercised" as a first-class finding. It is cheap,
  understandable, and directly compatible with Codecov, diff-cover, GitLab,
  lcov, Cobertura, JaCoCo, and Istanbul style reports.
- Avoid claiming "adequate tests" from coverage alone. Use coverage as a
  routing signal: where mutation testing or deeper checks should run first.

## 5. SARIF And Static-Analysis Contracts

SARIF 2.1.0 is an OASIS Standard for static-analysis results interchange,
intended to capture the range of data produced by tools and make results
portable between producers and consumers.[^sarif] GitHub code scanning accepts
third-party SARIF uploads, supports categories for multiple analyses, and uses
the CodeQL `upload-sarif` action or API for ingestion.[^gh-sarif] GitHub also
requires unique categories or `runAutomationDetails.id` for multiple SARIF
files so one analysis does not overwrite another.[^gh-sarif]

Roadmap implications:

- Keep SARIF output as a stable external contract. It is the right interchange
  channel for editor and GitHub code-scanning consumption.
- Extend SARIF properties with QA Doctor evidence fields, but keep the core
  SARIF shape conventional: rule IDs, result levels, locations, fingerprints,
  and categories.
- Treat SARIF upload success separately from analysis success. "Uploaded to code
  scanning" only proves transport; the trust engine must still say whether the
  analysis ran, covered the intended scope, and produced policy-compliant
  findings.
- For monorepos, categories are trust-critical. A static-analysis result without
  a stable category can overwrite another result set or blur scope.

## 6. Branch Protection And Required Checks

GitHub branch protection and rulesets provide the native enforcement plane.
Protected branches can require pull request reviews, status checks, signed
commits, linear history, merge queue, deployments, branch locks, bypass
restrictions, and push restrictions.[^gh-protected] Rulesets are the newer
policy mechanism and can apply multiple rules with a visible ruleset model
rather than the "only one branch protection rule applies" limitation of classic
branch rules.[^gh-rulesets]

Roadmap implications:

- Add a branch-protection/ruleset scanner that reads the platform settings and
  compares them to the trust policy documented in this repo.
- Model bypasses. A protected branch that allows admin or app bypass is not the
  same trust state as one with "do not allow bypassing" enabled.
- Treat required checks as named contracts. The engine should verify the
  expected check names, their source app, and whether job names are unique.
- Publish a recommended GitHub configuration that aligns `self-scan`,
  `certification`, release-trust, coverage, and SARIF upload without ambiguous
  contexts.

## 7. Test Impact Analysis And Selective Execution

Selective execution is now mainstream. Azure Pipelines documents Test Impact
Analysis to speed testing by running impacted automated tests.[^azure-tia]
Nx's affected command determines affected projects and runs tasks only where
recent changes touch the project graph.[^nx] Bazel exposes query and dependency
graph operations that teams use for target selection and incremental test
execution.[^bazel-query] Develocity documents Predictive Test Selection as a
governed automated test-selection capability for accelerating feedback.[^develocity]

Roadmap implications:

- Test impact analysis is a trust-risk multiplier: it shortens feedback, but
  skipped-by-selection tests must be visible as "not run due to selection",
  not erased.
- Require a fallback contract. Any TIA integration should record how the full
  suite is periodically revalidated and what happens when dependency mapping is
  missing, stale, or unsupported.
- Capture selector provenance: base SHA, head SHA, changed files, dependency
  graph version, selected tests, deselected tests, and forced-always-run tests.
- For QA Doctor, TIA evidence should affect scope integrity. A green selective
  run can be PASS only for the selected scope unless policy proves the selector
  is sufficient for the release boundary.

## 8. Tooling Landscape Through The Roadmap Lens

This table is intentionally about capability contracts, not vendor ranking.

| Area                   | First-party examples                                                                   | Contract QA Doctor should normalize                                                               |
| ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Mutation testing       | PIT, Stryker, Infection, Cosmic Ray                                                    | Mutant generated, killed, survived, timed out, ignored, uncovered, equivalent/waived, patch scope |
| Flake management       | Playwright, Pytest, Surefire, Gradle Test Retry, Trunk, Buildkite, BuildPulse, Harness | First attempt result, retry result, same-commit divergence, quarantine, owner, age, failure class |
| Coverage/diff coverage | Codecov, diff-cover, SonarQube, GitLab coverage visualization                          | Changed-line execution, project trend, uncovered changed code, quality-gate result                |
| Static analysis        | SARIF OASIS, GitHub code scanning, CodeQL upload-sarif                                 | Rule ID, location, severity, confidence, fingerprint, category, policy result                     |
| Required checks        | GitHub branch protection, rulesets, merge queue                                        | Required context, source app, strictness, skipped/neutral/success, bypass, queue validation       |
| Test impact analysis   | Azure TIA, Nx affected, Bazel query, Develocity PTS                                    | Selected/deselected tests, selector inputs, graph freshness, fallback/full-suite cadence          |

## 9. Proposed QA Doctor/Mjolnir Roadmap Slices

1. Evidence ingestion adapters

   Ingest JUnit XML, Playwright JSON, coverage formats, mutation reports, SARIF,
   GitHub Checks/Statuses, branch protection/rulesets, and TIA selection
   manifests. Normalize into evidence records without changing product code
   scoring immediately.

2. Trust-state upgrades

   Add explicit states for `SKIPPED_BY_PLATFORM`, `SKIPPED_BY_SELECTION`,
   `FLAKY_RETRIED`, `QUARANTINED`, `COVERED_ONLY`, and `MUTATION_SURVIVED`.
   Map them into the existing PASS/FAILED/UNPROVEN/PARTIAL/BLOCKED/
   INCONCLUSIVE algebra rather than creating another independent verdict layer.

3. Changed-code trust gate

   A PR-level gate that answers: changed lines exercised, impacted tests run,
   mutation sample evaluated where configured, no untracked retries, required
   checks source-bound, and SARIF/static analysis scope present.

4. GitHub enforcement audit

   Compare repository branch protection/rulesets with declared policy. Flag
   duplicate check names, loose required checks for release branches, any-source
   checks, admin bypass, missing merge queue where appropriate, skipped-success
   job patterns, and missing required contexts.

5. Flake ledger automation

   Generate and maintain a flake ledger from CI history. A retry-green test
   becomes visible evidence debt with owner, age, observed commits, and
   quarantine status.

6. Mutation-as-depth signal

   Start with optional patch-scoped mutation evidence and adapters. The product
   should report "behavioral assertion depth" separately from line coverage and
   only promote it after enough language adapters are stable.

7. Release-trust integration

   Extend release-trust dimensions to bind CI execution, changed-code coverage,
   flake state, branch protection, SARIF analysis, and TIA scope. The invariant
   should remain: no execution or partial execution never renders as PASS.

## Source Notes

[^pit]: PIT, "PIT Mutation Testing" and mutation-testing overview, https://pitest.org/

[^stryker]: Stryker Mutator, "Mutant states and metrics", https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/

[^infection]: Infection PHP Mutation Testing Framework, https://infection.github.io/

[^cosmic]: Cosmic Ray documentation, "Tutorial: The basics", https://cosmic-ray.readthedocs.io/en/latest/tutorials/basics.html

[^playwright]: Playwright TestConfig docs for `failOnFlakyTests`, `repeatEach`, `retries`, and `retryStrategy`, https://playwright.dev/docs/api/class-testconfig

[^pytest-flaky]: Pytest documentation, "Flaky tests", https://docs.pytest.org/en/stable/explanation/flaky.html

[^surefire]: Apache Maven Surefire Plugin, "Rerun failing tests", https://maven.apache.org/surefire/maven-surefire-plugin/examples/rerun-failing-tests.html

[^gradle-retry]: Gradle Test Retry Plugin Portal page, https://plugins.gradle.org/plugin/org.gradle.test-retry

[^trunk]: Trunk docs, "Flaky Tests overview", https://docs.trunk.io/flaky-tests/overview

[^buildkite]: Buildkite Test Engine, https://buildkite.com/test-engine

[^buildpulse]: BuildPulse, "Flaky Test Detection", https://buildpulse.io/flaky-tests

[^harness]: Harness Developer Hub, "Flaky Tests (Test Analysis Plugin)", https://developer.harness.io/docs/continuous-integration/use-ci/run-tests/test-analysis-plugin/flaky-tests/

[^gh-protected]: GitHub Docs, "About protected branches", https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches

[^gh-skip]: GitHub Docs, "Skipping workflow runs", https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs

[^gh-conditions]: GitHub Docs, "Using conditions to control job execution", https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions

[^codecov]: Codecov Docs, "Quick Start", https://docs.codecov.com/docs/quick-start

[^diff-cover]: diff-cover repository, https://github.com/Bachmann1234/diff_cover

[^sonar]: SonarQube Server Docs, "Quality standards and new code", https://docs.sonarsource.com/sonarqube-server/latest/quality-standards-administration/quality-standards-and-new-code/

[^gitlab-coverage]: GitLab Docs, "Coverage visualization", https://docs.gitlab.com/ci/testing/code_coverage/coverage_visualization/

[^sarif]: OASIS, "Static Analysis Results Interchange Format (SARIF) Version 2.1.0", https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html

[^gh-sarif]: GitHub Docs, "Uploading a SARIF file to GitHub", https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file

[^gh-rulesets]: GitHub Docs, "About rulesets", https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets

[^azure-tia]: Microsoft Learn, "Use Test Impact Analysis", https://learn.microsoft.com/en-us/azure/devops/pipelines/test/test-impact-analysis

[^nx]: Nx Docs, "Run Only Tasks Affected by a PR", https://nx.dev/ci/features/affected

[^bazel-query]: Bazel Docs, "Bazel Query Reference", https://bazel.build/query/language

[^develocity]: Develocity Docs, "Build Acceleration", https://docs.develocity.ai/develocity/build-acceleration/
