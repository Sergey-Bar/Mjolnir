# Mjölnir v6 — Wave 0 current-state inventory

**Generated — do not edit by hand.** Regenerate: `npm run docs:v6-inventory`.

Baseline commit `9c2bff39944c2e27b1f5fa6c6e9dc793dd995f56` · package version `4.0.0-rc.1` · published stable `3.0.0`.

This is the truth baseline v6 is built on. It is deliberately blunt: the
interesting part of a current-state inventory is what the product _cannot_
demonstrate, not what it contains.

## 1. The headline, stated as a negative

**No capability is advertised above the maturity the machine can prove.**

- The ecosystem census derives maturity from observed evidence only, and
  three of its criteria have no gate today, so **every** ecosystem entry is
  capped at **M2**. Distribution: **M1** 24 · **M2** 9.
- `M3 FIXTURE_VERIFIED` is unreachable for frameworks and adapters: there is
  no machine gate that verifies a positive/negative/boundary/adversarial
  fixture quad per capability (`GAP-V6-004`).
- `M4 CORPUS_VERIFIED` is unreachable: the measurement sidecar locks
  `detectorRev` per _rule_, and nothing binds a framework capability to it.
- `M5 FIELD_PROVEN` is unreachable **by construction**: it requires
  `REMOTE_PROVEN` external evidence, which the zero-network default never
  produces. That is D1 working, not a deficiency.

## 2. Repository facts

| Fact                            | Value                                                                                                                                   | Source                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Package version                 | `4.0.0-rc.1`                                                                                                                            | `package.json`                      |
| Published stable                | `3.0.0`                                                                                                                                 | `package.json`                      |
| Source files (`src/**.ts`)      | 324                                                                                                                                     | derived                             |
| Test specs (`tests/**.spec.ts`) | 641                                                                                                                                     | derived                             |
| Live rules                      | 79                                                                                                                                      | `src/rules/index.ts`                |
| Retired rule ids (preserved)    | 22                                                                                                                                      | `RETIRED_RULE_IDS`                  |
| Rules with a valid measurement  | 74                                                                                                                                      | `MEASURED_FP` + `detectorRev`       |
| Rule tiers                      | **core** 24 · **extended** 21 · **quarantine** 34                                                                                       | `effectiveTier`                     |
| Adapters                        | 11 (azure-pipelines, csharp, exit-code-integrity, github-actions, gitlab-ci, index, java, jenkins, python, typescript, workflow-bypass) | `src/adapters`                      |
| Commands                        | 44                                                                                                                                      | `src/commands`                      |
| Frameworks in the inventory     | 14                                                                                                                                      | `FRAMEWORK_INVENTORY`               |
| CI providers                    | 6                                                                                                                                       | `CI_PROVIDER_IDS`                   |
| QA domain records               | 13                                                                                                                                      | `QA_DOMAIN_RECORDS`                 |
| Gap-ledger records              | 17                                                                                                                                      | `docs/M26-GAP-LEDGER.jsonl`         |
| Support-matrix cells            | 136                                                                                                                                     | `docs/M26-SUPPORT-MATRIX.json`      |
| Issue dispositions              | 429                                                                                                                                     | `docs/M26-ISSUE-DISPOSITIONS.jsonl` |
| Open issues                     | 229                                                                                                                                     | same                                |
| External validation             | **BLOCKED**                                                                                                                             | `docs/M26-EXTERNAL-VALIDATION.json` |

### Largest source areas

- `src/rules/` — 88
- `src/engine/` — 55
- `src/commands/` — 44
- `src/forensics/` — 17
- `src/reporter/` — 15
- `src/adapters/` — 11
- `src/integrations/` — 11
- `src/discovery/` — 10
- `src/release/` — 7
- `src/frameworks/` — 6
- `src/mutation/` — 6
- `src/plugins/` — 6

### Ledgers

- Gap ledger: **fixed** 2 · **open** 15 · severities **high** 6 · **release-blocker** 11
- Open release-blocking gaps: **9** (GAP-M26-003, GAP-M26-004, GAP-M26-008, GAP-M26-009, GAP-M26-010, GAP-M26-012, GAP-M26-013, GAP-M26-015, GAP-M26-016)
- Support matrix: **BLOCKED** 44 · **NOT_APPLICABLE** 2 · **TESTED** 90 — **44 cells are explicitly BLOCKED**
- Issue dispositions: **CARRY_FORWARD** 229 · **CLOSED_NOT_PLANNED** 121 · **CLOSED_UNVERIFIED** 79

