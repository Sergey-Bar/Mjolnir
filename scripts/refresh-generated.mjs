/**
 * Refresh every generated artifact, in the one order that converges.
 *
 * Several generators write TRACKED files, and `candidate-trust-manifest.json`
 * hashes the whole worktree. So the order is load-bearing: run the manifest
 * update before a generator and the manifest is stale the moment that
 * generator finishes, and `candidate:manifest:check` fails with a
 * `workingTreeSha256 drift` that looks like tampering.
 *
 * This hit repeatedly enough to be worth encoding. The rule:
 *
 *   1. content generators first (docs, diagrams, brand, translations)
 *   2. the manifest LAST, so it hashes the finished tree
 *   3. re-run the manifest check to prove convergence
 *
 * Usage: node scripts/refresh-generated.mjs [--check]
 *   --check  verify the tree is already converged; non-zero if not.
 */

import { spawnSync } from "node:child_process";

const CHECK_ONLY = process.argv.includes("--check");

/**
 * [label, npm script] pairs, in the order they must run.
 *
 * Only GENERATORS belong here. Read-only gates do not: `docs:roadmap:check`
 * reports BLOCKED while external validation is outstanding, which is the
 * correct state, and folding it in would make this script fail for a reason
 * that has nothing to do with generated files.
 */
const GENERATORS = [
  ["docs:blast-radius", "blast radius audit"],
  ["docs:readme-brand", "README brand assets"],
  ["docs:translations:sync", "README translation sync"],
  ["docs:translations", "translation staleness report"],
];

const POST_CHECKS = [
  ["version:surface:sync", "version surface"],
  [
    "candidate:manifest:update",
    "candidate manifest (LAST: it hashes the tree)",
  ],
];

/**
 * The generators write markdown and JSON that is not prettier-clean, and the
 * lint-staged hook reformats it on commit — so a plain `npm run lint` fails
 * the moment a generator has run.
 *
 * TWO passes, and the split is not cosmetic. `docs/**` and the READMEs are
 * part of the tree the manifest hashes, so they must be formatted BEFORE the
 * manifest update. The manifest itself is excluded from that hash (see
 * `pathsFromGit` in `scripts/candidate-manifest.mjs`), so formatting it
 * afterwards is safe and must happen after — otherwise lint would fail on the
 * one file the refresh just wrote.
 */
function format(label, patterns) {
  if (CHECK_ONLY) return true;
  const result = spawnSync("npx", ["prettier", "--write", ...patterns], {
    encoding: "utf8",
    windowsHide: true,
    shell: true,
  });
  const ok = (result.status ?? 1) === 0;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}`);
  return ok;
}

function run(label, script) {
  if (CHECK_ONLY && script !== "candidate:manifest:update") return true;
  const result = spawnSync("npm", ["run", "--silent", script], {
    encoding: "utf8",
    windowsHide: true,
    shell: true,
  });
  const status = result.status ?? 1;
  console.log(`${status === 0 ? "ok  " : "FAIL"}  ${label} (${script})`);
  if (status !== 0) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    if (output.length > 0)
      console.log(output.split("\n").slice(0, 12).join("\n"));
  }
  return status === 0;
}

let failed = false;
for (const [script, label] of GENERATORS) {
  if (!run(label, script)) failed = true;
}
if (
  !format("format generated markdown (before the tree hash)", [
    "README.*.md",
    "docs/**/*.md",
  ])
)
  failed = true;
for (const [script, label] of POST_CHECKS) {
  if (!run(label, script)) failed = true;
}
if (
  !format("format the candidate manifest (excluded from the tree hash)", [
    "candidate-trust-manifest.json",
  ])
)
  failed = true;

// Prove convergence rather than asserting it: a manifest update that does not
// converge is the failure this script exists to prevent, so it is checked.
if (!CHECK_ONLY) {
  const verify = spawnSync(
    "npm",
    ["run", "--silent", "candidate:manifest:check"],
    {
      encoding: "utf8",
      windowsHide: true,
      shell: true,
    },
  );
  const converged = (verify.status ?? 1) === 0;
  console.log(
    `${converged ? "ok  " : "FAIL"}  manifest converged (candidate:manifest:check)`,
  );
  if (!converged) {
    const output = `${verify.stdout ?? ""}${verify.stderr ?? ""}`.trim();
    if (output.length > 0)
      console.log(output.split("\n").slice(0, 8).join("\n"));
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
