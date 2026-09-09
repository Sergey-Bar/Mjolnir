# Depth adjudication — no unexplained depth

Master plan P8 (plan 1788853205786, flag 6, decision 9). Every rule
whose detection strategy is LEXICAL carries a recorded verdict: the
closed reason code (see `src/rules/rule.ts` → `StrategyReasonCode`)
and the derivation citing the detector's actual shape. The doctor's
`registry-sanity` check enforces this on every run; this document is
the rendered record, regenerated from the registry (never hand-edited).

Deterministic provenance: the table below is generated from the same
`RuleMeta.strategyJustification` records the engine ships — one
source of truth, rendered here and in the capability matrix.

## Verdict summary

- Registry: 78 rules.
- LEXICAL rules adjudicated: 69 — every one carries a strategyJustification record (doctor-enforced).
- Rules on a deeper strategy: 6 (AST, AST, QA_MODEL, AST, QA_MODEL, AST).

## Migration record (DEFERRED — owner directive 2026-09-09)

Migration of LEXICAL detectors to AST/QA_MODEL is **deferred to the
next measurement round**: no migration may be initiated without
measured FP-reduction evidence, and initiating prolonged network
measurements solely to unblock migration was explicitly ruled out.
The deferral does not block any other work; rules whose existing
evidence already demonstrated a required migration would have been
migrated in this batch — none did.

The structural bench (rules already on AST/QA_MODEL) shows migration
is not hypothetical — it is the Lane-A/Lane-B precedent applied where
evidence supported it:

- **QA-CS-102** — AST (Medium depth): Hard sleep in test
- **QA-CS-103** — AST (Medium depth): Test without assertions
- **QA-CS-105** — QA_MODEL (High depth): WaitForTimeoutAsync hard sleep
- **QA-JV-103** — AST (Medium depth): Test without assertions
- **QA-JV-105** — QA_MODEL (High depth): waitForTimeout hard sleep
- **QA-PW-002** — AST (Medium depth): Unawaited Playwright assertion

## Verdicts by reason code

### `absence-aggregate` — absence over a suite/directory — the evidence is the aggregate shape (4 rules)

- **QA-ENV-001** (100% FP at n=20): environment-guard absence over the suite is an aggregate property; the detector aggregates the suite's guard shapes — the defect is what the suite lacks, not a node it has
- **QA-PW-142** (18% FP at n=11): blanket route interception is an aggregate of route calls across the suite; the detector aggregates the route-call shapes — the finding is the pattern's breadth, not one call
- **QA-PW-143** (6% FP at n=80): artifact-capture absence (no trace/video/screenshot anywhere in the suite) is a directory-level aggregate; the detector aggregates over the suite's shapes — absence, not presence
- **QA-PW-144** (14% FP at n=21): single-browser coverage absence is a config/projects aggregate property; the detector reads the projects arrangement across the config — no single node constitutes the finding

### `exact-key-match` — exact, unambiguous runner/API token — lexical precision equals structural (11 rules)

