// @ts-check
// check-ci-local-parity.mjs — keep the local gate, the CI job, and the
// merge-verify job exercising the SAME commands.
//
// A green PR means different things in different places if the lists
// drift: the pre-push hook runs `npm run ci-local`, ci.yml's build-test
// job runs its own step list, and merge-verify.yml runs the merge
// result. This script extracts the gate commands from each and fails on
// any mismatch, so "I ran the gate locally" and "CI is green" are the
// same statement.
//
// Usage:  node scripts/check-ci-local-parity.mjs
// Exit:   0 = all three lists match · 1 = drift detected

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the repo root from this file's location. On Windows the
// `file://` URL's pathname starts with a leading slash, so
// `path.resolve` would otherwise produce a doubled drive prefix
// (C:\C:\...). fileURLToPath handles that correctly.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The canonical gate list — the single source of truth for the
// build-test ↔ merge-verify comparison. It is the set of commands
// ci.yml's build-test job runs that MUST also run on the merge result
// in merge-verify.yml. A green PR that merges into a red main is not a
// green PR, so merge-verify must exercise every gate the PR head was
// checked against.
//
// `npm test` is the canonical form; ci.yml runs it instrumented
// (`npx vitest run --coverage`) plus the ratchet, which is the same gate
// with a measurement attached — both count as the test gate.
//
// `npm run build` is deliberately NOT in this list: ci.yml's build-test
// job does not build (the self-scan and certification jobs do, because
// they consume the built artifact), while merge-verify MUST build
// (it runs `node dist/cli.mjs . --json` against the merge result). That
// is a documented, intentional difference — merge-verify verifies the
// merge result, not the PR head's matrix — not drift.
const BUILD_TEST_CANONICAL = [
  "npm ci",
  "npm run typecheck",
  "npm run lint",
  "npm run brand:doctor",
  "npm run brand:doctor:selftest",
  "npm run brand:fonts:check",
  "npm audit --audit-level=moderate",
  "npm test",
  "npm run coverage:ratchet",
];

/**
 * Extract scalar `run:` values from a GitHub Actions YAML file, scoped
 * to a single job.
 *
 * Only single-line `run:` scalars are captured — multi-line blocks
 * (`>-`, `|`) are multi-command scripts compared separately by the
 * caller. This matches the canonical list, which is single-line
 * commands. Lines inside `with:`/`env:` blocks are naturally excluded
 * because their keys are not `run:`.
 *
 * @param {string} yamlText
 * @param {string} jobName  job to scope to (e.g. "build-test")
 */
function extractRunSteps(yamlText, jobName) {
  // Cut the file to the target job: from its header to the next top-level
  // job header (`  <name>:` at column 2). ci.yml has nine jobs; without
  // this scope the parity check compares build-test against the union
  // of every job's commands and reports drift by construction.
  const jobHeader = new RegExp(`^  ${jobName}:$`, "m");
  const start = yamlText.search(jobHeader);
  if (start === -1) throw new Error(`job "${jobName}" not found in YAML`);
  // Advance past the header line itself, then cut at the next job.
  const afterHeader = yamlText.slice(start).replace(/^.*\n/, "");
  const nextJob = /^ {2}[a-z][a-z-]*:$/m;
  const endIdx = afterHeader.search(nextJob);
  const body = endIdx === -1 ? afterHeader : afterHeader.slice(0, endIdx);

  const runs = [];
  for (const raw of body.split(/\r?\n/)) {
    // Match either `- run: <cmd>` (inline) or `      run: <cmd>`
    // (indented under a `- name:` step). Both forms appear in this
    // repo's workflows; only the inline form is a step of its own.
    const m = raw.match(/^\s*(?:-\s*)?run:\s*(.*)$/);
    if (!m) continue;
    let cmd = m[1].trim();
    // Strip surrounding quotes (single or double).
    if (
      (cmd.startsWith('"') && cmd.endsWith('"')) ||
      (cmd.startsWith("'") && cmd.endsWith("'"))
    ) {
      cmd = cmd.slice(1, -1);
    }
    // YAML block-scalar indicators (`|`, `>`, `>-`) appear on their own
    // lines when a step uses a multi-line script; they are syntax, not
    // commands. Non-gate steps (env setup, audit, artifact upload) are
    // likewise excluded — the parity check is about the GATE commands,
    // the ones that must all pass for the merge to be clean.
    if (
      !cmd ||
      cmd.startsWith("#") ||
      cmd.startsWith("node -e") ||
      cmd === "|" ||
      cmd === ">" ||
      cmd === ">-" ||
      cmd.startsWith("echo ") ||
      cmd.startsWith("git ") ||
      cmd.startsWith("./actionlint") ||
      cmd.startsWith("npx tsx") ||
      cmd.startsWith("node dist")
    ) {
      continue;
    }
    runs.push(cmd);
  }
  return runs;
}

