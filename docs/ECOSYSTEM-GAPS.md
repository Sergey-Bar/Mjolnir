# QA Ecosystem Census — entries and field gaps

**Generated — do not edit by hand.** Regenerate: `npm run docs:ecosystem`.

The census is the authority on _what exists_ in the QA ecosystem (Law 8, ADR 0010).
A hand-edited list of frameworks, languages or providers is a documentation
defect by construction, so this file and `docs/ECOSYSTEM-CENSUS.json` are
projections of a versioned registry plus a discovery probe over the corpus.

## What this file is not

It is **not** a support claim. `maturity` is derived from evidence by
`deriveMaturityFromEvidence`, so a low number here is a real finding, not a
placeholder — and a number here is never a promise to a user. The user-facing
support statements are projections of the capability registry (ADR 0007).

## Census summary

- Registry entries: **33**
- Corpus repositories probed: **0**
- Observations matched to a census entry: **0**
- Observations classified as a QA tool the census has no entry for (`UNRECOGNIZED`): **0 distinct tools**
- Observations that are ordinary application dependencies, not ecosystem gaps: **0** (counted, not reported — see _Probe scope_ below)
- Maturity distribution: **M1** 24 · **M2** 9
- State distribution: SUPPORTED 14 · TARGET 19

### The honest read

Maturity is capped by what the machine can _prove_, not by what the engine can
_do_. The resolver returns `false` for every criterion that has no gate today:

- **No per-adapter fixture-quad gate.** Positive / negative / boundary /
  adversarial fixtures exist per _rule_, not per adapter, so `M3` cannot be
  granted to a framework. Wave 4 ships the gate.
- **No framework-level `detectorRev` lock.** The measurement sidecar locks the
  revision per _rule_; nothing binds a framework capability to it, so `M4`
  cannot be granted. Wave 4.
- **No field evidence.** `M5` requires `REMOTE_PROVEN`, which the zero-network
  default never produces. It is unreachable from inside the engine by design.

That is D1 working: _peak_ means maximum defensible proof, not feature count.

## Staleness demotions (ADR 0010 rule 3)

No `SUPPORTED` entry was demoted: either the corpus cache is absent, or every observed upstream major is in its adapter's validated set. An absent cache is **not** a clean result — `ecosystem:gaps` reports it as `BLOCKED`.

## Census entries

| Census id                              | Name                  | Category             | State     | Maturity | Adapter                                         | Blocks axes                            | Revisit trigger                                                                                                     |
| -------------------------------------- | --------------------- | -------------------- | --------- | -------- | ----------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| ec.api-contract-testing.bruno          | Bruno                 | api-contract-testing | TARGET    | M1       | —                                               | API QA, Discovery                      | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.api-contract-testing.karate         | Karate                | api-contract-testing | TARGET    | M1       | —                                               | API QA, Contract Coverage              | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.api-contract-testing.pact           | Pact                  | api-contract-testing | TARGET    | M1       | —                                               | API QA, Contract Quality               | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.api-contract-testing.postman-newman | Postman / Newman      | api-contract-testing | TARGET    | M1       | —                                               | API QA, Artifact Analysis              | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.api-contract-testing.rest-assured   | REST Assured          | api-contract-testing | TARGET    | M1       | —                                               | API QA, Contract Coverage              | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.bdd-spec-dsl.cucumber               | Cucumber              | bdd-spec-dsl         | TARGET    | M1       | —                                               | Discovery, Static Analysis             | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.bdd-spec-dsl.specflow               | SpecFlow              | bdd-spec-dsl         | TARGET    | M1       | —                                               | Discovery, Static Analysis             | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.ci-cd-provider.azure-pipelines      | azure-pipelines       | ci-cd-provider       | SUPPORTED | M2       | azure-pipelines,src/adapters/azure-pipelines.ts | CI Integrity, False-Green Detection    | CI-IR adapter no longer normalizes a azure-pipelines pipeline construct; census staleness trigger demotes SUPPORTED |
| ec.ci-cd-provider.github-actions       | github-actions        | ci-cd-provider       | SUPPORTED | M2       | github-actions,src/adapters/github-actions.ts   | CI Integrity, False-Green Detection    | CI-IR adapter no longer normalizes a github-actions pipeline construct; census staleness trigger demotes SUPPORTED  |
| ec.ci-cd-provider.gitlab-ci            | gitlab-ci             | ci-cd-provider       | SUPPORTED | M2       | src/adapters/gitlab-ci.ts                       | CI Integrity, False-Green Detection    | CI-IR adapter no longer normalizes a gitlab-ci pipeline construct; census staleness trigger demotes SUPPORTED       |
| ec.ci-cd-provider.jenkins              | jenkins               | ci-cd-provider       | SUPPORTED | M2       | jenkins,src/adapters/jenkins.ts                 | CI Integrity, False-Green Detection    | CI-IR adapter no longer normalizes a jenkins pipeline construct; census staleness trigger demotes SUPPORTED         |
| ec.component-e2e.cypress               | cypress               | component-e2e        | SUPPORTED | M2       | typescript                                      | Discovery                              | adapter no longer handles a major version in cypress; census staleness trigger demotes SUPPORTED                    |
| ec.component-e2e.playwright            | playwright            | component-e2e        | SUPPORTED | M2       | typescript                                      | Discovery                              | adapter no longer handles a major version in playwright; census staleness trigger demotes SUPPORTED                 |
| ec.component-e2e.playwright-components | Playwright Components | component-e2e        | TARGET    | M1       | —                                               | Component E2E                          | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.iac-container.kubernetes-manifests  | Kubernetes manifests  | iac-container        | TARGET    | M1       | —                                               | Infrastructure / Cloud / IaC           | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.iac-container.terraform             | Terraform             | iac-container        | TARGET    | M1       | —                                               | Infrastructure / Cloud / IaC           | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.load-performance.gatling            | Gatling               | load-performance     | TARGET    | M1       | —                                               | Performance QA                         | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.load-performance.k6                 | k6                    | load-performance     | TARGET    | M1       | —                                               | Performance QA                         | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.load-performance.locust             | Locust                | load-performance     | TARGET    | M1       | —                                               | Performance QA                         | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.test-framework.jest                 | jest                  | test-framework       | SUPPORTED | M2       | typescript                                      | Discovery                              | adapter no longer handles a major version in jest; census staleness trigger demotes SUPPORTED                       |
| ec.test-framework.junit                | junit                 | test-framework       | SUPPORTED | M1       | java                                            | Discovery                              | adapter no longer handles a major version in junit; census staleness trigger demotes SUPPORTED                      |
| ec.test-framework.nunit                | nunit                 | test-framework       | SUPPORTED | M1       | csharp                                          | Discovery                              | adapter no longer handles a major version in nunit; census staleness trigger demotes SUPPORTED                      |
| ec.test-framework.pytest               | pytest                | test-framework       | SUPPORTED | M2       | python                                          | Discovery                              | adapter no longer handles a major version in pytest; census staleness trigger demotes SUPPORTED                     |
| ec.test-framework.testcontainers       | Testcontainers        | test-framework       | TARGET    | M1       | —                                               | Database QA, Isolation                 | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.test-framework.testng               | testng                | test-framework       | SUPPORTED | M1       | java                                            | Discovery                              | adapter no longer handles a major version in testng; census staleness trigger demotes SUPPORTED                     |
| ec.test-framework.vitest               | vitest                | test-framework       | SUPPORTED | M2       | typescript                                      | Discovery                              | adapter no longer handles a major version in vitest; census staleness trigger demotes SUPPORTED                     |
| ec.test-framework.xunit                | xunit                 | test-framework       | SUPPORTED | M1       | csharp                                          | Discovery                              | adapter no longer handles a major version in xunit; census staleness trigger demotes SUPPORTED                      |
| ec.test-management.azure-test-plans    | Azure Test Plans      | test-management      | TARGET    | M1       | —                                               | Human / Manual Verification            | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.test-management.testrail            | TestRail              | test-management      | TARGET    | M1       | —                                               | Human / Manual Verification            | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.test-management.xray                | Xray                  | test-management      | TARGET    | M1       | —                                               | Human / Manual Verification            | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.test-management.zephyr              | Zephyr                | test-management      | TARGET    | M1       | —                                               | Human / Manual Verification            | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.test-runner.robot-framework         | Robot Framework       | test-runner          | TARGET    | M1       | —                                               | Discovery, Human / Manual Verification | census gap generator reports this entry in the field backlog; promote only with adapter + corpus proof              |
| ec.test-runner.selenium                | selenium              | test-runner          | SUPPORTED | M1       | typescript,python,java                          | Discovery                              | adapter no longer handles a major version in selenium; census staleness trigger demotes SUPPORTED                   |

