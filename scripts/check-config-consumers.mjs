#!/usr/bin/env node
/**
 * Configuration at the repository root must name its consumer.
 *
 * Two files sat here for a release with no consumer in this tree and no note
 * saying who did: `sonar-project.properties` and `.coderabbit.yaml`. A reader
 * could reasonably have concluded either that SonarQube and CodeRabbit
 * analyse this repository in CI — they do not; neither appears in any
 * workflow — or that both were dead weight, which is what invites deleting a
 * curated file.
 *
 * Both are real. Both are read by the hosted service the moment this
 * repository is imported into it, which is a consumer this repository cannot
 * run and therefore cannot prove by running it. That is why this gate exists:
 * the fact is recorded rather than guessed at, and a new root-level
 * configuration file with no consumer fails until someone says who reads it.
 *
 * Two ways to be accounted for, and only two:
 *
 *   1. READ IN-REPO — the file's name appears in tracked source, in an npm
 *      script, or in a workflow step. This is detected, not declared, because
 *      detection is cheap and a declaration would rot the moment the reader
 *      was renamed.
 *   2. DECLARED EXTERNAL — the file is listed in `docs/EXTERNAL-CONFIG.md`
 *      with the external consumer named.
 *
 * What this deliberately does NOT do is guess. Inferring "this tool reads
 * this file" would mean reimplementing prettier's, git's, Codecov's and the
 * CLI's config resolution; a checker that guesses wrong reports a live file as
 * orphaned, which is worse than no checker. So detection is textual and
 * honest about its scope: it proves a name is MENTIONED, not that a value is
 * honoured, and the registry covers what mention cannot.
 *
 * Usage: node scripts/check-config-consumers.mjs [--root=<dir>]
 * Exit codes: 0 = every such file is accounted for, 1 = one or more are not.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const DEFAULT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ROOT = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  return flag === undefined
    ? DEFAULT_ROOT
    : resolve(flag.slice("--root=".length));
})();
const REGISTRY = join(ROOT, "docs", "EXTERNAL-CONFIG.md");

/**
 * Directories whose contents are DATA, not a place a root config would be
 * read from. Excluding them keeps the mention search from matching a corpus
 * review sheet that quotes a build command verbatim.
 */
const NOT_CONSUMERS = [
  "tests/corpus/positive-fixtures/",
  "tests/corpus/negative-fixtures/",
  "tests/corpus/review/",
  "tests/corpus/review-pairs/",
  "tests/golden/",
  "docs/archive/",
  "site/",
  "node_modules/",
  "dist/",
  "coverage/",
  "scripts/",
];

/**
 * A gate may not vouch for the thing it gates.
 *
 * `scripts/**` is excluded from the mention search because a CHECK is not a
 * CONSUMER of the configuration it checks. Without this, `sonar-project.
 * properties` and `.coderabbit.yaml` were "read in repo" — by
 * `scripts/check-config-consumers.mjs`'s own module comment, which names both
 * of them in the sentence explaining why the gate exists. The two files this
 * gate was written for were the only two it could not fail on, and the
 * `docs/EXTERNAL-CONFIG.md` rows recorded for them were dead weight.
 *
 * The general rule: a mention inside a tool that INSPECTS the file is not a
 * consumer of it. `src/release/` is deliberately KEPT in the search — it names
 * `capability-manifest.json` to rewrite its version, which is production code
 * doing real work — so the exclusion list is a decision a reader can audit
 * rather than a blanket.
 */
function isConsumerSource(file) {
  return !NOT_CONSUMERS.some((prefix) => file.startsWith(prefix));
}