- **QA-CS-101** (0% FP at n=20): [Ignore]/[Fact(Skip=…)] are exact xUnit/NUnit/MSTest attribute tokens; the detector matches the attribute identifiers — closed token sets where lexical precision equals structural
- **QA-CYP-003** (unmeasured): chromeWebSecurity:false is an exact config key/value pair inside cypress.config.*; the detector matches the key and value literally — the config surface's statements are the finding
- **QA-JV-101** (0% FP at n=23): @Disabled/@Ignore are exact JUnit/TestNG annotation tokens; the detector matches the annotation identifier — annotation shapes are closed token sets where lexical and structural match coincide
- **QA-PW-003** (10% FP at n=10): page.pause() and test.only() are exact Playwright runner tokens; the detector matches the member-call identifiers on the code-only text — closed token set, unique to the defect
- **QA-PW-102** (unmeasured): waitForLoadState('load') is an exact Playwright token plus a closed argument enum; the detector matches the call plus its argument — the AST re-derives the same call shape
- **QA-PW-104** (0% FP at n=10): the trial-click shape is an exact Playwright API token pair; the detector matches the call identifier on the code-only text — the token is closed and unique to the defect
- **QA-PW-113** (0% FP at n=11): frameLocator chaining depth is an exact Playwright token sequence; the detector matches the frameLocator call chains — the token sequence is closed and unique to the defect
- **QA-PW-116** (unmeasured): storageState is an exact Playwright config/use option token; the detector matches the option key and its value shapes — closed config surface
- **QA-PW-140** (0% FP at n=10): the detector matches a closed, exact runner API token on the code-only text; the token identifies the defect uniquely
- **QA-PY-005** (13% FP at n=23): time.sleep(n) is an exact stdlib token with a numeric argument; the detector matches the call identifier on the code-only text — closed token, unique to the defect
- **QA-PY-103** (8% FP at n=25): page.waitForTimeout is an exact Playwright token in Python tests; the detector matches the call identifier — closed token, same predicate the AST would encode

### `family-fallback-lockstep` — the §13.2 mandatory regex fallback kept in lockstep with the family's structural path (4 rules)

- **QA-JV-102** (26% FP at n=23): the hard-sleep family's Java variant (QA-JV-102): the family's structural path carries the depth where a tree is available; this lexical path is the mandatory deterministic fallback kept in lockstep (§13.2)
- **QA-PW-101** (0% FP at n=20): the hard-sleep family's §13.2 structural path (AST hook) carries the depth where a tree is available; this lexical path is the mandatory deterministic fallback kept in lockstep — the family's depth is real, the regex is its degraded mode
- **QA-PY-101** (unmeasured): the hard-sleep family's Python sync/async variant: the family's structural path carries the depth; this variant's lexical path is the lockstep fallback (async-mix shapes across the sync/async boundary)
- **QA-PY-102** (unmeasured): the hard-sleep family's Python Playwright variant: the family's structural path carries the depth; this variant's lexical path is the lockstep fallback (tree-sitter python availability varies by runner)

### `lexical-artifact` — the defect IS the lexical artifact (text = finding) (3 rules)

- **QA-PW-147** (100% FP at n=20): the codegen recorder's default title ('test', 'test 1', …) committed is a recording artifact — the default-title string is the finding; the detector matches the recorder's exact title shapes
- **QA-PY-009** (6% FP at n=18): commented-out test code is a lexical artifact by definition — the text IS the finding (comment-wrapped test bodies); the detector matches the commented shapes on the raw text, which is where the artifact lives
- **QA-TQUAL-011** (24% FP at n=25): commented-out assertions are lexical artifacts — the comment-wrapped assertion text is the finding itself; the detector matches the shapes on the raw text

### `runner-semantic` — semantics live in runner behavior no syntax tree represents (39 rules)