## 3. Vocabulary collisions found by this wave

These are not cosmetic. Each one is a place where two documents can say
different things about the same fact and both be internally consistent.

| #                      | Collision                                                               | Detail                                                                                                                                                                                                            | Record                       |
| ---------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `F0`–`F5`              | A **third** maturity ladder                                             | `FRAMEWORK_INVENTORY` declares its own maturity ladder alongside the finding trust level `L0`–`L5` and the v6 ladder `M0`–`M5`. The v6 blueprint only knew about `L`, so this collision was unrecorded until now. | `GAP-V6-001`, ADR 0001       |
| 3 support vocabularies | census states vs. framework `supportStatus` vs. rule `status`           | `SUPPORTED/TARGET/DEPRECATED/NOT_APPLICABLE/UNRECOGNIZED`, `OFFICIAL_FULL/…/UNSUPPORTED`, `MEASURED-CORE/…/UNMEASURED`. No single axis is authoritative.                                                          | `GAP-V6-002`, ADR 0007       |
| Naming vs. detection   | the census declared 'playwright'; the field installs '@playwright/test' | The tool the engine actually handles appeared in its own gap report as unrecognized. Fixed by declaring `upstreamPackages` as census data.                                                                        | `src/v6/ecosystem-census.ts` |

## 4. Client surfaces (D4: each has its own proof maturity)

| Surface      | State           | Note |
| ------------ | --------------- | ---- |
| cli          | **PRESENT**     |      |
| githubAction | **PRESENT**     |      |
| mcp          | **PRESENT**     |      |
| vscode       | **ABSENT**      |      |
| githubApp    | **ABSENT**      |      |
| dashboard    | **PROVISIONAL** |      |

Two surfaces are absent and must not be advertised at any maturity.

## 5. Requirement classification (§100)

113 spec sections classified from the repository, not from the spec's own description:

- **ALREADY_COMPLETE** — 37
- **BLOCKED** — 2
- **INCORRECT** — 2
- **MISSING** — 38
- **PARTIALLY_COMPLETE** — 34

