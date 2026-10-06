#!/usr/bin/env node
/**
 * Every npm script is reachable from a gate, or is declared manual.
 *
 * `package.json` carries ~130 scripts. Roughly half are reachable —
 * directly from a workflow step, or transitively through an npm script chain
 * such as `ci-local` → `certify:ci` → `typecheck`. The rest were reachable from
 * nothing: a gate written, wired to nothing, and left to rot. Nothing failed,
 * because an npm script that no workflow runs is indistinguishable from a
 * script that does not exist. The exact split is printed on every run rather
 * than stated here, because a prose number about a moving tree is a number
 * that goes stale and nothing notices.
 *
 * The two existing neighbours each answer half the question and neither
 * answers this one:
 *
 *   - `check-gate-tiers.mjs` asks whether a DECLARED gate has a step. It says
 *     nothing about scripts nobody declared.
 *   - `check-unimported-modules.mjs` asks whether a SCRIPT FILE is invoked.
 *     A script reachable only as a member of a chain — `certify` running
 *     `docs:translations` — looks orphaned to it by construction, so it
 *     cannot be the whole answer either.
 *
 * So reachability is computed here, the same way `check-gate-tiers.mjs`
 * computes it (a transitive closure over `npm run` chains) but from the other
 * end: start at every command a workflow step runs, walk outward, and report
 * what no path reaches.
 *
 * A script that is genuinely manual — a maintenance tool, a one-shot
 * fixture author, an interactive command — is declared in
 * `docs/MANUAL-SCRIPTS.md` with why. That is a committed decision rather than
 * an absence, which is the difference this gate exists to make.
 *
 * Usage: node scripts/check-script-reachability.mjs [--root=<dir>]
 * Exit codes: 0 = every script is reachable or declared manual, 1 = otherwise.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { parse } from "yaml";

const DEFAULT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ROOT = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  return flag === undefined
    ? DEFAULT_ROOT
    : resolve(flag.slice("--root=".length));
})();
const MANUAL = join(ROOT, "docs", "MANUAL-SCRIPTS.md");

/**
 * Scripts npm itself owns. Not gates, and not claims about the product.
 *
 * `test` and `prepare` are reachability ROOTS below rather than rows here:
 * `npm test` and the husky install reach them, and neither appears as
 * an `npm run` invocation anywhere. `prepublishOnly` is skipped outright —
 * this repository runs it, and a table row for a script npm invokes on
 * `npm publish` would dress npm's contract up as a decision of ours.
 */
const NPM_LIFECYCLE = new Set([
  "build",
  "prepare",
  "prepublishOnly",
  "start",
  "test",
]);

/** Scripts reachable only because npm runs them, and reported as such. */
const NPM_OWNED_ROOTS = ["test", "prepare", "start"];

/** `npm run <name>` names a script of THIS package. `npm --prefix site run y` does
 *  not — that one belongs to the workspace's own manifest, and resolving it
 *  here would attribute the site's scripts to the root. */
function rootScriptRefs(text) {
  return [...text.matchAll(/\bnpm run ([\w:.-]+)/g)]
    .map((m) => m[1])
    .filter((name) => name in SCRIPTS);
}