- **QA-CI-005** (8% FP at n=13): report generation is a runner side effect of the workflow step sequence, not a syntax tree property; the detector reads the workflow step graph, whose statements are already literal text
- **QA-CI-007** (0% FP at n=11): retry masking is defined by the runner's retry semantics, which no language syntax tree represents; the detector matches the runner's own retry keys in workflow YAML where statements are shell strings
- **QA-CI-008** (10% FP at n=10): always()-success is a workflow-step outcome contract, not a code construct; the detector matches the step's run/if keys, which are string fields of the YAML config surface
- **QA-CS-104** (unmeasured): the shared-page family's variants (QA-JV-104/QA-CS-104/QA-PY-106): page/fixture reuse across tests is runner fixture-lifecycle semantics; the detector matches the consumption shapes against test boundaries
- **QA-CS-107** (unmeasured): the network-idle family's variants (QA-JV-107/QA-CS-107/QA-PY-107): networkidle waits are runner timing semantics; the detector matches the runner's wait tokens — exact keys
- **QA-CS-109** (unmeasured): the retry-masking family's variants (QA-JV-109/QA-CS-109): retry masking is the runner's retry contract; the detector matches the runner's retry tokens on the code-only text
- **QA-CYP-001** (20% FP at n=15): cy.wait(numeric) is a Cypress runner wait contract; the detector matches the member-call token with a numeric-literal argument on the code-only text — alias waits (cy.wait('@…')) are structurally distinct and excluded by the argument shape
- **QA-CYP-002** (unmeasured): Cypress .only is the runner's focus token; the detector matches the it/describe/context .only member-call shape on the code-only text — exact-key precision
- **QA-JV-104** (20% FP at n=10): the shared-page family's variants (QA-JV-104/QA-CS-104/QA-PY-106): page/fixture reuse across tests is runner fixture-lifecycle semantics; the detector matches the consumption shapes against test boundaries
- **QA-JV-107** (unmeasured): the network-idle family's variants (QA-JV-107/QA-CS-107/QA-PY-107): networkidle waits are runner timing semantics; the detector matches the runner's wait tokens — exact keys
- **QA-JV-109** (0% FP at n=18): the retry-masking family's variants (QA-JV-109/QA-CS-109): retry masking is the runner's retry contract; the detector matches the runner's retry tokens on the code-only text
- **QA-PW-115** (56% FP at n=16): page reuse across tests is runner fixture-lifecycle semantics; the detector matches the page-consumption shapes against the test boundaries — the lifecycle is runner behavior
- **QA-PW-117** (0% FP at n=24): fullyParallel/serial are runner scheduling keys on the config and describe blocks; the detector matches the runner's exact API tokens — the semantics are scheduling, not syntax
- **QA-PW-121** (0% FP at n=12): retries in playwright.config.* is a runner top-level option, not a syntax node; the detector reads the config surface whose statements are object-literal keys — exact-key precision
- **QA-PW-122** (6% FP at n=80): trace/reporter capture is runner lifecycle state set in the config file; the detector reads the config surface's keys and enum values, which are exact matches — a syntax tree adds no semantic the config text lacks
- **QA-PW-124** (unmeasured): project split is a runner config concept (projects array arrangement); the detector reads playwright.config.* keys (adapter-gated), whose object-literal shape is exact-match text
- **QA-PW-125** (unmeasured): globalSetup/globalTeardown are runner lifecycle hooks declared in the config file; the detector matches those exact keys — the defect is the runner's execution order, not a code shape
- **QA-PW-141** (9% FP at n=33): retry triage is the runner's retry loop interacting with the reporter config; the detector reads both config keys and the triage call shape — the semantics live in runner behavior
- **QA-PY-001** (0% FP at n=12): pytest.skip/xfail/parametrize marks are runner decorators and module-level calls; the detector matches those exact tokens on the code-only text — the semantics are runner skip state
- **QA-PY-002** (4% FP at n=23): pytest.mark.skip/xfail are runner marker decorators — exact runner tokens; a syntax tree re-derives the same call shape with no added classification power
- **QA-PY-003** (47% FP at n=30): assertion-less pytest bodies are runner-outcome semantics (the runner reports a pass that proves nothing); the detector matches the test-def plus body shapes on the code-only text — pytest's pass contract is runner behavior
- **QA-PY-004** (53% FP at n=30): bare truthiness asserts (assert obj) are assertion-semantics on the code-only text; the detector matches the bare-assert shapes — the AST re-derives the same call
- **QA-PY-007** (79% FP at n=34): pytest.raises without match is a runner exception-contract semantic; the detector matches the raises-call plus its argumentless form — the runner's exception contract, not a syntax property
- **QA-PY-011** (10% FP at n=10): pytest fixture mutation is fixture-lifecycle semantics (autouse/scope keys plus mutation calls); the detector matches the runner's fixture decorator tokens plus the mutation shapes
- **QA-PY-012** (40% FP at n=30): tautological assertions in Python (assert x == x) are assertion-semantics on the code-only text; the detector matches the tautology shapes — the AST re-derives the same comparison
- **QA-PY-105** (0% FP at n=12): Playwright test bodies without assertions are runner-outcome semantics; the detector matches the test-def plus body shapes on the code-only text
- **QA-PY-106** (unmeasured): the shared-page family's variants (QA-JV-104/QA-CS-104/QA-PY-106): page/fixture reuse across tests is runner fixture-lifecycle semantics; the detector matches the consumption shapes against test boundaries
- **QA-PY-107** (unmeasured): the network-idle family's variants (QA-JV-107/QA-CS-107/QA-PY-107): networkidle waits are runner timing semantics; the detector matches the runner's wait tokens — exact keys
- **QA-SE-001** (unmeasured): the Selenium family's variants (QA-SE-001/002/003): the defect is the SEQUENCE sleep-then-interact — runner timing semantics, not a single node; the detector matches the sleep token followed by a lookup within the recorded window
- **QA-SE-002** (unmeasured): the Selenium family's variants (QA-SE-001/002/003): the defect is the SEQUENCE sleep-then-interact — runner timing semantics, not a single node; the detector matches the sleep token followed by a lookup within the recorded window
- **QA-SE-003** (unmeasured): the Selenium family's variants (QA-SE-001/002/003): the defect is the SEQUENCE sleep-then-interact — runner timing semantics, not a single node; the detector matches the sleep token followed by a lookup within the recorded window
- **QA-TEST-001** (60% FP at n=20): .only/focus is runner skip-scheduling state; the detector matches the runner's own member-call tokens (.only/.fit/fdescribe) on the code-only text — lexical precision equals the AST call-shape here, and the §13.2 fallback keeps parity
- **QA-TEST-002** (62% FP at n=21): skip/xfail/ignore are runner skip-state annotations whose forms are runner API tokens (it.skip, xit, t.skip, @unittest.skip); the detector matches those exact tokens on the code-only text
- **QA-TEST-003** (22% FP at n=78): assertion-less test bodies are runner-outcome semantics (the runner reports a pass that proves nothing); the detector matches the test-def plus body shapes on the code-only text
- **QA-TEST-004** (30% FP at n=20): hard-sleep is behavioral wait-shape matching (the wait call plus its interaction context), not a single node; the detector's pattern+wait-shape oracle is the recorded design (§12.1), and the hard-sleep family's structural path carries the depth where available
- **QA-TEST-006** (36% FP at n=11): retry abuse is the runner's retry contract (jest.retries, vitest retry, playwright retries); the detector matches the runner's retry API tokens across runners — each an exact key
- **QA-TEST-010** (58% FP at n=31): empty test bodies are runner-outcome semantics; the detector matches the test-def plus empty-body shapes on the code-only text — the AST body-shape is the same predicate
- **QA-TQUAL-002** (53% FP at n=32): tautological assertions (x === x, expect(true)) are assertion-semantics on the code-only text; the detector matches the tautology shapes after comment stripping — the AST call-shape is the same predicate
- **QA-TQUAL-009** (79% FP at n=14): un-awaited promise assertions are runner async semantics; the detector matches the assertion-call shapes inside promise chains on the code-only text — the async contract is runner behavior

