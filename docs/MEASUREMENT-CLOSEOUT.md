# Measurement Closeout

> **Status: OPEN** — active rules must remain explicit about measurement and
> must not enter effective core without candidate-bound evidence.

## Current census

- Active rules: <!-- census:total -->79<!-- /census:total -->
- Measured rules: <!-- census:measured -->73<!-- /census:measured -->
- Unmeasured rules: <!-- census:unmeasured -->6<!-- /census:unmeasured -->
- Core rules: <!-- census:core -->2<!-- /census:core -->
- Retired historical IDs: **22**

The census counts and the `core` count are generated (`npm run rules:census`
is the live source; `npm run docs:counts` stamps the sentinels above).
`tests/contract/census-drift.spec.ts` fails if any of them disagrees with the
registry, so this block cannot go stale the way it did when it read 74/5.

## Measurement law

- A rule is measured only with at least 10 hand-classified corpus verdicts at
  its current `detectorRevision`.
- Partial scans are not evidence.
- An unmeasured rule may remain visible, but it is never an effective-core
  trust claim.
- A detector change invalidates the prior measurement until the new revision
  is remeasured.
- Retired IDs remain historical records and are never reused.

## Open measurement records

Six rules are unmeasured. Two of them are a different failure from the other
four, and the distinction is the whole closeout: `unmeasured` means no
verdicts were ever classified, while `stale` means a verdict set existed and
the detector then changed, so the prior measurement no longer describes the
shipped detector and cannot be spent on a promotion.

| Rule           | Disposition           | Required closeout                                                                                           |
| -------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `QA-TQUAL-009` | unmeasured/quarantine | Add at least 10 classified verdicts and human adjudication.                                                 |
| `QA-CI-013`    | unmeasured/quarantine | Validate the CI security boundary on pinned workflow fixtures.                                              |
| `QA-CI-014`    | unmeasured/quarantine | Validate the CI evidence boundary on adversarial workflows.                                                 |
| `QA-PW-147`    | unmeasured/quarantine | Reassess the rule's scope and collect evidence before any promotion.                                        |
| `QA-PY-004`    | **stale**/quarantine  | Detector moved to revision 4. Re-measure at revision 4 — the verdicts exist and do not apply.               |
| `QA-PY-007`    | **stale**/quarantine  | Detector moved to revision 5. Add Python Playwright corpus verdicts for the declared surface at revision 5. |

## Closeout loop

1. Sample only the affected unmeasured rules:
   `npx tsx scripts/corpus-sample.ts --unmeasured-only --repo <name>`.
2. Classify each row into `tests/corpus/verdicts/*.jsonl` with TP/FP/UNSURE
   and a review note.
3. Regenerate `npm run generate-fp-audit-table` and the rule documentation.
4. Run the registry ratchet, census drift, and focused rule fixtures.
5. Review the diff with the rule owner before changing tier or trust state.
6. Record the candidate SHA and evidence in the gap ledger before promotion.

## Current release consequence

The corpus regression gate is intentionally held for human review. It must
not be bypassed with an automatic baseline update. A release candidate with
any open `release-blocker` gap remains **NO-GO**.
