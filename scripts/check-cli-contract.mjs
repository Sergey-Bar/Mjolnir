#!/usr/bin/env node
/**
 * `check-cli-contract` — the CLI and npm-script naming contract, in one gate.
 *
 * Two contracts, one file, because they fail the same way: a name that means
 * two things, or a name that means nothing.
 *
 * 1. ONE DISPOSITION PER VERB. `docs/cli-contract.json` carries a row for
 *    every verb in `src/engine/cli-command-names.ts` — KEEP, REPLACE, MOVE or
 *    DELETE, with the target for the first three. The gate fails when a verb
 *    has no row, when a row names a verb that does not exist, and when a
 *    removed verb is still named by a doc, a README, the site, a workflow or
 *    the Action. The CLI collapse is a refactor nobody can review from a
 *    diff of `src/`; it is reviewable from a diff of this table.
 *
 * 2. ONE NAME PER COMMAND. `package.json` carried pairs of names for the same
 *    command — `unimported:check` and `check-unimported-modules` both invoked
 *    `scripts/check-unimported-modules.mjs`; `build:determinism` and
 *    `verify-build-determinism` both invoked `scripts/verify-build-determinism.mjs`.
 *    Nothing failed, because npm has no opinion and a second name is
 *    indistinguishable from a first one.
 *
 *    The rule is deliberately about the COMMAND, not the entry file. A
 *    generator with a check arm and a write arm — `ledger:check` and
 *    `ledger:write` — is two names for one file and is a convention this
 *    repository uses eleven times on purpose: the write arm rewrites tracked
 *    files, so `docs/MANUAL-SCRIPTS.md` accounts for it as manual. Two names
 *    for the same argv is not that. That is the defect.
 *
 * 3. NO DANGLING NAME. Every `npm run <name>` in `package.json`, in any
 *    `.md`, in any workflow, in `action.yml` and in `.coderabbit.yaml`
 *    resolves to a script that exists. `npm --prefix site run x` belongs to
 *    the workspace's own manifest and is not checked here.
 *
 * Usage: node scripts/check-cli-contract.mjs
 * Exit codes: 0 = contract holds, 1 = a violation, 10 = the contract file or
 * the verb list could not be read (an unreadable contract is not a pass).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { parse } from "yaml";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CONTRACT_PATH = join(ROOT, "docs", "cli-contract.json");
const VERB_LIST_PATH = join(ROOT, "src", "engine", "cli-command-names.ts");
const WORKFLOW_DIR = join(ROOT, ".github", "workflows");

/** Every disposition a row may carry. DELETE is the only one with no target. */
const ACTIONS = new Set(["KEEP", "REPLACE", "MOVE", "DELETE"]);

const failures = [];
const notes = [];

// ---------------------------------------------------------------- contract --

if (!existsSync(CONTRACT_PATH)) {
  console.error(
    `check-cli-contract: missing ${CONTRACT_PATH}. The CLI collapse is only ` +
      "reviewable if the decision is a committed file; a table in a comment " +
      "is the thing this gate replaced.",
  );
  process.exit(10);
}

/**
 * The verb list, read statically.
 *
 * `cli-command-names.ts` is the source of truth, so importing it would need a
 * TS loader in a gate that otherwise needs none. The extraction is therefore
 * deliberately strict: it matches one shape and fails loudly on any other, so
 * a refactor of that file cannot silently reduce this gate to checking an
 * empty list (which would pass forever).
 */
function readVerbList() {
  const text = readFileSync(VERB_LIST_PATH, "utf8");
  const match = /CLI_COMMAND_NAMES\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(text);
  if (match === null) {
    console.error(
      `check-cli-contract: ${VERB_LIST_PATH} no longer has the ` +
        "`export const CLI_COMMAND_NAMES = [ … ] as const` shape this gate " +
        "reads. Re-derive the extractor; do not delete the check.",
    );
    process.exit(10);
  }
  const verbs = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (verbs.length === 0) {
    console.error(
      "check-cli-contract: extracted zero verbs — the gate would pass on an " +
        "empty contract, which is the failure mode this check exists to stop.",
    );
    process.exit(10);
  }
  return verbs;
}

