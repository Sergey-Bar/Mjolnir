# Mjölnir v6 — Wave 0 gap matrix

**Generated — do not edit by hand.** Regenerate: `npm run docs:v6-inventory`.

Baseline commit `933371fe224f3adb3c150e29c4de73ede3a7e00a`.

Two sources, one table. Rows marked **Wave 0** were found by this
inventory and were carried by no ledger before; rows marked **M26
ledger** are pre-existing open release-blockers, restated so the two
cannot be read as one number.

## Summary

- Wave 0 gaps found: **8**
- Open M26 release-blockers carried forward: **9**
- Support-matrix cells explicitly BLOCKED (not rows here, but the same class of truth): **44**
- Archive issues blocking reconciliation: **18**

## Gaps by target wave

### Wave 0

| Gap          | Severity   | Origin | Summary                                                                                                                                                                                                                                                          | Revalidation                                      |
| ------------ | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `GAP-V6-005` | **medium** | Wave 0 | The ROADMAP.yaml archive block cannot honestly reconcile: 14 of the 108 historical design-record issues (539–646) are still open, so 7 of 8 records are only partially reconciled and the block status must stay UNRECONCILED.                                   | `npx tsx scripts/v6/reconcile-archive.ts --check` |
| `GAP-V6-007` | **low**    | Wave 0 | PRODUCT-ENHANCEMENT-ANALYSIS.md (637 lines, repo root) self-reports all Wave 1/2/3 features as shipped and is referenced by no ledger, schema, script or CI gate, while the analysis that would verify it is itself deferred. A second, ungated source of truth. | `node scripts/v6/check-claims-prose.mjs`          |
| `GAP-V6-008` | **low**    | Wave 0 | QA/FINAL-RELEASE/ is a 10-file Cycle-0 audit pinned to RC 151186b (tag v0.5.18, 2026-09-07) and gated by nothing. Its verdict is NOT RELEASE READY for a 1.0.0 cut that no longer exists, and its findings F1–F4 are still open.                                 | `npx tsx scripts/v6/reconcile-archive.ts --check` |

### Wave 1

