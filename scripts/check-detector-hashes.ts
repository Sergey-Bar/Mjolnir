/**
 * Detector revision integrity gate (G4 check C) — `check-detector-hashes`.
 *
 * Two modes, one script file, one npm name. The invariant the plan states
 * is "no script file has two npm names"; a second file would have been the
 * same check under a different file, which is the duplication this gate
 * exists to end.
 *
 *   (default)          STALENESS. Recomputes the manifest from the live
 *                      source tree and compares it, byte for byte, with
 *                      `tests/corpus/detector-hashes.json`. Drift exits 1
 *                      and names the fix. This is the arm that can gate: it
 *                      needs no branch, no credentials and no network.
 *
 *   --base <manifest>  REVIEW VISIBILITY, the CI base-diff. Diffs HEAD's
 *                      manifest against the base branch's per rule:
 *                        - logicHash changed + detectorRevision identical ->
 *                          WARN annotation ("confirm behavior-neutrality or
 *                          bump"). Legitimate for behavior-neutral churn; a
 *                          hard fail here would manufacture exactly the
 *                          routine-bump culture G4 prohibits.
 *                        - revision changes / added / removed rules are
 *                          INFO. The doctor's blocking checks own that
 *                          invariant; this arm is for the reviewer.
 *                        - a missing base manifest (first landing) is INFO.
 *
 * Exit codes: 0 = pass (or INFO/WARN-only base-diff), 1 = the committed
 * manifest disagrees with the source tree, or the HEAD manifest is
 * unreadable, 10 = usage error.
 *
 * Why the two live together: the base-diff alone is not a gate, and a
 * staleness check alone cannot tell a reviewer *which* rule moved. The plan
 * asks for `check-detector-hashes` to be the single name that a detector
 * change has to pass, and the single name a reviewer has to read.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { RULES, RETIRED_RULE_IDS } from "../src/rules/index.js";
import {
  annotationFor,
  computeDetectorHashes,
  diffManifests,
  loadManifest,
  serializeManifest,
  type DetectorHashManifest,
} from "../src/engine/detector-hash.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HEAD_MANIFEST = join(ROOT, "tests", "corpus", "detector-hashes.json");

function usage(): never {
  console.error(
    "usage: tsx scripts/check-detector-hashes.ts [--base <path/to/base/detector-hashes.json>]",
  );
  process.exit(10);
}

const baseFlag = process.argv.indexOf("--base");
const baseArg =
  baseFlag === -1 ? undefined : (process.argv[baseFlag + 1] ?? usage());
if (baseArg !== undefined && baseArg.startsWith("-")) usage();
if (baseFlag !== -1 && process.argv.length > baseFlag + 2) usage();

function staleness(): void {
  const current = computeDetectorHashes(
    RULES,
    join(ROOT, "src", "rules"),
    RETIRED_RULE_IDS,
  );
  const expected = serializeManifest(current);
  const actual = existsSync(HEAD_MANIFEST)
    ? readFileSync(HEAD_MANIFEST, "utf8")
    : null;
  if (actual === expected) {
    console.log(
      `check-detector-hashes: PASS — ${Object.keys(current).length} rules, ` +
        "manifest matches the source tree.",
    );
    return;
  }
  const committed: DetectorHashManifest =
    actual === null ? {} : loadManifest(HEAD_MANIFEST);
  const moved = [
    ...new Set([...Object.keys(committed), ...Object.keys(current)]),
  ]
    .sort()
    .filter((id) => {
      const c = committed[id];
      const n = current[id];
      if (c === undefined || n === undefined) return true;
      return c.logicHash !== n.logicHash;
    });
  console.error(
    "check-detector-hashes: FAIL — the committed manifest is stale.",
  );
  for (const id of moved) {
    const c = committed[id];
    const n = current[id];
    const change =
      c === undefined
        ? "added to the registry"
        : n === undefined
          ? "removed from the registry"
          : "source identity changed";
    console.error(`  - ${id}: ${change}`);
  }
  if (moved.length === 0) {
    console.error(
      "  - every rule id and hash agrees, so the committed file differs only in " +
        "serialization. Re-run the generator rather than hand-editing it.",
    );
  }
  console.error(
    "\nTwo legitimate resolutions (G4/D17):\n" +
      "  (a) behavior changed  -> bump detectorRevision, re-measure, regenerate;\n" +
      "  (b) behavior-neutral   -> regenerate and say so in the PR body.\n" +
      "Regenerate with: npm run detector-hashes:update",
  );
  process.exit(1);
}

/** The CI base-diff arm. WARN semantics: it annotates, it does not block. */
function baseDiff(path: string): never {
  const head: DetectorHashManifest = loadManifest(HEAD_MANIFEST); // throws -> exit 1
  let base: DetectorHashManifest;
  try {
    base = loadManifest(path);
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
  console.log(
    warned === 0
      ? "detector-hashes base-diff: no WARN-level findings."
      : `detector-hashes base-diff: ${warned} WARN annotation(s) emitted — each needs a ` +
          "behavior-neutrality statement in the PR body or a revision bump.",
  );
  process.exit(0);
}

if (baseArg !== undefined) baseDiff(baseArg);
staleness();
