/**
 * Backlink gate for the version ladder.
 *
 * The M26 version of this file checked 25 trains' `dependsOn` edges and ~160
 * workstream backlinks and verified that every provisional artifact resolved —
 * 19 of which did not, for a release, because nothing was wired into any gate
 * tier that ran on a PR.
 *
 * What survives is the part that was actually right: a row that cites a path
 * must cite one that exists. The ladder has one such citation — the archived
 * program — and the point of checking it is that a retirement whose record is
 * missing is a silent deletion.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  assertPathsExist,
  type PathClaim,
} from "../../src/lib/path-existence.js";
import { validateRoadmap } from "./validate.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const root = process.argv[2] ?? process.cwd();
const document: unknown = parse(
  readFileSync(join(root, "docs/ROADMAP.yaml"), "utf8"),
);
const errors = [...validateRoadmap(document).errors];

if (isRecord(document) && isRecord(document.retiredProgram)) {
  const archive = document.retiredProgram.archive;
  if (typeof archive === "string") {
    const claims: PathClaim[] = [{ path: archive, citedBy: "retiredProgram" }];
    assertPathsExist(root, claims, (missing) => {
      errors.push(
        `retired program archive missing: ${missing.path} — the record of the ` +
          "25 trains is what makes this a retirement rather than a deletion",
      );
    });
  }
}

console.log(
  JSON.stringify(
    { status: errors.length === 0 ? "PASS" : "FAIL", errors },
    null,
    2,
  ),
);
if (errors.length > 0) process.exit(1);
