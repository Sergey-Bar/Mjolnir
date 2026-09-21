> STATUS 2026-08-25: SUPERSEDED/DUPLICATE VISION. This is a second,
> independently-written long-term vision doc that overlaps with
> `docs/plans/Product.txt` — both invent an "Evidence Graph"-style concept
> under different names (this file: Evidence Engine/False-Green
> Engine/Hollow Test Engine/etc; Product.txt: Evidence Levels E0–E4). Not
> linked from `docs/README.md`. Nothing shipped in `src/` maps to this
> file's specific phase names. Recommend treating `Product.txt` as the
> long-term vision reference and this file as archived/historical only.
> Near-0% of this file is implemented — no EvidenceGraph, mutation engine,
> or behavior-extraction code exists anywhere in the codebase.

# QA Doctor — 10/10 Verification Trust Platform

> **Your tests are lying to you. QA Doctor proves where the trust breaks.**

---

# 0. PRODUCT NORTH STAR

QA Doctor is a **CLI-first, local-first Verification Trust Platform** for QA engineers, developers, SDETs, QA leads, engineering managers, and release teams.

It does not merely inspect test code.

It answers:

> **"If this test suite is green, what evidence do we have that the product is actually safe to ship?"**

QA Doctor must therefore distinguish between:

- what it knows
- what it proves
- what it infers
- what it does not know

The product must never turn missing evidence into confidence.

---

# 1. THE FIVE CORE PRINCIPLES

## 1.1 Evidence Over Heuristics

Static analysis may identify risk.

Runtime evidence may increase confidence.

Mutation/challenge testing may provide stronger proof.

No heuristic alone should be presented as proof.

---

## 1.2 UNKNOWN Is a First-Class Verdict

QA Doctor has four fundamental verdict states:

```text
PASS
FAIL
UNKNOWN
NOT_APPLICABLE
```

Never:

```text
NO_EVIDENCE → PASS
```

Instead:

```text
NO_EVIDENCE → UNKNOWN
```

---

## 1.3 Trust ≠ Confidence

Every finding must distinguish:

```text
TRUST
```

from:

```text
CONFIDENCE
```

Example:

```text
TRUST: LOW
CONFIDENCE: HIGH
```

Meaning:

> QA Doctor is highly confident that the test is weak.

Versus:

```text
TRUST: UNKNOWN
CONFIDENCE: LOW
```

Meaning:

> QA Doctor does not have enough evidence to judge the test.

---

## 1.4 Evidence Must Be Traceable

Every important verdict must be explainable through evidence.

Example:

```text
Requirement
    ↓
Behavior
    ↓
Test
    ↓
Execution
    ↓
Assertion
    ↓
Production Code
    ↓
Challenge / Mutation
    ↓
Observed Result
    ↓
Verdict
```

This becomes the **QA Doctor Evidence Graph**.

---

## 1.5 QA Doctor Must Trust Itself

A QA platform that cannot prove its own correctness has no credibility.

QA Doctor therefore implements a permanent **Meta-QA / Self-Trust Protocol**.

---

# 2. CORE PRODUCT ARCHITECTURE

```text
                       QA DOCTOR
                           │
              ┌────────────┴────────────┐
              │                         │
         DISCOVERY                   INGESTION
              │                         │
      ┌───────┼────────┐        ┌───────┼────────┐
      │       │        │        │       │        │
    Tests   CI/CD   Frameworks Results  Logs   Coverage
      │       │        │        │       │        │
      └───────┴────────┴────────┴───────┴────────┘
                           │
                           ▼
                    EVIDENCE GRAPH
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   FALSE-GREEN         HOLLOW            WEAK
     ENGINE            ENGINE           ENGINE
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                  BEHAVIOR ENGINE
                           │
                           ▼
                 CHALLENGE ENGINE
                           │
                           ▼
                  TRUST CALCULATOR
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          CLI/UI        CI GATE       SARIF
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                    TRUST REGRESSION
```

---

# 3. MASTER DOMAIN MODEL

QA Doctor must model these entities explicitly:

```text
Project
Repository
Test
Test Suite
Assertion
Behavior
Requirement
Critical Path
Execution
Execution Attempt
Failure
Retry
Mock
Dependency
Production Symbol
API Contract
Mutation
Challenge
Evidence
Finding
Verdict
Trust Score
Confidence Score
Policy
Trust Regression
```

