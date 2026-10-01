#!/usr/bin/env node
/**
 * A module nothing imports cannot be reached by anything.
 *
 * The C2 defect class: eleven modules and eight specs existed in the tree,
 * were listed on the coverage-exemption ledger as DEAD_CODE or CONTRACT_ONLY,
 * and no production code imported any of them. Nobody noticed for four
 * commits, because the only test that claimed to check for them asserted
 * `reachable.has(path) === false` about files that had already been
 * deleted — and that is true of a path that does not exist.
 *
 * The guard is deliberately the bluntest possible form: no reachability
 * closure, no exceptions, no reasoning about which script is live. If
 * nothing in `src/`, `scripts/` or `tests/` imports a module, the module is
 * unreachable by definition, and the only legitimate reasons to keep one are
 * enumerated below and committed.
 *
 * The committed list is the point. A gate that computed the set and asserted
 * `length > 0` would assert only that the problem persists. Comparing against
 * a list means:
 *   - a NEW module with no importer fails, with its path in the message;
 *   - a module on the list that gains an importer fails too, because an entry
 *     that no longer describes reality is a lie in a data file.
 *
 * Classes:
 *   BARREL   — re-exports other modules. No logic of its own to lose, but
 *              still unused: nothing imports `src/adapters/index.js`.
 *   ENTRY    — a shipped surface that is SPAWNED rather than imported
 *              (`src/mcp/stdio.ts` is exec'd by an MCP client, so no import
 *              edge exists and none should).
 *   ORPHAN   — a module with behaviour and no caller. These are the C2 class
 *              proper; the class label records that, and each one is a
 *              candidate for deletion or wiring.
 *   GAP      — named evidence for an open item in the v6 gap matrix. The
 *              matrix cites it, so deleting it would falsify a tracked claim;
 *              the module is unwired AND it is the record of a known gap.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import { importGraphSnapshot } from "./lib/coverage-exemption-ledger.mjs";

const DEFAULT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ROOT = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  return flag === undefined
    ? DEFAULT_ROOT
    : resolve(flag.slice("--root=".length));
})();

/**
 * Committed 2026-09-29. Read with `node scripts/list-unimported-modules.mjs`
 * to regenerate the list; every addition needs a class and, for ORPHAN and
 * GAP, a reason.
 *
 * `src/rules/tier-evidence.ts` left this list when the promotion ratchet
 * started reading it — the gate said so itself ("on the committed list but
 * something now imports it"). The list is a disclosure, and a disclosure of
 * something that is no longer unimported is a lie, so removing the entry is
 * the only correct response. Its disclosure role did not go away with it: the
 * ratchet now reports `demotedForUnsubstantiatedCore` on every run.
 *
 * TWELVE ENTRIES BELOW ALSO APPEAR IN `docs/COVERAGE-EXEMPTIONS.json`, under
 * the `UNIMPLEMENTED_SPEC` classification:
 *
 *   bench/m48-scale-operating-model     engine/m38-challenge-contract
 *   change-intelligence                 engine/m43-system-of-systems
 *   engine/m44-historical-intelligence  engine/m49-experience-parity-contract
 *   engine/runtime-evidence-graph       frameworks/universal-pack-contract
 *   governance/m33-m34-contract         mutation/failure-sensitivity
 *   plugins/sdk-contract                qa/domain-model
 *
 * The same twelve files, named by two ledgers. That duplication is deliberate
 * and the two are NOT merged, because they answer different questions: this
 * list is about IMPORT disclosure, that ledger is about COVERAGE exclusion,
 * and a module can be on one without the other meaning anything. Coupling
 * them would trade a stale-entry risk for a coupling cost, which is not a
 * clear win for two static lists.
 *
 * What is owed is that a reader arriving at one finds the other, which is what
 * the cross-reference on each side is for. The lists are reconciled by
 * `scripts/clean-exemption-ledger`-style regeneration and by review, not by a
 * gate: a gate that enforced the overlap would be a second source of truth
 * telling the first what to say.
 */