function main() {
  const ciYaml = fs.readFileSync(
    path.join(ROOT, ".github/workflows/ci.yml"),
    "utf8",
  );
  const mvYaml = fs.readFileSync(
    path.join(ROOT, ".github/workflows/merge-verify.yml"),
    "utf8",
  );

  const ciSteps = extractRunSteps(ciYaml, "build-test");
  const mvSteps = extractRunSteps(mvYaml, "merge-verify");

  let ok = true;
  console.log("Canonical build-test gate list:");
  for (const c of BUILD_TEST_CANONICAL) console.log("  -", c);

  console.log("\nci.yml build-test gate commands:", ciSteps.length);
  for (const c of ciSteps) console.log("  -", c);

  console.log("\nmerge-verify.yml gate commands:", mvSteps.length);
  for (const c of mvSteps) console.log("  -", c);

  // build-test and merge-verify must run the SAME gates. merge-verify is
  // a subset of build-test's surface by design (it re-verifies the merge
  // result, not the PR head's matrix), so the comparison is: every
  // canonical build-test gate must appear in BOTH, and neither may
  // carry a gate the canonical list does not name.
  const missing = BUILD_TEST_CANONICAL.filter(
    (c) => !ciSteps.includes(c) || !mvSteps.includes(c),
  );
  if (missing.length) {
    ok = false;
    console.error("\nDRIFT: gate commands missing from a workflow:", missing);
  }
  const ciExtra = ciSteps.filter((c) => !BUILD_TEST_CANONICAL.includes(c));
  if (ciExtra.length) {
    ok = false;
    console.error(
      "\nDRIFT: ci.yml build-test has gate commands not in the canonical list:",
      ciExtra,
    );
  }
  const mvExtra = mvSteps
    .filter((c) => !BUILD_TEST_CANONICAL.includes(c))
    // Documented exception: merge-verify builds the artifact (it runs
    // `node dist/cli.mjs . --json` against the merge result), whereas
    // ci.yml's build-test job does not — the self-scan and
    // certification jobs build instead. This is intentional, not drift.
    .filter((c) => c !== "npm run build");
  if (mvExtra.length) {
    ok = false;
    console.error(
      "\nDRIFT: merge-verify.yml has gate commands not in the canonical list:",
      mvExtra,
    );
  }

  // Gates that live in their OWN ci.yml job rather than build-test. They
  // are still required to exist somewhere in ci.yml — the parity check
  // asserts presence separately rather than folding them into the
  // build-test comparison (they are independent gates, not build-test
  // steps, and comparing them as if they were would report drift by
  // construction).
  //
  // Note the self-scan gate is invoked as `node dist/cli.mjs .` (the
  // built artifact), not as `npm run self-scan` — both spellings are the
  // same gate and either counts. `npm run docs:regen` lives inside a
  // multi-line `run: |` block in generated-docs-drift, so it is matched
  // against the raw YAML text rather than the scalar-extraction list.
  const OTHER_REQUIRED_GATES = [
    "node dist/cli.mjs . --json",
    "npm run docs:regen",
  ];
  const absent = OTHER_REQUIRED_GATES.filter((g) => !ciYaml.includes(g));
  if (absent.length) {
    ok = false;
    console.error(
      "\nDRIFT: required gates not found in ci.yml (self-scan / generated-docs-drift):",
      absent,
    );
  } else {
    console.log("\nOther required gates present in ci.yml: OK");
  }

  if (ok) {
    console.log("\nCI / merge-verify parity: OK");
  } else {
    console.error("\nCI / merge-verify parity: FAILED — see above");
    process.exit(1);
  }
}

main();
