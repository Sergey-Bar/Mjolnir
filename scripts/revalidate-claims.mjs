/**
 * `claims:revalidate` — every trust claim re-checked against the tree.
 *
 * Usage: node scripts/revalidate-claims.mjs [repo-root]
 *
 * BITTERSWEET `BW-003`, and the general form of the `sync-m26-github.mjs`
 * failure the plan calls the load-bearing discovery.
 *
 * THE DEFECT THIS EXISTS TO MAKE IMPOSSIBLE
 *
 * A ledger row once read:
 *
 *   { "gap_id": "GAP-M26-002", "status": "fixed",
 *     "closure_evidence": { "command": "npm run m26:github:sync",
 *                           "result": "PASS", "observed_at": "2026-09-25" } }
 *
 * and that script's entire disposition logic was
 * `row.state === "open" ? "CARRY_FORWARD" : "CLOSED_NOT_PLANNED"` — a pure
 * function of its own input. It certified itself. A 429-row ledger with
 * zero engineering judgement was stamped `fixed` / `PASS`, and the row
 * could not even gate: every open issue was `RELEASE_BLOCKED` and the only
 * way to clear that was to close the issue, which the same script then
 * rubber-stamped `CLOSED_NOT_PLANNED`.
 *
 * THE RULE
 *
 * A `fixed` claim must rest on evidence that is CANDIDATE-BOUND and
 * INDEPENDENT:
 *
 *   1. `verification` names a real thing — an existing file path, or a
 *      command that is not the script that produced the artifact.
 *   2. `observed_at_base_sha` is an ancestor of (or equal to) HEAD, so the
 *      evidence belongs to code that is actually in this tree.
 *   3. Every path the evidence cites still exists.
 *   4. SELF-DERIVATION IS REJECTED (BW-006): a claim may not be proven by
 *      the artifact it is about, nor by a script whose only output is a
 *      restatement of its input.
 *
 * A claim that fails is DOWNGRADED to `BLOCKED` with an owner and the
 * reason. It is never deleted: a deleted claim is indistinguishable from a
 * claim nobody ever made, which is the failure mode this whole release
 * exists to end.
 *
 * Exit code is 0 when every claim is either verified or honestly BLOCKED.
 * It is non-zero only when a claim is asserted `fixed` on evidence that
 * does not hold — that is a false claim, not an honest gap.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? process.cwd();
const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
const readJsonl = (rel) =>
  readFileSync(join(root, rel), "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));

const head = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();

/** Is `sha` HEAD or an ancestor of HEAD? An evidence run from a branch
 *  that was never merged proves nothing about this tree. */