Everything eventually connects through the Evidence Graph.

---

# 4. TRUST MODEL

QA Doctor should never rely on a single magic score.

Expose multiple dimensions.

```text
Execution Coverage
Assertion Coverage
Behavior Coverage
Mutation Coverage
Critical Path Coverage
Pipeline Enforcement
Mock Dependency
Flake Risk
Contract Verification
Verification Depth
```

Then provide:

```text
Overall Trust
Confidence
Unknown Rate
```

---

# 5. BEHAVIORAL COVERAGE

Code coverage answers:

> Did this code execute?

QA Doctor must additionally answer:

> Did we verify the behavior?

Example:

```text
Checkout

✓ Happy path
✓ Invalid card
✗ Expired card
✗ Duplicate submission
✗ Timeout
✓ Discount
✗ Currency conversion
✗ Retry behavior
```

Output:

```text
LINE COVERAGE:       94%
TEST COVERAGE:       81%
BEHAVIOR COVERAGE:   43%
```

This distinction is fundamental.

---

# 6. VERIFICATION DEPTH

QA Doctor must identify where verification stops.

Example:

```text
UI
 ↓
API
 ↓
Service
 ↓
Repository
 ↓
Database
```

If everything below Service is mocked:

```text
VERIFICATION DEPTH: 3/5
REAL-WORLD VERIFICATION: LOW
```

This powers Hollow-Test analysis.

---

# 7. MOCK BOUNDARY ANALYSIS

Detect:

- mock-only verification
- excessive mocking
- mocked critical dependencies
- assertions only against mocks
- mocked return values never independently validated
- mocks hiding integration failures
- database mocks replacing persistence verification
- payment-service mocks replacing transaction verification
- authentication mocks hiding authorization behavior

---

# 8. CONTRACT VERIFICATION

For REST and GraphQL:

```text
Response fields: 12
Fields verified:  2
Verification:     16%
```

Detect:

- status-only checks
- unverified response bodies
- schema drift
- missing required fields
- incorrect types
- ignored error payloads
- GraphQL field omissions
- request/response mismatch

---

# 9. TRUST REGRESSION

QA Doctor must detect when test quality gets worse.

Example:

```text
PR #1842

Mutation Catch Rate
71% → 54%

Behavior Coverage
83% → 67%

Unknown Rate
4% → 13%

Trust Regression: HIGH
```

The tool should answer:

> **"Did this PR make our verification less trustworthy?"**

This becomes a major CI feature.

---

# 10. UNKNOWN BUDGET

Introduce policy around uncertainty.

Example:

```text
UNKNOWN RATE: 8%

Policy:
<5%      PASS
5–10%    REVIEW
>10%     BLOCK
```

Unknown is itself a risk signal.

---

# 11. SPRINT STRUCTURE

The project is divided into 15 major phases.

Each sprint has:

- implementation
- tests
- self-tests
- fixtures
- documentation
- acceptance criteria
- measurable exit gate

No sprint is considered complete merely because code exists.

---

# 🔴 PHASE 0 — PRODUCT & ARCHITECTURE FOUNDATION

## Sprint 0.1 — Product Contract

### Tasks

- [ ] Define North Star
- [ ] Define terminology
- [ ] Define PASS / FAIL / UNKNOWN / N/A
- [ ] Define Trust vs Confidence
- [ ] Define evidence hierarchy
- [ ] Define what constitutes proof
- [ ] Define what constitutes inference
- [ ] Define prohibited claims
- [ ] Define deterministic behavior requirements
- [ ] Define privacy/local-first guarantees

### Deliverables

- PRODUCT.md
- TERMINOLOGY.md
- TRUST-MODEL.md
- EVIDENCE-MODEL.md
- PRIVACY.md

### Exit Gate

No ambiguous definition remains for:

```text
Trust
Confidence
Evidence
Proof
Unknown
Failure
Risk
Verification
Coverage
```

---

# Sprint 0.2 — Architecture

### Tasks

- [ ] CLI architecture
- [ ] Core domain model
- [ ] Plugin architecture
- [ ] Rule engine
- [ ] Evidence engine
- [ ] Parser abstraction
- [ ] Framework adapter abstraction
- [ ] Result ingestion abstraction
- [ ] Reporter abstraction
- [ ] Policy engine abstraction
- [ ] Challenge engine abstraction

