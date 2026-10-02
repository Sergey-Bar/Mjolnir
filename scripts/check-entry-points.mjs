#!/usr/bin/env node
/**
 * Two entry points, and a budget for each.
 *
 * 6.0 gave the repository two commands to run everything:
 *
 *   `npm run check`     — what a pull request has to pass. 12 leaves.
 *   `npm run certify`   — everything, before a release.
 *
 * The number is the point. The plan's own diagnosis of the previous state was
 * that a PR ran ~30 npm-level commands behind 31 gate ids, that a gate file
 * drifting was invisible for 24 hours because the gate-set check was
 * nightly-only, and that "the whole thing is one command" was true of four
 * different scripts at once. A promise nobody can count is a promise nobody
 * can keep, so this counts.
 *
 * WHAT IT CHECKS
 *
 *   1. Both entry points exist and run only scripts that exist. A chain that
 *      names a deleted script exits 2 with "missing script" and a maintainer
 *      reads that as a broken gate rather than a broken chain. (The
 *      `docs-consistency` gate reads this file's source and treats any
 *      runnable command in a comment as an instruction to a reader, so this
 *      paragraph names no command either.)
 *   2. `check` is at most CEILING terms long. Counted on the chain a
 *      maintainer reads, which is the number a person can hold.
 *   3. `certify` is a superset of `check`, transitively. The release path
 *      must not be narrower than the PR path — that ordering is the whole
 *      reason there are two entry points, and it decays without a gate because
 *      nobody notices until a release ships something a PR would have caught.
 *   4. Neither entry point reaches a WRITE-mode script. `npm run check` and
 *      `npm run certify` rewrite nothing; the write modes are in
 *      `docs/MANUAL-SCRIPTS.md` and invoked by hand.
 *
 * TWO NUMBERS, ON PURPOSE
 *
 * The ceiling is on the chain's own terms, and the report also prints the
 * transitive leaf count. Collapsing the latter to the former is the plan's
 * larger promise and it is NOT done: `check-version`, `gates:claim-integrity`
 * and `docs:regen` expand to roughly forty gates between them, so a 12-term
 * chain is still a 41-command wait.
 *
 * Both numbers are printed rather than one, because the cheap way to satisfy a
 * budget is to count the thing that is easy to count. An alias added to make
 * the leaf count smaller would make the chain shorter and the wait longer, and
 * the only way to see that is if the report says which number it is measuring.
 * The leaf count is debt, stated, not debt hidden behind the ceiling.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The PR budget, in leaf scripts.
 *
 * Twelve, not ten: build, typecheck and lint are three commands that cannot
 * be merged without losing the one thing a contributor needs from them — a
 * failing `lint` that says which file. The other nine are the ones that
 * actually guard the tree.
 */
const CEILING = 12;

const root = process.argv[2] ?? process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};

/** The script names a command string invokes, in source order. */
function references(command) {
  return [...command.matchAll(/\bnpm run ([a-zA-Z0-9:_-]+)/g)].map((m) => m[1]);
}

/**
 * Every script an entry point reaches, transitively.
 *
 * Cycles are impossible to write honestly (a chain that calls itself is a
 * hang) but trivial to write by accident during a rename, so `seen` doubles
 * as the loop guard rather than adding a check for something that would only
 * ever be a hang.
 */
function leaves(entry, seen = new Set()) {
  if (seen.has(entry)) return [];
  const path = new Set(seen);
  path.add(entry);
  const command = scripts[entry];
  if (command === undefined) return [entry];
  // A self-reference is a chain that calls itself (`build` does, to build
  // workspaces). It is a loop, not a dependency, and counting it as one would
  // count `build` twice for the price of one.
  const refs = references(command).filter((name) => name !== entry);
  // Nothing else to expand to: this IS the leaf. Returning the expansion
  // instead — which for a self-referencing script is empty — is how the first
  // version of this counted zero commands and reported PASS.
  if (refs.length === 0) return [entry];
  const out = [];
  for (const next of refs) out.push(...leaves(next, path));
  return out;
}

const problems = [];
const missing = new Set();

function entryPoint(name) {
  if (scripts[name] === undefined) {
    problems.push(`package.json has no "${name}" script`);
    return null;
  }
  return name;
}

const check = entryPoint("check");
const certify = entryPoint("certify");

let checkTerms = [];
let checkLeaves = [];
let certifyLeaves = [];