let contract;
try {
  contract = JSON.parse(readFileSync(CONTRACT_PATH, "utf8"));
} catch (error) {
  console.error(
    `check-cli-contract: ${CONTRACT_PATH} is not valid JSON: ` +
      `${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(10);
}

const verbs = readVerbList();
const dispositions = contract.dispositions ?? {};
const retired = (contract.retiredVerbs ?? []).map((entry) =>
  typeof entry === "string" ? entry : entry.verb,
);
const removed = [
  ...new Set([
    ...retired,
    ...Object.entries(dispositions)
      .filter(([, row]) => row?.action === "DELETE")
      .map(([name]) => name),
  ]),
].filter((verb) => !verbs.includes(verb));

// (1) one disposition row per verb
for (const verb of verbs) {
  const row = dispositions[verb];
  if (row === undefined) {
    failures.push(
      `${CONTRACT_PATH.slice(ROOT.length + 1)}: no disposition for \`${verb}\`. ` +
        "Every verb needs a row, including `help` — a verb with no stated " +
        "disposition is a verb nobody decided about.",
    );
    continue;
  }
  const action = row.action;
  if (!ACTIONS.has(action)) {
    failures.push(
      `dispositions.${verb}.action is ${JSON.stringify(action)}; expected one of ` +
        `${[...ACTIONS].join(", ")}.`,
    );
    continue;
  }
  if (action === "DELETE") {
    if (typeof row.target === "string" && row.target !== "") {
      failures.push(
        `dispositions.${verb} is DELETE but names a target ${JSON.stringify(row.target)}. ` +
          "A deleted verb points at nothing.",
      );
    }
  } else if (action !== "KEEP") {
    if (typeof row.target !== "string" || row.target === "") {
      failures.push(
        `dispositions.${verb} is ${action} with no \`target\`. A REPLACE or MOVE ` +
          "without a destination is a rename someone else has to guess.",
      );
    }
  } else if (row.target !== undefined && row.target !== verb) {
    failures.push(
      `dispositions.${verb} is KEEP but names target ${JSON.stringify(row.target)}. ` +
        "A KEEP row needs no target.",
    );
  }
}

for (const name of Object.keys(dispositions)) {
  if (verbs.includes(name)) continue;
  // A DELETE row whose verb has left `cli-command-names.ts` is the honest
  // case: the verb is gone and the contract still records why. It has to be
  // paired with a `retiredVerbs` entry, or the row is just a name that means
  // nothing.
  if (dispositions[name]?.action === "DELETE") {
    if (!retired.includes(name)) {
      failures.push(
        `dispositions.${name} is DELETE and the verb is gone from ` +
          "cli-command-names.ts, but it is not listed in `retiredVerbs`. A " +
          "removal that is not recorded where the gate can check it is a " +
          "removal the next reader has to rediscover.",
      );
    }
    continue;
  }
  failures.push(
    `dispositions.${name}: a row for a verb that does not exist in ` +
      "cli-command-names.ts. A disposition for a removed verb is a hole in " +
      "the contract, not a safety net.",
  );
}

// Every verb the contract says was removed must actually be gone, and must
// not still carry a KEEP row.
for (const verb of retired) {
  if (verbs.includes(verb)) {
    failures.push(
      `retiredVerbs lists \`${verb}\`, which is still in cli-command-names.ts. ` +
        "Either the verb came back, or the retirement was recorded before the " +
        "code that removed it landed. Both are reviewable diffs and neither " +
        "should be invisible.",
    );
  }
  if (dispositions[verb] !== undefined) {
    failures.push(
      `retiredVerbs lists \`${verb}\` and dispositions still has a row for it. ` +
        "One fact, one place: the retirement is the record.",
    );
  }
}