### Exit Gate

Adding a new framework must not require rewriting the core.

---

# Sprint 0.3 — Repository Discovery

Support:

- [ ] JavaScript
- [ ] TypeScript
- [ ] Python
- [ ] Playwright
- [ ] Jest
- [ ] Vitest
- [ ] PyTest
- [ ] package.json
- [ ] tsconfig
- [ ] CI configuration
- [ ] test directories
- [ ] coverage artifacts
- [ ] JUnit
- [ ] Playwright reports

### CLI

```bash
npx qa-doctor
```

### Exit Gate

A new repository can be analyzed with zero configuration.

---

# 🟠 PHASE 1 — EVIDENCE ENGINE

## Sprint 1.1 — Evidence Graph

### Tasks

Implement graph relationships:

```text
Test → Assertion
Test → Execution
Test → Production Symbol
Test → Behavior
Test → Mock
Execution → Result
Mutation → Production Symbol
Mutation → Test
Mutation → Result
```

### Exit Gate

Every major finding can point to evidence.

---

# Sprint 1.2 — Evidence Quality

Implement evidence classes:

```text
STATIC
RUNTIME
HISTORICAL
MUTATION
CI
CONTRACT
BEHAVIORAL
```

Evidence must have:

```text
source
timestamp
scope
confidence
determinism
```

---

# Sprint 1.3 — Evidence Viewer

CLI:

```bash
qa-doctor explain <finding>
```

Output:

```text
WHY?

Finding:
Checkout test does not verify persisted order.

Evidence:
✓ checkout.spec.ts:142
✓ API response verified
✗ database state never verified
✗ persistence mutation survived

Confidence: HIGH
Trust: LOW
```

---

# 🟠 PHASE 2 — FALSE-GREEN ENGINE

## Sprint 2.1 — CI Parsing

Support:

- [ ] GitHub Actions
- [ ] GitLab CI
- [ ] Jenkins
- [ ] generic shell
- [ ] npm scripts
- [ ] Docker
- [ ] Makefiles

Detect:

- [ ] continue-on-error
- [ ] swallowed exit codes
- [ ] `|| true`
- [ ] incorrect shell pipelines
- [ ] ignored test failures
- [ ] jobs not required
- [ ] quality jobs not gating
- [ ] reports generated but unused

---

# Sprint 2.2 — Retry Integrity

Detect:

- [ ] excessive retries
- [ ] retry-only passes
- [ ] retry masking
- [ ] flaky tests promoted as green
- [ ] different outcomes between attempts

Output:

```text
PASS AFTER RETRY

Attempts: 5
Failures: 4
Success: 1

CI TRUST: LOW
```

---

# Sprint 2.3 — Skip / Bypass Detection

Detect:

- `.skip`
- `.only`
- `xit`
- `xdescribe`
- conditional bypasses
- dynamic skips
- environment-dependent bypasses
- disabled suites
- quarantined tests
- ignored failures

---

# 🟠 PHASE 3 — HOLLOW TEST ENGINE

## Sprint 3.1 — Tautology Detection

Detect:

```text
expect(true).toBe(true)
expect(x).toBe(x)
expect(mock).toHaveBeenCalled()
```

when there is no meaningful behavioral verification.

---

# Sprint 3.2 — Setup-Only Tests

Detect tests that:

- create state
- initialize components
- configure mocks
- call setup
- assert setup
- never verify behavior

---

# Sprint 3.3 — Mock-Only Verification

Detect:

```text
mock → call → verify mock
```

without independent evidence.

---

# Sprint 3.4 — Dependency Boundary Analysis

Build dependency graph.

Calculate:

```text
REAL VERIFICATION DEPTH
MOCK DEPENDENCY
CRITICAL MOCK RISK
```

---

# 🟠 PHASE 4 — WEAK TEST ENGINE

## Sprint 4.1 — Assertion Strength

Detect:

- status-only
- existence-only
- visibility-only
- generic text checks
- weak equality
- partial object checks
- meaningless snapshots
- broad snapshots
- generic truthiness

---

# Sprint 4.2 — Async Integrity

Detect:

