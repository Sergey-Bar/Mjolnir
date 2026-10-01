#!/usr/bin/env node
/**
 * The Phase 0 carve manifest: what is actually in the areas the plan says to
 * manifest before deleting anything.
 *
 * The plan's own sentence for why this exists is the one worth repeating:
 * "several nominally-dead areas turned out load-bearing when checked, so
 * directory names are not evidence." `src/ledger/` sounds like bookkeeping.
 * It is 2,738 lines of M26 validators that four scripts import. `src/benchmark/`
 * sounds like a perf harness. It is a schema three release gates read. Reading
 * the directory name would have deleted both.
 *
 * So the manifest is PER FILE, and it records FACTS a reviewer can check rather
 * than a verdict:
 *
 *   importedBy   every module that imports it, resolved — the load-bearing
 *                fact, and the one the directory name lies about
 *   shipped      reachable by IMPORT from a shipped entry point
 *   testedBy     spec files that name it
 *   exports      the public surface a deletion would remove
 *   lines        the size of the decision
 *
 * Facts are generated; DISPOSITIONS are hand-written and preserved across
 * regeneration. That split is the point: the generator must never be able to
 * decide a file is safe to delete, only to publish the evidence for a human
 * decision, and `--check` fails when the committed facts stop matching the
 * tree so the evidence cannot rot into a stale green.
 *
 * Usage: node scripts/v6/carve-manifest.mjs [--check] [--root=<dir>]
 * Exit codes: 0 = facts match (or were written), 1 = drift or a manifest rule
 * failed, 10 = usage error.
 *
 * `--root` exists so the negative cases can be observed on a COPY of the tree.
 * The generator reads the tree to produce facts, so the only honest way to test
 * "a file left without a decision" is to remove a file and watch what happens —
 * which must never happen to the real tree. A gate whose own tests can only run
 * against production is a gate nobody runs.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import {
  importGraphSnapshot,
  shippedReachableModules,
} from "../lib/coverage-exemption-ledger.mjs";

const SELF_DIR = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_ROOT = resolve(SELF_DIR, "..", "..");
const ROOT = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  return flag === undefined
    ? DEFAULT_ROOT
    : resolve(flag.slice("--root=".length));
})();
const MANIFEST = join(ROOT, "docs", "CARVE-MANIFEST.json");

/**
 * The scope, exactly as §10 names it: these directories and these files.
 *
 * Kept as a literal list rather than a pattern, because the whole failure this
 * guards against is a rule that quietly covers more than the decision it was
 * written for. A new directory is not in the manifest until someone adds it.
 */
const SCOPE_DIRS = [
  "src/ledger",
  "src/gaps",
  "src/traceability",
  "src/benchmark",
  "src/v6",
  "src/release",
];
const SCOPE_FILES = [
  "src/capabilities.ts",
  "src/claim-evidence.ts",
  "src/store/legacy-import.ts",
];

const SOURCE_EXT = /\.(ts|mts|cts)$/;

function listSourceFiles(dir, out = []) {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) listSourceFiles(rel, out);
    else if (SOURCE_EXT.test(entry.name)) out.push(rel);
  }
  return out;
}

const scope = [
  ...SCOPE_DIRS.flatMap((dir) => listSourceFiles(dir)),
  ...SCOPE_FILES.filter((file) => existsSync(join(ROOT, file))),
].sort();

/** Every spec file that names a path, for the `testedBy` fact. */
function specFiles() {
  const out = [];
  const testsDir = join(ROOT, "tests");
  // A tree without `tests/` is a legitimate input — a fixture that only needs
  // the source half to answer "did a file leave without a decision". Answering
  // with an empty list keeps `testedBy` honest (no spec named it) instead of
  // crashing on a directory the caller never promised.
  if (!existsSync(testsDir)) return out;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".cache") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.spec\.(ts|mts|cts)$/.test(entry.name)) out.push(full);
    }
  };
  walk(testsDir);
  return out;
}

function lineCount(path) {
  return readFileSync(join(ROOT, path), "utf8").split("\n").length;
}

function exportedNames(path) {
  const text = readFileSync(join(ROOT, path), "utf8");
  const names = new Set();
  for (const m of text.matchAll(
    /export\s+(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(m[1]);
  }
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name !== undefined && name !== "") names.add(name);
    }
  }
  return [...names].sort();
}

function computeFacts() {
  const snapshot = importGraphSnapshot(ROOT);
  const shipped = shippedReachableModules(ROOT);
  const specs = specFiles().map((file) => ({
    path: relative(ROOT, file).replaceAll("\\", "/"),
    text: readFileSync(file, "utf8"),
  }));

  const files = {};
  for (const path of scope) {
    const base = path.replace(/\.ts$/, "");
    const importers = [...new Set(snapshot.importedBy.get(path) ?? [])].sort();
    const testedBy = specs
      .filter((s) => s.text.includes(path) || s.text.includes(base))
      .map((s) => s.path)
      .sort();
    files[path] = {
      lines: lineCount(path),
      exports: exportedNames(path).length,
      importedBy: importers,
      // A file with importers is not orphaned even if every importer is itself
      // orphaned, so the manifest records BOTH facts and lets the reader see
      // the difference. Collapsing them would hide the exactly-inverted cases
      // — a whole dead subtree reads identically to a single dead leaf.
      imported: importers.length > 0,
      shipped: shipped.has(path),
      testedBy,
    };
  }
  return files;
}