const COMMITTED = {
  // ── Barrels: re-export only, no behaviour of their own ──────────────────
  "src/adapters/index.ts": "BARREL",
  "src/anti-gaming/index.ts": "BARREL",
  "src/benchmark/index.ts": "BARREL",
  "src/forensics/index.ts": "BARREL",
  "src/frameworks/index.ts": "BARREL",
  "src/gaps/index.ts": "BARREL",
  "src/integrations/github/index.ts": "BARREL",
  "src/traceability/index.ts": "BARREL",
  "src/trust/index.ts": "BARREL",
  "src/rules/families/index.ts": "BARREL",

  // ── Shipped by being spawned, not imported ──────────────────────────────
  "src/mcp/stdio.ts":
    "ENTRY — the MCP stdio server is exec'd as a child process by tests/mcp-transport.spec.ts and by any MCP client. An import edge is not what makes it shipped.",

  // ── Named evidence for an open v6 gap ───────────────────────────────────
  "src/change-intelligence.ts":
    "GAP — the diff-scoped affected-path computation (M37). It is NOT a small wiring job: `calculateAffectedPaths` takes `ChangeRecord[]`, and nothing in the tree builds those. They need a git diff turned into SEMANTIC and DEPENDENCY records, which means a dependency graph the scanner does not have. `src/scope/changed.ts` computes which files a PR touched, which is coarser and is what the diff-scoped comment uses today.\n\n" +
    'An earlier commit here said "6.0 wires it" and that was not done. The reason is the size of the work, and the honest description of an unwired module is the one above rather than a promise.',
  "src/store/legacy-import.ts":
    "ORPHAN — imports a legacy evidence store. The store it imports is reachable only from here, so neither has a caller.",
  "src/v6/test-doubles.ts":
    "ORPHAN — the false-proof detector, and the module this product is named after. Its only importer was `src/v6/tool-coverage.ts`, deleted as dead: so nothing in `src/` or `scripts/` has called this since. Only tests do.\n\n" +
    "It is listed rather than deleted deliberately. The defect it detects — a test whose every assertion is about its own mock — is the product's thesis, and a thesis module that is unwired is a product gap, not a cleanup candidate. Deleting it would make the gap invisible rather than gone, and re-deriving it would be more code than keeping it. The 2026-10 fix that made `DOUBLE_ONLY` require a double landed here, on a module no scan reaches: the logic is now right, and the wiring is still owed.\n\n" +
    'Wire it to a surface that renders `assessDoubleRisk` per test. Until then the honest state is "this detector does not run".',
  "src/rules/families/flaky-patterns.ts":
    "ORPHAN — a rule family with no registrar. Its siblings (assertion-quality, test-independence) are reachable; this one is not.",
  "src/rules/families/marker-registry.ts":
    "ORPHAN — the marker registry for the family framework. Nothing consults it, so the framework's markers resolve to nothing.",
  "src/rules/families/no-assertions.ts":
    "ORPHAN — a rule family with no registrar, like flaky-patterns.",
  "src/release/pack-audit.ts":
    "ORPHAN — the packaged-tarball audit. Nothing in the release flow calls it, which is how the AST-grammar packaging defect survived.",
  "src/release/provenance.ts":
    "ORPHAN — release provenance. Not called by the release flow.",
  "src/release/reproducibility.ts":
    "ORPHAN — release reproducibility. Not called by the release flow.",
  "src/release/sbom.ts":
    "ORPHAN — the SBOM generator. The release workflow checksums and attaches an SBOM it does not produce from this module, so a second, unwired SBOM implementation exists.",
  "src/integrations/github/github-permissions.ts":
    "ORPHAN — the GitHub permissions model. The workflow emitter (ci-adapter) does not consult it, which is the D5 defect: the generated workflow inherited the default token scope.",
  "src/integrations/github/stale-guard.ts":
    "ORPHAN — the stale-artifact guard. The PR publisher does not consult it, so a stale scan can overwrite a newer comment.",
  "src/engine/command-registry.ts":
    "ORPHAN — a command registry. The CLI derives its verbs from src/cli.ts, so this second source of truth is not consulted.",
  "src/discovery/ecosystem-detection.ts":
    "ORPHAN — ecosystem detection. The adapters detect their own ecosystems, so this is a second implementation with no caller.",
  "src/commands/registry.ts":
    "ORPHAN — a command registry beside src/engine/command-registry.ts. Two registries, neither used by the CLI, which is a third source of truth for the verb list.",
  "src/bench/memory-profiling.ts":
    "ORPHAN — memory profiling. No benchmark runs it.",
  "src/bench/regression-gates.ts":
    "ORPHAN — benchmark regression gates. No benchmark invokes them, so a slow regression is invisible.",
};

