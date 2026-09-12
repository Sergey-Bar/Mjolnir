/**
 * Generates tests/corpus/detector-hashes.json — the detector revision
 * integrity manifest (certification-audit Phase 3, D8v2/G4).
 *
 * Per registered rule: { logicHash, detectorRevision } where logicHash =
 * sha256(metadataJson ‖ moduleTokenStream) — see src/engine/detector-hash.ts
 * for the exact contract. Reproducible from a clean clone: the input is
 * the repository's own src/rules tree + the live registry (no build
 * artifacts, no timestamps, sorted keys, trailing newline).
 *
 * Regenerate with `npm run detector-hashes:update`. Two legitimate
 * resolutions when a rule's hash changed (G4/D17):
 *   (a) behavior may have changed → bump detectorRevision, re-measure,
 *       then regenerate the manifest;
 *   (b) behavior-neutral churn → regenerate the manifest only, and state
 *       behavior-neutrality in the PR body.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { RULES, RETIRED_RULE_IDS } from "../src/rules/index.js";
import {
  computeDetectorHashes,
  serializeManifest,
} from "../src/engine/detector-hash.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "tests", "corpus", "detector-hashes.json");

const manifest = computeDetectorHashes(RULES, join(ROOT, "src", "rules"), RETIRED_RULE_IDS);
writeFileSync(OUT, serializeManifest(manifest), "utf8");
console.log(
  `Wrote ${OUT} — ${Object.keys(manifest).length} rules hashed (metadata ‖ token stream, sha256).`,
);
