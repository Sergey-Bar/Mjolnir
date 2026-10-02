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
 *
 * THE ORDER IS TWO-LAYERED, and the layering is a dependency rather than a
 * preference.
 *
 *   1. `docs:regen` FIRST — the content chain everything below reads. The rule
 *      pages, the FP audit and the capability matrix are all inputs to the
 *      artifacts that follow, so regenerating one of those first and then
 *      `docs:regen` would overwrite it.
 *   2. `docs:v6-inventory` and `docs:registry` NEXT, and they cannot live in
 *      `docs:regen` at all: both are provenance-stamped, embedding a commit
 *      SHA, so a regenerating staleness gate would report a diff on every
 *      commit because the stamp is always the new HEAD. That is the same
 *      constraint as the coverage high-water mark — see
 *      `docs/PRODUCT-DECISIONS.md` D-5 and `scripts/check-provenance-artifacts.ts`.
 *   3. The remaining generators, then formatting, then the manifest LAST.
 *
 * 6.0 had a second orchestrator, `regen:ordered`, with a subset of this list
 * and no convergence proof — two sources of truth for the same ordering, which
 * is the defect this repository exists to remove. It was deleted rather than
 * merged: `refresh-generated.mjs` already ends by PROVING convergence, and a
 * duplicate that proves nothing is worse than no duplicate.
 *
 * The list is also the answer to a question no gate was asking. It ran
 * `docs:translations:sync` and `docs:translations` — two npm scripts the v6
 * positioning carve (#697) deleted along with the 20 translated READMEs — and
 * neither `npm run check` nor `scripts:reachable` could see it: the first never
 * runs this file, and the second answers the opposite question (is a script
 * reachable FROM a caller, not does every name here resolve). The refresh then
 * reported `FAIL` on both and exited non-zero, so the convergence tool was
 * broken in the one way that matters — it could not converge — and nothing said
 * so until someone ran it.
 *
 * That is why `npm run <name>` inside a `.mjs` is now checked the same way a
 * workflow step's is: `scripts/check-workflow-scripts.mjs` reads every
 * `npm run <name>` a repository script invokes and fails when `package.json`
 * does not define it. A name in this list that resolves to nothing is a
 * convergence tool that cannot converge.
 */
const GENERATORS = [
  ["docs:regen", "content chain (rules, FP audit, capability, counts)"],
  ["docs:v6-inventory", "V6 inventory (provenance-stamped)"],
  ["docs:registry", "capability registry (provenance-stamped)"],
  ["docs:blast-radius", "blast radius audit"],
  ["docs:readme-brand", "README brand assets"],
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
// `README.md`, not `README.*.md`: the 20 translated READMEs were deleted with
// the translation scripts in the v6 carve, so the glob matched nothing and
// prettier exited 2 — which this script reported as `FAIL` and turned into a
// non-zero exit, so a formatter with no files to format was indistinguishable
// from a formatter that could not format.
if (
  !format("format generated markdown (before the tree hash)", [
    "README.md",
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
