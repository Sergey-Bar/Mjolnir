/**
 * Coverage exemption truth ledger (plan V5-000).
 *
 * The vitest coverage `exclude` list is the one escape hatch that lets real
 * source escape the per-file ratchet. Hand-maintained, it becomes a silent
 * erosion path — a file is added, the gate quietly stops measuring it, and
 * nothing records who decided that.
 *
 * This module is the single evaluator: it reads the committed ledger
 * (docs/COVERAGE-EXEMPTIONS.json), the committed exclusion list, and the real
 * import graph, and reports every way the three can disagree. The CLI script
 * (scripts/check-coverage-exemption-ledger.mjs) and the guard spec
 * (tests/config/coverage-exemption-ledger.spec.ts) both call it, so a gate
 * that can drift from its own evidence is not a gate.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve as resolvePath } from "node:path";
import { globSync } from "node:fs";

export const LEDGER_PATH = "docs/COVERAGE-EXEMPTIONS.json";
export const COVERAGE_CONFIG_PATH = "vitest.config.ts";

/** Directories whose imports are production surface, not test surface. */
const PRODUCTION_GLOBS = [
  "src/**/*.{ts,mts,js,mjs}",
  "scripts/**/*.{ts,mts,js,mjs}",
  "packages/*/src/**/*.{ts,mts,js,mjs}",
];

