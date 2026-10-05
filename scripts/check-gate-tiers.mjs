#!/usr/bin/env node

import { execFileSync } from "node:child_process";
/**
 * Gate tier declarations, and the subset relation between them.
 *
 * `scripts/check-ci-local-parity.mjs` answers one direction: for a hard-coded
 * list of commands, is there an active step that runs it? It never asks the
 * other question. Nothing in the repository could previously observe a gate
 * that runs on a pull request and nowhere else, which is the failure this
 * script exists to make visible: a check added high and forgotten low reads
 * as "the tiers are just different", and nobody notices until a release
 * ships without it.
 *
 * The three tiers are data (`gates/pr.json`, `gates/release.json`,
 * `gates/nightly.json`) rather than three more hard-coded arrays, because
 * the relation between them is the invariant and a relation cannot be
 * checked between two literals in a checker that has to be edited to
 * express it. A tier file is reviewable on its own; a third list inside a
 * 289-line script is not.
 *
 * The rule enforced is `pr ⊆ release ⊆ nightly`: every gate id in a tier
 * must appear in the next tier out. Nightly is the outermost tier because
 * it is the only one nobody waits on, so it is the only place a slow gate
 * can honestly live — and because a superset costs nothing, whereas a gate
 * that exists only in nightly is a gate a contributor can ship past.
 *
 * Each tier file also names the workflow its gates are expected to run in,
 * and each declared gate is checked to have an active step there. So a
 * declaration cannot drift away from the YAML either: adding a gate to
 * `gates/pr.json` without adding the CI step fails, and removing the step
 * fails.
 *
 * `workflows` is the AUTHORITATIVE list: a declared gate must have an active
 * step in one of those files. `alsoRunsIn` names further workflows that belong
 * to the tier but must not satisfy its gates — `pages.yml` builds the site, but
 * it triggers only on `site/**` pushes, so treating it as authoritative would
 * let a step removed from `ci.yml` keep passing on the strength of a workflow
 * that runs one day in twenty. Coverage over `workflows ∪ alsoRunsIn` is
 * exhaustive; gate-presence is not, and the split is the point.
 *
 * That coverage is the check that did not exist. Eight workflows ran gates
 * while being named by no tier at all, so the tier files claimed to be the
 * complete picture of what gates this repository and were wrong. A tier that
 * lists every gate and omits every workflow still reads as complete. Now a
 * workflow file must be claimed by some tier or exempted with a stated reason.
 *
 * The exemptions live in `scripts/lib/workflow-exemptions.mjs`, ONCE, together
 * with the workflows that run someone else's npm scripts. Those were two lists
 * of the same kind of fact with two workflows appearing in both under
 * different reasons, and no cross-check to say which was current — the response
 * to a duplication is not a second copy of it.
 *
 * What this deliberately does NOT do: it does not decide which gates ought
 * to exist. It proves the three declared sets are nested, that the
 * declarations match the workflows, and that no workflow is unaccounted for.
 * Choosing the contents is a reviewer's job, recorded in the tier file's own
 * `description`.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { parse } from "yaml";

import { EXEMPT_FROM_TIERS } from "./lib/workflow-exemptions.mjs";

/**
 * The tree to check.
 *
 * Defaults to the repository this file lives in, and accepts
 * `--root=<dir>` so a test can point it at a fixture tree. That argument is
 * not a convenience: the spec for this checker has to prove the checker can
 * FAIL, and the obvious way to do that — mutate a committed tier file, run
 * the checker, restore it — makes the test suite mutate the working tree
 * while a parallel worker is hashing it. That produced a spurious
 * `candidate-manifest: workingTreeSha256 drift` failure, which is exactly the
 * kind of cross-test interference this repository's other specs are written
 * to avoid. A checker that only reads its own repository cannot be tested for
 * failure against anything else.
 */
const DEFAULT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ROOT = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  return flag === undefined
    ? DEFAULT_ROOT
    : resolve(flag.slice("--root=".length));
})();
const TIER_DIR = join(ROOT, "gates");

/** Innermost first. The chain is `tiers[i] ⊆ tiers[i + 1]`. */
const TIERS = ["pr", "release", "nightly"];

const failures = [];

