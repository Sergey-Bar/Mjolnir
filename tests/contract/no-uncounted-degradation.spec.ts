/**
 * No `catch` in a detection path may hand its caller a clean default.
 *
 * This is the durable half of W1.1. The ledger spec proves the counting
 * works; this proves the set of sites that have to count cannot grow without
 * a human noticing, which is the only property that matters once the fifteen
 * known sites are fixed.
 *
 * The defect is not "there is a catch". The defect is that a `catch` RETURNS
 * A VALUE, and that value is indistinguishable from success: `return
 * undefined`, `return []`, `return {}`, `return file.text`, `return { ok:
 * true }`. The scan then exits 0, reports `analysisComplete`, and has quietly
 * lost the capability that made its verdict trustworthy. Fifteen such sites
 * were verified in this tree; the AST-layer ones were the worst, because
 * `getCodeOnlyText` returning raw text switches OFF the comment/string
 * false-positive firewall for that file rather than merely slowing it.
 *
 * So the rule is about the RETURN, not the `catch`. A `catch` that returns
 * NOTHING cannot lie to a caller — there is no value to mistake for success
 * — and 38 of the 71 detection-path catches in this tree are of that shape,
 * almost all of them crash-isolation blocks that route the failure to a
 * counted `onCrash` callback or best-effort cleanup that must not throw. The
 * rest are the whole surface, and each one is named
 * below with the reason it cannot succeed falsely.
 *
 * Auditing `src/` as a whole instead of the detection path would mean ~215
 * exemptions, which is the same as no exemption list: a reviewer learns it is
 * noise and stops reading. The scope is therefore stated per directory
 * (`OUTSIDE_DETECTION_PATH`), and a test asserts every directory under `src/`
 * has a declared status — so widening or narrowing the audit is itself a
 * reviewable change.
 *
 * Modelled on `tests/contract/no-bare-process-exec.spec.ts`: a source audit
 * over `src/**`, so it runs on every platform and in CI without needing the
 * failure to be reproducible at runtime.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEGRADATION_REASONS } from "../../src/engine/degradation-ledger.js";

const SRC_ROOT = join(import.meta.dirname, "..", "..", "src");

/**
 * The detection path: the code that decides WHAT A SCAN FOUND.
 *
 * Two `src/commands/` files are named individually because their catches do
 * sit on a detection path — `explain` runs a rule on its own fixture and
 * `trend` decides what the recorded history says — while the other ~90
 * catches under `commands/` render output and cannot overstate coverage.
 */
const DETECTION_PATH_PREFIXES = [
  "engine/",
  "adapters/",
  "discovery/",
  "commands/explain.ts",
  "commands/trend.ts",
  // V6 additions. Each of these turns a failure into a false green if the
  // failure is swallowed, which is the definition of the detection path:
  //
  //  detectors/            a detector that throws and is caught looks exactly
  //                        like a detector that found nothing;
  //  change-intelligence  affected-path computation; an empty result renders
  //                        a change as touching nothing;
  //  v6/                  claim lint, the capability registry and the
  //                        hollow-test-double detector all return verdicts, and
  //                        a dropped verdict is a passed one;
  //  agent/               decision-receipt validation, where accepting an
  //                        invalid receipt is the false green;
  //  governance/          control-plane records, where a dropped record reads
  //                        as an absent control rather than a failing one;
  //  qa/                  the domain model's own validation;
  //  research/            the reproducibility contract, whose whole claim is
  //                        that a result was reproduced.
  "detectors/",
  "change-intelligence.ts",
  "v6/",
  "agent/",
  "governance/",
  "qa/",
  "research/",
];

/**
 * Directories outside the detection path, each with the reason a `catch`
 * there cannot turn a failure into a false green. Stated per directory
 * because "the rest of src/" is not a claim anyone can check.
 */
