/**
 * The release decision gate (plan V5-005 / V5-006).
 *
 * Usage:
 *   node scripts/check-candidate-decision.mjs --stage engineering [root]
 *   node scripts/check-candidate-decision.mjs --stage release [root]
 *
 * `engineering` is the certification gate: it fails on a contradictory
 * manifest or incomplete local evidence, and reports the release blockers so
 * they can never be invisible.
 *
 * `release` is the release gate: it additionally requires an authorized,
 * immutable candidate, completed external validation, and REMOTE_PROVEN
 * evidence for every required class. A WORKING_CANDIDATE can never pass it.
 */

import { decideForRoot } from "./lib/candidate-decision.mjs";

const args = process.argv.slice(2);
const stageIndex = args.findIndex((arg) => arg === "--stage");
const stage = stageIndex === -1 ? "engineering" : args[stageIndex + 1];
const positional = args.filter(
  (arg, index) => !arg.startsWith("--") && index !== stageIndex + 1,
);
const root = positional[0] ?? process.cwd();

let decision;
try {
  decision = decideForRoot(root, stage);
} catch (error) {
  console.error(`candidate-decision: ${error.message}`);
  process.exit(1);
}

console.log(
  JSON.stringify({
    stage: decision.stage,
    status: decision.status,
    determination: decision.determination,
    state: decision.state,
    candidateSha: decision.candidateSha,
    engineeringCertificationState: decision.engineeringCertificationState,
    releaseAuthorizationState: decision.releaseAuthorizationState,
    blockers: decision.blockers,
    unmet: decision.unmet,
    engineeringBlockers: decision.engineeringBlockers,
    releaseBlockers: decision.releaseBlockers,
  }),
);

if (decision.status === "READY") {
  if (stage === "engineering" && decision.releaseBlockers.length > 0) {
    console.error(
      `candidate-decision: engineering evidence is complete, but ${decision.releaseBlockers.length} release blocker(s) remain. Engineering certification is not release authorization.`,
    );
  }
  process.exit(0);
}

for (const problem of decision.contradictions) {
  console.error(`candidate-decision: contradiction: ${problem}`);
}
const label = decision.determination === "BLOCKED" ? "blocked" : "inconclusive";
console.error(
  `candidate-decision: ${stage} gate is ${label} — ${decision.unmet.length} unmet requirement(s).`,
);
process.exit(1);