function safeRead(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const SCRIPTS = pkg.scripts ?? {};

// Roots: every command a workflow step runs, plus the scripts npm itself
// invokes. `test` is a root because `npm test` is how the suite is invoked,
// and `prepare` because husky installs itself — neither appears as an
// `npm run` invocation anywhere.
const roots = new Set(NPM_OWNED_ROOTS);

const workflowDir = join(ROOT, ".github", "workflows");
if (existsSync(workflowDir)) {
  for (const name of readdirSync(workflowDir)) {
    if (!name.endsWith(".yml") && !name.endsWith(".yaml")) continue;
    let workflow;
    try {
      workflow = parse(readFileSync(join(workflowDir, name), "utf8"));
    } catch {
      continue; // `check-gate-tiers.mjs` owns malformed-workflow reporting
    }
    for (const job of Object.values(workflow?.jobs ?? {})) {
      for (const step of job?.steps ?? []) {
        if (typeof step?.run === "string") {
          for (const ref of rootScriptRefs(step.run)) roots.add(ref);
        }
      }
    }
  }
}

/** Transitive closure over `npm run` chains, memoised. */
const closureCache = new Map();
function closureOf(name, seen = new Set()) {
  if (closureCache.has(name)) return closureCache.get(name);
  if (seen.has(name)) return new Set();
  seen.add(name);
  const out = new Set([name]);
  const body = SCRIPTS[name];
  if (typeof body === "string") {
    for (const ref of rootScriptRefs(body)) {
      out.add(ref);
      for (const deep of closureOf(ref, seen)) out.add(deep);
    }
  }
  closureCache.set(name, out);
  return out;
}

const reachable = new Set();
for (const root of roots) {
  for (const name of closureOf(root)) reachable.add(name);
}

/**
 * `| `script` | why |` and `| `script` | `--mode` | why |` rows in the manual
 * registry.
 *
 * The three-cell form exists because a WRITE MODE of a script a gate already
 * reaches is a real category that this gate could not express. `npm run
 * check-fixture-quad` is reachable; `npm run check-fixture-quad --write`
 * rewrites a tracked file, which is precisely what a CI step must not do. A
 * two-cell row naming the mode would be read as a script named
 * `check-fixture-quad --write`, and a script with that name does not exist —
 * so the row was silently unread, and the write arm became unaccounted for
 * without anything going red. A mode row is keyed by its BASE script and is
 * validated against it, but is not added to the manual set: a reachable
 * script with a manual mode is the normal case, not a contradiction.
 */
function declaredManual(text) {
  const out = new Map();
  const modes = new Map();
  for (const line of text.split("\n")) {
    const m =
      /^\|\s*`([\w:.-]+)`\s*\|\s*`(--?[\w-]+)`\s*\|\s*([^|]+?)\s*\|/.exec(line);
    if (m) {
      const list = modes.get(m[1]) ?? [];
      list.push({ mode: m[2], why: m[3] });
      modes.set(m[1], list);
      continue;
    }
    const two = /^\|\s*`([\w:.-]+)`\s*\|\s*([^|]+?)\s*\|/.exec(line);
    if (two) out.set(two[1], two[2]);
  }
  return { manual: out, modes };
}

const failures = [];

if (!existsSync(MANUAL)) {
  console.error(
    `script reachability: missing ${MANUAL}. A script no gate runs is either a ` +
      "gate that was never wired or a tool a human invokes; both are decisions " +
      "that belong in a committed file, and this one is where they are recorded.",
  );
  process.exit(1);
}
const { manual, modes } = declaredManual(readFileSync(MANUAL, "utf8"));
if (manual.size === 0) {
  console.error(
    `script reachability: ${MANUAL} declares no rows. Expected a table of ` +
      "`| \\`script\\` | why |` or `| \\`script\\` | \\`--mode\\` | why |`.",
  );
  process.exit(1);
}

const unreachable = [];
const manualScripts = [];
for (const name of Object.keys(SCRIPTS).sort()) {
  if (reachable.has(name)) continue;
  if (NPM_LIFECYCLE.has(name)) continue;
  if (manual.has(name)) {
    manualScripts.push(name);
    continue;
  }
  unreachable.push(name);
}

for (const name of unreachable) {
  failures.push(
    `scripts.${name}: no workflow step runs it and no script chains to it, and ` +
      "docs/MANUAL-SCRIPTS.md does not declare it manual. Wire it into a gate, or " +
      "record that a human runs it and why.",
  );
}

for (const [name, why] of manual) {
  if (!(name in SCRIPTS)) {
    failures.push(
      `docs/MANUAL-SCRIPTS.md declares ${name}, which package.json does not define. ` +
        "An exemption for a deleted script is a hole with a comment on it.",
    );
  }
  if (reachable.has(name)) {
    failures.push(
      `docs/MANUAL-SCRIPTS.md declares ${name} manual, but a gate reaches it. ` +
        "A script cannot be both a gate and a manual tool; remove the row.",
    );
  }
  if (why.length < 15) {
    failures.push(
      `docs/MANUAL-SCRIPTS.md declares ${name} with a one-word reason ("${why}"). ` +
        "The reason is the part a reviewer needs to check.",
    );
  }
}

const declaredModes = [];
/** The interpreter entry a script body invokes, for reading a mode back. */
const ENTRY_PATTERNS = [
  /(?:^|\s)node\s+((?:[\w.@/-]+)\.(?:mjs|cjs|js|ts|mts|tsx))/,
  /(?:^|\s)npx\s+tsx\s+((?:[\w.@/-]+)\.(?:mjs|cjs|js|ts|mts|tsx))/,
  /(?:^|\s)tsx\s+((?:[\w.@/-]+)\.(?:mjs|cjs|js|ts|mts|tsx))/,
];

function entryOf(body) {
  if (typeof body !== "string") return undefined;
  for (const pattern of ENTRY_PATTERNS) {
    const m = pattern.exec(body);
    if (m !== null) return m[1];
  }
  return undefined;
}

for (const [name, list] of modes) {
  if (!(name in SCRIPTS)) {
    failures.push(
      `docs/MANUAL-SCRIPTS.md declares a mode of ${name}, which package.json does ` +
        "not define. An exemption for a deleted script is a hole with a comment " +
        "on it.",
    );
    continue;
  }
  // A mode is an ARGUMENT the script parses, not a token in the npm body, so
  // the check reads the script file. `npm run corpus:audit --update` carries
  // no `--update` in package.json; `tests/corpus/audit.ts` does.
  const entry = entryOf(SCRIPTS[name]);
  const source =
    entry === undefined
      ? SCRIPTS[name]
      : (safeRead(join(ROOT, entry)) ?? SCRIPTS[name]);
  // A mode is an ARGUMENT the script parses, not a token in the npm body, so
  // the check reads the script file: `npm run corpus:audit --update` carries
  // no `--update` in package.json, and `tests/corpus/audit.ts` does.
  //
  // A fixture tree that ships only the manifest and the registry has no script
  // file to read. That is not a mode that does not exist — it is a tree where
  // the question cannot be asked — so the check is skipped rather than failed.
  // The base script still has to exist in package.json and the reason still has
  // to be a sentence, so a fixture run is not vacuous.
  const readable = entry !== undefined && safeRead(join(ROOT, entry)) !== null;
  for (const { mode, why } of list) {
    if (readable && !source.includes(mode)) {
      failures.push(
        `docs/MANUAL-SCRIPTS.md declares ${name} ${mode} as a manual mode, but ` +
          `${entry} never mentions ${mode}. A mode that does not exist cannot ` +
          "be the reason a write arm is not in CI.",
      );
      continue;
    }
    if (why.length < 15) {
      failures.push(
        `docs/MANUAL-SCRIPTS.md declares ${name} ${mode} with a one-word reason ` +
          `("${why}").`,
      );
    }
    declaredModes.push(`${name} ${mode}`);
  }
}

if (failures.length > 0) {
  console.error("Script reachability check failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      scripts: Object.keys(SCRIPTS).length,
      reachableFromWorkflows: [...reachable].filter((n) => n in SCRIPTS).length,
      declaredManual: manualScripts.sort(),
      declaredModes: declaredModes.sort(),
    },
    null,
    2,
  ),
);