/** `| \`name\` | consumer |` rows in the registry table. */
function declaredIn(text) {
  const out = new Map();
  for (const line of text.split("\n")) {
    const m = /^\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/.exec(line);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

function listTracked() {
  try {
    return execFileSync("git", ["ls-files"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((f) => !NOT_CONSUMERS.some((prefix) => f.startsWith(prefix)));
  } catch {
    return null; // not a git checkout
  }
}

const CONFIG_EXTENSIONS = new Set([
  ".json",
  ".yaml",
  ".yml",
  ".properties",
  ".toml",
  ".ini",
]);

/**
 * Dot-prefixed root files that are NOT configuration: ignore lists, ignore
 * rules and line-ending attributes. Each is read by a named tool from a
 * conventional name, so asking who else reads them has no answer worth
 * recording. A dot-prefixed file that is NOT in this set is treated as
 * configuration — `.coderabbit.yaml` is the case that forced the split, and a
 * rule that started with "dotfiles are never config" would have exempted the
 * file the gate was written for.
 */
const DOTFILES_NOT_CONFIG = new Set([
  ".gitignore",
  ".prettierignore",
  ".mjolnirignore",
  ".mcp.json",
  ".gitattributes",
]);

/** Root-level configuration, by name — not by guessing which tool wants it. */
function isConfigCandidate(name) {
  const dot = name.lastIndexOf(".");
  if (dot < 1) return false; // no extension, or a bare dotfile
  if (!CONFIG_EXTENSIONS.has(name.slice(dot))) return false;
  if (name.startsWith(".") && DOTFILES_NOT_CONFIG.has(name)) return false;
  return true;
}

const failures = [];

const tracked = listTracked();
const trackedSet = new Set(tracked ?? []);
// A file that names ITSELF is not its own consumer. `kilo.json` carries
// `"$schema": ".../kilo.json"`, so without this the search would find a
// consumer in the very file it was looking for — the shape of a check that
// passes by construction.
const selfName = (p) => p.slice(p.lastIndexOf("/") + 1);
const sources =
  tracked === null
    ? null
    : tracked
        .filter(isConsumerSource)
        .filter((f) => /\.(ts|mts|cts|js|mjs|cjs|json|ya?ml)$/.test(f))
        .map((f) => {
          try {
            return readFileSync(join(ROOT, f), "utf8")
              .split(selfName(f))
              .join("\u0000");
          } catch {
            return "";
          }
        })
        .join("\n");

const registryExists = existsSync(REGISTRY);
const declared = registryExists
  ? declaredIn(readFileSync(REGISTRY, "utf8"))
  : new Map();
if (!registryExists) {
  console.error(
    `config consumers: missing ${REGISTRY}. Root-level configuration with no in-repo ` +
      "consumer must be declared there with the external consumer named.",
  );
  process.exit(1);
}

const rootEntries = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isFile() && isConfigCandidate(entry.name))
  .map((entry) => entry.name)
  // TRACKED only. Several machine-local agent configs (`opencode.json`,
  // `.mcp.json`) are gitignored by design, so they are not repository claims
  // at all — gating on them would fail on every checkout where a developer
  // has an editor configured, which is the same defect as gating on a
  // machine-local path in any other form.
  .filter((name) => tracked === null || trackedSet.has(name))
  .sort();

const accountedInRepo = [];
const accountedExternally = [];
for (const name of rootEntries) {
  if (sources !== null && sources.includes(name)) {
    accountedInRepo.push(name);
    continue;
  }
  if (declared.has(name)) {
    accountedExternally.push(name);
    continue;
  }
  failures.push(
    `${name}: no tracked source, npm script or workflow step mentions it, and ` +
      "docs/EXTERNAL-CONFIG.md does not declare who reads it. Name the consumer " +
      "(an external service counts) or delete it — a configuration file nobody reads " +
      "is a claim the repository does not make.",
  );
}

for (const [name, consumer] of declared) {
  if (!existsSync(join(ROOT, name))) {
    failures.push(
      `docs/EXTERNAL-CONFIG.md declares ${name} (${consumer}), which is not in the tree. ` +
        "An exemption for a deleted file is a hole with a comment on it.",
    );
  }
  if (consumer.length < 10) {
    failures.push(
      `docs/EXTERNAL-CONFIG.md declares ${name} with a one-word consumer ("${consumer}"). ` +
        "The reason is the part a reviewer needs to check.",
    );
  }
}

if (failures.length > 0) {
  console.error("Config consumer check failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      configFilesAtRoot: rootEntries.length,
      readInRepo: accountedInRepo.sort(),
      declaredExternal: accountedExternally.sort(),
      detectionScope:
        sources === null
          ? "not a git checkout — external declarations only"
          : "textual mention in tracked source, npm scripts and workflow steps",
    },
    null,
    2,
  ),
);
