/**
 * CI base-diff step for detector revision integrity (G4 check C).
 *
 * Diffs the PR branch's detector-hashes manifest against the BASE
 * branch's manifest per rule:
 *   - logicHash changed + detectorRevision identical → WARN annotation
 *     ("confirm behavior-neutrality or bump") — legitimate for
 *     behavior-neutral churn; a hard fail would manufacture the
 *     routine-bump culture G4 prohibits.
 *   - revision changes / added / removed rules are INFO (the doctor's
 *     blocking checks own the invariant; this step is review visibility).
 *   - a missing base manifest (first landing) is INFO, not a failure.
 *
 * Usage: tsx scripts/diff-detector-hashes.ts <base-manifest-path>
 * Exit codes: 0 always (WARN semantics), except usage errors (10) and
 * an unreadable HEAD manifest (1 — that one IS a hard failure: a broken
 * manifest must not slide through silently).
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  annotationFor,
  diffManifests,
  loadManifest,
  type DetectorHashManifest,
} from "../src/engine/detector-hash.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function usage(): never {
  console.error(
    "usage: tsx scripts/diff-detector-hashes.ts <path/to/base/detector-hashes.json>",
  );
  process.exit(10);
}

const baseArg = process.argv[2];
if (!baseArg || baseArg.startsWith("-")) usage();

const headPath = join(ROOT, "tests", "corpus", "detector-hashes.json");
const head: DetectorHashManifest = loadManifest(headPath); // throws → exit 1 (hard)

let base: DetectorHashManifest;
try {
  base = loadManifest(baseArg);
} catch {
  console.log(
    "INFO: no detector-hashes manifest on the base branch (first landing) — nothing to diff.",
  );
  process.exit(0);
}

const findings = diffManifests(base, head);
let warned = 0;
for (const f of findings) {
  const annotation = annotationFor(f);
  if (annotation) {
    console.log(annotation);
    warned++;
  } else {
    const label =
      f.kind === "revision-changed"
        ? "revision bumped (re-measurement expected per §07)"
        : f.kind === "added"
          ? "rule added to the registry"
          : "rule removed from the registry";
    console.log(`INFO: ${f.ruleId} — ${label}`);
  }
}
if (warned === 0) {
  console.log("detector-hashes base-diff: no WARN-level findings.");
} else {
  console.log(
    `detector-hashes base-diff: ${warned} WARN annotation(s) emitted — each needs a ` +
      `behavior-neutrality statement in the PR body or a revision bump.`,
  );
}
process.exit(0);