- missing await
- unhandled promises
- detached async operations
- race-prone assertions
- premature completion
- missing network waits

---

# Sprint 4.3 — UI Verification Depth

Analyze:

```text
click
 ↓
wait
 ↓
assert
```

versus:

```text
click
 ↓
verify resulting state
 ↓
verify persisted behavior
 ↓
verify user-visible outcome
```

---

# Sprint 4.4 — API Verification Depth

Detect:

```text
HTTP 200
```

without verification of:

- response body
- schema
- side effects
- business state
- error behavior

---

# 🟡 PHASE 5 — RUNTIME FORENSICS

## Sprint 5.1 — Result Ingestion

Support:

- [ ] JUnit
- [ ] Playwright JSON
- [ ] Jest JSON
- [ ] console logs
- [ ] GitHub Actions artifacts
- [ ] generic result adapters

---

# Sprint 5.2 — Flake Intelligence

Classify:

```text
Timing
Network
Shared State
Environment
Browser
Data
Infrastructure
Unknown
```

---

# Sprint 5.3 — Historical Analysis

Track:

```text
failure frequency
retry recovery
browser distribution
environment distribution
failure clustering
```

Example:

```text
18 failures
15 recovered after retry
13 occurred on WebKit

Diagnosis:
HIGH-CONFIDENCE WEBKIT FLAKE
```

---

# Sprint 5.4 — Selector Resilience

Score:

```text
getByRole
getByLabel
getByTestId
CSS
XPath
nth-child
```

But clearly classify this as **risk evidence**, not proof of test weakness.

---

# 🟡 PHASE 6 — BEHAVIOR ENGINE

## Sprint 6.1 — Behavior Extraction

Extract behavioral units from:

- test names
- describe blocks
- assertions
- API calls
- UI actions
- production symbols
- route names
- GraphQL operations

---

# Sprint 6.2 — Critical Path Detection

Identify:

- authentication
- authorization
- payments
- checkout
- user creation
- destructive operations
- data mutation
- security boundaries
- critical workflows

---

# Sprint 6.3 — Behavior Matrix

Generate:

```text
Behavior                  Tests    Verified
------------------------------------------------
Checkout happy path         8        ✓
Invalid payment             4        ✓
Duplicate payment           0        ✗
Timeout                     0        ✗
Currency conversion         1        ⚠
Refund                      2        ✓
```

---

# Sprint 6.4 — Behavioral Coverage

Produce:

```text
Code Coverage:        94%
Execution Coverage:   91%
Behavior Coverage:    58%
Critical Coverage:    43%
```

This prevents 100% code coverage from being interpreted as quality.

---

# 🟡 PHASE 7 — CONTRACT INTELLIGENCE

## Sprint 7.1 — REST

Analyze:

- request schema
- response schema
- status codes
- response fields
- errors
- side effects

---

# Sprint 7.2 — GraphQL

Analyze:

- queries
- mutations
- fields
- fragments
- variables
- errors
- expected response structure

---

# Sprint 7.3 — Contract Drift

Detect:

```text
Backend changed
        ↓
Test still passes
        ↓
Test does not verify changed contract
```

---

# 🟡 PHASE 8 — VERIFICATION CHALLENGE ENGINE

## Sprint 8.1 — Mutation Infrastructure

Implement:

- source isolation
- mutation generation
- target selection
- test selection
- rollback
- sandbox execution
- timeout handling
- deterministic cleanup

---

# Sprint 8.2 — Safe Mutators

Initial mutations:

- [ ] arithmetic operators
- [ ] comparison operators
- [ ] boolean operators
- [ ] return values
- [ ] constants
- [ ] conditional branches

---

# Sprint 8.3 — Targeted Mutation

Never mutate the entire repository blindly.

Use:

```bash
qa-doctor challenge --scope changed
```

Target:

```text
changed production code
        ↓
dependent tests
        ↓
relevant mutations
```

---

# Sprint 8.4 — Mutation Verdicts

Every challenge becomes:

```text
CAUGHT
SURVIVED
NOT_REACHED
INVALID
TIMEOUT
UNKNOWN
```

Important:

> SURVIVED does not automatically mean "test is useless."

It means:

> **The test failed to detect this specific behavioral mutation.**

---

# Sprint 8.5 — Mutation Confidence

