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
 * THE SAME QUESTION, ASKED OF FILES
 *
 * `npm run <name>` answers "does this NAME resolve". The other half of a step
 * is "does this FILE resolve", and `.github/workflows/ci.yml` shipped a step
 * naming `scripts/diff-detector-hashes.ts` — a file the v6 positioning carve
 * deleted while the step kept its name. The capability was present the whole
 * time: `scripts/check-detector-hashes.ts` documents `--base <manifest>`, and
 * the step has been corrected to name it. But a corrected line is not an
 * invariant, and nothing would have said so.
 *
 * So every step's file argument is resolved too, against the same
 * `working-directory` resolution the name check uses and the same exemption
 * list. The shape of a reference is deliberately narrow — an interpreter, some
 * flags, then a token that is a plain relative path with a code extension —
 * because the alternative (every `\S+` in a `run:` block) reads shell
 * arguments, redirections and inline scripts as file paths and reports the
 * workflow's own commands back at it. `./actionlint` is the case that decides
 * it: a downloaded artifact with no extension, which a prefix rule would have
 * reported as a missing file forever.
 *
 * Usage: node scripts/check-workflow-scripts.mjs [--root=<dir>]
 * Exit codes: 0 = every referenced script and file resolves, 1 = one or more
 * do not.
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

/**
 * An interpreter, its flags, and the file it is handed.
 *
 * The flag group is consumed before the path, so a step written as
 * `--timeout 30 scripts/check-managed-surfaces.mjs` does not read `30` as the
 * file. `node -e "<inline program>"` reads the program as the file, and
 * `PLAIN_PATH` rejects it because it carries quotes — which is the right answer,
 * since an inline program is not a path, and resolving it would mean parsing
 * JavaScript to find out whether it mentions a filename.
 */
const FILE_REF =
  /(?:^|[\s;&|(])(?:node|npx\s+tsx|tsx|bash|sh|python3?|pwsh)\s+((?:--?[\w-]+(?:=[^\s]+)?\s+)*)([^\s;&|)]+)/g;

/** A bare relative path, with a code extension this repository can execute. */
const PLAIN_PATH = /^\.{0,2}\/?[\w.@\-/]+\.(?:mjs|cjs|js|mts|ts|tsx|sh|bash)$/;

/**
 * A BUILD OUTPUT is not a repository file.
 *
 * `node dist/cli.mjs` is how every gate step invokes the CLI, and `dist/` is
 * produced by the `npm run build` step that precedes those steps in the same
 * job. Checking it would make this gate red on a clean checkout run before the
 * build — `npm run certify:fast` and a bare `npm run workflow:scripts` both do
 * that — and the fix would be an exemption, which is how a gate becomes
 * decoration. `walk()` in `check-cli-contract.mjs` already skips `dist/` for
 * the same reason.
 */
function isBuildOutput(arg) {
  return arg === "dist" || arg.startsWith("dist/") || arg.startsWith("./dist/");
}

/** The file arguments one step's body names, in order. */
function fileArgsIn(run) {
  const out = [];
  for (const m of String(run).matchAll(FILE_REF)) {
    // Two capture groups: the flag run, then the candidate. Both
    // alternatives before them are non-capturing, so the path is group 2 — a
    // third group here reads as "there is another one" and silently resolves to
    // `undefined`, which fails closed to "nothing checked".
    const candidate = m[2] ?? "";
    if (candidate.startsWith("-")) continue;
    if (!PLAIN_PATH.test(candidate)) continue;
    if (isBuildOutput(candidate)) continue;
    out.push(candidate);
  }
  return out;
}

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
let fileRefs = 0;
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
      const base = stepDir ?? ROOT;
      if (exemption) continue;
      for (const ref of referencesIn(step.run)) {
        if (ref.isCd) {
          failures.push(
            `${relative} (${jobId}): step changes directory with \`cd ${ref.line}\`, ` +
              `which this checker cannot resolve. Use \`working-directory:\` so the ` +
              `script it runs is verifiable against a known package.json.`,
          );
          continue;
        }
        const dir = ref.dir ?? base;
        const scripts = scriptsFor(dir);
        const where =
          dir === ROOT
            ? "package.json"
            : `${dir.slice(ROOT.length + 1)}/package.json`;
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
      // A step that moves with `cd` has already been reported above, and its
      // file arguments would resolve against the wrong directory. Reporting them
      // as well would bury the one line that says what to change.
      if (/(?:^|[\s;&|(])cd\s+\S/.test(step.run)) continue;
      for (const arg of fileArgsIn(step.run)) {
        fileRefs += 1;
        if (!existsSync(join(base, arg))) {
          failures.push(
            `${relative} (${jobId}): runs \`${arg}\`, which does not exist under ` +
              `${base === ROOT ? "the repository root" : base.slice(ROOT.length + 1)}. ` +
              `A step that names a file it cannot execute fails at the step, not at the gate that would have said so.`,
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
      fileReferencesVerified: fileRefs,
      exemptWorkflows: [...EXEMPT_FROM_SCRIPT_CHECK.keys()],
    },
    null,
    2,
  ),
);