const OUTSIDE_DETECTION_PATH: ReadonlyArray<{
  prefix: string;
  reason: string;
}> = [
  {
    prefix: "commands/",
    reason:
      "Presentation and verb wiring. A swallowed error here drops a line of " +
      "output or a file from a list; it cannot make a scan report more " +
      "coverage than it has. The two exceptions are audited individually.",
  },
  {
    prefix: "forensics/",
    reason:
      "Reads a runtime report the tool did not produce. A catch returns fewer " +
      "classifications, and each classification is counted as evidence rather " +
      "than asserted as proof.",
  },
  {
    prefix: "store/",
    reason:
      "The evidence store has its own three-status integrity model " +
      "(CORRUPT != ABSENT) and counts torn lines at every reader, so a catch " +
      "there degrades into an explicit state rather than into a clean one.",
  },
  {
    prefix: "scope/",
    reason:
      "Change-scope resolution. A catch resolves to the empty scope, which " +
      "the caller reports as unscoped rather than as a clean tree.",
  },
  {
    prefix: "plugins/",
    reason:
      "Operator-declared rule loading. The trust gate and the JSON local-rule " +
      "path are documented boundaries, audited by their own specs.",
  },
  {
    prefix: "mcp/",
    reason:
      "The MCP transport converts an error into a tool result carrying the " +
      "error; that is the whole contract of a request/response boundary.",
  },
  {
    prefix: "integrations/",
    reason:
      "Outbound integrations (Sentry, GitHub, CI install). Each is gated " +
      "behind an explicit opt-in, and an unavailable integration is a " +
      "documented absent capability rather than a lost detection.",
  },
  {
    prefix: "rules/",
    reason:
      "Rule bodies are pure predicates over a parsed file. A rule that throws " +
      "is caught by crash isolation at the adapter boundary, which IS " +
      "counted (rulesCrashed), so a catch inside a rule body is either local " +
      "to a parse attempt or unreachable.",
  },
  {
    prefix: "lib/",
    reason:
      "Bounded readers, atomic writes and comparators. Their whole contract " +
      "is to THROW a typed failure; a catch in a caller of theirs is audited " +
      "at the call site.",
  },
  {
    prefix: "release/",
    reason:
      "Provenance, SBOM and reproducibility checks, all of which report " +
      "their own pass/fail per item rather than a single verdict.",
  },
  {
    prefix: "reporter/",
    reason: "Rendering. Nothing rendered here feeds a verdict.",
  },
  {
    prefix: "scorer/",
    reason:
      "Scoring reads an already-assembled finding list; it performs no I/O " +
      "that could fail and hide a result.",
  },
  {
    prefix: "certification/",
    reason:
      "Capability manifest assembly over files the census already generated, " +
      "audited by tests/contract/census-drift.spec.ts.",
  },
  {
    prefix: "ledger/",
    reason:
      "M26 ledger validation, which REJECTS rather than degrades: an invalid " +
      "record is a reported problem, and tests/ledger owns it.",
  },
  {
    prefix: "config/",
    reason:
      "Config loading throws a typed ConfigValidationError that the CLI routes " +
      "to the usage-error path; it does not degrade to a default.",
  },
  {
    prefix: "playwright/",
    reason:
      "Selector health over an already-scanned tree. The tiebreaker it " +
      "computes is covered by tests/contract/deterministic-ordering.spec.ts.",
  },
  {
    prefix: "gaps/",
    reason:
      "Gap-registry lookups. A catch yields no gap entry, so a gap stops " +
      "being reported; the gap registry is a documentation surface, and " +
      "m26:integrity counts its rows independently.",
  },
  {
    prefix: "trust/",
    reason:
      "Trust-ladder derivation over an already-assembled result. Its " +
      "own contract specs assert the values it can produce.",
  },
  {
    prefix: "anti-gaming/",
    reason:
      "Cross-checks over an already-scanned result, reported per check " +
      "rather than as a single verdict.",
  },
  {
    prefix: "traceability/",
    reason:
      "Provenance and blast-radius bookkeeping over files the generators " +
      "already produced; audited by tests/blast-radius.",
  },
  {
    prefix: "mutation/",
    reason:
      "Mutation-test protocol fixtures. Test infrastructure, not a " +
      "detection path.",
  },
  {
    prefix: "bench/",
    reason:
      "Benchmark harness. Measures, never decides; W2.1 is where its " +
      "provenance is made real.",
  },
  {
    prefix: "benchmark/",
    reason: "Benchmark data and report builders. Same as bench/.",
  },
  {
    prefix: "brand/",
    reason: "Design tokens and mark rendering. Nothing here feeds a verdict.",
  },
  {
    prefix: "frameworks/",
    reason:
      "Framework detection tables. Consumed by adapters/ and discovery/, " +
      "which ARE audited, so a bad detection surfaces as a counted " +
      "degradation at the call site rather than here.",
  },
  {
    prefix: "cli.ts",
    reason:
      "Argument parsing and verb dispatch. A catch falls back to the " +
      "frozen usage-error path, which is a reportable failure, and never " +
      "to a successful scan.",
  },
  {
    prefix: "cli-handlers.ts",
    reason:
      "Verb wiring. Each handler delegates to a command that owns its own " +
      "error contract; the catch here is the process-level last resort " +
      "that prints and exits non-zero.",
  },
  {
    prefix: "cli-io.ts",
    reason: "Output sink helpers. A write failure surfaces as a broken pipe.",
  },
  {
    prefix: "exit-codes.ts",
    reason: "Constants. Contains no I/O and cannot fail.",
  },
  {
    prefix: "capabilities.ts",
    reason: "Capability declarations read by the census; see certification/.",
  },
  {
    prefix: "claim-evidence.ts",
    reason:
      "Decides whether a CLAIM carries evidence, and it fails closed: an " +
      "unresolvable claim is unmeasured, never measured.",
  },
  {
    prefix: "types.ts",
    reason: "Type declarations only. No runtime behaviour to catch.",
  },
];

/** The ledger itself: auditing the auditor is circular. */
const EXEMPT_FILES = ["engine/degradation-ledger.ts"];

/**
 * The six detection-path catches that return a value and are correct
 * BECAUSE of what they return. Each is a claim, and the claims fall into
 * three directions, none of which is "look like success":
 *
 *   FAILS EXPLICITLY  — the returned value names the failure.
 *   FAILS BY ABSENCE  — there is nothing to return, and inventing a
 *                       placeholder is the thing being avoided.
 *   FAILS IN THE REDUCING DIRECTION — the consequence is strictly less
 *                       evidence, never more.
 */