A mutation result must include:

```text
mutation type
target
affected behavior
test selected
execution result
confidence
```

---

# 🔥 PHASE 9 — TRUST ENGINE

## Sprint 9.1 — Multi-Dimensional Trust

Calculate separately:

```text
Execution Trust
Assertion Trust
Behavior Trust
Mutation Trust
Pipeline Trust
Contract Trust
Flake Trust
Mock Trust
```

---

# Sprint 9.2 — Trust Score

Score only after evidence collection.

Example:

```text
TEST TRUST

Execution       96
Assertions      81
Behavior        58
Mutation        61
Pipeline        100
Contract        42

Overall Trust   LOW
Confidence      HIGH
```

---

# Sprint 9.3 — Trust Card

CLI:

```text
┌──────────────────────────────────────────────┐
│ TEST TRUST CARD                              │
│ checkout.spec.ts:142                        │
│                                              │
│ TRUST: LOW                                   │
│ CONFIDENCE: HIGH                             │
│                                              │
│ Execution             96%                    │
│ Assertion             38%                    │
│ Behavior              42%                    │
│ Mutation              23%                    │
│ Contract              18%                    │
│                                              │
│ UNKNOWN: 7%                                  │
│                                              │
│ PROOF                                      │
│ ✗ Payment mutation survived                 │
│ ✗ Database state not verified               │
│ ✗ Only HTTP status asserted                 │
│ ✓ Test executed successfully                │
│                                              │
│ PRESCRIPTION                                │
│ Verify payment amount and persisted order.  │
└──────────────────────────────────────────────┘
```

---

# 🔥 PHASE 10 — TRUST REGRESSION

## Sprint 10.1 — Baselines

Store:

```text
previous trust
previous mutation rate
previous behavior coverage
previous unknown rate
previous flaky rate
```

---

# Sprint 10.2 — PR Comparison

```text
Before → After
```

Detect:

- trust regression
- new weak tests
- new hollow tests
- new false-green risk
- mutation regression
- behavior regression
- unknown increase

---

# Sprint 10.3 — Regression Policy

Example:

```text
Mutation coverage ↓ >10% → BLOCK

Critical behavior coverage ↓ → BLOCK

Unknown rate ↑ >5% → REVIEW

New critical hollow test → BLOCK
```

---

# 🔥 PHASE 11 — META-QA / CIRCLE OF TRUST

This phase is mandatory and never "finished."

## Sprint 11.1 — Rule Fixtures

Every rule requires:

```text
MUST_FIRE
MUST_NOT_FIRE
EDGE_CASE
```

---

# Sprint 11.2 — Golden Outputs

Protect:

- CLI
- JSON
- SARIF
- schemas
- error messages
- exit codes

---

# Sprint 11.3 — Self-Mutation

QA Doctor deliberately mutates its own implementation.

If the QA Doctor test suite remains green:

```text
RELEASE BLOCKED
```

---

# Sprint 11.4 — Differential Testing

Run:

```text
Expected behavior
vs
actual analyzer behavior
```

against large fixture corpus.

---

# Sprint 11.5 — False Positive / False Negative Corpus

Maintain permanent corpus for:

```text
real-world valid code
real-world broken tests
edge cases
framework-specific behavior
```

---

# Sprint 11.6 — Determinism

Same input must produce equivalent:

```text
verdict
evidence
score
exit code
```

unless runtime evidence intentionally changes.

---

# Sprint 11.7 — QA Doctor Self-Audit

QA Doctor audits its own repository.

But:

> **Do NOT require 100/100.**

Instead require:

```text
Rule coverage:              100%
Must-fire fixtures:         100%
Must-not-fire fixtures:     100%
Critical mutation tests:    PASS
False-positive threshold:   PASS
Determinism:                PASS
Schema stability:           PASS
Regression suite:            PASS
```

This avoids the circular "we are good because we said we are good" problem.

---

# 🔵 PHASE 12 — DEVELOPER EXPERIENCE

## Sprint 12.1 — CLI UX

Commands:

```bash
qa-doctor
qa-doctor scan
qa-doctor explain
qa-doctor test
qa-doctor challenge
qa-doctor coverage
qa-doctor trust
qa-doctor diff
qa-doctor baseline
qa-doctor fix
qa-doctor ci
```