const CLASSIFICATIONS = [
  "PERMANENT_STRUCTURAL",
  "DEAD_CODE",
  "CONTRACT_ONLY",
  "SHIPPED_SURFACE",
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toPosix(value) {
  return value.replace(/\\/g, "/");
}

function isFile(root, relativePath) {
  const absolute = join(root, relativePath);
  return existsSync(absolute) && statSync(absolute).isFile();
}

/**
 * The committed coverage `exclude` list, parsed out of vitest.config.ts.
 * The FIRST `exclude: [` after `coverage: {` is the coverage list — the
 * test.include/test.exclude arrays live outside that block.
 */
export function committedExclusions(root) {
  const text = readFileSync(join(root, COVERAGE_CONFIG_PATH), "utf8");
  const coverageIdx = text.indexOf("coverage: {");
  if (coverageIdx === -1) return [];
  const excludeIdx = text.indexOf("exclude: [", coverageIdx);
  if (excludeIdx === -1) return [];
  const open = text.indexOf("[", excludeIdx);
  const close = text.indexOf("]", open);
  const body = text.slice(open + 1, close);
  return [...body.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function productionSourceFiles(root) {
  return globSync(PRODUCTION_GLOBS, { cwd: root })
    .map(toPosix)
    .filter((path) => {
      const absolute = join(root, path);
      return existsSync(absolute) && statSync(absolute).isFile();
    });
}

/**
 * Module specifiers named by an import/export/require statement.
 *
 * The graph's dead-code detector reported this as unreachable on 2026-09-28,
 * alongside `productionImporters`, and removing it broke
 * `importGraphSnapshot` with a ReferenceError. It is used at the one place
 * that matters most: the import walk behind
 * `scripts/check-unimported-modules.mjs`. A detector that cannot see a use in
 * a file it is reporting on is a reason to verify, not to act.
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

// 6.0: `productionImporters` and `resolvesTo` were removed.
//
//   `productionImporters` was exported and imported by nothing — dead code in
//   the file whose whole job is to police dead code.
//   `resolvesTo` was private and reachable only from it. Its candidate list is
//   inlined at the one remaining call site, so the duplication went with it.
//
// `specifiersIn` looked dead in the same pass and was NOT: `importGraphSnapshot`
// uses it, and eslint caught the ReferenceError that removing it caused. The
// detector's list is a set of candidates, not verdicts.

/**
 * Entry points a user or a release pipeline can actually reach.
 *
 * Not just the CLI and the MCP server: this repository ships its release
 * GATES as npm scripts, and a module that only a gate imports is still
 * shipped surface — `certify` and `release:verify` run it on every commit.
 * The two `SHIPPED_SURFACE` rows that would otherwise be misfiled are
 * `src/ledger/m26-validators.ts` and `src/release/version-surface.ts`, both
 * reached only from here.
 */
const SHIPPED_ENTRY_POINTS = [
  "src/cli.ts",
  "src/mcp/server.ts",
  "scripts/check-m26-ledgers.ts",
  "scripts/check-version-surface.ts",
  "scripts/sync-version-surface.ts",
  "scripts/check-candidate-decision.mjs",
  "scripts/roadmap/check.ts",
];

/**
 * Modules reachable from a shipped surface, walked transitively.
 *
 * Why reachability and not declaration: a contract that is imported only by
 * other unwired contracts is still a contract. Declaring "it has an importer,
 * therefore it ships" produces false SHIPPED_SURFACE rows the moment a second
 * prototype imports the first — which is exactly what happens when a new
 * capability track's census module starts consuming a provider-capability
 * contract. The honest test is whether anything a user can invoke reaches it.
 */
/**
 * One snapshot of the import graph, for a whole validation pass.
 *
 * The first version of this module re-globbed and re-read the tree for every
 * ledger entry — forty-odd full walks per validation, which is
 * O(entries × tree). Under a parallel test run that pushed the guard past the
 * per-test timeout, so a CORRECT guard reported itself as a failure — the
 * worst possible failure mode, because it teaches you to ignore it.
 *
 * Reading the tree once turns the pass into a single walk plus in-memory
 * queries, and makes it deterministic in a second way: every question in a
 * pass is answered against the same view, so two entries can never disagree
 * about whether a file exists.
 */
export function importGraphSnapshot(root) {
  const files = productionSourceFiles(root);
  const byPath = new Map();
  for (const path of files)
    byPath.set(path, readFileSync(join(root, path), "utf8"));

  /** repo-relative path → the repo-relative modules it imports */
  const imports = new Map();
  /** repo-relative path → the repo-relative modules that import it */
  const importedBy = new Map();
  for (const path of files) {
    imports.set(path, []);
    if (!importedBy.has(path)) importedBy.set(path, []);
  }
  for (const path of files) {
    const text = byPath.get(path);
    for (const line of (text ?? "").split("\n")) {
      for (const specifier of specifiersIn(line)) {
        if (!specifier.startsWith(".")) continue;
        const resolved = resolvePath(join(root, path, ".."), specifier);
        for (const candidate of [
          resolved,
          resolved.replace(/\.js$/, ".ts"),
          resolved.replace(/\.mjs$/, ".mts"),
          resolved.replace(/\.js$/, ".tsx"),
        ]) {
          const rel = toPosix(relative(root, candidate));
          if (rel.startsWith("..") || !byPath.has(rel)) continue;
          imports.get(path).push(rel);
          importedBy.get(rel).push(path);
          break;
        }
      }
    }
  }
  return { files, byPath, imports, importedBy };
}

/**
 * Modules reachable from the shipped entry points, along DEPENDENCY edges.
 */
function reachableFrom(snapshot, entryPoints) {
  const seen = new Set();
  const queue = entryPoints.filter((path) => snapshot.byPath.has(path));
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined || seen.has(current)) continue;
    seen.add(current);
    // Follow the DEPENDENCY edge, not the reverse: a module is shipped if a
    // shipped entry point can reach it by importing it.
    for (const dependency of snapshot.imports.get(current) ?? []) {
      if (!seen.has(dependency)) queue.push(dependency);
    }
  }
  return seen;
}

export function shippedReachableModules(root) {
  return reachableFrom(importGraphSnapshot(root), SHIPPED_ENTRY_POINTS);
}

export function readLedger(root) {
  return JSON.parse(readFileSync(join(root, LEDGER_PATH), "utf8"));
}

/**
 * The command modules the CLI dispatch table actually registers, derived by
 * joining two facts in src/cli.ts: which symbol each `./commands/*.js` import
 * binds, and which verb key each handler symbol is wired to. Deriving it beats
 * filename guessing — `report-playwright.ts` ships as the `report` verb.
 */
function shippedCommandModules(root) {
  const cli = readFileSync(join(root, "src/cli.ts"), "utf8");
  const symbolByModule = new Map();
  for (const line of cli.split("\n")) {
    const match = line.match(
      /import\s*\{([^}]+)\}\s*from\s*"\.\/commands\/([^"]+)\.js"/,
    );
    if (!match) continue;
    const symbol = match[1].split(",")[0].trim();
    if (symbol) symbolByModule.set(`src/commands/${match[2]}.ts`, symbol);
  }
  const shipped = new Set();
  for (const line of cli.split("\n")) {
    const match = line.match(/^\s*"?[\w:-]+"?:[^=]*=>\s*(\w+)\(/);
    if (!match) continue;
    for (const [modulePath, symbol] of symbolByModule) {
      if (symbol === match[1]) shipped.add(modulePath);
    }
  }
  return shipped;
}