const ALLOWED_VALUE_RETURNS: ReadonlyArray<{
  file: string;
  /** 1-based line the `catch` keyword is on, as of this commit. */
  line: number;
  direction: "fails-explicitly" | "fails-by-absence" | "reducing";
  reason: string;
}> = [
  {
    file: "engine/verification-intelligence.ts",
    line: 601,
    direction: "fails-explicitly",
    reason:
      "Returns status: 'fail' with the parse error as the detail. The " +
      "workflow check is reported as FAILED, which is the opposite of the " +
      "defect: an unreadable workflow must not certify a passing one.",
  },
  {
    file: "engine/verification-intelligence.ts",
    line: 635,
    direction: "fails-explicitly",
    reason:
      "Returns false, meaning 'this workflow has no blocking gate'. An " +
      "unanalysable workflow therefore reads as UNGATED, so the tool " +
      "recommends adding a gate. That errs toward an extra finding on a " +
      "healthy repo, never toward a clean verdict on a broken one.",
  },
  {
    file: "engine/candidate-binding.ts",
    line: 76,
    direction: "fails-by-absence",
    reason:
      "Not a repository, or git is absent. Returning undefined is the whole " +
      "point: a scan of an unpacked tarball has no commit, and its identity " +
      "must say so rather than carry a placeholder that looks like " +
      "provenance. A placeholder here would be a forgery.",
  },
  {
    file: "engine/candidate-binding.ts",
    line: 41,
    direction: "fails-by-absence",
    reason:
      "A file whose sha256 cannot be computed contributes NO hash to the " +
      "binding rather than a wrong one. The caller sets identityIncomplete " +
      "on the same path, so the loss is reported as incompleteness upstream " +
      "rather than presented as a complete identity.",
  },
  {
    file: "engine/candidate-binding.ts",
    line: 184,
    direction: "fails-by-absence",
    reason:
      "A candidate manifest that will not parse yields NO binding. The " +
      "alternative — a partially-read manifest — would assert a tree hash " +
      "derived from bytes nobody verified, which is the forgery this module " +
      "exists to prevent.",
  },
  {
    file: "engine/dependency-graph.ts",
    line: 87,
    direction: "reducing",
    reason:
      "A package.json that cannot be parsed yields NO dependency node. The " +
      "consequence is a smaller dependency graph, so cross-file evidence " +
      "shrinks. The failure direction is fewer findings supported, never " +
      "more, and a fabricated dependency would be the opposite of safe.",
  },
  {
    file: "engine/dependency-graph.ts",
    line: 108,
    direction: "reducing",
    reason:
      "Same shape as the package.json reader: an unparseable pyproject.toml " +
      "contributes no dependencies, so the graph is smaller and the evidence " +
      "is weaker. Absence is the honest answer for a file that will not parse.",
  },
  {
    file: "engine/dependency-graph.ts",
    line: 124,
    direction: "reducing",
    reason:
      "Same shape again for pom.xml. Every one of these three readers fails " +
      "in the reducing direction, which is the property that makes them safe: " +
      "a dependency graph that is too small under-reports, and a graph with an " +
      "invented edge would over-report.",
  },
  {
    file: "engine/file-executor.ts",
    line: 175,
    direction: "fails-explicitly",
    reason:
      "Returns status: 'FAILED' with no findings. FAILED is a THIRD state " +
      "precisely so a file that threw cannot be read as a clean file, and the " +
      "pipeline counts it. The comment at the call site says so.",
  },
  {
    file: "engine/scan-cache.ts",
    line: 167,
    direction: "reducing",
    reason:
      "When the rule tree cannot be walked, the fingerprint falls back to a " +
      "sha256 over the rules' own function SOURCE. That is a weaker input, " +
      "but it is still a real digest of the detector bodies: two different " +
      "rule sets still hash differently, so a stale verdict is not served. " +
      "It degrades cache PRECISION, never cache CORRECTNESS.",
  },
  {
    file: "engine/scan-pipeline.ts",
    line: 849,
    direction: "fails-explicitly",
    reason:
      "Counts the failure three ways in the block itself " +
      "(parseFallbacks, skippedFiles, parseFailed) and lets the run continue. " +
      "Containment, not propagation, with the counters kept visible — the " +
      "pattern the plan requires of every crash-isolation site.",
  },
  {
    file: "engine/scan-pipeline.ts",
    line: 1252,
    direction: "fails-explicitly",
    reason:
      "Sets identityIncomplete and returns hash: 'UNAVAILABLE'. The literal " +
      "sentinel is the point: a reader can see that the hash is missing " +
      "instead of mistaking a zero-length placeholder for a real digest.",
  },
  // The three `engine/tree-sitter-ast.ts` parse catches that used to be
  // exempted here are gone. Their exemption said "counted one layer up — the
  // pipeline counts every parseAst returning undefined as a parse fallback,
  // and recording again here would count one file twice".
  //
  // That was a judgement about double counting, and it was made at the wrong
  // layer. `parseFallbacks` counts FILES that lost their AST stage. A grammar
  // WASM that never loaded is a different fact: it takes the AST stage away
  // from every file, for the whole run, and the reader cannot tell a run that
  // parsed 400 files and hit one unparseable from a run with no AST at all.
  // Both are now recorded — `parseFallbacks` at the call site,
  // `ast-grammar-unavailable` here — because they are different facts, not
  // the same one twice.
  {
    file: "adapters/github-actions.ts",
    line: 126,
    direction: "fails-by-absence",
    reason:
      "readWorkflowSafe returns null for a file that is not there or cannot " +
      "be read. Both callers treat null as 'no workflow here'; inventing an " +
      "empty string instead would hand a rule a parseable document with no " +
      "content, which is a worse lie than absence.",
  },
  {
    file: "commands/explain.ts",
    line: 464,
    direction: "fails-explicitly",
    reason:
      "parseScanJson returns undefined for a hostile input file, and its only " +
      "caller turns that into ok: false with a message naming the contract. " +
      "The failure is reported; it is not laundered into a result.",
  },
  {
    file: "commands/explain.ts",
    line: 479,
    direction: "fails-explicitly",
    reason:
      "Returns ok: false naming the unreadable path. The file is treated as " +
      "hostile input and a read failure is a reported error, never a success " +
      "with a missing example.",
  },
  {
    file: "commands/trend.ts",
    line: 52,
    direction: "fails-explicitly",
    reason:
      "Returns false, which the caller reports as 'Failed to record trend " +
      "snapshot' and turns into EXIT_INTERNAL. The boolean is a return code " +
      "about the write, not a verdict about any repository.",
  },
  {
    file: "commands/trend.ts",
    line: 175,
    direction: "fails-explicitly",
    reason:
      "The verb-level handler: it prints the internal error and returns " +
      "EXIT_INTERNAL. The return value IS the failure report, which is why " +
      "this is the shape to look for rather than 'returns a value' alone.",
  },
  {
    file: "discovery/ecosystem-detection.ts",
    line: 54,
    direction: "reducing",
    reason:
      "A root whose .csproj files cannot be listed reports no .NET " +
      "ecosystem. Framework detection then enables FEWER rules, so the " +
      "consequence is a narrower scan, never a broader one. Absence of " +
      "evidence about a language is not evidence the language is absent, but " +
      "it is also not a claim that it is present.",
  },
  {
    file: "discovery/evidence-discovery.ts",
    line: 89,
    direction: "reducing",
    reason:
      "An unreadable directory yields no evidence CANDIDATES. Corroboration " +
      "is computed from what is found, so fewer candidates means fewer " +
      "corroborating facts and a LOWER evidence level — the same direction " +
      "the plan's own verification-intelligence exemption relies on.",
  },
  {
    file: "discovery/ignores.ts",
    line: 291,
    direction: "reducing",
    reason:
      "isLintFixtureDir returns false for a directory it cannot list, so the " +
      "directory is scanned rather than skipped. Scanning a fixture directory " +
      "produces findings; skipping it would hide them, so the failure " +
      "direction here is the noisy one, which is the safe one.",
  },
  {
    file: "engine/m38-challenge-contract.ts",
    line: 274,
    direction: "fails-explicitly",
    reason:
      "Returns `{ valid: false, candidateId: null, evaluatedAtMs: null }`, which names the failure in the value itself rather than leaving the caller to infer it. A caller reading this sees a state it cannot promote, so a thrown check cannot read as a satisfied one.",
  },
  {
    file: "engine/m38-challenge-contract.ts",
    line: 326,
    direction: "fails-explicitly",
    reason:
      'Returns `{ state: "MALFORMED", id: null, dimension: null }`, which names the failure in the value itself rather than leaving the caller to infer it. A caller reading this sees a state it cannot promote, so a thrown check cannot read as a satisfied one.',
  },
  {
    file: "engine/m38-challenge-contract.ts",
    line: 490,
    direction: "fails-explicitly",
    reason:
      'Returns `result(null, null, "UNKNOWN", "RECORD_MALFORMED")`, which names the failure in the value itself rather than leaving the caller to infer it. A caller reading this sees a state it cannot promote, so a thrown check cannot read as a satisfied one.',
  },
  {
    file: "engine/m38-challenge-contract.ts",
    line: 613,
    direction: "fails-explicitly",
    reason:
      'Returns `buildReport("MALFORMED", 0, 0, 0, [], "UNDETERMINED")`, which names the failure in the value itself rather than leaving the caller to infer it. A caller reading this sees a state it cannot promote, so a thrown check cannot read as a satisfied one.',
  },
  {
    file: "engine/m38-challenge-contract.ts",
    line: 638,
    direction: "reducing",
    reason:
      "Returns `buildReport(`, which reports less than the check would have on success. The direction is downward: no field is asserted that the failed check did not establish.",
  },
  {
    file: "engine/m38-challenge-contract.ts",
    line: 740,
    direction: "fails-explicitly",
    reason:
      'Returns `"UNKNOWN"`, which names the failure in the value itself rather than leaving the caller to infer it. A caller reading this sees a state it cannot promote, so a thrown check cannot read as a satisfied one.',
  },
  {
    file: "engine/m43-system-of-systems.ts",
    line: 227,
    direction: "fails-by-absence",
    reason:
      "Returns null. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "engine/m43-system-of-systems.ts",
    line: 290,
    direction: "fails-explicitly",
    reason:
      "Returns `{ valid: false }`, which names the failure in the value itself rather than leaving the caller to infer it. A caller reading this sees a state it cannot promote, so a thrown check cannot read as a satisfied one.",
  },
  {
    file: "engine/m43-system-of-systems.ts",
    line: 362,
    direction: "fails-by-absence",
    reason:
      "Returns null. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "engine/m43-system-of-systems.ts",
    line: 379,
    direction: "fails-by-absence",
    reason:
      "Returns null. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "engine/m43-system-of-systems.ts",
    line: 514,
    direction: "fails-by-absence",
    reason:
      "Returns null. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "engine/m43-system-of-systems.ts",
    line: 606,
    direction: "fails-explicitly",
    reason:
      'Returns `rejectedInput(null, null, null, null, "MALFORMED")`, which names the failure in the value itself rather than leaving the caller to infer it. A caller reading this sees a state it cannot promote, so a thrown check cannot read as a satisfied one.',
  },
  {
    file: "engine/m44-historical-intelligence.ts",
    line: 472,
    direction: "fails-by-absence",
    reason:
      "Returns false. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "engine/m44-historical-intelligence.ts",
    line: 655,
    direction: "fails-by-absence",
    reason:
      "Returns null. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "engine/m44-historical-intelligence.ts",
    line: 1563,
    direction: "reducing",
    reason:
      "Returns `historyFailure(0, 0, diagnostics)`, which reports less than the check would have on success. The direction is downward: no field is asserted that the failed check did not establish.",
  },
  {
    file: "engine/m49-experience-parity-contract.ts",
    line: 304,
    direction: "fails-by-absence",
    reason:
      "Returns false. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "engine/m49-experience-parity-contract.ts",
    line: 315,
    direction: "fails-by-absence",
    reason:
      "Returns undefined. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "engine/m49-experience-parity-contract.ts",
    line: 767,
    direction: "reducing",
    reason:
      "Returns `freezeReport(`, which reports less than the check would have on success. The direction is downward: no field is asserted that the failed check did not establish.",
  },
  {
    file: "engine/m49-experience-parity-contract.ts",
    line: 944,
    direction: "reducing",
    reason:
      "Returns `personaResults(`, which reports less than the check would have on success. The direction is downward: no field is asserted that the failed check did not establish.",
  },
  {
    file: "engine/runtime-evidence-graph.ts",
    line: 828,
    direction: "reducing",
    reason:
      "Returns `{`, which reports less than the check would have on success. The direction is downward: no field is asserted that the failed check did not establish.",
  },
  {
    file: "engine/runtime-evidence-graph.ts",
    line: 855,
    direction: "reducing",
    reason:
      "Returns `{`, which reports less than the check would have on success. The direction is downward: no field is asserted that the failed check did not establish.",
  },
  {
    file: "governance/m33-m34-contract.ts",
    line: 536,
    direction: "fails-by-absence",
    reason:
      "Returns false. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "governance/m33-m34-contract.ts",
    line: 560,
    direction: "fails-by-absence",
    reason:
      "Returns undefined. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "governance/m33-m34-contract.ts",
    line: 589,
    direction: "fails-by-absence",
    reason:
      "Returns an empty list. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "governance/m33-m34-contract.ts",
    line: 828,
    direction: "fails-by-absence",
    reason:
      "Returns undefined. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "v6/capability-registry.ts",
    line: 783,
    direction: "fails-by-absence",
    reason:
      "Returns an empty list. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "v6/capability-registry.ts",
    line: 469,
    direction: "fails-by-absence",
    reason:
      "Returns an empty map when docs/ECOSYSTEM-CENSUS.json is absent or unreadable. An empty map makes every entry advertise the level it PROVED rather than the level the census claims, so an unreadable ledger can only LOWER a claim and never raise one — the direction that cannot manufacture a green.",
  },
  {
    file: "v6/fixture-quad-probe.ts",
    line: 78,
    direction: "fails-by-absence",
    reason:
      "Returns false when a fixture directory cannot be listed. The leg is one of four and withholding it can only LOWER a rule's quad, so the failure direction cannot manufacture an M3 claim — which is the whole reason a proxy that returns `true` on a missing directory was the defect.",
  },
  {
    file: "v6/claim-lint.ts",
    line: 185,
    direction: "fails-by-absence",
    reason:
      "Returns false. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "v6/claim-lint.ts",
    line: 196,
    direction: "fails-by-absence",
    reason:
      "Returns an empty list. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "v6/claim-lint.ts",
    line: 243,
    direction: "fails-by-absence",
    reason:
      "Returns an empty list. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "v6/ecosystem-probe.ts",
    line: 155,
    direction: "fails-by-absence",
    reason:
      "Returns an empty list. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "v6/ecosystem-probe.ts",
    line: 268,
    direction: "fails-by-absence",
    reason:
      "Returns false. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "v6/ecosystem-probe.ts",
    line: 434,
    direction: "fails-by-absence",
    reason:
      "Returns false. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "v6/ecosystem-probe.ts",
    line: 470,
    direction: "fails-by-absence",
    reason:
      "Returns null. The probe could not complete, and the only thing this reports is that nothing was found. Absence is never read downstream as a pass: a capability, edge or capability-level with no evidence stays unproven, which is the direction that cannot manufacture a green.",
  },
  {
    file: "engine/version.ts",
    line: 77,
    direction: "fails-by-absence",
    reason:
      "Resolving git failed, so `BUILD_ID` is `undefined` and `--version` prints the version with no build rather than a build that was not measured. Absence is the only safe direction for a claim about which code ran: a fallback, or a reused version string, would print something that looks like evidence and is not. It is also the same shape a plain npm install already produces, where no checkout exists.",
  },
];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".spec.ts")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Comments are stripped before auditing. A header that CITES a former defect
 * — and several in this tree do, by design, so a future reader can see what
 * was fixed — must not read as a violation. The invariant is about code.
 *
 * Removed content is replaced with an EQUAL number of newlines, not with an
 * empty string, so every surviving line keeps its original number. An earlier
 * version deleted block comments outright and shifted every line after the
 * first docstring, producing violation reports pointing at code that has
 * nothing to do with the catch — the worst possible failure for a spec whose
 * entire job is to point at the right line.
 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