### `shell-string-in-config` — config surface: the statements ARE string literals (shell in YAML) (1 rules)

- **QA-CI-002** (11% FP at n=18): exit-code swallowing lives inside workflow run: strings (shell scripts embedded in YAML); the YAML statement IS a string literal — a shell syntax tree of a YAML value adds parsing without adding classification power

### `string-content-defect` — the defect lives in string content (selector/URL) — outside AST semantics by design (7 rules)

- **QA-CS-106** (unmeasured): the brittle-selector family's variants (QA-JV-106/QA-CS-106/QA-PY-104): selector defects are string-argument shapes (xpath=/nth-child/absolute-path); the detector classifies the string shapes the code-text mask preserves for this class
- **QA-JV-106** (unmeasured): the brittle-selector family's variants (QA-JV-106/QA-CS-106/QA-PY-104): selector defects are string-argument shapes (xpath=/nth-child/absolute-path); the detector classifies the string shapes the code-text mask preserves for this class
- **QA-PW-004** (43% FP at n=14): brittle selectors ARE string arguments (css=/xpath=/nth-child shapes) — the code-text masking that protects other rules deliberately excludes string content here; the detector reads the string shapes directly (inside-string oracle)
- **QA-PW-123** (46% FP at n=11): hardcoded environment URLs are string literals (http(s):// shapes); the detector reads the string-content shapes the code-text mask preserves for exactly this defect class
- **QA-PW-146** (12% FP at n=17): CSS/XPath string selectors are string-argument shapes (css=/xpath= engines, bare id/class/attr CSS, nth-child); the detector classifies the string shapes directly
- **QA-PY-104** (unmeasured): the brittle-selector family's variants (QA-JV-106/QA-CS-106/QA-PY-104): selector defects are string-argument shapes (xpath=/nth-child/absolute-path); the detector classifies the string shapes the code-text mask preserves for this class
- **QA-PY-108** (unmeasured): the hardcoded-url family's variants (QA-JV-108/QA-CS-108/QA-PY-108): hardcoded URLs are string literals; the detector matches the http(s):// string shapes — the URL lives in the string, not the syntax tree

## Mutation-coverage status (P8.3 — zero UNCLASSIFIED cells)

- `not-applicable`: the defect class is mutation-unreachable —
  runner-enforced semantics (`.only` skip is enforced by the runner;
  no mutant of the test body changes the runner's skip decision) and
  config-key rules (the target is a workflow/config surface mutation
  tooling does not cover).
- `not-yet-measured`: code-level defect classes a mutation tool can
  in principle measure — no P5 mutation-evidence run has covered the
  registry yet. Honest until a real mutation report is ingested.
- `measured`: renders only after a mutation report is ingested via
  `mjolnir mutation` and cross-referenced (P5). Today: none.

| Rule         | Mutation coverage | Reason                                                        |
| ------------ | ----------------- | ------------------------------------------------------------- |
| QA-CI-001    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CI-002    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CI-005    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CI-007    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CI-008    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CI-009    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CI-010    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CS-101    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CS-102    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CS-103    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CS-104    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CS-105    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CS-106    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CS-107    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CS-109    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CYP-001   | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CYP-002   | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-CYP-003   | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-ENV-001   | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-JV-101    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-JV-102    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-JV-103    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-JV-104    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-JV-105    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-JV-106    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-JV-107    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-JV-109    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-002    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-003    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-004    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-101    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-102    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-104    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-113    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-115    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-116    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-117    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-121    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-122    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-123    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-124    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-125    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-140    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-141    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-142    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-143    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-144    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-146    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PW-147    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-001    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-002    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-003    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-004    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-005    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-007    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-009    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-011    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-012    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-101    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-102    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-103    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-104    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-105    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-106    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-107    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-PY-108    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-SE-001    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-SE-002    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-SE-003    | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-TEST-001  | not-applicable    | runner-enforced semantics (mutation-unreachable defect class) |
| QA-TEST-002  | not-applicable    | runner-enforced semantics (mutation-unreachable defect class) |
| QA-TEST-003  | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-TEST-004  | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-TEST-006  | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-TEST-010  | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-TQUAL-002 | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-TQUAL-009 | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |
| QA-TQUAL-011 | not-yet-measured  | no mutation-evidence run has covered this defect class yet    |

_Generated by `scripts/generate-depth-adjudication.ts` from the
registry — deterministic, no timestamps; the generated-docs-drift CI
job regenerates and fails on any diff._