/**
 * Roots the import walk treats as callers at all. `scripts/` is a caller
 * because a generator or a gate consuming a module is a live consumer; a
 * module reachable only from `tests/` is a different case, and the guard
 * below is scoped to the unambiguous one — nothing at all.
 */
const CALLER_ROOTS = ["src/", "scripts/", "tests/", "docs/"];

function unimportedModules(root) {
  const snapshot = importGraphSnapshot(root);
  const out = [];
  for (const path of snapshot.files) {
    if (!path.startsWith("src/")) continue;
    const importers = snapshot.importedBy.get(path) ?? [];
    if (importers.length === 0) out.push(path);
  }
  return out;
}

const actual = new Set(unimportedModules(ROOT));
const committed = new Set(Object.keys(COMMITTED));

/**
 * Scripts nothing invokes.
 *
 * A script that no npm script, workflow, or action references cannot be run
 * by anyone, which makes it either a defect — a generator whose artifact is
 * committed but never regenerated, so nothing ever checks it for drift — or
 * deliberate history, a one-shot tool from a wave that has already landed.
 *
 * `assets/readme/how-it-works.svg` was the first kind and nobody could tell:
 * `readme-how-it-works.ts` generated it, the SVG was committed, and no npm
 * script ran the generator, so the file was exactly as checkable as a
 * hand-written one. 6.0 wired it into `docs:regen`; the artifact turned out
 * to be byte-identical on regeneration, so nothing was stale — but the gate
 * that would have said so now exists.
 *
 * The rest are the second kind, and deleting them unilaterally is not this
 * gate's call: an `author-wave3.mts` is a record of how a wave's fixtures
 * were made, which is provenance a reviewer may want. So they are listed with
 * a reason, and a NEW unreferenced script fails.
 *
 * Those 24 `HISTORY` entries moved to `scripts/archive/` rather than staying
 * beside the five `TOOL` ones. Both were listed, and the list was the only
 * thing distinguishing them — so a reader of `scripts/` saw twenty-four
 * one-shot fixture authors sitting next to five things a human runs, with
 * nothing in the directory itself to say which was which. `HISTORY` is now a
 * PATH: a reader of `scripts/` sees tools, and a reader of
 * `scripts/archive/` sees the record of how they were made.
 */