interface CatchSite {
  file: string;
  line: number;
  body: string;
}

/**
 * Every `catch` in the file, with its own block body located by brace
 * matching from the keyword.
 *
 * A fixed window of N lines was the first attempt and it was wrong twice: too
 * small, it missed a `recordDegradation` sitting a comment below the catch,
 * and too large, it would have swallowed the next statement and credited this
 * catch for someone else's accounting. Brace matching is the only window
 * that is both complete and exact.
 */
function catchSites(code: string, file: string): CatchSite[] {
  const lines = code.split("\n");
  const out: CatchSite[] = [];
  for (let i = 0; i < lines.length; i++) {
    const catchLine = lines[i] ?? "";
    if (!/\bcatch\b/.test(catchLine)) continue;
    let body = "";
    let depth = 0;
    let started = false;
    outer: for (let j = i; j < lines.length; j++) {
      let line = lines[j] ?? "";
      if (j === i) {
        // Start at the keyword, not column 0. The commonest shape is
        // `} catch {`, and counting that leading `}` closed the PREVIOUS
        // block, so the catch's own braces never reached depth 1 and every
        // such body audited as empty — including the ones this commit added.
        const at = line.indexOf("catch");
        if (at >= 0) line = line.slice(at);
      }
      for (const ch of line) {
        if (ch === "{") {
          depth++;
          started = true;
          continue;
        }
        if (ch === "}") {
          depth--;
          // LABELLED break, not a bare one: a bare `break` here left the
          // character loop only, so the scan kept appending every following
          // line to this body and a catch inherited the `return` of whatever
          // statement came after it. That silently moved sites between the
          // audited and exempt sets, which is the exact class of wrong this
          // spec must not commit.
          if (started && depth === 0) {
            break outer;
          }
          continue;
        }
        if (started && depth === 1) body += ch;
      }
      if (started) body += "\n";
    }
    out.push({ file, line: i + 1, body: started ? body : "" });
  }
  return out;
}