---

# Sprint 12.2 — Output Modes

Support:

```text
human
json
jsonl
sarif
markdown
ci
quiet
verbose
debug
```

---

# Sprint 12.3 — Exit Codes

Define stable exit codes:

```text
0 = PASS
1 = QUALITY FAILURE
2 = UNKNOWN / INSUFFICIENT EVIDENCE
3 = CONFIGURATION ERROR
4 = TOOL ERROR
5 = CHALLENGE FAILURE
```

Never allow exit-code ambiguity.

---

# 🔵 PHASE 13 — CI / ENFORCEMENT

## Sprint 13.1 — GitHub Actions

Native integration.

---

# Sprint 13.2 — GitLab

Native integration.

---

# Sprint 13.3 — Jenkins

Generic integration.

---

# Sprint 13.4 — PR Comments

Example:

```text
QA DOCTOR

Trust Regression: -14%

New Findings:
2 Weak
1 Hollow
0 False-Green

Behavior Coverage:
81% → 64%

Mutation Detection:
73% → 59%

Status: BLOCKED
```

---

# Sprint 13.5 — SARIF

Integrate with GitHub security/code scanning interfaces.

---

# 🔵 PHASE 14 — POLICY AS CODE

Configuration:

```javascript
{
  criticalBehaviorCoverage: 90,
  mutationCoverage: 70,
  maxUnknownRate: 5,
  blockOnFalseGreen: true,
  blockOnHollowCriticalTests: true,
  maxTrustRegression: 5
}
```

Support:

```text
project policy
team policy
repository policy
branch policy
critical-path policy
```

---

# 🔵 PHASE 15 — SAFE AUTO-REMEDIATION

Only deterministic, low-risk fixes.

Examples:

```text
remove .only
remove .skip
add missing await
replace deprecated API
fix obvious assertion mistakes
```

Never automatically rewrite complex test intent.

Every fix must support:

```bash
qa-doctor fix --dry-run
```

and:

```bash
qa-doctor fix --explain
```

---

# 🟣 PHASE 16 — AI / INTENT ENGINE

AI comes AFTER the deterministic foundation.

## Sprint 16.1 — Intent Extraction

Infer:

```text
test name
describe context
actions
assertions
expected behavior
```

---

# Sprint 16.2 — Intent vs Assertion

Example:

```text
Intent:
"User receives 10% discount."

Actual assertions:
HTTP 200

Result:
INTENT / ASSERTION MISMATCH
```

AI may suggest the mismatch.

It must not pretend this is deterministic proof.

---

# Sprint 16.3 — AI Explanation

AI translates evidence into:

```text
What happened?
Why does it matter?
What should be tested?
What evidence is missing?
```

---

# Sprint 16.4 — AI Remediation

Suggest:

```text
new assertions
missing scenarios
better test structure
better fixtures
```

But suggestions remain suggestions until deterministic validation passes.

---

# 🟣 PHASE 17 — ENTERPRISE

## Tasks

- [ ] centralized policies
- [ ] organization configuration
- [ ] team dashboards
- [ ] historical trust trends
- [ ] debt tracking
- [ ] release quality reports
- [ ] audit exports
- [ ] compliance evidence
- [ ] role-based access
- [ ] optional cloud
- [ ] organization-wide quality baselines

Cloud remains optional.

CLI/local mode remains fully functional.

---

# 18. SECURITY & PRIVACY

Mandatory:

- [ ] zero network by default
- [ ] no source upload
- [ ] no telemetry by default
- [ ] explicit opt-in telemetry
- [ ] secret detection
- [ ] credential redaction
- [ ] secure temporary mutation directories
- [ ] sandboxed execution
- [ ] mutation cleanup
- [ ] path traversal protection
- [ ] command injection protection
- [ ] untrusted repository safety
- [ ] dependency auditing

---

# 19. PERFORMANCE ENGINEERING

QA Doctor must remain practical.

Targets:

```text
Static scan:
<5 seconds for normal repositories

Incremental scan:
<2 seconds target

PR scope:
only changed/relevant graph

Mutation:
parallelizable

Full verification:
explicit opt-in
```

The user should never need to run a 30-minute analysis for every commit.

---

# 20. FRAMEWORK ADAPTER ROADMAP