const ORPHAN_SCRIPTS = {
  "scripts/certification-surface-cells.ts":
    "BRIDGE — `check-certification-surface.mjs` invokes it by an absolute path resolved from its own location, the same arrangement as `check-detector-hashes.ts` and `carve-manifest.mjs`. It prints the declared surface as JSON and does nothing else: useful for reading the manifest, not a command. The gate it serves cannot import it directly because that gate is `.mjs` and this is TypeScript.",
  "scripts/complete-lockfile.mjs":
    "TOOL — a manual maintenance command with an explicit usage line (`node scripts/complete-lockfile.mjs <known-good-ref>`). It is run by a human, deliberately, when a lockfile needs the optional platform entries a single-platform generation cannot produce. Not a gate and not a fixture author.",
  "scripts/check-version-surface.ts":
    "MODE — the first arm of `npm run check-version`, spawned by `scripts/check-version.mjs`. One npm name for one subject means the manifest names the ORCHESTRATOR, and this file is the implementation behind one of its arms. Same for the three arms below.",
  "scripts/check-reporter-version.ts":
    "MODE — the second arm of `npm run check-version`; see the note on `scripts/check-version-surface.ts`.",
  "scripts/check-changelog.ts":
    "MODE — the third arm of `npm run check-version`; see the note on `scripts/check-version-surface.ts`.",
  "scripts/check-unreleased-entry.mjs":
    "MODE — the fourth arm of `npm run check-version`, and the only one that reads `--base`. See the note on `scripts/check-version-surface.ts`.",
  "scripts/corpus/quad-verdicts.ts":
    "MODE — the verdict-building arm of `npm run check-fixture-quad --verdicts`, spawned by `scripts/v6/check-fixture-quad.ts` with a resolved absolute path. It stays a separate file because it is 250 lines of top-level side effect; wrapping it in a module boundary would be a refactor of working code to satisfy a naming rule.",
  "scripts/resample-unmeasured.ts":
    "MODE — the re-measurement arm of `npm run corpus:audit --resample`, imported and called by `tests/corpus/audit.ts` under the same `import.meta.url` guard that keeps an import from firing a networked re-measure. Listed here because the manifest names the audit, not the arm.",
  "scripts/compute-release.mjs":
    "TOOL — pure release-bump decision logic kept for planning and reporting. The header states it does not publish, version, tag or update any branch, and that a release-publishing CLI wrapper was the intended caller. That wrapper was never written, so the logic is currently reachable by nobody — the honest description of an unwired tool, and a candidate for either a wrapper or deletion.",
  "scripts/corpus-pairs.ts":
    "TOOL — builds the side-by-side pair view the human classifier uses to keep verdicts consistent across a cross-language rule family. Its output is a review aid, not a gate, so it is invoked by hand during a corpus pass.",
  "scripts/list-unimported-modules.mjs":
    "TOOL — the regenerator for THIS file's script list, named in the guard's header. Run by a human when a script is added or removed; it prints only the diff a reviewer needs.",
  "scripts/release-changelog.mjs":
    "TOOL — a deterministic CHANGELOG transform for a reviewed release branch. The Release Candidate workflow VALIDATES the resulting version and changelog rather than invoking this helper, which is what the header says and what the workflow does. A human runs it on a release branch.",
  "scripts/archive/adjudicate-fixtures-0609.mts":
    "HISTORY — one-shot adjudicator from the 2026-06-09 fixture pass. Its verdicts are committed in tests/corpus/verdicts/; the tool that wrote them is the record of how.",
  "scripts/archive/adjudicate-harvest-0609.mts":
    "HISTORY — the harvest half of the same 2026-06-09 pass.",
  "scripts/archive/apply-depth-adjudications.ts":
    "HISTORY — the P8 depth-sweep applier. It patches `strategyJustification` into the rule sources from a hand-authored table; the patch is applied, the table is in the source, and re-running it is a no-op. Kept because the table is the adjudication record.",
  "scripts/archive/author-closure-final.mts":
    "HISTORY — one-shot fixture author for the closure pass.",
  "scripts/archive/author-closure-fixtures.mts":
    "HISTORY — one-shot fixture author for the closure pass.",
  "scripts/archive/author-fixtures-0609.mts":
    "HISTORY — one-shot fixture author for the 2026-06-09 pass.",
  "scripts/archive/author-pw116.mts":
    "HISTORY — one-shot author for QA-PW-116's fixtures.",
  "scripts/archive/author-wave10.mts":
    "HISTORY — one-shot fixture author for wave 10.",
  "scripts/archive/author-wave2.mts":
    "HISTORY — one-shot fixture author for wave 2.",
  "scripts/archive/author-wave3.mts":
    "HISTORY — one-shot fixture author for wave 3.",
  "scripts/archive/author-wave4.mts":
    "HISTORY — one-shot fixture author for wave 4.",
  "scripts/archive/author-wave5.mts":
    "HISTORY — one-shot fixture author for wave 5.",
  "scripts/archive/author-wave6.mts":
    "HISTORY — one-shot fixture author for wave 6.",
  "scripts/archive/author-wave7.mts":
    "HISTORY — one-shot fixture author for wave 7.",
  "scripts/archive/author-wave8.mts":
    "HISTORY — one-shot fixture author for wave 8.",
  "scripts/archive/author-wave9.mts":
    "HISTORY — one-shot fixture author for wave 9.",
  "scripts/archive/omitted-tier.mts":
    "HISTORY — a five-line probe that printed the omitted-tier default, kept because its answer is quoted in src/rules/measurement.ts's header.",
  "scripts/archive/overlap-audit.mts":
    "HISTORY — a one-off overlap audit whose findings are recorded in the gap matrix.",
  "scripts/archive/rev-dump.mts": "HISTORY — a review-dump helper.",
  "scripts/archive/sync-census-0609.mts":
    "HISTORY — one-shot census sync for the 2026-06-09 pass.",
  "scripts/archive/sync-sarif-version.cjs":
    "HISTORY — a manual SARIF version sync, superseded by the release workflow's own version stamping.",
  "scripts/archive/sync-smithery-version.cjs":
    "HISTORY — a manual smithery version sync, same.",
  "scripts/archive/unmeasured-map.mts":
    "HISTORY — a one-off map of unmeasured rules; the answer is now the `recallStatus` column in the capability matrix.",
  "scripts/archive/verdict-census.mts":
    "HISTORY — a one-off verdict census; superseded by docs/RULE-CAPABILITY-MATRIX.md.",
};