for (const verb of contract.publicVerbs ?? []) {
  if (dispositions[verb]?.action !== "KEEP") {
    failures.push(
      `publicVerbs lists \`${verb}\`, which is not KEEP. The public verb set is ` +
        "what a consumer is promised still works.",
    );
  }
}

// -------------------------------------------------- surfaces that name verbs --

const TEXT_EXT = new Set([
  ".md",
  ".json",
  ".jsonl",
  ".yml",
  ".yaml",
  ".mts",
  ".mjs",
  ".cjs",
  ".ts",
  ".vue",
  ".txt",
]);

function walk(dir, onFile) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (
      entry === "node_modules" ||
      entry === "dist" ||
      entry === ".git" ||
      entry === ".kilo" ||
      entry.startsWith(".cache")
    ) {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, onFile);
    else if (TEXT_EXT.has(extname(full))) onFile(full);
  }
}

/**
 * A file that belongs to a NESTED project is not this repository's surface.
 *
 * `site/`, `packages/*`, `examples/demo-repo/` and the multi-app fixtures
 * under `tests/corpus/positive-fixtures/QA-PW-125/` each carry their own
 * `package.json`, so an `npm run <its-script>` in one of them names a script
 * that project defines, not one this manifest does. Resolving the nearest
 * enclosing manifest is the rule, rather than a blocklist that would need a
 * new entry for every fixture directory someone adds.
 */
function isNestedProject(file) {
  let dir = dirname(file);
  while (dir.length >= ROOT.length && dir !== ROOT) {
    if (existsSync(join(dir, "package.json"))) return true;
    dir = dirname(dir);
  }
  return false;
}

const rel = (file) => file.slice(ROOT.length + 1).replaceAll("\\", "/");

/** `docs/archive/` is history. A plan from 2024 may name a script from 2024. */
const isArchive = (r) =>
  r.startsWith("docs/archive/") || r.startsWith("CHANGELOG.md");

/**
 * CAPTURED ARTEFACTS — a snapshot of what something said on a date is a
 * record, not a surface a reader acts on, and rewriting one would make it a
 * fabrication of a conversation nobody held.
 *
 * The list is by artefact class and deliberately short. A real command that
 * ends up in one of these paths is visible in this file, which is the point:
 * an exemption with a name in it can be argued with, and an exemption with a
 * pattern in it cannot.
 */
const CAPTURED_ARTEFACTS = new Set([
  "docs/M26-GITHUB-SNAPSHOT.json",
  "docs/M26-GITHUB-COMMENTS.json",
  // Captured scan output — the before/after pair a design document compares.
  // Rewriting a capture would make it a fabrication of a scan that did not
  // happen.
  "docs/design/baseline/cli-scan.before.txt",
  "docs/design/after/cli-scan.after.txt",
]);

/** Every markdown, workflow and Action file this repository publishes. */
const surfaces = [];
for (const dir of ["", "docs", "site", join(".github", "workflows")]) {
  walk(join(ROOT, dir), (f) => surfaces.push(f));
}
for (const f of [
  "action.yml",
  ".coderabbit.yaml",
  "smithery.yaml",
  "README.md",
]) {
  const full = join(ROOT, f);
  if (existsSync(full)) surfaces.push(full);
}

/**
 * `tests/` and `docs/adr/` are excluded. A regression spec for the gate that
 * catches removed verbs has to be able to SAY the word — `expect(() =>
 * run("diff")).toThrow("unknown subcommand")` is the test, and excluding it
 * would mean the only proof that a verb is gone could not name it. A design
 * decision recorded in an ADR is the same: it is a record of what was decided
 * and when, not an instruction to a reader.
 *
 * `docs/cli-contract.json` is excluded for a sharper reason, and the gate
 * found it the hard way: the contract records WHY each verb was retired, and
 * half those sentences name the command that was replaced. A gate that fails
 * the file which documents the retirements has to be exempted — and an
 * exemption with a reason in it is the version a reviewer can argue with.
 *
 * Everything else counts. A removed verb in the README, on the site, in a
 * contributor guide, in a workflow, in the Action or in a SOURCE help string
 * is a consumer — or a colleague — following a command that does not exist.
 */