## Tier 1

```text
Playwright
Jest
Vitest
PyTest
```

## Tier 2

```text
Cypress
Mocha
JUnit
Testing Library
Supertest
```

## Tier 3

```text
Postman/Newman
REST Assured
Cucumber
Webdriver
Appium
```

The core remains framework-agnostic.

---

# 21. RULE SEVERITY MODEL

Every finding gets:

```text
SEVERITY
CONFIDENCE
TRUST IMPACT
EVIDENCE
```

Example:

```text
CRITICAL
Confidence: HIGH
Trust Impact: HIGH

HTTP 200-only assertion on payment flow.
```

Do not equate severity with certainty.

---

# 22. RISK MODEL

Risk should incorporate:

```text
Business Criticality
Verification Weakness
Evidence Quality
Change Risk
Historical Failure
Mutation Survival
Behavior Coverage
```

Example:

```text
LOW-RISK weak test
```

may remain a warning.

But:

```text
HIGH-RISK + CRITICAL PATH + MUTATION SURVIVAL
```

becomes:

```text
BLOCK
```

---

# 23. PRESCRIPTION ENGINE

Every meaningful finding must answer:

```text
What is wrong?
Why does it matter?
What evidence proves it?
What should change?
How can I verify the fix?
```

Example:

```text
Finding:
Payment test only checks HTTP 200.

Evidence:
Payment amount mutation survived.

Prescription:
Assert:
- transaction status
- charged amount
- currency
- persisted transaction
- user-visible result

Verification:
Mutation must be caught.
```

---

# 24. DEBT MANAGEMENT

QA Doctor should track:

```text
New debt
Existing debt
Resolved debt
Regressed debt
Accepted risk
Unknown debt
```

Allow:

```text
qa-doctor baseline
qa-doctor diff
```

Important:

> Existing debt does not automatically block every PR.

New or worsened debt should be the primary enforcement mechanism.

---

# 25. RELEASE GATES

A repository can define:

```text
Critical behavior coverage >= 90%
Mutation detection >= 70%
Unknown <= 5%
False-green critical findings = 0
New hollow critical tests = 0
Trust regression <= 5%
```

QA Doctor produces:

```text
SHIP
BLOCK
REVIEW
UNKNOWN
```

Not simply:

```text
PASS / FAIL
```

---

# 26. GOLDEN DEMO REPOSITORY

Build a permanent intentionally-broken repository containing:

```text
Perfect tests
Hollow tests
Weak tests
Flaky tests
False-green CI
Mock-heavy tests
Status-only API tests
Snapshot abuse
Mutation survivors
Skipped tests
Retry abuse
Behavior gaps
Contract drift
Auth bugs
Critical path gaps
```

QA Doctor must correctly diagnose this repository.

This becomes the primary product demonstration.

---

# 27. COMPETITIVE DIFFERENTIATION

QA Doctor should explicitly position itself against:

```text
Code Coverage
Test Linters
Mutation Testing
Flaky Test Detection
CI Quality Gates
Static Analysis
AI Test Generation
```

The message:

```text
Coverage:
"Did code execute?"

Linter:
"Does the test look suspicious?"

Mutation:
"Did the test catch this change?"

Flake detector:
"Is the test unstable?"

QA Doctor:
"How much evidence do we have that this verification can be trusted?"
```

---

# 28. THE ULTIMATE TRUST REPORT

Example:

```text
╔══════════════════════════════════════════════════╗
║                 QA DOCTOR                        ║
║            VERIFICATION REPORT                   ║
╠══════════════════════════════════════════════════╣
║ Overall Trust              LOW                   ║
║ Confidence                 HIGH                  ║
║ Unknown Rate               4%                    ║
╠══════════════════════════════════════════════════╣
║ Execution Coverage         96%                   ║
║ Assertion Coverage         81%                   ║
║ Behavior Coverage          63%                   ║
║ Critical Path Coverage     51%                   ║
║ Mutation Detection         58%                   ║
║ Contract Verification      42%                   ║
║ Pipeline Enforcement       100%                  ║
║ Verification Depth         2.8/5                 ║
╠══════════════════════════════════════════════════╣
║ CRITICAL FINDINGS                               ║
║                                                  ║
║ 3 False-Green                                 ║
║ 8 Hollow                                      ║
║ 17 Weak                                        ║
║ 6 Critical Behavior Gaps                       ║
║ 12 Mutation Survivors                          ║
╠══════════════════════════════════════════════════╣
║ TRUST REGRESSION                                ║
║                                                  ║
║ Previous: 78                                    ║
║ Current:  61                                    ║
║ Delta:   -17  🚨                                ║
╠══════════════════════════════════════════════════╣
║ RELEASE VERDICT: BLOCK                         ║
╚══════════════════════════════════════════════════╝
```