| Gap           | Severity            | Origin     | Summary                                                                                                                                                                                                                                                                                                                                            | Revalidation                                                                      |
| ------------- | ------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GAP-V6-001`  | **high**            | Wave 0     | A third maturity ladder exists: FRAMEWORK_INVENTORY declares F0–F5 alongside the finding trust level L0–L5, and the v6 ladder is M0–M5. Three ladders for two axes is the collision Amendment A1 was written to prevent, and the blueprint only knew about L.                                                                                      | `npx tsx scripts/v6/check-ecosystem.ts census`                                    |
| `GAP-V6-002`  | **high**            | Wave 0     | Three overlapping 'how well do we support this' vocabularies coexist: census states (SUPPORTED/TARGET/DEPRECATED/NOT_APPLICABLE/UNRECOGNIZED), framework supportStatus (OFFICIAL_FULL/OFFICIAL_PARTIAL/EXPERIMENTAL/DISCOVERED/UNSUPPORTED/DEGRADED/DEPRECATED), and rule status (MEASURED-CORE/MEASURED-EXTENDED/MEASURED-QUARANTINE/UNMEASURED). | `npx tsx scripts/v6/check-ecosystem.ts census`                                    |
| `GAP-V6-006`  | **medium**          | Wave 0     | Four claims are registered in docs/claim-registry.json and all four are proof.status BLOCKED because candidate-trust-manifest.json carries candidateSha: null. No public claim currently has bound proof, so §94's de-metrics is enforced by nothing.                                                                                              | `node scripts/check-claim-registry.mjs && node scripts/v6/check-claim-budget.mjs` |
| `GAP-M26-003` | **release-blocker** | M26 ledger | Carried from the M26 gap ledger; see `docs/M26-GAP-LEDGER.jsonl` for the full record.                                                                                                                                                                                                                                                              | `npm run m26:audit`                                                               |
| `GAP-M26-004` | **release-blocker** | M26 ledger | Carried from the M26 gap ledger; see `docs/M26-GAP-LEDGER.jsonl` for the full record.                                                                                                                                                                                                                                                              | `npm run m26:audit`                                                               |
| `GAP-M26-008` | **release-blocker** | M26 ledger | Carried from the M26 gap ledger; see `docs/M26-GAP-LEDGER.jsonl` for the full record.                                                                                                                                                                                                                                                              | `npm run m26:audit`                                                               |
| `GAP-M26-009` | **release-blocker** | M26 ledger | Carried from the M26 gap ledger; see `docs/M26-GAP-LEDGER.jsonl` for the full record.                                                                                                                                                                                                                                                              | `npm run m26:audit`                                                               |
| `GAP-M26-010` | **release-blocker** | M26 ledger | Carried from the M26 gap ledger; see `docs/M26-GAP-LEDGER.jsonl` for the full record.                                                                                                                                                                                                                                                              | `npm run m26:audit`                                                               |
| `GAP-M26-012` | **release-blocker** | M26 ledger | Carried from the M26 gap ledger; see `docs/M26-GAP-LEDGER.jsonl` for the full record.                                                                                                                                                                                                                                                              | `npm run m26:audit`                                                               |
| `GAP-M26-013` | **release-blocker** | M26 ledger | Carried from the M26 gap ledger; see `docs/M26-GAP-LEDGER.jsonl` for the full record.                                                                                                                                                                                                                                                              | `npm run m26:audit`                                                               |
| `GAP-M26-015` | **release-blocker** | M26 ledger | Carried from the M26 gap ledger; see `docs/M26-GAP-LEDGER.jsonl` for the full record.                                                                                                                                                                                                                                                              | `npm run m26:audit`                                                               |
| `GAP-M26-016` | **release-blocker** | M26 ledger | Carried from the M26 gap ledger; see `docs/M26-GAP-LEDGER.jsonl` for the full record.                                                                                                                                                                                                                                                              | `npm run m26:audit`                                                               |

### Wave 4

| Gap          | Severity   | Origin | Summary                                                                                                                                                                                                                                                                                                                         | Revalidation                                   |
| ------------ | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `GAP-V6-003` | **high**   | Wave 0 | The framework inventory's validated versions no longer cover what the corpus uses: the cypress adapter is validated against 13 while a corpus repository uses 16, and the vitest adapter against 1.6/2.0/2.1 while corpus repositories use 3.2.4, 3.2.6, 4.x and 5.0.0. Found by the census staleness trigger on its first run. | `npx tsx scripts/v6/ecosystem-census.ts`       |
| `GAP-V6-004` | **medium** | Wave 0 | No machine gate verifies a positive/negative/boundary/adversarial fixture quad per capability, so no framework or adapter can be promoted past M2. M3 is currently unreachable for every ecosystem entry.                                                                                                                       | `npx tsx scripts/v6/check-ecosystem.ts census` |

## Maturity impact of each Wave 0 gap

| Gap          | What the engine cannot demonstrate because of it                                         |
| ------------ | ---------------------------------------------------------------------------------------- |
| `GAP-V6-001` | M3 for every framework capability is unstateable until F is mapped or migrated           |
| `GAP-V6-002` | no capability can advertise a single support level until one vocabulary is authoritative |
| `GAP-V6-003` | cypress and vitest are demoted SUPPORTED → TARGET by the census                          |
| `GAP-V6-004` | census: 0 entries above M2                                                               |
| `GAP-V6-004` | capability: M3 unattainable for all frameworks and adapters                              |
| `GAP-V6-005` | migration model proof (§1.4) cannot claim the archive is reconciled                      |
| `GAP-V6-006` | P4 claim:budget: every public claim is unbound                                           |
| `GAP-V6-007` | claims:prose scope; a reader cannot tell it from an authority                            |
| `GAP-V6-008` | nothing; it is history, but an ungated one                                               |

## Requirements still missing or incorrect

The subset of §100 classifications that is not `ALREADY_COMPLETE`. This is
the actual scope of v6, and it is much larger than the wave list suggests.

| Spec § | Area                       | State                  | Wave |
| ------ | -------------------------- | ---------------------- | ---- |
| §1     | Maturity model             | **INCORRECT**          | 1    |
| §2     | Capability registry        | **MISSING**            | 1    |
| §3     | Domain coverage model      | **PARTIALLY_COMPLETE** | 1    |
| §4     | QA-IR                      | **PARTIALLY_COMPLETE** | 2    |
| §5     | CI-IR                      | **PARTIALLY_COMPLETE** | 3    |
| §6     | Rule certification factory | **PARTIALLY_COMPLETE** | 4    |
| §11    | Contradiction engine       | **PARTIALLY_COMPLETE** | 5    |
| §12    | Mutation engine            | **MISSING**            | 6    |
| §13    | Failure sensitivity        | **PARTIALLY_COMPLETE** | 6    |
| §14    | Test strength              | **PARTIALLY_COMPLETE** | 7    |
| §18    | Gap detection              | **PARTIALLY_COMPLETE** | 7    |
| §19    | Quality graph              | **MISSING**            | 8    |
| §20    | Requirements traceability  | **MISSING**            | 8    |
| §21    | Database QA                | **MISSING**            | 8    |
| §22    | API / Contract QA          | **MISSING**            | 8    |
| §23    | Mobile QA                  | **MISSING**            | 8    |
| §24    | Desktop QA                 | **MISSING**            | 8    |
| §25    | Embedded / IoT             | **MISSING**            | 8    |
| §26    | Accessibility QA           | **PARTIALLY_COMPLETE** | 8    |
| §27    | Visual regression          | **PARTIALLY_COMPLETE** | 8    |
| §28    | Cross-browser / device     | **PARTIALLY_COMPLETE** | 8    |
| §29    | i18n / RTL                 | **MISSING**            | 8    |
| §30    | Performance QA             | **MISSING**            | 8    |
| §31    | Security verification QA   | **BLOCKED**            | 8    |
| §32    | AI / LLM QA                | **MISSING**            | 8    |
| §33    | Data / ETL QA              | **MISSING**            | 8    |
| §34    | Chaos / resilience QA      | **MISSING**            | 8    |
| §35    | Network / protocol QA      | **MISSING**            | 8    |
| §36    | Test data management       | **PARTIALLY_COMPLETE** | 9    |
| §37    | Environment integrity      | **PARTIALLY_COMPLETE** | 9    |
| §43    | Test selection integrity   | **PARTIALLY_COMPLETE** | 9    |
| §45    | Risk-based model           | **PARTIALLY_COMPLETE** | 7    |
| §49    | Rule conflict engine       | **PARTIALLY_COMPLETE** | 4    |
| §50    | Autofix safety             | **PARTIALLY_COMPLETE** | 9    |
| §52    | Monorepo intelligence      | **PARTIALLY_COMPLETE** | 4    |
| §53    | Incremental engine         | **PARTIALLY_COMPLETE** | 4    |
| §54    | AI challenger              | **MISSING**            | 7    |
| §56    | VS Code / LSP              | **MISSING**            | 10   |
| §58    | GitHub App                 | **MISSING**            | 10   |
| §59    | Dashboard                  | **PARTIALLY_COMPLETE** | 10   |
| §62    | Defect learning loop       | **MISSING**            | 12   |
| §63    | Production feedback        | **MISSING**            | 12   |
| §64    | Test economics             | **MISSING**            | 11   |
| §67    | Ownership                  | **PARTIALLY_COMPLETE** | 9    |
| §70    | Cross-repo enterprise      | **BLOCKED**            | 10   |
| §72    | Signed packs               | **MISSING**            | 11   |
| §73    | Plugin security            | **MISSING**            | 11   |
| §74    | Privacy / deployment modes | **PARTIALLY_COMPLETE** | 10   |
| §75    | Hosted governance          | **MISSING**            | 10   |
| §76    | Security review            | **PARTIALLY_COMPLETE** | 11   |
| §78    | Exit codes                 | **INCORRECT**          | 13   |
| §83    | Surface parity             | **PARTIALLY_COMPLETE** | 10   |
| §84    | Framework matrix           | **PARTIALLY_COMPLETE** | 1    |
| §85    | Language matrix            | **PARTIALLY_COMPLETE** | 1    |
| §86    | CI matrix                  | **PARTIALLY_COMPLETE** | 1    |
| §88    | Reliability SLOs           | **MISSING**            | 11   |
| §89    | Reproducibility            | **PARTIALLY_COMPLETE** | 11   |
| §90    | Self-trust                 | **PARTIALLY_COMPLETE** | 14   |
| §92    | Migration                  | **MISSING**            | 13   |
| §94    | No vanity metrics          | **PARTIALLY_COMPLETE** | 13   |
| §95    | Persona UX                 | **PARTIALLY_COMPLETE** | 10   |
| §99    | Architecture freeze        | **MISSING**            | 14   |
| §2.4.1 | QA Ecosystem Census        | **MISSING**            | 0    |
| Law 7  | E-HUMAN evidence class     | **MISSING**            | 8    |
| P1     | Independent verifier       | **MISSING**            | 11   |
| P2     | Nondeterminism manifest    | **MISSING**            | 11   |
| P3     | Proof-carrying artifacts   | **PARTIALLY_COMPLETE** | 11   |
| P4     | Claim budget / prose lint  | **MISSING**            | 0    |
| P5     | FP/FN delta gate           | **MISSING**            | 4    |
| P6     | Degradation ledger         | **MISSING**            | 4    |
| U1     | Single Presentation Model  | **PARTIALLY_COMPLETE** | 10   |
| U4     | No naked numbers           | **MISSING**            | 5    |
| E6     | Parse-once fact store      | **MISSING**            | 11   |
| L4     | Threshold registry         | **MISSING**            | 4    |
| R1     | Self-falsification suite   | **MISSING**            | 11   |
| R2     | Golden-output corpus       | **PARTIALLY_COMPLETE** | 14   |

## What closes a gap here

A gap row is closed by **closure evidence**, not by an intention:

- a machine gate that passes and can be re-run (`revalidationCommand`),
- a recorded owner, so a regression has somewhere to go,
- a `revisitTrigger`, so a demotion is automatic rather than a memory.

A gap whose row lacks any of those three is not a tracked gap; it is a wish.
Every row in this file carries all three.
