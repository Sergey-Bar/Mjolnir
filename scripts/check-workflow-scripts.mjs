#!/usr/bin/env node
/**
 * Every `npm run <script>` a workflow step executes must exist in the
 * package.json that step actually runs against.
 *
 * This class shipped a defect that only a grep finds. `.github/workflows/
 * pages.yml` ran the SITE's own `doctor` script in a step with no
 * `working-directory`, and the root package.json defines no such script — it
 * exists only in `site/package.json`. The step could never pass, and because
 * the workflow only triggers on `site/**`, `docs/**`, `src/**` and manual
 * dispatch, it was never observed.
 *
 * The step in the tree today is correct (`working-directory: site`), which
 * is exactly why this gate exists: a correct line found by reading is not
 * an invariant, and the next edit does not have to be as careful.
 *
 * The check is per-step, not per-file. `npm run build` is a real script in
 * the root package.json and a different real script in `site/package.json`,
 * and both are legitimate — so the question is never "does this name exist"
 * but "does this name exist WHERE this step runs". Resolution order:
 *
 *   1. `step.working-directory` (repo-relative), else the repository root.
 *   2. `npm --prefix <dir> run <script>` is spelled by reading it as a
 *      prefix invocation rather than a working-directory one, so both
 *      spellings resolve against `<dir>/package.json`.
 *   3. Continuation lines (`run: |`) are joined before parsing, because a
 *      shell block's steps are the unit that executes.
 *
 * A missing `package.json` under a declared working directory is a failure
 * too, not a skip: the step would fail for the same reason.
 *
 * Usage: node scripts/check-workflow-scripts.mjs [--root=<dir>]
 * Exit codes: 0 = every referenced script resolves, 1 = one or more do not.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { parse } from "yaml";
import { EXEMPT_FROM_SCRIPT_CHECK } from "./lib/workflow-exemptions.mjs";

const DEFAULT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ROOT = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  return flag === undefined
    ? DEFAULT_ROOT
    : resolve(flag.slice("--root=".length));
})();
const WORKFLOW_DIR = join(ROOT, ".github", "workflows");

/** `npm run <name>` in a step body, including inside a shell block. */
const SCRIPT_REF = /\bnpm\s+run\s+([A-Za-z][\w:.-]*)/g;
const PREFIX_REF = /\bnpm\s+--prefix\s+(\S+)\s+run\s+([A-Za-z][\w:.-]*)/g;

function scriptsIn(dir) {
  const manifest = join(dir, "package.json");
  if (!existsSync(manifest)) return null;
  try {
    const parsed = JSON.parse(readFileSync(manifest, "utf8"));
    return new Set(Object.keys(parsed.scripts ?? {}));
  } catch {
    return undefined; // present but unreadable — a failure, not an absence
  }
}

/**
 * Every `npm run` in one step's shell body, paired with the package.json
 * it would execute against.
 *
 * A shell block is read line by line because a `cd` inside it changes the
 * directory for the lines that follow. Both cases the tree actually uses —
 * an explicit `working-directory`, and `npm --prefix` — are resolved; a
 * bare `cd` is not, and is recorded as such rather than silently assumed.
 */
function referencesIn(run) {
  const out = [];
  let cwd = null;
  for (const line of String(run).split(/\r?\n/)) {
    for (const m of line.matchAll(PREFIX_REF)) {
      out.push({ script: m[2], dir: join(ROOT, m[1]), line: line.trim() });
    }
    const cd = /^\s*cd\s+(\S+)\s*$/.exec(line);
    if (cd && !out.some((ref) => ref.line === line.trim())) {
      cwd = join(ROOT, cd[1]);
      out.push({ script: null, dir: cwd, line: line.trim(), isCd: true });
    }
    for (const m of line.matchAll(SCRIPT_REF)) {
      out.push({ script: m[1], dir: cwd ?? null, line: line.trim() });
    }
  }
  return out;
}

const failures = [];

if (!existsSync(WORKFLOW_DIR)) {
  console.error(`workflow script check: missing ${WORKFLOW_DIR}`);
  process.exit(1);
}

const rootScripts = scriptsIn(ROOT);
if (rootScripts === null || rootScripts === undefined) {
  console.error(
    `workflow script check: unreadable ${join(ROOT, "package.json")}`,
  );
  process.exit(1);
}

/** Cache of directory → script set, so a 40-step workflow reads each once. */
const dirCache = new Map([[ROOT, rootScripts]]);
function scriptsFor(dir) {
  if (!dirCache.has(dir)) dirCache.set(dir, scriptsIn(dir));
  return dirCache.get(dir);
}

let referenced = 0;
const files = readdirSync(WORKFLOW_DIR)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

for (const name of files) {
  const relative = `.github/workflows/${name}`;
  const exemption = EXEMPT_FROM_SCRIPT_CHECK.get(relative);
  let workflow;
  try {
    workflow = parse(readFileSync(join(WORKFLOW_DIR, name), "utf8"));
  } catch (error) {
    failures.push(
      `${relative}: invalid YAML (${error instanceof Error ? error.message : String(error)})`,
    );
    continue;
  }
  if (typeof workflow !== "object" || workflow === null || !workflow.jobs) {
    continue;
  }
  for (const [jobId, job] of Object.entries(workflow.jobs)) {
    if (typeof job !== "object" || job === null) continue;
    const jobDir = job["working-directory"]
      ? join(ROOT, job["working-directory"])
      : null;
    for (const step of job.steps ?? []) {
      if (typeof step !== "object" || step === null) continue;
      if (typeof step.run !== "string") continue;
      const stepDir = step["working-directory"]
        ? join(ROOT, step["working-directory"])
        : jobDir;
      for (const ref of referencesIn(step.run)) {
        if (ref.isCd) {
          failures.push(
            `${relative} (${jobId}): step changes directory with \`cd ${ref.line}\`, ` +
              `which this checker cannot resolve. Use \`working-directory:\` so the ` +
              `script it runs is verifiable against a known package.json.`,
          );
          continue;
        }
        const dir = ref.dir ?? stepDir ?? ROOT;
        const scripts = scriptsFor(dir);
        const where =
          dir === ROOT
            ? "package.json"
            : `${dir.slice(ROOT.length + 1)}/package.json`;
        if (exemption) continue;
        if (scripts === null) {
          failures.push(
            `${relative} (${jobId}): runs \`npm run ${ref.script}\` but ${where} does not exist`,
          );
          continue;
        }
        if (scripts === undefined) {
          failures.push(
            `${relative} (${jobId}): ${where} is unreadable, so \`npm run ${ref.script}\` cannot be verified`,
          );
          continue;
        }
        referenced += 1;
        if (!scripts.has(ref.script)) {
          failures.push(
            `${relative} (${jobId}): runs \`npm run ${ref.script}\`, which ${where} does not define. ` +
              `A step that can never pass is a gate that only ever reads as one.`,
          );
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Workflow script check failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      workflows: files.length,
      scriptInvocationsVerified: referenced,
      exemptWorkflows: [...EXEMPT_FROM_SCRIPT_CHECK.keys()],
    },
    null,
    2,
  ),
);