---

# 29. MASTER DEVELOPMENT ORDER

The implementation order is deliberately:

```text
1. Product Contract
2. Architecture
3. Discovery
4. Evidence Graph
5. Deterministic Rules
6. False-Green
7. Hollow
8. Weak
9. Runtime Forensics
10. Behavioral Coverage
11. Contract Intelligence
12. Mutation
13. Trust Engine
14. Trust Regression
15. Meta-QA
16. CLI UX
17. CI Enforcement
18. Policy
19. Auto-Fix
20. AI Intent
21. Enterprise
```

Never reverse this order by building the AI layer first.

---

# 30. DEFINITION OF DONE — EVERY FEATURE

A feature is NOT complete until:

- [ ] implementation exists
- [ ] unit tests exist
- [ ] integration tests exist where applicable
- [ ] MUST-FIRE fixture exists
- [ ] MUST-NOT-FIRE fixture exists
- [ ] edge-case fixture exists
- [ ] negative test exists
- [ ] regression test exists
- [ ] deterministic behavior verified
- [ ] CLI output verified
- [ ] JSON output verified where applicable
- [ ] documentation exists
- [ ] performance impact measured
- [ ] false-positive behavior tested
- [ ] false-negative behavior challenged
- [ ] self-scan covers the feature

---

# 31. DEFINITION OF DONE — EVERY SPRINT

A sprint cannot close with:

> "The code works."

It closes only when:

```text
IMPLEMENTED
    +
VERIFIED
    +
CHALLENGED
    +
DOCUMENTED
    +
MEASURED
    +
SELF-TESTED
```

---

# 32. DEFINITION OF DONE — RELEASE

Before every release:

```text
✓ Full unit suite
✓ Full integration suite
✓ Full fixture corpus
✓ Mutation suite
✓ Self-mutation
✓ Golden outputs
✓ CLI regression
✓ JSON/SARIF regression
✓ Performance regression
✓ Security scan
✓ Dependency scan
✓ Determinism check
✓ Repository self-audit
✓ Golden demo repository audit
✓ False-positive review
✓ False-negative review
✓ Documentation review
```

---

# 33. FINAL PRODUCT STANDARD

QA Doctor should never claim:

> "Your tests are good."

It should say:

> "Here is the evidence we have."

It should never claim:

> "Your test is useless."

It should say:

> "This test failed to detect these specific behavioral challenges."

It should never claim:

> "100% coverage means you're safe."

It should say:

> "96% of the code executed, but only 58% of identified behaviors have strong verification evidence."

And when it cannot determine the answer:

> **UNKNOWN.**

That is the core philosophy of QA Doctor.

---

# 34. THE FINAL 10/10 PRODUCT

The completed platform becomes:

```text
              QA DOCTOR
                  │
        ┌─────────┴─────────┐
        │                   │
     ANALYZE              PROVE
        │                   │
        ▼                   ▼
   Static Evidence      Mutation
   Runtime Evidence     Challenges
   CI Evidence          Behavioral Tests
   Historical Data      Contract Tests
        │                   │
        └─────────┬─────────┘
                  ▼
             EVIDENCE GRAPH
                  │
                  ▼
            TRUST ENGINE
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
     TRUST    CONFIDENCE   UNKNOWN
       │          │          │
       └──────────┼──────────┘
                  ▼
          RELEASE DECISION
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
       SHIP      REVIEW    BLOCK
```

The final category is not:

**"Test Linter."**

It is:

# **Verification Trust Platform**

And the moat is not the number of rules.

The moat is:

**Evidence Graph + Behavioral Understanding + Mutation Proof + Runtime Forensics + Trust Regression + Meta-QA.**

That combination is what should make QA Doctor genuinely difficult to replicate.