const committed = existsSync(MANIFEST)
  ? JSON.parse(readFileSync(MANIFEST, "utf8"))
  : null;

/**
 * Dispositions survive regeneration; facts do not.
 *
 * A generated `disposition` would let a re-run silently turn a DELETE decision
 * into a KEEP one (or the reverse) with no diff in the reviewed file, which is
 * the whole thing a manifest exists to prevent.
 */
function withPreservedDispositions(facts) {
  const previous = committed?.files ?? {};
  for (const path of Object.keys(facts)) {
    facts[path].disposition = previous[path]?.disposition ?? {
      action: "KEEP",
      reason:
        "Not yet adjudicated. The facts beside it are the evidence; the " +
        "decision is a reviewable edit to this file.",
    };
  }
  return facts;
}

function render(facts) {
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      manifestId: "mjolnir-carve-manifest-001",
      generatedBy: "scripts/v6/carve-manifest.mjs",
      note:
        "FACTS are generated; DISPOSITIONS are hand-written and preserved " +
        "across regeneration. Phase 0 admits every file with KEEP. A DELETE " +
        "disposition names the evidence that made deletion safe and the " +
        "commit that carries it — directory names are not evidence.",
      scope: { dirs: SCOPE_DIRS, files: SCOPE_FILES },
      files: facts,
    },
    null,
    2,
  )}\n`;
}

const args = process.argv.slice(2);
for (const arg of args) {
  if (arg === "--check" || arg.startsWith("--root=")) continue;
  console.error(
    `carve-manifest: unknown argument ${JSON.stringify(arg)}. Usage: ` +
      "node scripts/v6/carve-manifest.mjs [--check] [--root=<dir>]",
  );
  process.exit(10);
}

/**
 * A file the manifest lists that the tree no longer has.
 *
 * Legitimate exactly when its disposition says DELETE — that is the whole
 * point of a manifest, and the commit that removes the file is the record. Not
 * legitimate otherwise, because it means a file left the tree without anyone
 * having decided, which is the failure a manifest is supposed to make visible.
 */
function removedSinceCommit(previous, facts) {
  const out = [];
  for (const path of Object.keys(previous)) {
    if (facts[path] !== undefined) continue;
    const action = previous[path]?.disposition?.action;
    if (action === "DELETE") {
      out.push({ path, ok: true, why: "disposition says DELETE" });
    } else {
      out.push({
        path,
        ok: false,
        why: `disposition is ${action ?? "absent"} and the file is gone`,
      });
    }
  }
  return out;
}

const facts = withPreservedDispositions(computeFacts());
const removals = removedSinceCommit(committed?.files ?? {}, facts);
const next = render(facts);

if (args.includes("--check")) {
  if (!existsSync(MANIFEST)) {
    console.error(
      "carve-manifest: docs/CARVE-MANIFEST.json is missing. The manifest is " +
        "the artifact the carve reviews against; regenerating it is how a " +
        "deletion earns its place.",
    );
    process.exit(1);
  }
  const problems = removals.filter((r) => !r.ok);
  if (problems.length > 0) {
    console.error(
      "carve-manifest: FAIL — files left the tree without a DELETE disposition.",
    );
    for (const r of problems) console.error(`  - ${r.path}: ${r.why}`);
    console.error(
      "\nEither the file is coming back, or the disposition that authorised " +
        "its removal was never written. Those are different commits and the " +
        "diff should show which.",
    );
    process.exit(1);
  }
  const current = readFileSync(MANIFEST, "utf8");
  if (current === next) {
    const deleted = Object.values(facts).filter(
      (f) => f.disposition.action === "DELETE",
    ).length;
    console.log(
      `carve-manifest: PASS — ${Object.keys(facts).length} files, ` +
        `${deleted} marked DELETE, ${removals.length} already removed, ` +
        "facts match the tree.",
    );
    process.exit(0);
  }
  const currentParsed = JSON.parse(current);
  const drifted = Object.keys(facts).filter(
    (path) =>
      JSON.stringify(currentParsed.files?.[path]?.importedBy) !==
        JSON.stringify(facts[path].importedBy) ||
      JSON.stringify(currentParsed.files?.[path]?.testedBy) !==
        JSON.stringify(facts[path].testedBy) ||
      currentParsed.files?.[path]?.shipped !== facts[path].shipped ||
      currentParsed.files?.[path]?.lines !== facts[path].lines,
  );
  console.error(
    "carve-manifest: FAIL — the committed facts no longer match the tree.",
  );
  for (const path of drifted) console.error(`  - ${path}`);
  if (drifted.length === 0) {
    console.error(
      "  - a disposition was added or removed; re-run without --check and " +
        "review the diff before committing it",
    );
  }
  console.error("\nRegenerate with: node scripts/v6/carve-manifest.mjs");
  process.exit(1);
}

if (removals.some((r) => !r.ok)) {
  console.error(
    "carve-manifest: refusing to write. These files left the tree without a " +
      "DELETE disposition, and regenerating would drop them from the record:",
  );
  for (const r of removals.filter((x) => !x.ok)) {
    console.error(`  - ${r.path}: ${r.why}`);
  }
  process.exit(1);
}

writeFileSync(MANIFEST, next, "utf8");
const deleted = Object.values(facts).filter(
  (f) => f.disposition.action === "DELETE",
).length;
console.log(
  `carve-manifest: wrote docs/CARVE-MANIFEST.json — ${Object.keys(facts).length} ` +
    `files, ${deleted} marked DELETE, ${removals.length} already removed.`,
);
