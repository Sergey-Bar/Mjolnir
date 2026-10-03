/**
 * `docs:external-evidence` — RETIRED. This script no longer checks anything.
 *
 * It reads this line because three documents still name the command:
 * `docs/adr/0013-the-core-ceiling-is-decided.md` (immutable once accepted, so
 * it keeps the sentence it was written with), `docs/PRODUCT-DECISIONS.md` D-9,
 * and `docs/RELEASE-PATH-RUNBOOK.md`. `check-cli-contract` fails on any
 * `npm run X` in a live document that resolves to nothing, so removing the npm
 * script outright would have traded a dead gate for three dangling references —
 * and a name that resolves to nothing is the same defect as one that resolves to
 * two things: the reader cannot tell which.
 *
 * So the name still resolves, and what it resolves to is the explanation. Exit
 * 0: this is not a failure, and a tombstone that exits non-zero would put every
 * release red for a decision that was already made.
 *
 * ## Why the checker was removed rather than repaired
 *
 * `scripts/check-external-evidence.ts` counted `- [ ]` boxes in
 * `docs/EXTERNAL-EVIDENCE-REQUEST.md` against `EXTERNAL_BOX_CEILING = 39`. The
 * 6.0 M26-M50 retirement deleted that document along with
 * `docs/M26-EXTERNAL-VALIDATION.json` and its schema, leaving a ceiling that was
 * a number about a file that no longer existed. It exited 2 with a setup error
 * and `npm run certify:integrity` could not complete.
 *
 * Three ways out, and all three were rejected:
 *
 *   1. Lower the ceiling to what survives. `docs/PRODUCT-DECISIONS.md` D-7 and
 *      `tests/corpus/verdicts/unclassified-ceiling.json` both exist to stop a
 *      recorded bound being moved to fit today's number.
 *   2. Re-create the request document. That resurrects retired scope.
 *   3. Point the ceiling at the runbook's `EXTERNAL_PENDING` rows. That changes
 *      what the check measures without recording that it changed.
 *
 * What settled it is D-9's own principle — *an unobtainable criterion is not a
 * criterion* — applied one level further: a gate whose input was deleted on
 * purpose is an unobtainable criterion wearing a ratchet's clothes, and a gate
 * that can never pass is worse than no gate, because it turns every release red
 * for a reason nobody can fix in a diff. That is how gates get switched off, and
 * then the six pending rows lose even the visibility they kept.
 *
 * The rows are the record. This tombstone is the signpost.
 *
 * Usage: tsx scripts/retired-external-evidence.ts
 * Exit codes: 0 — always. There is nothing left to check.
 */

console.log(
  [
    "docs:external-evidence is RETIRED and checks nothing.",
    "",
    "It counted external-evidence checkboxes in docs/EXTERNAL-EVIDENCE-REQUEST.md",
    "against a ceiling of 39. The 6.0 M26-M50 retirement deleted that document,",
    "so the gate could only ever exit 2 with a setup error, and",
    "`npm run certify:integrity` could not complete.",
    "",
    "The disposition is intact — see the EXTERNAL_PENDING rows in",
    "docs/RELEASE-PATH-RUNBOOK.md and D-9 in docs/PRODUCT-DECISIONS.md.",
    "What it no longer has is a mechanical counter. Re-homing the count onto the",
    "surviving rows is open work, and doing it by lowering the recorded ceiling is",
    "the change D-7 exists to prevent.",
  ].join("\n"),
);
