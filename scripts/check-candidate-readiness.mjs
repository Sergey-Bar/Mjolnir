/**
 * Release readiness — the release stage of the one decision evaluator
 * (plan V5-005). Kept as its own script because the release workflows call it
 * by name; the rules live in scripts/lib/candidate-decision.mjs so the
 * working-candidate and release-candidate manifests cannot drift apart.
 *
 * A WORKING_CANDIDATE can never pass this gate. That is the point: engineering
 * readiness and release authorization are separate facts, and conflating them
 * is what let a working candidate look releasable.
 */

import { evaluateCandidateDecision } from "./lib/candidate-decision.mjs";
import { readCandidateManifest } from "./candidate-manifest.mjs";

const root = process.argv[2] ?? process.cwd();
const decision = evaluateCandidateDecision(
  readCandidateManifest(root),
  "release",
);

process.stdout.write(
  `${JSON.stringify({
    status: decision.status,
    determination: decision.determination,
    implementationStatus:
      decision.engineeringBlockers.length === 0
        ? "IMPLEMENTATION_READY_CANDIDATE_COMMIT_NOT_AUTHORIZED"
        : "IMPLEMENTATION_BLOCKED",
    softwareOnly: decision.softwareOnly,
    trustCertificationClaimed: false,
    blockers: decision.blockers,
    manifest: readCandidateManifest(root).manifestId,
  })}\n`,
);
if (decision.status === "BLOCKED") process.exitCode = 1;