/**
 * PRESERVED RULE DOCS are history. `docs/rules/<RETIRED-ID>.md` records what
 * a rule said while it existed; the 22 of them that still name a retired verb
 * are doing their job. So a rule doc is skipped when its ID is NOT in the
 * live registry — which is a checkable fact about the file, read from the
 * registry the file's own generator uses, not a pattern exemption.
 */
const LIVE_RULE_IDS = new Set(
  readRuleIds(join(ROOT, "src", "rules", "index.ts")),
);

function isPreservedRuleDoc(r) {
  if (!r.startsWith("docs/rules/") || !r.endsWith(".md")) return false;
  const id = r.slice("docs/rules/".length, -".md".length);
  if (id === "README") return false;
  return !LIVE_RULE_IDS.has(id);
}

/** The IDs the registry exports as live rules, read statically. */
function readRuleIds(indexPath) {
  if (!existsSync(indexPath)) return [];
  const text = readFileSync(indexPath, "utf8");
  const start = text.indexOf("export const RULES");
  if (start === -1) return [];
  const slice = text.slice(start);
  return [...slice.matchAll(/^\s*"?([A-Z][A-Z0-9-]+)"?:/gm)].map((m) => m[1]);
}

function isLiveSurface(file) {
  const r = rel(file);
  if (isArchive(r)) return false;
  if (CAPTURED_ARTEFACTS.has(r)) return false;
  if (r === "docs/cli-contract.json") return false;
  if (r.startsWith("docs/adr/")) return false;
  if (r.startsWith("tests/")) return false;
  if (isPreservedRuleDoc(r)) return false;
  return true;
}

// `mjolnir <verb>` is the invocation surface, whether it arrives through
// `npx mjolnir-qa`, the installed binary or a CI step. The `npm run` prefix is
// deliberately NOT part of it: no npm script invokes a verb, and writing the
// prefix into this pattern would also put a non-existent `npm run <name>` in
// this file, which `docs-consistency.spec.ts` correctly reports as a reader
// being told to run something that does not exist.
const REMOVED_PATTERN = removed.length
  ? new RegExp(
      `\\bmjolnir\\s+(${removed
        .map((v) => v.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&"))
        .join("|")})\\b`,
    )
  : null;

if (REMOVED_PATTERN !== null) {
  for (const file of surfaces) {
    if (!isLiveSurface(file)) continue;
    const text = readFileSync(file, "utf8");
    const m = REMOVED_PATTERN.exec(text);
    if (m !== null) {
      failures.push(
        `${rel(file)}: names \`mjolnir ${m[1]}\`, which docs/cli-contract.json ` +
          "removes. A removed verb in a live surface is a consumer following " +
          "a command that no longer exists.",
      );
    }
  }
}

// ------------------------------------------------------------ npm scripts ---

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const SCRIPTS = pkg.scripts ?? {};

/** The first interpreter + entry + argv of a script body. */
function commandOf(body) {
  if (typeof body !== "string") return null;
  const m =
    /(?:^|\s|\|\|\s)(?:node|npx\s+tsx|tsx)\s+((?:--?[\w-]+(?:=[^\s]+)?\s+)*)((?:[\w.@/-]+)\.(?:mjs|cjs|js|ts|mts|tsx))((?:\s+[^\s|&]+)*)/.exec(
      body,
    );
  if (m === null) return null;
  const flags = m[1].trim();
  const argv = (m[3] ?? "").trim();
  if (argv.includes("--prefix")) return null;
  return `${m[2]} ${flags} ${argv}`.trim().replace(/\s+/g, " ");
}