## Field gap backlog (generated, ranked by field frequency)

The probe observed no tooling. That is **not** a clean result — an empty
observation usually means the corpus cache is absent, and an absent cache
must read as `UNKNOWN`, never as _nothing to support_. See the probe's
`nextLevelGap` below.

## `UNRECOGNIZED` findings — the honesty register

Tools the engine saw in a real repository that the census does not know.
**A new tool the engine sees in the wild and ignores is a release-blocking
honesty failure** (`ecosystem:gaps` gate), not a backlog item.

None observed in the probed corpus. Note the scope limit below before
reading that as a clean result.

## Probe scope and its own gaps

The probe reads **declared** tooling: manifests (`package.json`,
`pyproject.toml`, `pom.xml`, `build.gradle`, `go.mod`, `Cargo.toml`,
`Gemfile`, `composer.json`), CI workflow files and directories, and
infrastructure-as-code markers. It executes nothing.

What that means, stated rather than hidden:

- Tooling a repository uses **without declaring it** is invisible to the
  probe. A probe that silently under-reports is the same failure as a census
  that silently over-reports, so this limit is recorded here instead.
- A discovered name becomes a _finding_ only when it matches a census
  detection signal or a `CENSUS_NAME_PATTERNS` entry. Ordinary application
  dependencies are counted, never listed: a gap report with 4 000 rows of
  `react` and `lodash` is a report nobody reads, and a report nobody reads
  protects nothing.
- The corpus cache is a **local** checkout set. On a machine without it the
  probe walks zero repositories, and the gate reports that as `BLOCKED`, not
  as _nothing to support_.
- Frequency counts are per-repository presence, not usage volume.

## Orthogonality note (ADR 0011)

`state` (ecosystem coverage) and `maturity` (proof of our handling) are
independent axes and neither is derived from the other. The six axes are
declared once in `ORTHOGONAL_AXES` and no renderer may merge them:

- **trustLevel** — How much do we trust this finding? (src/types.ts:106-117)
- **maturity** — How much has this capability been proven? (ADR 0001)
- **evidenceState** — Is this evidence current and admissible?
- **determination** — What is the verdict? (closed set, TRUST-CONSTITUTION §2)
- **lifecycle** — Where is this rule in its career?
- **severity** — How much does it matter? (technical severity stays separate)

## Gates

- `npm run ecosystem:census` — schema, ownership, states, staleness triggers.
- `npm run ecosystem:gaps` — no `UNRECOGNIZED` entry older than one corpus
  cycle without a recorded disposition in
  `docs/ECOSYSTEM-DISPOSITIONS.json`.