| Spec § | Area                       | State                  | Wave | Evidence                                                                            | Note                                                                                                             |
| ------ | -------------------------- | ---------------------- | ---- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| §1     | Maturity model             | **INCORRECT**          | 1    | src/types.ts                                                                        | L0–L5 is the finding trust level; the spec reuses it for capability maturity. Amendment A1 / ADR 0001.           |
| §2     | Capability registry        | **MISSING**            | 1    | src/frameworks/framework-inventory.ts, src/rules/registry-census.ts                 | Parallel primitives exist; Amendment A7 / ADR 0007 forbids a second inventory.                                   |
| §3     | Domain coverage model      | **PARTIALLY_COMPLETE** | 1    | src/qa/domain-model.ts                                                              | 11 provisional domain records; the security domain is BLOCKED.                                                   |
| §4     | QA-IR                      | **PARTIALLY_COMPLETE** | 2    | src/adapters                                                                        | 11 adapter modules, no neutral IR.                                                                               |
| §5     | CI-IR                      | **PARTIALLY_COMPLETE** | 3    | src/frameworks/provider-capability-contract.ts, src/adapters/github-actions.ts      | CI adapters exist; no normalized CI model.                                                                       |
| §6     | Rule certification factory | **PARTIALLY_COMPLETE** | 4    | docs/FP-AUDIT.md, src/rules/measurement.ts, src/rules/measured-fp.generated.ts      | Corpus + FP audit exist; no precision/recall gate.                                                               |
| §7     | Anti-pattern encyclopedia  | **ALREADY_COMPLETE**   | 4    | docs/rules                                                                          | 101 rule pages across 12 families.                                                                               |
| §8     | Proof of absence           | **ALREADY_COMPLETE**   | 4    | tests/blast-radius/scope-and-exit.spec.ts                                           | Completeness accounting exists.                                                                                  |
| §9     | Evidence graph             | **ALREADY_COMPLETE**   | 5    | src/engine/runtime-evidence-graph.ts                                                | Provisional but present.                                                                                         |
| §10    | Evidence freshness         | **ALREADY_COMPLETE**   | 5    | src/engine/runtime-evidence-graph.ts                                                | Freshness binding exists.                                                                                        |
| §11    | Contradiction engine       | **PARTIALLY_COMPLETE** | 5    | tests/commands/artifact-integrity.spec.ts                                           | Input-conflict detection exists; no cross-source engine.                                                         |
| §12    | Mutation engine            | **MISSING**            | 6    | src/mutation/failure-sensitivity.ts                                                 | Contract only, non-gating.                                                                                       |
| §13    | Failure sensitivity        | **PARTIALLY_COMPLETE** | 6    | src/mutation/failure-sensitivity.ts                                                 | False-green rules exist; no explicit 5-stage model.                                                              |
| §14    | Test strength              | **PARTIALLY_COMPLETE** | 7    | src/rules/rule-metadata-schema.ts                                                   | No 22-dimension exposure.                                                                                        |
| §15    | False-green engine         | **ALREADY_COMPLETE**   | 6    | tests/false-green                                                                   | Flagship; 4 families already shipping.                                                                           |
| §16    | Trust diff                 | **ALREADY_COMPLETE**   | 7    | src/change-intelligence.ts                                                          | verify/diff/trend exist.                                                                                         |
| §17    | Impact analysis            | **ALREADY_COMPLETE**   | 7    | src/commands/impact.ts, docs/BLAST-RADIUS-AUDIT.md                                  | Blast radius is computed and audited; the residual gap is that it is per-rule, not per-capability.               |
| §18    | Gap detection              | **PARTIALLY_COMPLETE** | 7    | src/gaps/gap-registry.ts                                                            | Graph-based; anti-1:1 principle already held.                                                                    |
| §19    | Quality graph              | **MISSING**            | 8    | src/traceability                                                                    | Thin: 2 modules.                                                                                                 |
| §20    | Requirements traceability  | **MISSING**            | 8    | src/traceability                                                                    | No opt-in connectors.                                                                                            |
| §21    | Database QA                | **MISSING**            | 8    | —                                                                                   | No pack.                                                                                                         |
| §22    | API / Contract QA          | **MISSING**            | 8    | —                                                                                   | No pack.                                                                                                         |
| §23    | Mobile QA                  | **MISSING**            | 8    | —                                                                                   | No pack.                                                                                                         |
| §24    | Desktop QA                 | **MISSING**            | 8    | —                                                                                   | No pack.                                                                                                         |
| §25    | Embedded / IoT             | **MISSING**            | 8    | —                                                                                   | Extension domain by design.                                                                                      |
| §26    | Accessibility QA           | **PARTIALLY_COMPLETE** | 8    | src/qa/domain-model.ts                                                              | Automation coverage only; human-required axis absent.                                                            |
| §27    | Visual regression          | **PARTIALLY_COMPLETE** | 8    | docs/PLAYWRIGHT-CAPABILITIES.md                                                     | Snapshot rules exist; no baseline-freshness model.                                                               |
| §28    | Cross-browser / device     | **PARTIALLY_COMPLETE** | 8    | src/rules/index.ts                                                                  | Some rules retired for a false premise.                                                                          |
| §29    | i18n / RTL                 | **MISSING**            | 8    | —                                                                                   | No pack.                                                                                                         |
| §30    | Performance QA             | **MISSING**            | 8    | src/bench                                                                           | src/bench measures the tool, not load tests.                                                                     |
| §31    | Security verification QA   | **BLOCKED**            | 8    | docs/M26-SUPPORT-MATRIX.json                                                        | Requires external scanners; zero-network default.                                                                |
| §32    | AI / LLM QA                | **MISSING**            | 8    | src/agent                                                                           | src/agent is the agent surface, not LLM-app QA.                                                                  |
| §33    | Data / ETL QA              | **MISSING**            | 8    | —                                                                                   | No pack.                                                                                                         |
| §34    | Chaos / resilience QA      | **MISSING**            | 8    | —                                                                                   | No pack.                                                                                                         |
| §35    | Network / protocol QA      | **MISSING**            | 8    | —                                                                                   | No pack.                                                                                                         |
| §36    | Test data management       | **PARTIALLY_COMPLETE** | 9    | src/forensics/evidence-hygiene.ts                                                   | Hygiene checks exist; no data-lifecycle model.                                                                   |
| §37    | Environment integrity      | **PARTIALLY_COMPLETE** | 9    | src/config                                                                          | No cross-environment comparison.                                                                                 |
| §38    | Flake intelligence         | **ALREADY_COMPLETE**   | 9    | src/forensics                                                                       | 17 modules incl. pw-report and trend.                                                                            |
| §39    | Quarantine governance      | **ALREADY_COMPLETE**   | 9    | src/commands/quarantine.ts                                                          | Quarantine is a first-class governance surface with its own command.                                             |
| §40    | Artifact intelligence      | **ALREADY_COMPLETE**   | 9    | src/forensics, src/reporter/sarif.ts                                                | Artifact parsing and SARIF emission exist; the residual gap is report-format coverage, not artifact handling.    |
| §41    | Configuration intelligence | **ALREADY_COMPLETE**   | 9    | src/config, tests/config/config.spec.ts                                             | Config rules and a config spec suite exist.                                                                      |
| §42    | Coverage integrity         | **ALREADY_COMPLETE**   | 9    | src/engine/coverage-ingestion.ts, src/rules/ci/qa-ci-005-report-never-generated.ts  | Coverage is evidence, not truth.                                                                                 |
| §43    | Test selection integrity   | **PARTIALLY_COMPLETE** | 9    | src/scope                                                                           | Scope and selection logic exist, but selection completeness has no oracle to be verified against.                |
| §44    | Health scorecards          | **ALREADY_COMPLETE**   | 7    | src/scorer                                                                          | Aggregate conflicts with §94; Amendment A4 / ADR 0004.                                                           |
| §45    | Risk-based model           | **PARTIALLY_COMPLETE** | 7    | src/commands/impact.ts, src/traceability                                            | Impact-driven ordering exists; the risk model itself is not derived from corpus frequency.                       |
| §46    | Policy-as-code             | **ALREADY_COMPLETE**   | 9    | src/commands/policy.ts                                                              | Policy evaluation ships as a command.                                                                            |
| §47    | Baseline governance        | **ALREADY_COMPLETE**   | 9    | src/commands/baseline.ts                                                            | Baseline store, compare and gate exist.                                                                          |
| §48    | Suppression governance     | **ALREADY_COMPLETE**   | 9    | src/engine/suppression-governance.ts, src/engine/suppression-integrity.ts           | Suppression governance and suppression integrity are separate modules and both are gate-covered.                 |
| §49    | Rule conflict engine       | **PARTIALLY_COMPLETE** | 4    | src/rules/index.ts                                                                  | overlapWith survivor logic only.                                                                                 |
| §50    | Autofix safety             | **PARTIALLY_COMPLETE** | 9    | src/commands/fix.ts                                                                 | 3-tier safety undeclared.                                                                                        |
| §51    | Packs                      | **ALREADY_COMPLETE**   | 4    | src/frameworks/universal-pack-contract.ts                                           | Contracts exist; packs are the Wave 8 work.                                                                      |
| §52    | Monorepo intelligence      | **PARTIALLY_COMPLETE** | 4    | src/discovery/ecosystem-detection.ts                                                | Ecosystem and workspace detection exist; the map from workspace to capability coverage is not modelled.          |
| §53    | Incremental engine         | **PARTIALLY_COMPLETE** | 4    | src/engine/scan-cache.ts                                                            | Equivalence unproven.                                                                                            |
| §54    | AI challenger              | **MISSING**            | 7    | —                                                                                   | Advisory only, never a verdict override.                                                                         |
| §55    | MCP                        | **ALREADY_COMPLETE**   | 10   | src/mcp/server.ts                                                                   | 1:1 rule + catalog digest; Amendment A5 / ADR 0005.                                                              |
| §56    | VS Code / LSP              | **MISSING**            | 10   | —                                                                                   | New surface.                                                                                                     |
| §57    | GitHub Action              | **ALREADY_COMPLETE**   | 10   | action.yml                                                                          | Advisory-first default.                                                                                          |
| §58    | GitHub App                 | **MISSING**            | 10   | —                                                                                   | New surface.                                                                                                     |
| §59    | Dashboard                  | **PARTIALLY_COMPLETE** | 10   | src/commands/dashboard.ts                                                           | Local HTML only.                                                                                                 |
| §60    | Release readiness          | **ALREADY_COMPLETE**   | 14   | src/commands/release-report.ts, src/commands/release-trust.ts                       | Release report and release-trust both exist as commands.                                                         |
| §61    | Release evidence bundle    | **ALREADY_COMPLETE**   | 14   | candidate-trust-manifest.json                                                       | Not signed / not consumer-verifiable (P3).                                                                       |
| §62    | Defect learning loop       | **MISSING**            | 12   | —                                                                                   | Nothing converts an adjudicated verdict into a rule change; the verdict corpus is curated by hand.               |
| §63    | Production feedback        | **MISSING**            | 12   | —                                                                                   | Opt-in evidence, never proof.                                                                                    |
| §64    | Test economics             | **MISSING**            | 11   | src/bench                                                                           | src/bench measures the tool's own runtime, not the economics of a test suite.                                    |
| §65    | Historical forensics       | **ALREADY_COMPLETE**   | 11   | src/forensics                                                                       | 17 modules, including pw-report and trend.                                                                       |
| §66    | Quality debt               | **ALREADY_COMPLETE**   | 9    | src/commands/debt.ts                                                                | The debt register ships as a command.                                                                            |
| §67    | Ownership                  | **PARTIALLY_COMPLETE** | 9    | .github/CODEOWNERS                                                                  | Routing only, not blame.                                                                                         |
| §68    | Dedup / root cause         | **ALREADY_COMPLETE**   | 7    | src/engine/overlap-dedup.ts, src/engine/cross-file-analysis.ts                      | Overlap dedup and cross-file analysis both exist, so a duplicated finding is reduced to a root cause.            |
| §69    | Graph query layer          | **ALREADY_COMPLETE**   | 5    | src/engine/evidence-graph.ts                                                        | The evidence graph and its query path exist; the Wave-8 quality graph is a different graph over different nodes. |
| §70    | Cross-repo enterprise      | **BLOCKED**            | 10   | docs/RELEASE-TRAINS.md                                                              | Previously deferred past 5.0.                                                                                    |
| §71    | Custom rule SDK            | **ALREADY_COMPLETE**   | 11   | src/plugins/sdk-contract.ts                                                         | Custom rules start unproven.                                                                                     |
| §72    | Signed packs               | **MISSING**            | 11   | —                                                                                   | No pack signature or verification path exists, so a pack cannot be proven unaltered.                             |
| §73    | Plugin security            | **MISSING**            | 11   | docs/VERSIONING.md                                                                  | Full Node privileges, documented only (residual R4).                                                             |
| §74    | Privacy / deployment modes | **PARTIALLY_COMPLETE** | 10   | tests/adversarial                                                                   | Zero-network default exists; mode undeclared (A8 / ADR 0008).                                                    |
| §75    | Hosted governance          | **MISSING**            | 10   | —                                                                                   | No hosted governance surface exists, so no hosted control can be proven.                                         |
| §76    | Security review            | **PARTIALLY_COMPLETE** | 11   | tests/adversarial, tests/forensics/hostile-repo.spec.ts                             | Local covered; hosted/VS Code/App not.                                                                           |
| §77    | Versioned contracts        | **ALREADY_COMPLETE**   | 13   | docs/VERSIONING.md                                                                  | Additive-only.                                                                                                   |
| §78    | Exit codes                 | **INCORRECT**          | 13   | src/exit-codes.ts                                                                   | Frozen {0,1,2,10,20}; no UNSUPPORTED_ENVIRONMENT / INTERNAL_ERROR (A2 / ADR 0002).                               |
| §79    | doctor                     | **ALREADY_COMPLETE**   | 10   | src/commands/doctor.ts                                                              | doctor ships as a command with eight self-checks.                                                                |
| §80    | report                     | **ALREADY_COMPLETE**   | 10   | src/engine/command-registry.ts, src/commands/report-io.ts, src/reporter/terminal.ts | The command registry, the report I/O layer and the terminal reporter all exist.                                  |
| §81    | trust-report               | **ALREADY_COMPLETE**   | 10   | src/commands/trust-report.ts                                                        | trust-report ships as a command.                                                                                 |
| §82    | policy                     | **ALREADY_COMPLETE**   | 10   | src/commands/policy.ts                                                              | policy ships as a command.                                                                                       |
| §83    | Surface parity             | **PARTIALLY_COMPLETE** | 10   | scripts/check-ci-local-parity.mjs                                                   | CI↔local only.                                                                                                   |
| §84    | Framework matrix           | **PARTIALLY_COMPLETE** | 1    | docs/RULE-CAPABILITY-MATRIX.md                                                      | Generated; not a census projection yet.                                                                          |
| §85    | Language matrix            | **PARTIALLY_COMPLETE** | 1    | docs/M26-SUPPORT-MATRIX.json                                                        | 2 cells only.                                                                                                    |
| §86    | CI matrix                  | **PARTIALLY_COMPLETE** | 1    | docs/M26-SUPPORT-MATRIX.json                                                        | 4 cells only.                                                                                                    |
| §87    | Performance / scale proof  | **ALREADY_COMPLETE**   | 11   | src/bench, tests/stress                                                             | src/bench and tests/stress both cover scale; the gap is scale _proof_, not scale coverage.                       |
| §88    | Reliability SLOs           | **MISSING**            | 11   | —                                                                                   | Not a shipped artifact.                                                                                          |
| §89    | Reproducibility            | **PARTIALLY_COMPLETE** | 11   | src/engine/scan-cache.ts                                                            | Digest proven; byte-replay gate absent.                                                                          |
| §90    | Self-trust                 | **PARTIALLY_COMPLETE** | 14   | src/commands/doctor.ts                                                              | 8 checks + release-trust.                                                                                        |
| §91    | Documentation architecture | **ALREADY_COMPLETE**   | 13   | docs/rules                                                                          | Large and drift-prone.                                                                                           |
| §92    | Migration                  | **MISSING**            | 13   | docs/MIGRATION-3.0.0.md                                                             | No 6.0 path; A6 / ADR 0006 fixes the baseline.                                                                   |
| §93    | Backward compatibility     | **ALREADY_COMPLETE**   | 13   | docs/VERSIONING.md                                                                  | docs/VERSIONING.md publishes the additive-only contract.                                                         |
| §94    | No vanity metrics          | **PARTIALLY_COMPLETE** | 13   | docs/claim-registry.json                                                            | Registry covers 4 claims; prose is unlinted (P4).                                                                |
| §95    | Persona UX                 | **PARTIALLY_COMPLETE** | 10   | src/reporter                                                                        | No view layer.                                                                                                   |
| §96    | Onboarding                 | **ALREADY_COMPLETE**   | 10   | tests/e2e/journey-1-first-run.spec.ts                                               | A first-run journey test exists.                                                                                 |
| §97    | Severity model             | **ALREADY_COMPLETE**   | 4    | src/rules/rule.ts                                                                   | severity × tier × evidence × qaImpact.                                                                           |
| §98    | Release proof gate         | **ALREADY_COMPLETE**   | 14   | package.json                                                                        | Most gates exist.                                                                                                |
| §99    | Architecture freeze        | **MISSING**            | 14   | —                                                                                   | Definition only.                                                                                                 |
| §2.4.1 | QA Ecosystem Census        | **MISSING**            | 0    | —                                                                                   | Shipped in this wave: src/v6/ecosystem-census.ts + docs/ECOSYSTEM-CENSUS.json.                                   |
| Law 7  | E-HUMAN evidence class     | **MISSING**            | 8    | src/v6/capability-types.ts                                                          | Class + ceiling declared; the contract is Wave 8/9.                                                              |
| P1     | Independent verifier       | **MISSING**            | 11   | —                                                                                   | Sampled-subset re-derivation.                                                                                    |
| P2     | Nondeterminism manifest    | **MISSING**            | 11   | —                                                                                   | No manifest exists, so the tool cannot state which of its own outputs are deterministic.                         |
| P3     | Proof-carrying artifacts   | **PARTIALLY_COMPLETE** | 11   | candidate-trust-manifest.json                                                       | Unsigned.                                                                                                        |
| P4     | Claim budget / prose lint  | **MISSING**            | 0    | —                                                                                   | Shipped in this wave: scripts/v6/check-claims-prose.mjs + check-claim-budget.mjs.                                |
| P5     | FP/FN delta gate           | **MISSING**            | 4    | docs/FP-AUDIT.md                                                                    | A document, not a release signal.                                                                                |
| P6     | Degradation ledger         | **MISSING**            | 4    | —                                                                                   | No ledger records what degrades, so a degraded run is indistinguishable from a clean one.                        |
| U1     | Single Presentation Model  | **PARTIALLY_COMPLETE** | 10   | src/reporter/score-state.ts, src/reporter/evidence-tag.ts                           | Two decision sites exist; the model does not.                                                                    |
| U4     | No naked numbers           | **MISSING**            | 5    | src/reporter/evidence-tag.ts                                                        | 4 coarse values, no maturity/n/interval.                                                                         |
| E6     | Parse-once fact store      | **MISSING**            | 11   | src/types.ts                                                                        | Rules re-parse.                                                                                                  |
| L4     | Threshold registry         | **MISSING**            | 4    | src/reporter/score-state.ts                                                         | Documented 3× cross-surface drift, class not closed.                                                             |
| R1     | Self-falsification suite   | **MISSING**            | 11   | tests/fuzz, tests/stress                                                            | Fuzz/stress exist; targeted self-harm does not.                                                                  |
| R2     | Golden-output corpus       | **PARTIALLY_COMPLETE** | 14   | tests/golden                                                                        | Does not lock render + exit code + digest per scenario.                                                          |