/**
 * Module specifiers named by an import/export/require statement.
 *
 * The same helper the ledger uses for its import walk, for the same reason:
 * a substring search over a file's text matches a path inside a comment or a
 * docstring, and every such match would have made a genuinely orphaned script
 * look referenced.
 */
function specifiersIn(line) {
  const out = [];
  const importMatch = line.match(/from\s+["']([^"']+)["']/);
  if (importMatch) out.push(importMatch[1]);
  const bareImport = line.match(/^\s*import\s+["']([^"']+)["']/);
  if (bareImport) out.push(bareImport[1]);
  const requireMatch = line.match(/require\(\s*["']([^"']+)["']\s*\)/);
  if (requireMatch) out.push(requireMatch[1]);
  return out;
}

/**
 * Does `importerPath` import `targetPath`?
 *
 * Resolves the specifier RELATIVE TO THE IMPORTER and compares whole repo
 * paths. Matching on the file's stem alone is wrong: `scripts/roadmap/validate.ts`
 * shares a stem with a dozen other `validate.*` modules, and a stem match
 * would have reported a genuinely orphaned script as referenced.
 */
function importsScript(root, importerPath, targetPath) {
  const importerDir = dirname(importerPath);
  const target = normalizePath(join(root, targetPath));
  for (const line of readFileSync(importerPath, "utf8").split("\n")) {
    for (const specifier of specifiersIn(line)) {
      if (!specifier.startsWith(".")) continue;
      const resolved = join(importerDir, specifier);
      // Source imports are written with a runtime extension against a
      // different source extension, exactly as the ledger's import walk
      // accounts for.
      const candidates = [
        resolved,
        resolved.replace(/\.js$/, ".ts"),
        resolved.replace(/\.js$/, ".tsx"),
        resolved.replace(/\.mjs$/, ".mts"),
        resolved.replace(/\.cjs$/, ".cts"),
      ];
      if (candidates.some((c) => normalizePath(c) === target)) return true;
    }
  }
  return false;
}

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

