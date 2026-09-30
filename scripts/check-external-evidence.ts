/**
 * `npm run docs:external-evidence` — the external-evidence disposition, and
 * the check that makes it falsifiable.
 *
 * `docs/EXTERNAL-EVIDENCE-REQUEST.md` carries 39 boxes, every one needing
 * something this repository cannot produce: a design partner's codebase,
 * another person's classification, CI minutes, an account. A release gate
 * that depends on those either blocks until somebody with the right
 * credentials has an afternoon — and then gets disabled — or is satisfied by
 * a person ticking a box, which is a gate that cannot fail.
 *
 * D-9 puts it in a third state: the evidence is named, the actor is named, the
 * box stays open, and the status is `EXTERNAL_PENDING` rather than `CLOSED`.
 * `docs/RELEASE-PATH-RUNBOOK.md` is the human half of this; this script is the
 * machine half.
 *
 * What makes the disposition falsifiable rather than a way to park work:
 *
 *   1. A checked box is an error. A box that was ticked and had its evidence
 *      attached belongs CLOSED with a link, not checked in this file.
 *   2. A NEW box is an error. The count is a ratchet: an external requirement
 *      that appears must come with a decision, and the decision is the
 *      runbook's table, not a checkbox.
 *   3. The count is printed on every run, so "39" is a number someone can
 *      watch fall rather than a phrase in a document.
 *
 * Usage: npx tsx scripts/check-external-evidence.ts
 * Exit codes: 0 = the disposition holds, 1 = it was violated, 2 = setup error.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const REQUEST = join(ROOT, "docs", "EXTERNAL-EVIDENCE-REQUEST.md");
const RUNBOOK = join(ROOT, "docs", "RELEASE-PATH-RUNBOOK.md");

/**
 * The count this bound holds.
 *
 * 39 is what the file holds today, so the first run passes.
 *
 * It is a BOUND, not a ratchet, and the distinction is the honest one. A
 * ratchet falls as work completes; this number CANNOT fall while every box is
 * open, because an open box is an open box — nothing here produces evidence
 * for another team's design-partner study. It may not RISE, and that is the
 * direction with teeth: a new external requirement has to come with a decision
 * and a row in `docs/RELEASE-PATH-RUNBOOK.md`, not with a checkbox.
 *
 * The first version called it a ratchet in three places, including a comment
 * explaining that "a box may leave by being satisfied with evidence attached".
 * None of that can happen: the one box that WAS satisfiable in-repo — the SBOM
 * entry — was found to be stale and closed, and the count went 39 → 39.
 */
const EXTERNAL_BOX_CEILING = 39;

interface Box {
  section: string;
  checked: boolean;
  text: string;
}

function parseBoxes(text: string): Box[] {
  const boxes: Box[] = [];
  let section = "(preamble)";
  for (const line of text.split("\n")) {
    const heading = /^#{1,3} (.+)$/.exec(line);
    if (heading) {
      section = heading[1] ?? section;
      continue;
    }
    const box = /^\s*- \[([ xX])\] (.+)$/.exec(line);
    if (box) {
      boxes.push({
        section,
        checked: (box[1] ?? " ") !== " ",
        text: box[2] ?? "",
      });
    }
  }
  return boxes;
}

function main(): void {
  for (const [label, path] of [
    ["evidence request", REQUEST],
    ["release-path runbook", RUNBOOK],
  ] as const) {
    if (!existsSync(path)) {
      console.error(`external evidence: missing ${label} (${path})`);
      process.exit(2);
    }
  }

  const boxes = parseBoxes(readFileSync(REQUEST, "utf8"));
  const failures: string[] = [];

  const checked = boxes.filter((b) => b.checked);
  if (checked.length > 0) {
    // A ticked box is a claim with no evidence attached, which is the exact
    // state D-9 refuses. The way to close one is to record the evidence where
    // a reviewer can read it and change the STATUS — the runbook's table has a
    // status column for exactly this.
    failures.push(
      `${checked.length} box(es) are ticked in the evidence request. A tick is a ` +
        "claim with no evidence attached, which is the state this disposition " +
        "exists to end. Attach the evidence and record it as CLOSED in " +
        "docs/RELEASE-PATH-RUNBOOK.md instead: " +
        checked
          .slice(0, 3)
          .map((b) => `"${b.text.slice(0, 48)}"`)
          .join(", "),
    );
  }

  if (boxes.length > EXTERNAL_BOX_CEILING) {
    failures.push(
      `the evidence request has ${boxes.length} boxes, above the ceiling of ${EXTERNAL_BOX_CEILING}. ` +
        "A new EXTERNAL requirement is a product decision — somebody agreed to be " +
        "accountable for it — so it belongs as a row in docs/RELEASE-PATH-RUNBOOK.md, " +
        "not as a checkbox that appears without a decision.",
    );
  }

  // The runbook must actually cover the external gaps it is standing in for.
  // A runbook that forgets the whole point is worse than none, because the
  // disposition points at it.
  const runbook = readFileSync(RUNBOOK, "utf8");
  for (const id of [
    "GAP-M26-004",
    "GAP-M26-009",
    "GAP-M26-010",
    "GAP-M26-012",
  ]) {
    if (!runbook.includes(id)) {
      failures.push(
        `docs/RELEASE-PATH-RUNBOOK.md does not mention ${id}, which it is the ` +
          "runbook for. A disposition that points at an incomplete document is " +
          "a way to close a gap without closing it",
      );
    }
  }
  if (!runbook.includes("EXTERNAL_PENDING")) {
    failures.push(
      "docs/RELEASE-PATH-RUNBOOK.md does not use the EXTERNAL_PENDING status. " +
        "The disposition is that these rows are pending, not closed, and the " +
        "runbook has to say so where a reader meets the table",
    );
  }

  if (failures.length > 0) {
    console.error("External-evidence disposition failed:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  const bySection = Object.fromEntries(
    [...new Set(boxes.map((b) => b.section))].map((section) => [
      section,
      boxes.filter((b) => b.section === section).length,
    ]),
  );
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        externalBoxes: boxes.length,
        ceiling: EXTERNAL_BOX_CEILING,
        direction: "may not rise",
        bySection,
        disposition: "EXTERNAL_PENDING — see docs/RELEASE-PATH-RUNBOOK.md",
      },
      null,
      2,
    ),
  );
}

main();