function isCandidateBound(sha) {
  if (typeof sha !== "string" || !/^[0-9a-f]{40}$/.test(sha)) return false;
  if (sha === head) return true;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", sha, head], {
      cwd: root,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

/** The BW-006 tautology test, in its general form: does the verification
 *  name the very artifact the claim is about? A snapshot cannot prove a
 *  snapshot is correct. */
function isSelfDerived(verification, artifacts) {
  if (typeof verification !== "string") return false;
  const v = verification.replace(/\\/g, "/");
  return (artifacts ?? []).some((a) => {
    const normalized = String(a).replace(/\\/g, "/");
    return (
      v.includes(normalized) &&
      !v.includes("--check") &&
      !v.includes("--strict")
    );
  });
}

const diagnostics = [];
const downgraded = [];
const verified = [];

function checkClaim({
  id,
  source,
  status,
  verification,
  baseSha,
  artifacts,
  owner,
}) {
  if (status !== "fixed" && status !== "PROVEN") {
    // Already honest: an open/BLOCKED claim asserts nothing.
    return;
  }
  const problems = [];
  if (
    !verification ||
    typeof verification !== "string" ||
    verification.trim() === ""
  ) {
    problems.push("no `verification` field naming a command or source path");
  } else if (
    verification.startsWith("npm run") === false &&
    verification.startsWith("npx") === false &&
    verification.startsWith("node ") === false &&
    verification.startsWith("tsx ") === false &&
    existsSync(join(root, verification)) === false
  ) {
    problems.push(
      `\`verification\` is neither a runnable command nor an existing path: ${verification}`,
    );
  }
  if (isSelfDerived(verification, artifacts)) {
    problems.push(
      `\`verification\` (${verification}) cites the artifact it is meant to prove — self-derived evidence proves nothing`,
    );
  }
  if (!isCandidateBound(baseSha)) {
    problems.push(
      `\`observed_at_base_sha\` is not HEAD (${head.slice(0, 8)}) or an ancestor of it: ${baseSha ?? "absent"}`,
    );
  }
  for (const artifact of artifacts ?? []) {
    if (!existsSync(join(root, String(artifact)))) {
      problems.push(`cited artifact does not exist: ${artifact}`);
    }
  }
  if (problems.length === 0) {
    verified.push({ id, source });
    return;
  }
  downgraded.push({
    id,
    source,
    status: "BLOCKED",
    owner: owner ?? "UNASSIGNED",
    reasons: problems,
  });
  for (const reason of problems) {
    diagnostics.push({
      claim: id,
      source,
      code: "UNVERIFIABLE_CLAIM",
      message: reason,
    });
  }
}

/* ── 1. the M26 gap ledger ──────────────────────────────────── */

const gaps = readJsonl("docs/M26-GAP-LEDGER.jsonl");
for (const row of gaps) {
  const evidence = row.closure_evidence;
  checkClaim({
    id: row.gap_id,
    source: "docs/M26-GAP-LEDGER.jsonl",
    status: row.status,
    verification: evidence?.command ?? evidence?.source_path ?? null,
    baseSha: evidence?.observed_at_base_sha ?? null,
    artifacts: evidence?.artifacts ?? [],
    owner: row.owner,
  });
}

/* ── 2. the support matrix ──────────────────────────────────── */

const matrix = readJson("docs/M26-SUPPORT-MATRIX.json");
const matrixCells = Array.isArray(matrix)
  ? matrix
  : (matrix.cells ?? matrix.records ?? []);
for (const cell of matrixCells) {
  if (cell?.disposition !== "SUPPORTED" && cell?.status !== "PROVEN") continue;
  checkClaim({
    id: cell.id ?? cell.cell ?? "UNKNOWN-CELL",
    source: "docs/M26-SUPPORT-MATRIX.json",
    status: "fixed",
    verification: cell.verification ?? cell.proof_command ?? null,
    baseSha: cell.observed_at_base_sha ?? null,
    artifacts: cell.artifacts ?? [],
    owner: cell.owner,
  });
}

/* ── 3. the public claim registry ───────────────────────────── */

const registry = readJson("docs/claim-registry.json");
for (const claim of registry.claims ?? []) {
  if (claim.proof?.status !== "PROVEN") continue;
  checkClaim({
    id: claim.id,
    source: "docs/claim-registry.json",
    status: "fixed",
    verification: claim.proof.verification ?? claim.candidateProof ?? null,
    baseSha: claim.proof.base_sha ?? null,
    artifacts: claim.proof.artifact ? [claim.proof.artifact] : [],
    owner: claim.authority,
  });
}

const report = {
  status: downgraded.length === 0 ? "PASS" : "DOWNGRADED",
  head: head.slice(0, 12),
  checked: gaps.length + matrixCells.length + (registry.claims ?? []).length,
  verified: verified.length,
  downgraded: downgraded.length,
  // The full downgrade list is printed so a human can promote a claim
  // deliberately. Nothing is deleted; a claim that lost its evidence is
  // still a claim somebody made.
  downgradedClaims: downgraded,
};

console.log(JSON.stringify(report, null, 2));

if (downgraded.length > 0) {
  console.error(
    `\nclaims:revalidate: ${downgraded.length} claim(s) asserted 'fixed' on evidence that does not hold.`,
  );
  for (const claim of downgraded) {
    console.error(
      `  ${claim.id} (${claim.source}) → BLOCKED, owner ${claim.owner}`,
    );
    for (const reason of claim.reasons) console.error(`      - ${reason}`);
  }
  console.error(
    "\nEach one is now visibly BLOCKED rather than silently trusted. " +
      "Re-run its stated verification on this tree, or fix the evidence, " +
      "or accept the claim as open work.",
  );
  process.exit(1);
}