/** A script no npm script, workflow or action names, and that no script imports. */
function unreferencedScripts(root) {
  const pkg = readFileSync(join(root, "package.json"), "utf8");
  const workflowDir = join(root, ".github", "workflows");
  const surface = [
    pkg,
    ...(existsSync(workflowDir)
      ? readdirSync(workflowDir).map((file) =>
          readFileSync(join(workflowDir, file), "utf8"),
        )
      : []),
    ...["action.yml", "action-pr.yml"]
      .filter((file) => existsSync(join(root, file)))
      .map((file) => readFileSync(join(root, file), "utf8")),
  ].join("\n");

  const files = walkScripts(join(root, "scripts"));

  return files
    .map((path) => normalizePath(relative(root, path)))
    .filter((path) => {
      if (path.includes(".spec.") || path.startsWith("scripts/lib/"))
        return false;
      // A workflow invokes a script by writing its path in a `run:` line, or
      // package.json does. Both name the PATH; a bare filename match would
      // fire on any mention of the word.
      if (surface.includes(path)) return false;
      for (const file of files) {
        if (normalizePath(relative(root, file)) === path) continue;
        if (importsScript(root, file, path)) return false;
      }
      return true;
    });
}

function walkScripts(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkScripts(path));
    else if (/\.(ts|mts|cts|mjs|cjs|js)$/.test(entry.name)) out.push(path);
  }
  return out;
}

const problems = [];
for (const path of [...actual].sort()) {
  if (committed.has(path)) continue;
  problems.push(
    `${path}: nothing imports it — wire it, delete it, or add it to ` +
      `scripts/check-unimported-modules.mjs with a class and a reason`,
  );
}
for (const path of [...committed].sort()) {
  if (actual.has(path)) continue;
  if (!existsSync(join(ROOT, path))) {
    problems.push(`${path}: on the committed list but the file does not exist`);
    continue;
  }
  problems.push(
    `${path}: on the committed list but something now imports it — ` +
      `an entry that no longer describes reality is a lie in a data file`,
  );
}

const actualScripts = new Set(unreferencedScripts(ROOT));
const committedScripts = new Set(Object.keys(ORPHAN_SCRIPTS));
for (const path of [...actualScripts].sort()) {
  if (committedScripts.has(path)) continue;
  problems.push(
    `${path}: no npm script, workflow or action invokes it — wire it, delete ` +
      `it, or add it to scripts/check-unimported-modules.mjs with a reason`,
  );
}
for (const path of [...committedScripts].sort()) {
  if (actualScripts.has(path)) continue;
  if (!existsSync(join(ROOT, path))) {
    problems.push(`${path}: on the orphan list but the file does not exist`);
    continue;
  }
  problems.push(
    `${path}: on the orphan list but something now invokes it — remove it`,
  );
}

if (problems.length > 0) {
  console.error("check-unimported-modules: FAILED");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

// The lists, not just the counts. The failure path names every offender, but
// the PASS path printed four integers — and an integer is not an action. The
// question a maintainer asks of a green run is "what is on the list?", and it
// needed a failing run or a read of this file's source to answer.
//
// Names are also what makes the output diffable across releases: a count that
// goes 41 → 42 says a module appeared, and the list says which.
console.log(
  JSON.stringify(
    {
      status: "PASS",
      /** Modules under src/ that nothing in the repository imports. */
      unimported: actual.size,
      unimportedModules: [...actual].sort(),
      /** Roots the walk treats as callers at all — a scripts/ importer is a live gate or generator. */
      callerRoots: CALLER_ROOTS,
      /** Entries on the committed list, each with a class and a reason. */
      committed: committed.size,
      /** Scripts no npm script, workflow or action invokes. */
      orphanScripts: actualScripts.size,
      orphanScriptPaths: [...actualScripts].sort(),
      committedOrphanScripts: committedScripts.size,
    },
    null,
    2,
  ),
);