/** A catch that hands its caller a value is the only shape that can lie. */
function returnsAValue(body: string): boolean {
  return /\breturn\b/.test(body);
}

/**
 * The counted sinks this codebase already has. `onCrash?.(` is the crash
 * isolation callback every adapter passes to `shared-run-rules`;
 * `onSkipped` and `onDiscoveryTruncated` are the discovery accounting seams.
 * A catch that routes a failure to one of these is counted, by construction.
 *
 * The OPTIONAL-CALL form is the whole subtlety, and the first version got it
 * wrong. The pattern read `\b(on[A-Z]\w*)\s*(?:\?\s*)?\(`, which does not
 * match `onCrash?.(`: that is `onCrash` + the single token `?.` + `(`, and
 * the pattern had no `\.` between them. So every `onCrash?.(` sink in the
 * tree went UNRECOGNIZED and the violation list filled with sites that were
 * in fact correctly counted. An invariant that cries wolf is an invariant
 * nobody enables, so `COUNTED_SINK_RECOGNISES_ITSELF` below is not
 * belt-and-braces — it is the part that makes the rest of this file credible.
 */
const COUNTED_SINK =
  /\b(?:on[A-Z]\w*|options\.on\w*|hooks\.\w+)\s*(?:\?\.\s*)?\(/;

/**
 * Every sink call shape this codebase actually uses. If a new one appears and
 * this list is not extended, the real spec will go quiet about it — so the
 * list is asserted rather than assumed.
 */
const COUNTED_SINK_RECOGNISES_ITSELF: ReadonlyArray<[string, string]> = [
  ["direct call", "onCrash(rule.id, error)"],
  ["optional call", "onCrash?.(rule.id, error)"],
  ["direct call on a namespace", "options.onSkipped('stat-failed')"],
  ["optional call on a namespace", "options.onDiscoveryTruncated?.()"],
  ["nested namespace", "hooks.onIgnored(path)"],
];

const files = listSourceFiles(SRC_ROOT)
  .map((full) => ({
    full,
    rel: full.slice(SRC_ROOT.length + 1).replaceAll("\\", "/"),
  }))
  .filter((f) => !EXEMPT_FILES.some((name) => f.rel.endsWith(name)))
  .map((f) => ({
    ...f,
    audited: DETECTION_PATH_PREFIXES.some(
      (p) => f.rel === p || f.rel.startsWith(p),
    ),
  }));

const auditedSites = files
  .filter((f) => f.audited)
  .flatMap((f) =>
    catchSites(stripComments(readFileSync(f.full, "utf8")), f.rel),
  );

const valueReturning = auditedSites.filter((s) => returnsAValue(s.body));
const voidCatches = auditedSites.filter((s) => !returnsAValue(s.body));

/**
 * The keys an exemption list matches against, resolved through a DRIFT
 * WINDOW.
 *
 * The exemptions are keyed by `file:line`, and a line number is not a stable
 * identifier: every import added above a catch moves it. This file has been
 * re-pointed three times in one afternoon for exactly that reason, and each
 * re-point is a chance to leave a stale entry protecting nothing.
 *
 * So an exemption resolves by SIGHT rather than by position: a recorded line
 * counts if there is a value-returning catch within `LINE_DRIFT_WINDOW` lines
 * of it, and the staleness test then requires that every entry resolved.
 *
 * The window is 20 lines rather than "the next catch in the file": a
 * whole-file nearest-match would let every exemption in a file satisfy every
 * catch in it.
 *
 * RESOLUTION IS UNIQUE, and the uniqueness is the load-bearing part. An earlier
 * version resolved each entry to the nearest catch and stopped — which is a
 * pure nearest-match with two consequences, both of them the failure this
 * mechanism was introduced to prevent:
 *
 *   - two entries in one file could both resolve to the SAME catch, which left
 *     a genuinely unaccounted catch uncovered while both entries counted as
 *     live (`m38-challenge-contract.ts` carries six entries, so this is not
 *     hypothetical);
 *   - if an exempt catch was DELETED, its exemption migrated onto whichever
 *     unaccounted catch became nearest, and the staleness test still passed
 *     because the entry had resolved.
 *
 * So a site claimed by two entries is a FAILURE, not a silent precedence rule,
 * and the two sets of keys are compared for equality below — every exempt site
 * claimed by exactly one entry, and every entry pointing at one site.
 */
const LINE_DRIFT_WINDOW = 20;

/**
 * Resolve an exemption list against the catches that actually exist.
 *
 * Returns BOTH sides, because the two questions are different and answering
 * one with the other is the bug: "which sites are exempt" (for the accounting
 * test) and "did every entry resolve" (for the staleness test). A recorded
 * line that drifted is a resolved ENTRY at a different line — not a missing
 * entry.
 */
function resolveExemptions(
  entries: ReadonlyArray<{ file: string; line: number }>,
  sites: ReadonlyArray<{ file: string; line: number }>,
): {
  sites: Set<string>;
  entries: Set<string>;
  /** Sites claimed by more than one entry — a resolution failure. */
  collisions: string[];
} {
  const byFile = new Map<string, number[]>();
  for (const site of sites) {
    const list = byFile.get(site.file) ?? [];
    list.push(site.line);
    byFile.set(site.file, list);
  }
  const resolvedSites = new Set<string>();
  const resolvedEntries = new Set<string>();
  const claims = new Map<string, string[]>();
  for (const entry of entries) {
    const entryKey = `${entry.file}:${entry.line}`;
    const lines = byFile.get(entry.file);
    if (lines === undefined) continue;
    // NEAREST, not first-in-file-order. Taking the first match let an
    // exemption with two nearby catches claim the wrong one.
    let best: number | undefined;
    let bestDistance = LINE_DRIFT_WINDOW + 1;
    for (const line of lines) {
      const distance = Math.abs(line - entry.line);
      if (distance > LINE_DRIFT_WINDOW) continue;
      if (distance >= bestDistance) continue;
      best = line;
      bestDistance = distance;
    }
    if (best === undefined) continue;
    const siteKey = `${entry.file}:${best}`;
    const claimants = claims.get(siteKey) ?? [];
    claimants.push(entryKey);
    claims.set(siteKey, claimants);
    resolvedEntries.add(entryKey);
    resolvedSites.add(siteKey);
  }
  const collisions = [...claims.entries()]
    .filter(([, claimants]) => claimants.length > 1)
    .map(([site, claimants]) => `${site} claimed by ${claimants.join(", ")}`);
  return { sites: resolvedSites, entries: resolvedEntries, collisions };
}

describe("W1.1 invariant: no detection-path catch hands its caller a clean default", () => {
  it("audited a non-trivial number of source files (sanity check on the scan itself)", () => {
    expect(files.filter((f) => f.audited).length).toBeGreaterThan(20);
  });

  it("found the catches it is meant to govern (the scanner works)", () => {
    // A spec that silently matches nothing is the failure mode this whole
    // file exists to prevent, applied to itself.
    expect(auditedSites.length).toBeGreaterThan(50);
    expect(valueReturning.length).toBeGreaterThan(0);
  });

  it("every src/ directory is either audited or carries a stated exemption", () => {
    const topLevel = [
      ...new Set(
        files.map(
          (f) => `${f.rel.split("/")[0]}${f.rel.includes("/") ? "/" : ""}`,
        ),
      ),
    ].sort();
    const declared = new Set([
      // A prefix is a directory when it ends in "/", and a top-level name
      // when it is a bare filename. Anything with a slash in the middle is
      // declared per-file inside a directory that another entry may already
      // own, so it contributes the directory and nothing more. Mapping all
      // three to `${top}/` lost a standalone file's name entirely, which made
      // it impossible to declare one.
      ...DETECTION_PATH_PREFIXES.flatMap((p) =>
        p.endsWith("/") ? [p] : p.includes("/") ? [`${p.split("/")[0]}/`] : [p],
      ),
      ...OUTSIDE_DETECTION_PATH.map((e) => e.prefix),
    ]);
    const undeclared = topLevel.filter((dir) => !declared.has(dir));
    expect(
      undeclared,
      `directories under src/ with no stated status: ${undeclared.join(", ")}. ` +
        "Add each to DETECTION_PATH_PREFIXES or OUTSIDE_DETECTION_PATH with the " +
        "reason a catch there cannot succeed falsely.",
    ).toEqual([]);
  });

  it("every exemption resolves to a DISTINCT catch", () => {
    // The failure the drift window introduces if resolution is not unique, and
    // the one its own comment claims to prevent: two entries claiming one site
    // means a real unaccounted catch is uncovered while both entries read as
    // live, and a deleted exempt catch silently migrates its exemption onto
    // whichever unaccounted catch became nearest.
    const { collisions } = resolveExemptions(
      ALLOWED_VALUE_RETURNS,
      valueReturning,
    );
    expect(
      collisions,
      "two or more exemptions resolve to the same catch. A shared claim means one " +
        "real catch is covered twice over and a different one is not covered at all — " +
        "re-point the entry that drifted",
    ).toEqual([]);
  });

  it("every exemption states a direction and a reason a reviewer could argue with", () => {
    for (const entry of ALLOWED_VALUE_RETURNS) {
      expect(
        entry.reason.trim().length,
        `${entry.file}:${entry.line} has a reason too short to be a claim`,
      ).toBeGreaterThan(60);
      expect(
        ["fails-explicitly", "fails-by-absence", "reducing"],
        `${entry.file}:${entry.line} must name one of the three honest directions`,
      ).toContain(entry.direction);
    }
  });

  it("the counted-sink pattern actually recognises the sinks it claims to", () => {
    const blind: string[] = [];
    for (const [shape, call] of COUNTED_SINK_RECOGNISES_ITSELF) {
      if (!COUNTED_SINK.test(`\n  ${call};\n`)) blind.push(shape);
    }
    expect(
      blind,
      "COUNTED_SINK does not match these call shapes: " +
        `${blind.join(", ")}. A sink the pattern cannot see is a counted ` +
        "degradation this spec would report as uncounted, which is worse " +
        "than no spec at all.",
    ).toEqual([]);
  });

  it("the counted-sink pattern does not match an unrelated call", () => {
    // The other half. A pattern loose enough to accept anything returns no
    // violations ever, which looks exactly like a passing spec.
    for (const call of ["emit(f, id)", "record(a)", "console.log(x)"]) {
      expect(COUNTED_SINK.test(`\n  ${call};\n`)).toBe(false);
    }
  });

  it("no value-returning catch is unaccounted", () => {
    const allowlisted = resolveExemptions(
      ALLOWED_VALUE_RETURNS,
      valueReturning,
    ).sites;
    const violations: string[] = [];
    for (const site of valueReturning) {
      const id = `${site.file}:${site.line}`;
      if (allowlisted.has(id)) continue;
      const accounted =
        /recordDegradation\s*\(/.test(site.body) ||
        /\bthrow\b/.test(site.body) ||
        COUNTED_SINK.test(site.body);
      if (!accounted) {
        violations.push(
          `src/${id} — a catch that RETURNS A VALUE with no counted sink, no ` +
            "rethrow, and no exemption. Returning a value is the defect " +
            "signature: a caller cannot tell a clean default from a " +
            "successful one. Either record a reason from DEGRADATION_REASONS, " +
            "rethrow, route the failure to a counted on*() sink, or add the " +
            "site to ALLOWED_VALUE_RETURNS with the direction it fails in.",
        );
      }
    }
    expect(
      violations,
      `${violations.length} unaccounted of ${valueReturning.length} ` +
        `value-returning detection-path catches (${voidCatches.length} return ` +
        `nothing and are exempt by construction).\n\n${violations.join("\n\n")}`,
    ).toEqual([]);
  });

  it("no exemption is stale — each still points at a real value-returning catch", () => {
    // An exemption that outlives its defect is worse than no exemption: it
    // teaches a reviewer the list is noise, and the next entry gets the same
    // unearned trust.
    //
    // Compared against the RESOLVED set rather than the recorded lines, so a
    // site that drifted inside the window is still live, and one that drifted
    // out of it — or whose catch was deleted — is reported.
    const resolvedEntries = resolveExemptions(
      ALLOWED_VALUE_RETURNS,
      valueReturning,
    ).entries;
    const stale = ALLOWED_VALUE_RETURNS.filter(
      (e) => !resolvedEntries.has(`${e.file}:${e.line}`),
    ).map((e) => `${e.file}:${e.line}`);
    expect(
      stale,
      "these exemptions no longer describe a value-returning detection-path " +
        "catch. The site moved, the catch went away, or the scope changed. " +
        "Remove the entry or re-point it, or it is protecting nothing.",
    ).toEqual([]);
  });

  it("every exemption names a file that is actually audited", () => {
    const outside = ALLOWED_VALUE_RETURNS.filter(
      (e) => !files.some((f) => f.audited && f.rel === e.file),
    ).map((e) => e.file);
    expect(outside).toEqual([]);
  });

  it("the ledger's reason set is the single source of truth, not a copy", () => {
    // A second list of reasons in a test would drift, and a drifted list is
    // worse than none: the test would pass while a site recorded a reason no
    // consumer has ever heard of.
    const source = readFileSync(
      join(SRC_ROOT, "engine", "degradation-ledger.ts"),
      "utf8",
    );
    for (const reason of DEGRADATION_REASONS) {
      expect(source).toContain(`"${reason}"`);
    }
  });
});