function fail(message) {
  failures.push(message);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTier(tier) {
  const path = join(TIER_DIR, `${tier}.json`);
  if (!existsSync(path)) {
    fail(`gates/${tier}.json: missing`);
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(
      `gates/${tier}.json: invalid JSON (${error instanceof Error ? error.message : String(error)})`,
    );
    return null;
  }
  if (!isRecord(parsed)) {
    fail(`gates/${tier}.json: root is not an object`);
    return null;
  }
  if (parsed.schemaVersion !== 1) {
    fail(
      `gates/${tier}.json: schemaVersion must be 1, got ${parsed.schemaVersion}`,
    );
  }
  if (parsed.tier !== tier) {
    fail(
      `gates/${tier}.json: tier field is ${JSON.stringify(parsed.tier)}, expected "${tier}"`,
    );
  }
  if (typeof parsed.description !== "string" || !parsed.description.trim()) {
    fail(
      `gates/${tier}.json: description is required — it is the record of why these gates are in this tier`,
    );
  }
  if (!Array.isArray(parsed.gates) || parsed.gates.length === 0) {
    fail(`gates/${tier}.json: gates must be a non-empty array`);
    return null;
  }
  for (const gate of parsed.gates) {
    if (
      !isRecord(gate) ||
      typeof gate.id !== "string" ||
      typeof gate.command !== "string"
    ) {
      fail(`gates/${tier}.json: every gate needs a string id and command`);
      return null;
    }
  }
  if (!Array.isArray(parsed.workflows) || parsed.workflows.length === 0) {
    fail(`gates/${tier}.json: workflows must be a non-empty array`);
    return null;
  }
  // `alsoRunsIn` is optional; it participates in workflow COVERAGE but never in
  // gate-presence. An id in it is existence- and parse-checked like any other
  // declaration, so a typo is a failure rather than a workflow that silently
  // stops being counted — and a path in both lists is a failure, because the
  // two mean opposite things.
  if (parsed.alsoRunsIn !== undefined) {
    if (!Array.isArray(parsed.alsoRunsIn)) {
      fail(`gates/${tier}.json: alsoRunsIn must be an array when present`);
      return null;
    }
    for (const path of parsed.alsoRunsIn) {
      if (typeof path !== "string") {
        fail(`gates/${tier}.json: every alsoRunsIn entry must be a string`);
        return null;
      }
      if (parsed.workflows.includes(path)) {
        fail(
          `gates/${tier}.json: "${path}" is in both workflows and alsoRunsIn — ` +
            "workflows is authoritative for gate-presence, so listing it twice makes the " +
            "distinction between them unreadable",
        );
      }
    }
  }
  return parsed;
}

const tiers = new Map();
for (const tier of TIERS) {
  const parsed = readTier(tier);
  if (parsed) tiers.set(tier, parsed);
}

/**
 * The subset relation.
 *
 * Compared on `id`, not on the command string: the same gate can be
 * invoked with a different argument or from a different script in each
 * tier (release shells out to `ci-local`, which chains the same steps), and
 * comparing strings would report that as a missing gate. `id` is the
 * identity; the command is one tier's spelling of it.
 */
for (let i = 0; i + 1 < TIERS.length; i += 1) {
  const inner = TIERS[i];
  const outer = TIERS[i + 1];
  const innerTier = tiers.get(inner);
  const outerTier = tiers.get(outer);
  if (!innerTier || !outerTier) continue;
  const outerIds = new Set(outerTier.gates.map((gate) => gate.id));
  const outerCommands = new Map(
    outerTier.gates.map((gate) => [gate.id, gate.command]),
  );
  for (const gate of innerTier.gates) {
    if (outerIds.has(gate.id)) continue;
    fail(
      `gates/${outer}.json: missing "${gate.id}" — ${inner} ⊆ ${outer} is violated, so a ` +
        `gate that runs on ${inner} would not run on ${outer}. Declare it with the ${outer} ` +
        `spelling of the command (the ${inner} one is ${JSON.stringify(gate.command)}).`,
    );
    continue;
  }
  // A shared id whose command changed between tiers is legal — release
  // legitimately re-spells a gate as part of a longer chain — but it must
  // be spelled *somewhere*. An id declared with an empty command is a
  // declaration that proves nothing.
  for (const [id, command] of outerCommands) {
    if (!command.trim())
      fail(`gates/${outer}.json: gate "${id}" has an empty command`);
  }
}

// A gate id declared twice in one tier is ambiguous: the second entry can
// disagree with the first and the relation check will read whichever it
// happens to see.
//
// A gate COMMAND declared twice in one tier is the same ambiguity wearing a
// different hat, and it is the one that survived. `gates/nightly.json` carried
// both `qa-ir-parity` and `gate:qa-ir-parity` (same command) and both
// `scripts-unimported` and `gate:unimported-modules` (same command) for a
// whole release: four gate ids, two checks, each run twice a night, and the
// nightly cost report reading double. The id check above cannot see it, which
// is why it is a second loop rather than a second clause in the first.
for (const [tier, parsed] of tiers) {
  const seenIds = new Set();
  const seenCommands = new Map();
  for (const gate of parsed.gates) {
    if (seenIds.has(gate.id)) {
      fail(`gates/${tier}.json: duplicate gate id "${gate.id}"`);
    }
    seenIds.add(gate.id);
    // Flags are part of what a gate runs: `corpus:audit` and
    // `corpus:audit --resample` are two different gates that share a command.
    // The key is the whole command string.
    const command = String(gate.command ?? "");
    const first = seenCommands.get(command);
    if (first !== undefined) {
      fail(
        `gates/${tier}.json: gates "${first}" and "${gate.id}" run the same ` +
          `command (${command}) under different ids — one of them is a second ` +
          "nightly run of the same check, and the nightly cost double-counts it",
      );
    }
    seenCommands.set(command, gate.id);
  }
}

/** Read the union of workflows any tier names, parsed once each.
 *
 * `alsoRunsIn` is included so an entry there is existence- and parse-checked
 * like any other declaration. Its commands are deliberately NOT consulted for
 * gate-presence below.
 */
const workflowPaths = new Set();
for (const parsed of tiers.values()) {
  for (const path of parsed.workflows ?? []) workflowPaths.add(path);
  for (const path of parsed.alsoRunsIn ?? []) workflowPaths.add(path);
}
const workflows = new Map();
for (const path of workflowPaths) {
  const absolute = join(ROOT, path);
  if (!existsSync(absolute)) {
    fail(`tier declaration names a workflow that does not exist: ${path}`);
    continue;
  }
  try {
    workflows.set(path, parse(readFileSync(absolute, "utf8")));
  } catch (error) {
    fail(
      `${path}: invalid YAML (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

/**
 * Does this workflow run `command`, directly or through an npm script chain?
 *
 * The release and nightly workflows do not inline `npm run typecheck`. They
 * run `npm run ci-local`, which chains `certify:ci`, which runs
 * `typecheck` and a dozen others. A checker that demanded a literal
 * `npm run typecheck` step would therefore report every chained gate as
 * missing — and the obvious "fix" would be to copy the steps into both
 * workflows, which is exactly the duplication the chains exist to prevent.
 *
 * So the question is reachability, not literal presence: does this workflow
 * invoke `command`, or invoke a script that (transitively) invokes it?
 * Reachability through the real script graph is the same question the tier
 * relation is asking, so answering it the same way in both places keeps one
 * notion of "this gate runs here".
 */
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const npmScripts = pkg.scripts ?? {};

/** Every `npm run X` a script's body chains to, transitively. */
function commandsIn(text) {
  const out = new Set();
  for (const match of text.matchAll(/\bnpm run ([\w:-]+)/g))
    out.add(`npm run ${match[1]}`);
  return out;
}

/** Memoised transitive closure of the commands one npm script executes. */
const scriptClosureCache = new Map();
function commandsRunBy(scriptName, seen = new Set()) {
  if (scriptClosureCache.has(scriptName))
    return scriptClosureCache.get(scriptName);
  const body = npmScripts[scriptName];
  const out = new Set();
  if (typeof body === "string" && !seen.has(scriptName)) {
    seen.add(scriptName);
    // The script's own body counts as a command: `certify:ci` runs
    // `npx vitest run tests/contract/`, and a tier is allowed to declare
    // that as a gate without the workflow inlining the invocation.
    for (const line of body.split(/&&|\n|;/)) {
      const trimmed = line.trim();
      if (trimmed) out.add(trimmed);
    }
    for (const command of commandsIn(body)) {
      out.add(command);
      const nested = /^npm run ([\w:-]+)$/.exec(command);
      if (nested)
        for (const deep of commandsRunBy(nested[1], seen)) out.add(deep);
    }
  }
  scriptClosureCache.set(scriptName, out);
  return out;
}

/**
 * Every command a workflow runs, as a list of invocable strings.
 *
 * Two shapes, because a workflow step is one of two things: a literal
 * command (`node tests/stress/soak.mjs`) or a script invocation that chains
 * (`npm run ci-local`). Both are recorded as strings, and a declared gate
 * matches if any of them contains it — so a gate is satisfied by a step that
 * runs `npm run <that gate> && npm run <something else>`, and by a script that
 * chains it transitively.
 *
 * (`tests/contract/docs-consistency.spec.ts` greps tracked source for literal
 * `npm run <script>` names package.json does not define, so the illustrative
 * second command above is deliberately described rather than spelled.)
 */
function commandsInWorkflow(workflow) {
  const out = new Set();
  if (!isRecord(workflow) || !isRecord(workflow.jobs)) return out;
  for (const job of Object.values(workflow.jobs)) {
    if (!isRecord(job)) continue;
    for (const step of job.steps ?? []) {
      if (!isRecord(step) || typeof step.run !== "string") continue;
      for (const line of step.run.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed) out.add(trimmed);
      }
      for (const command of commandsIn(step.run)) {
        out.add(command);
        const nested = /^npm run ([\w:-]+)$/.exec(command);
        if (nested) for (const deep of commandsRunBy(nested[1])) out.add(deep);
      }
    }
  }
  return out;
}

const workflowCommands = new Map();
for (const [path, workflow] of workflows) {
  workflowCommands.set(path, commandsInWorkflow(workflow));
}

for (const [tier, parsed] of tiers) {
  // What the tier's own AUTHORITATIVE workflows run, in total — the chain
  // means one workflow is enough to satisfy a gate, and a tier that names two
  // workflows is a tier whose gates are split. `alsoRunsIn` is excluded here
  // on purpose: it is coverage, not authority.
  const available = new Set();
  for (const path of parsed.workflows ?? []) {
    for (const command of workflowCommands.get(path) ?? [])
      available.add(command);
  }
  for (const gate of parsed.gates) {
    const satisfied = [...available].some(
      (candidate) =>
        candidate === gate.command || candidate.includes(gate.command),
    );
    if (satisfied) continue;
    fail(
      `gates/${tier}.json: gate "${gate.id}" declares ${JSON.stringify(gate.command)}, ` +
        `but no step in ${(parsed.workflows ?? []).join(", ")} runs it directly or through ` +
        `an npm script chain. A gate that is declared and never run is worse than one that ` +
        `is missing: the declaration reads as coverage.`,
    );
  }
}

/**
 * WORKFLOW COVERAGE — every workflow file is accounted for.
 *
 * The tier files were, until this check, a complete-looking inventory of what
 * gates this repository — while naming eight of twenty-one workflows. A tier
 * that lists every gate and omits every workflow still reads as complete, and
 * a reviewer auditing `gates/` had no way to know which files they were not
 * being shown.
 *
 * One-directional in the useful direction: a workflow must be named by some
 * tier (as `workflows` or `alsoRunsIn`) or carry a stated exemption. The
 * reverse is not enforced and cannot be — a workflow can be deleted, and a
 * deletion is not a defect. Exemptions come from
 * `scripts/lib/workflow-exemptions.mjs`, shared with the workflow-script check
 * so there is one list rather than two that can disagree.
 */
const WORKFLOW_DIR = join(ROOT, ".github", "workflows");
if (existsSync(WORKFLOW_DIR)) {
  const committed = new Set();
  for (const name of readdirSync(WORKFLOW_DIR)) {
    if (name.endsWith(".yml") || name.endsWith(".yaml")) {
      committed.add(`.github/workflows/${name}`);
    }
  }
  const claimed = new Set();
  for (const parsed of tiers.values()) {
    for (const path of parsed.workflows ?? []) claimed.add(path);
    for (const path of parsed.alsoRunsIn ?? []) claimed.add(path);
  }
  for (const path of committed) {
    if (claimed.has(path) && EXEMPT_FROM_TIERS.has(path)) {
      fail(
        `${path} is named by a gate tier AND exempted with a reason. The two ` +
          "mean opposite things — one says the workflow belongs to a tier, the " +
          "other says it does not — and `!claimed && !exempt` treats both as " +
          "accounted for, so the contradiction is invisible. Pick one: if it " +
          "belongs to a tier, drop the exemption; if it does not, drop the tier.",
      );
      continue;
    }
    if (claimed.has(path) || EXEMPT_FROM_TIERS.has(path)) continue;
    fail(
      `${path} runs in this repository but is named by no gate tier and carries no exemption. ` +
        "A workflow outside every tier is a workflow whose gates nobody reviews: it can be " +
        "deleted, or start running something new, without the tier files changing. Add it to " +
        "a tier's `workflows` (if its steps may satisfy that tier's gates) or `alsoRunsIn` " +
        "(if they must not), or record why it belongs to none in " +
        "scripts/lib/workflow-exemptions.mjs",
    );
  }
  for (const path of EXEMPT_FROM_TIERS.keys()) {
    if (committed.has(path)) continue;
    fail(
      `${path} is exempted but no longer exists. An exemption for a deleted file is a ` +
        "hole with a comment on it",
    );
  }
}

// Every declared gate must also RUN. See scripts/check-gate-commands.mjs for
// why this is not implied by the checks above.
{
  const { status, problems } = JSON.parse(
    execFileSync("node", ["scripts/check-gate-commands.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    }),
  );
  if (status !== "PASS") {
    for (const problem of problems)
      failures.push(`unrunnable gate — ${problem}`);
  }
}

if (failures.length > 0) {
  console.error("Gate tier check failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const summary = TIERS.map((tier) => ({
  tier,
  gates: tiers.get(tier).gates.length,
  workflows: tiers.get(tier).workflows.length,
  alsoRunsIn: (tiers.get(tier).alsoRunsIn ?? []).length,
}));
console.log(
  JSON.stringify(
    { status: "PASS", chain: "pr ⊆ release ⊆ nightly", tiers: summary },
    null,
    2,
  ),
);
