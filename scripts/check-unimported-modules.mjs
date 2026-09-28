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

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
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
 * Committed 2026-09-28. Read with `node scripts/list-unimported-modules.mjs`
 * to regenerate the list; every addition needs a class and, for ORPHAN and
 * GAP, a reason.
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
  "src/qa/domain-model.ts":
    "GAP — cited by the v6 gap matrix as the missing domain model. Unwired, and it is the record of a known gap.",
  "src/plugins/sdk-contract.ts":
    "GAP — the plugin SDK contract. Named by the capability surface; unwired, and the record of what a plugin author would target.",
  "src/governance/m33-m34-contract.ts":
    "GAP — the control-plane contract for the M33/M34 governance work. Unwired by design until that wave lands.",
  "src/engine/m38-challenge-contract.ts":
    "GAP — the challenge contract for milestone 38. Unwired; the record of the interface that work will implement.",
  "src/engine/m40-language-expansion-contract.ts":
    "GAP — the language-expansion contract for milestone 40. Unwired; the record of the interface that work will implement.",
  "src/engine/m49-experience-parity-contract.ts":
    "GAP — the experience-parity contract for milestone 49. Unwired; the record of the interface that work will implement.",

  // ── ORPHANS: behaviour, no caller. The C2 class. ────────────────────────
  "src/change-intelligence.ts":
    "ORPHAN — the diff-scoped affected-path computation. 6.0 wires it; until then it is a prerequisite with no caller.",
  "src/v6/tool-coverage.ts":
    "ORPHAN — the tool-coverage v6 check. Its only would-be caller (test-doubles) is itself an orphan, so the pair is dead as a unit.",
  "src/store/legacy-import.ts":
    "ORPHAN — imports a legacy evidence store. The store it imports is reachable only from here, so neither has a caller.",
  "src/scorer/scoring-validation.ts":
    "ORPHAN — scoring self-validation. Nothing runs it, so the scoring model has no runtime check.",
  "src/rules/tier-evidence.ts":
    "ORPHAN — added by 6.0 (B3) and read by a spec only. Promoted here deliberately rather than deleted: the list it commits is the disclosure that no rule is core on evidence, and it becomes wired when the capability matrix renders it.",
  "src/rules/families/flaky-patterns.ts":
    "ORPHAN — a rule family with no registrar. Its siblings (assertion-quality, test-independence) are reachable; this one is not.",
  "src/rules/families/marker-registry.ts":
    "ORPHAN — the marker registry for the family framework. Nothing consults it, so the framework's markers resolve to nothing.",
  "src/rules/families/no-assertions.ts":
    "ORPHAN — a rule family with no registrar, like flaky-patterns.",
  "src/reporter/sarif-compliance.ts":
    "ORPHAN — SARIF conformance checks. The reporter does not consult them, so nothing verifies the SARIF it emits.",
  "src/release/pack-audit.ts":
    "ORPHAN — the packaged-tarball audit. Nothing in the release flow calls it, which is how the AST-grammar packaging defect survived.",
  "src/release/provenance.ts":
    "ORPHAN — release provenance. Not called by the release flow.",
  "src/release/reproducibility.ts":
    "ORPHAN — release reproducibility. Not called by the release flow.",
  "src/release/sbom.ts":
    "ORPHAN — the SBOM generator. The release workflow checksums and attaches an SBOM it does not produce from this module, so a second, unwired SBOM implementation exists.",
  "src/frameworks/universal-pack-contract.ts":
    "ORPHAN — the universal pack contract. Nothing consumes the interface it declares.",
  "src/integrations/github/github-permissions.ts":
    "ORPHAN — the GitHub permissions model. The workflow emitter (ci-adapter) does not consult it, which is the D5 defect: the generated workflow inherited the default token scope.",
  "src/integrations/github/stale-guard.ts":
    "ORPHAN — the stale-artifact guard. The PR publisher does not consult it, so a stale scan can overwrite a newer comment.",
  "src/mutation/failure-sensitivity.ts":
    "ORPHAN — the failure-sensitivity analysis. Nothing runs it.",
  "src/mutation/mutation-resilience.ts":
    "ORPHAN — the mutation-resilience harness. Nothing runs it.",
  "src/engine/command-registry.ts":
    "ORPHAN — a command registry. The CLI derives its verbs from src/cli.ts, so this second source of truth is not consulted.",
  "src/engine/coverage-ingestion.ts":
    "ORPHAN — ingests coverage for the evidence model. Nothing ingests it.",
  "src/engine/evidence-artifacts.ts":
    "ORPHAN — writes evidence artifacts. Nothing writes one.",
  "src/engine/evidence-enforcement.ts":
    "ORPHAN — enforces evidence. Nothing enforces it, so the enforcement is aspirational.",
  "src/engine/finalize-scan-result.ts":
    "ORPHAN — a finalize step outside the pipeline that uses it. The scan pipeline finalizes in place.",
  "src/engine/m43-system-of-systems.ts":
    "ORPHAN — the M43 system-of-systems model. Unwired; the record of that work's shape.",
  "src/engine/m44-historical-intelligence.ts":
    "ORPHAN — the M44 historical-intelligence model. Unwired; the record of that work's shape.",
  "src/engine/pipeline-stages.ts":
    "ORPHAN — a stage inventory for the scan pipeline. The pipeline does not read it, so it cannot drift-proof anything.",
  "src/engine/runtime-evidence-graph.ts":
    "ORPHAN — the runtime evidence graph. Nothing builds one.",
  "src/engine/runtime-static-correlation.ts":
    "ORPHAN — runtime/static correlation. Nothing correlates.",
  "src/engine/semantic-model-api.ts":
    "ORPHAN — a semantic-model API surface. No consumer.",
  "src/discovery/ecosystem-detection.ts":
    "ORPHAN — ecosystem detection. The adapters detect their own ecosystems, so this is a second implementation with no caller.",
  "src/commands/registry.ts":
    "ORPHAN — a command registry beside src/engine/command-registry.ts. Two registries, neither used by the CLI, which is a third source of truth for the verb list.",
  "src/certification/language-manifest.ts":
    "ORPHAN — the language certification manifest. The certification state machine does not read it.",
  "src/bench/m48-scale-operating-model.ts":
    "ORPHAN — the M48 scale operating model. Unwired; the record of that work's shape.",
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

if (problems.length > 0) {
  console.error("check-unimported-modules: FAILED");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      /** Modules under src/ that nothing in the repository imports. */
      unimported: actual.size,
      /** Roots the walk treats as callers at all — a scripts/ importer is a live gate or generator. */
      callerRoots: CALLER_ROOTS,
      /** Entries on the committed list, each with a class and a reason. */
      committed: committed.size,
    },
    null,
    2,
  ),
);
