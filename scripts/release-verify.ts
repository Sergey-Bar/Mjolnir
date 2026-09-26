/**
 * `release:verify` — run EVERY release gate, then report them all.
 *
 * Usage: npm run release:verify
 *
 * THE DEFECT THIS FIXES
 *
 * `release:verify` was a `&&` chain of nine gates. `&&` short-circuits, and
 * the first gate that blocked was `m26:audit`, so an operator saw exactly one
 * blocker — "M26 audit is not PASS" — out of ten real ones, fixed it, re-ran,
 * and met the next. The project's own plan budgets for this ("Re-validating 17
 * ledger rows surfaces new breakage … Budget for it rather than discovering it
 * at GA"), and this is the release-path instance of it: the gate designed to
 * tell you what is between you and shipping tells you one thing at a time.
 *
 * This runs all nine regardless of outcome and prints the whole picture. It
 * reuses `decideRelease` rather than inventing a second release decision, and
 * it adds the four gates that chain ran but the decision never modelled
 * (coverage exemptions, enterprise threat model, candidate manifest, candidate
 * release decision) — each one a way the release can be wrong, and none of
 * them previously able to appear in a `NO_GO` reason.
 *
 * Exit code is non-zero when any gate is not PASS, so this stays a usable gate
 * in CI. It is not a substitute for `certify`, which is the build gate.
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { decideRelease } from "../src/release/decision.js";

type GateStatus = "PASS" | "BLOCKED" | "FAIL";

type Gate = {
  name: string;
  script: string;
  /** Gates whose non-zero exit means "honestly blocked", not "broken". */
  blocking: boolean;
};

const GATES: readonly Gate[] = [
  { name: "M26 audit", script: "m26:audit", blocking: true },
  { name: "version surface", script: "version:check", blocking: true },
  { name: "claim registry", script: "claims:check", blocking: true },
  {
    name: "candidate manifest",
    script: "candidate:manifest:check",
    blocking: true,
  },
  {
    name: "candidate release decision",
    script: "candidate:decision:release",
    blocking: true,
  },
  {
    name: "candidate readiness",
    script: "candidate:readiness",
    blocking: true,
  },
  {
    name: "coverage exemptions",
    script: "coverage:exemptions",
    blocking: true,
  },
  { name: "roadmap", script: "docs:roadmap:check", blocking: true },
  {
    name: "enterprise threat model",
    script: "enterprise:threat-model",
    blocking: true,
  },
];

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(script: string): { status: GateStatus; output: string } {
  const result = spawnSync(npm, ["run", "--silent", script], {
    encoding: "utf8",
    windowsHide: true,
    shell: process.platform === "win32",
    maxBuffer: 32 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status === 0) return { status: "PASS", output };
  // A gate that reports a structured `status` is being honest about being
  // blocked; one that does not is broken. The difference matters: "we cannot
  // release yet" is a state to work through, "the check is broken" is a bug.
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(output.slice(start, end + 1)) as {
        status?: string;
      };
      if (parsed.status === "PASS") return { status: "PASS", output };
      if (typeof parsed.status === "string") {
        return { status: "BLOCKED", output };
      }
    } catch {
      // Not JSON — fall through to FAIL.
    }
  }
  return { status: "FAIL", output };
}

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
  publishedStable?: string;
};

console.log("release:verify — running every gate, reporting every blocker\n");

const results = GATES.map((gate) => {
  const { status } = run(gate.script);
  const mark =
    status === "PASS" ? "PASS" : status === "BLOCKED" ? "BLOCK" : "FAIL";
  console.log(`  ${mark}  ${gate.name}  (${gate.script})`);
  return { gate, status };
});

const statusOf = (script: string): GateStatus =>
  results.find((r) => r.gate.script === script)?.status ?? "FAIL";

// The decision model is the existing one, unchanged. The four extra gates are
// surfaced in `blockers` here so the operator sees them, without teaching
// decideRelease a second vocabulary.
const decision = decideRelease({
  currentVersion: pkg.version,
  publishedVersion: pkg.publishedStable ?? pkg.version,
  candidateStatus: statusOf("candidate:readiness"),
  m26Status: statusOf("m26:audit"),
  versionStatus: statusOf("version:check") === "PASS" ? "PASS" : "FAIL",
  claimsStatus: statusOf("claims:check") === "PASS" ? "PASS" : "FAIL",
  roadmapStatus: statusOf("docs:roadmap:check") === "PASS" ? "PASS" : "FAIL",
});

const extraBlocked = results
  .filter(
    (r) =>
      r.status !== "PASS" &&
      ![
        "candidate:readiness",
        "m26:audit",
        "version:check",
        "claims:check",
        "docs:roadmap:check",
      ].includes(r.gate.script),
  )
  .map((r) => `${r.gate.name} is not PASS`);

const report = {
  status:
    decision.status === "GO" && extraBlocked.length === 0 ? "GO" : "NO_GO",
  version: decision.version,
  publishedVersion: pkg.publishedStable ?? null,
  gates: results.map((r) => ({
    gate: r.gate.name,
    script: r.gate.script,
    status: r.status,
  })),
  blocked: results.filter((r) => r.status !== "PASS").length,
  blockers: [...decision.blockers, ...extraBlocked],
  historicalVersionImmutable: decision.historicalVersionImmutable,
  releaseMutationAllowed: decision.releaseMutationAllowed,
};

console.log("");
console.log(JSON.stringify(report, null, 2));
console.log("");
if (report.blocked > 0) {
  console.log(
    `${report.blocked} of ${GATES.length} gates blocked. Every one is listed ` +
      `above — this reports the complete picture in one run, so a release can ` +
      `be worked through in a single pass.`,
  );
}

if (report.status !== "GO") process.exit(1);