### Citation verification

Every cited path in the classification resolves in this checkout.

## 6. Archive reconciliation

The `archive` block of `docs/ROADMAP.yaml` covers 108 historical design-record issues (M18–M25, GitHub #539–#646). Status: **UNRECONCILED**.

- Records reconciled: 1 of 8
- Records partially reconciled: 7
- **Issues inside the historical ranges that are still open: 18** (539, 546, 547, 551, 553, 556, 561, 565, 575, 588, 589, 590, 593, 594, 595, 597, 602, 617)
- Closure command: `npm run m26:github:sync`

The block **cannot** honestly be flipped to `RECONCILED` while those issues
are open. Flipping it would be a false proof produced by the very act meant
to establish the truth, so the gate records the open issues instead. See
`docs/V6-GAP-MATRIX.md` (`GAP-V6-005`) and `docs/V6-ARCHIVE-RECONCILIATION.json`.

## 7. The six orthogonal claim axes (ADR 0011)

None of these is derivable from another, and no renderer may merge them.

| Axis            | Fields                                | Vocabulary size | Question                                                     |
| --------------- | ------------------------------------- | --------------- | ------------------------------------------------------------ |
| `trustLevel`    | trustLevel                            | 6               | How much do we trust this finding? (src/types.ts:106-117)    |
| `maturity`      | maturity                              | 6               | How much has this capability been proven? (ADR 0001)         |
| `evidenceState` | evidenceState, state                  | 8               | Is this evidence current and admissible?                     |
| `determination` | determination, verdict                | 6               | What is the verdict? (closed set, TRUST-CONSTITUTION §2)     |
| `lifecycle`     | lifecycle, ruleStatus                 | 7               | Where is this rule in its career?                            |
| `severity`      | severity, trustImpact, policySeverity | 6               | How much does it matter? (technical severity stays separate) |

## 8. What this wave did not do, and will not pretend

- It did **not** make any gate green that was red before it. `m26:audit`
  and `docs:roadmap:check` are still red, for the same honest reasons:
  9 open release-blocking gaps, 44 BLOCKED matrix cells, and external validation still `BLOCKED`.
- It did **not** promote any capability. Promotion is a machine transition
  and no criterion for it is satisfied yet.
- It did **not** dispose of the 229 open issues. Dispositions are
  bookkeeping; they prove nothing about capability.

See `docs/V6-GAP-MATRIX.md` for what is missing and `docs/adr/README.md` for
the decisions that constrain how it may be built.