/**
 * Every way the ledger, the committed exclusion list, and the real import
 * graph can disagree. An empty array is the only passing state.
 */
export function validateCoverageExemptionLedger(root, options = {}) {
  const now = options.now ?? new Date();
  const problems = [];
  // `options.ledger` is the test seam: the rule set is what needs proving,
  // and proving it against the committed file alone can only ever show the
  // happy path. A caller can hand the evaluator a mutated ledger and read
  // back exactly which rule fired.
  const ledger = options.ledger ?? readLedger(root);
  const entries = ledger.entries ?? [];
  const committed = committedExclusions(root);

  if (ledger.schemaVersion !== 2) {
    problems.push(`schemaVersion must be 2, got ${ledger.schemaVersion}`);
  }

  // 1. The ledger and the committed list are the same set, in the same order.
  const ledgerPaths = entries.map((entry) => entry.path);
  if (JSON.stringify(ledgerPaths) !== JSON.stringify(committed)) {
    const missing = committed.filter((path) => !ledgerPaths.includes(path));
    const extra = ledgerPaths.filter((path) => !committed.includes(path));
    problems.push(
      `ledger/vitest.config.ts exclusion drift` +
        (missing.length ? `; unrecorded: ${missing.join(", ")}` : "") +
        (extra.length ? `; stale ledger rows: ${extra.join(", ")}` : ""),
    );
  }

  // Modules that are themselves recorded as unshipped are not a live caller:
  // a dead island is still dead, and requiring it to have zero bytes of
  // inbound edges would only forbid recording the shape honestly. The same
  // reasoning extends past the ledger: a contract imported only by other
  // unwired code is still a contract, so the live-caller test is REACHABILITY
  // from a shipped surface, not the mere existence of an importer.
  const unshipped = new Set(
    entries
      .filter((entry) => entry.classification !== "SHIPPED_SURFACE")
      .map((entry) => entry.path),
  );
  // One snapshot for the whole pass: the graph is read once and every entry's
  // question is answered against it. See importGraphSnapshot for why this is
  // a correctness property and not only a speed one.
  const snapshot = importGraphSnapshot(root);
  const reachable = reachableFrom(snapshot, SHIPPED_ENTRY_POINTS);
  const liveImporters = (path) =>
    (snapshot.importedBy.get(path) ?? []).filter(
      (importer) => !unshipped.has(importer) && reachable.has(importer),
    );

  for (const entry of entries) {
    const id = entry.path;
    if (!CLASSIFICATIONS.includes(entry.classification)) {
      problems.push(`${id}: unknown classification ${entry.classification}`);
    }
    if (
      typeof entry.justification !== "string" ||
      !entry.justification.trim()
    ) {
      problems.push(`${id}: justification missing`);
    }
    if (typeof entry.owner !== "string" || !entry.owner.trim()) {
      problems.push(`${id}: owner missing`);
    }
    if (typeof entry.shippedSurface !== "boolean") {
      problems.push(`${id}: shippedSurface must be a boolean`);
    }
    if (!entry.path.includes("*") && !isFile(root, entry.path)) {
      problems.push(`${id}: excluded path does not exist`);
    }

    if (entry.classification === "PERMANENT_STRUCTURAL") {
      if (
        typeof entry.structuralReason !== "string" ||
        !entry.structuralReason.trim()
      ) {
        problems.push(
          `${id}: PERMANENT_STRUCTURAL requires a structuralReason`,
        );
      }
      if (entry.reviewBy !== undefined) {
        problems.push(
          `${id}: PERMANENT_STRUCTURAL must not carry a reviewBy date`,
        );
      }
    } else {
      if (typeof entry.structuralReason !== "undefined") {
        problems.push(
          `${id}: only PERMANENT_STRUCTURAL may carry a structuralReason`,
        );
      }
      if (!ISO_DATE.test(entry.reviewBy ?? "")) {
        problems.push(`${id}: reviewBy must be an ISO date (YYYY-MM-DD)`);
      } else if (new Date(`${entry.reviewBy}T00:00:00Z`) < now) {
        problems.push(
          `${id}: review date ${entry.reviewBy} has passed — cover the file or delete it`,
        );
      }
      if (typeof entry.removalPlan !== "string" || !entry.removalPlan.trim()) {
        problems.push(`${id}: removalPlan missing`);
      }
    }

    // 2. The classification must match what the import graph actually shows,
    //    or the ledger is a claim rather than a record. A structural entry is
    //    evidenced by its structural reason, not by an inbound edge.
    if (entry.classification === "PERMANENT_STRUCTURAL") {
      if (
        entry.defectSignatures !== undefined ||
        entry.closureState !== undefined
      ) {
        problems.push(
          `${id}: PERMANENT_STRUCTURAL is evidenced by its structuralReason, not by a defect — it carries neither defectSignatures nor closureState`,
        );
      }
      continue;
    }
    // 2a. A prose-only entry is not permitted. Every non-structural entry
    //     carries EITHER regexes that must still match its file OR an
    //     explicit closure state — never neither, never both. A signature
    //     is a drift alarm, not a defect prover: it fires when the thing
    //     the entry is about changes, so a fix forces a ledger update in
    //     the same commit and drift becomes impossible rather than merely
    //     detectable. This is the same mechanism as
    //     tests/corpus/detector-hashes.json.
    const signatures = entry.defectSignatures;
    const closure = entry.closureState;
    const hasSignatures = Array.isArray(signatures) && signatures.length > 0;
    const hasClosure = typeof closure === "string" && closure.trim().length > 0;
    if (!hasSignatures && !hasClosure) {
      problems.push(
        `${id}: prose-only entry — carry defectSignatures (regexes that must still match this file) or an explicit closureState, never neither`,
      );
    }
    if (hasSignatures && hasClosure) {
      problems.push(
        `${id}: carries both defectSignatures and closureState — an entry either still has a surface worth pinning or is closed, not both`,
      );
    }
    if (hasSignatures) {
      if (entry.path.includes("*")) {
        problems.push(
          `${id}: a glob path has no source to match — use a structuralReason instead`,
        );
      } else {
        const source = readFileSync(join(root, entry.path), "utf8");
        for (const signature of signatures) {
          if (typeof signature !== "string" || signature.length === 0) {
            problems.push(
              `${id}: defectSignatures must be non-empty regex strings`,
            );
            continue;
          }
          let matched;
          try {
            matched = new RegExp(signature, "u").test(source);
          } catch (e) {
            problems.push(
              `${id}: defectSignature ${JSON.stringify(signature)} is not a valid regex: ${e instanceof Error ? e.message : String(e)}`,
            );
            continue;
          }
          if (!matched) {
            problems.push(
              `${id}: defect closed or drifted — signature ${JSON.stringify(signature)} no longer matches ${entry.path}. Remove or reclassify the entry, and record what changed.`,
            );
          }
        }
      }
    }

    const importers = liveImporters(entry.path);
    if (
      (entry.classification === "DEAD_CODE" ||
        entry.classification === "CONTRACT_ONLY") &&
      importers.length > 0
    ) {
      problems.push(
        `${id}: classified ${entry.classification} but imported by ${importers.join(", ")}`,
      );
    }
    if (entry.classification === "SHIPPED_SURFACE" && importers.length === 0) {
      problems.push(
        `${id}: classified SHIPPED_SURFACE but has no production importer`,
      );
    }
    if (entry.shippedSurface && importers.length === 0) {
      problems.push(`${id}: marked shippedSurface but nothing live imports it`);
    }
  }

  // 3. A command file is a shipped surface exactly when the dispatch table
  //    registers it. The ledger may not under-report a shipped verb.
  const shippedModules = shippedCommandModules(root);
  for (const entry of entries) {
    if (!entry.path.startsWith("src/commands/")) continue;
    const shipped = shippedModules.has(entry.path);
    if (shipped && entry.shippedSurface !== true) {
      problems.push(
        `${entry.path}: registered in the CLI dispatch but not marked shippedSurface`,
      );
    }
    if (!shipped && entry.shippedSurface === true) {
      problems.push(
        `${entry.path}: marked shippedSurface but not registered in the CLI dispatch`,
      );
    }
  }

  // 4. The shipped-surface count is a ratchet: it may fall, never rise.
  //    Structural entries are excluded — they are not debt with an end date.
  const shippedDebt = entries.filter(
    (entry) =>
      entry.shippedSurface && entry.classification !== "PERMANENT_STRUCTURAL",
  ).length;
  const ceiling = ledger.policy?.shippedSurfaceCeiling;
  if (typeof ceiling !== "number") {
    problems.push("policy.shippedSurfaceCeiling must be a number");
  } else if (shippedDebt > ceiling) {
    problems.push(
      `shipped-surface exemptions grew: ${shippedDebt} > ceiling ${ceiling}. Cover the file or remove the verb.`,
    );
  }

  return problems;
}