if (check !== null) {
  checkTerms = references(scripts[check]);
  checkLeaves = leaves(check);
  const absent = [...new Set(checkLeaves)].filter(
    (name) => scripts[name] === undefined,
  );
  for (const name of absent) missing.add(name);
  if (absent.length > 0) {
    problems.push(
      `\`npm run check\` reaches script(s) package.json does not define: ${absent.join(", ")}`,
    );
  } else if (checkTerms.length > CEILING) {
    problems.push(
      `\`npm run check\` is ${checkTerms.length} commands long, over the budget of ${CEILING}: ${checkTerms.join(", ")}`,
    );
  } else {
    // 6.0. A direct term that is ALSO reachable through another direct term
    // runs twice, and `check` shipped that way for three gates —
    // `scripts:reachable`, `check-cli-contract` and `check-detector-hashes`
    // were listed directly AND reached through `gates:claim-integrity`.
    //
    // It is the same defect this session removed from `gates/nightly.json`,
    // where two gate ids ran one command twice a night, except that this one
    // was invisible: the nightly duplicate check reads gate FILES, and nothing
    // read the shape of a chain. A contributor waits for it, so it is the most
    // expensive possible place to waste time.
    const inner = checkTerms.flatMap((term) =>
      scripts[term] === undefined
        ? []
        : references(scripts[term]).map((name) => ({ term, name })),
    );
    const doubled = checkTerms.filter((term) =>
      inner.some((edge) => edge.name === term && edge.term !== term),
    );
    if (doubled.length > 0) {
      problems.push(
        `\`npm run check\` runs ${doubled.join(", ")} twice — each is a direct ` +
          "term and is also reached through another direct term. A gate that " +
          "runs twice is a gate nobody can time",
      );
    }
  }
}

if (certify !== null && check !== null) {
  certifyLeaves = leaves(certify);
  const absent = certifyLeaves.filter((name) => scripts[name] === undefined);
  for (const name of absent) missing.add(name);
  if (absent.length > 0) {
    problems.push(
      `\`npm run certify\` reaches script(s) package.json does not define: ${absent.join(", ")}`,
    );
  } else {
    const certifySet = new Set(certifyLeaves);
    const notInRelease = [...new Set(checkLeaves)].filter(
      (name) => !certifySet.has(name),
    );
    if (notInRelease.length > 0) {
      problems.push(
        "`npm run certify` no longer reaches everything `npm run check` runs: " +
          `${notInRelease.join(", ")} — the release path must not be narrower ` +
          "than the PR path",
      );
    }
  }
}

/**
 * Write-mode scripts, by hand, because "does this rewrite files" is not a
 * property of the command string — `npm run docs:regen` runs twenty
 * generators and reads exactly like a read-only check.
 */
const WRITE_MODES = new Set([
  "version:surface:sync",
  "candidate:manifest:update",
  "ledger:write",
  "generate-carve-manifest",
  "docs:video:capture",
  "corpus:apply-verdicts",
  "fix",
  "docs:provenance-drift:fix",
  "claim:budget:init",
  "corpus:audit",
  "docs:video:render",
]);

/**
 * The one exemption, stated rather than folded into the rule above.
 *
 * `skip:budget:init` deletes `coverage/skip-budget.actual.jsonl`, which the
 * vitest run it precedes WRITES, under `coverage/` (untracked). It is run
 * setup: without it the reporter cannot tell a stale measurement from this
 * run's, and the skip-budget gate passes on the previous run's numbers.
 *
 * It is here rather than dropped from the check because "it only deletes an
 * untracked file this run is about to rewrite" is an argument, and arguments
 * are what this list is for.
 */
const WRITE_MODE_EXEMPT = new Set(["skip:budget:init"]);

for (const [entry, reached] of [
  ["check", checkLeaves],
  ["certify", certifyLeaves],
]) {
  if (reached === null || reached.length === 0) continue;
  const writers = [...new Set(reached)].filter(
    (name) => WRITE_MODES.has(name) && !WRITE_MODE_EXEMPT.has(name),
  );
  if (writers.length > 0) {
    problems.push(
      `\`npm run ${entry}\` runs write-mode script(s): ${writers.join(", ")}. ` +
        "An entry point that rewrites what it checks cannot check it.",
    );
  }
}

const report = {
  status: problems.length === 0 ? "PASS" : "FAIL",
  ceiling: CEILING,
  check: {
    // The number the ceiling applies to: the chain a maintainer reads.
    commands: checkTerms.length,
    // How many commands actually run. This is what a contributor waits for,
    // and it is not the same as either number above: three gates were listed
    // directly AND reachable through `gates:claim-integrity`, so the distinct
    // set never moved while the wait did. All three are printed for that
    // reason — a budget met by deduplicating looks identical to one met by
    // deleting, and only the executions column tells them apart.
    executions: checkLeaves.length,
    leafCommands: [...new Set(checkLeaves)].length,
    scripts: checkTerms,
  },
  certify: {
    leafCommands: [...new Set(certifyLeaves)].length,
  },
  missingScripts: [...missing],
  problems,
};

console.log(JSON.stringify(report, null, 2));
if (problems.length > 0) process.exit(1);