const byCommand = new Map();
for (const name of Object.keys(SCRIPTS).sort()) {
  const cmd = commandOf(SCRIPTS[name]);
  if (cmd === null) continue;
  const existing = byCommand.get(cmd);
  if (existing === undefined) byCommand.set(cmd, [name]);
  else existing.push(name);
}
for (const [cmd, names] of byCommand) {
  if (names.length > 1) {
    failures.push(
      `${names.map((n) => `\`${n}\``).join(" and ")} both run \`${cmd}\`. ` +
        "Two names for one command is indistinguishable from one name, and " +
        "the second one is the straggler a reader stops trusting.",
    );
  }
}

// (3) every referenced name resolves
const knownNames = new Set(Object.keys(SCRIPTS));
const refPattern = /(?<![\w-])npm run ([\w:.-]+)/g;
const reported = new Set();

function checkReferences(where, text) {
  // `npm --prefix site run x` belongs to the workspace manifest.
  const stripped = text.replace(/npm --prefix \S+ run [\w:.-]+/g, "");
  for (const m of stripped.matchAll(refPattern)) {
    const name = m[1];
    if (knownNames.has(name)) continue;
    const key = `${where}|${name}`;
    if (reported.has(key)) continue;
    reported.add(key);
    failures.push(
      `${where}: \`npm run ${name}\` — package.json defines no such script. A ` +
        "name that resolves to nothing is the same defect as a name that " +
        "resolves to two things: the reader cannot tell which.",
    );
  }
}

for (const [name, body] of Object.entries(SCRIPTS)) {
  if (typeof body === "string")
    checkReferences(`package.json scripts.${name}`, body);
}

/**
 * The published surfaces: markdown, this repository's own workflows, the
 * Action and the reviewer config. `site/` has its own manifest, so it is a
 * nested project for THIS check — a step that runs one of the site's own
 * scripts is the site's, not ours — while still being scanned for removed
 * verbs above, which is the check a reader of the documentation site actually
 * needs.
 */
const DANGLING_SURFACES = surfaces.filter((file) => {
  const r = rel(file);
  if (isArchive(r) || isNestedProject(file)) return false;
  if (r.startsWith("site/")) return false;
  return (
    r.endsWith(".md") ||
    r === "action.yml" ||
    r === ".coderabbit.yaml" ||
    r === "smithery.yaml" ||
    r.startsWith(".github/workflows/")
  );
});

for (const file of DANGLING_SURFACES) {
  checkReferences(rel(file), readFileSync(file, "utf8"));
}

// Workflows are read as YAML as well as text: a `run:` block is the
// authoritative signal, and the text pass already covers it. Reading both
// costs nothing because `reported` dedupes.
for (const entry of existsSync(WORKFLOW_DIR) ? readdirSync(WORKFLOW_DIR) : []) {
  if (!entry.endsWith(".yml") && !entry.endsWith(".yaml")) continue;
  const where = join(".github", "workflows", entry);
  let workflow;
  try {
    workflow = parse(readFileSync(join(WORKFLOW_DIR, entry), "utf8"));
  } catch {
    notes.push(
      `${where}: not valid YAML — check-gate-tiers.mjs owns that report.`,
    );
    continue;
  }
  for (const job of Object.values(workflow?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      if (typeof step?.run === "string") checkReferences(where, step.run);
    }
  }
}

// ------------------------------------------------------------------ report --

if (failures.length > 0) {
  console.error("CLI / npm-script contract check failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      verbs: verbs.length,
      dispositions: Object.keys(dispositions).length,
      publicVerbs: contract.publicVerbs ?? [],
      removedVerbs: removed,
      scripts: Object.keys(SCRIPTS).length,
      distinctCommands: byCommand.size,
      surfacesScanned: surfaces.length,
      notes,
    },
    null,
    2,
  ),
);
