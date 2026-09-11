/**
 * False-Green Attack Corpus — the case REGISTRY (product-gap master
 * plan §6, plan 1789009691197 R4b). Every case declares the seven
 * owner-required fields; the index generator (scripts/generate-false-
 * green-index.ts) renders this registry into a drift-locked manifest and
 * the class spec files execute the wired cases with specific field/exit
 * assertions.
 *
 * Unwired surfaces (MCP transport internals, agent-action policy, artifact
 * binding — R8/R9/R4c) stay in the registry as UNSURFACED rows: recorded,
 * never silently dropped (Constitution §5).
 */

import type { FalseGreenCase } from "./harness.js";

export const FALSE_GREEN_CASES: readonly FalseGreenCase[] = [
  // ── execution-failures ────────────────────────────────────────────
  {
    id: "fg-exec-empty-suite",
    className: "execution-failures",
    surface: "engine/scan-pipeline",
    input:
      "a workspace with zero test files (an empty suite: nothing collected)",
    expectedExecution:
      "scan completes, nothing collected — the empty state is RECORDED, never fabricated",
    expectedEvidence:
      "PROVEN (the scan ran; the nothing-found fact is machine-visible)",
    expectedVerdict:
      "score null + reason no-tests-found — 'searched and found nothing', never a silent clean bill",
    expectedExitCode: 0,
    expectedReportFields: [
      "score: null-marker",
      "reason: ==no-tests-found",
      "testFileCount: ==0",
    ],
    releaseImpact:
      "a gate reading the report sees the explicit no-tests-found marker instead of a score",
    wired: true,
    mutations: [
      {
        id: "fg-exec-empty-suite/m1",
        transform: "unknown→clean (remove the no-tests-found marker)",
        build: (input) => input,
      },
    ],
  },
  {
    id: "fg-exec-partial-with-findings",
    className: "execution-failures",
    surface: "engine/scan-pipeline",
    input:
      "a deadline-truncated scan whose partial output still contains gate findings (CI workflow with `npm test || true`) — the plan's 'partial never blocks' invariant",
    expectedExecution:
      "partial — the deadline truncation is recorded AND the partial findings are present",
    expectedEvidence:
      "PROVEN (both the truncation and the findings are machine-recorded)",
    expectedVerdict:
      "partial + findings: the CLI contract keeps exit 2 — a truncated scan is never published as a complete blocking gate",
    expectedExitCode: 2,
    expectedReportFields: [
      "partial: true",
      "truncationReasons: non-empty",
      "findings: >=1",
    ],
    releaseImpact:
      "a partial scan with findings can never fold into a complete clean bill or a complete blocking gate (audit C5)",
    wired: true,
    mutations: [
      {
        id: "fg-exec-partial-with-findings/m1",
        transform:
          "partial→complete (fold the truncated findings into a complete gate)",
        build: (input) => input,
      },
    ],
  },
  {
    id: "fg-exec-deadline-scan",
    className: "execution-failures",
    surface: "engine/scan-pipeline",
    input: "an explicit zero-second deadline — execution prevented mid-flight",
    expectedExecution: "partial — the deadline truncation reason is recorded",
    expectedEvidence: "PROVEN (the deadline fact is machine-recorded)",
    expectedVerdict: "partial: never a complete bill",
    expectedExitCode: 2,
    expectedReportFields: ["partial: true", "truncationReasons: non-empty"],
    releaseImpact:
      "a deadline death can never be published as a finished audit",
    wired: true,
    mutations: [
      {
        id: "fg-exec-deadline-scan/m1",
        transform:
          "failure→success (render the deadline death as a finished scan)",
        build: (input) => input,
      },
    ],
  },

  // ── parser-failures ───────────────────────────────────────────────
  // Forensics containment contract (run.ts): a hostile report degrades
  // to ZERO RECORDS, and the CLI maps totalTests === 0 to exit 2 —
  // "nothing recognized to report". The false-green invariant under
  // attack: a corrupt/truncated/malformed report must never read as a
  // green (exit-0) empty suite. The cases below pin the observable
  // honest state end to end through runForensics (the real entry).
  {
    id: "fg-parser-corrupt-json",
    className: "parser-failures",
    surface: "forensics/run (runForensics: Jest JSON report)",
    input: "a Jest JSON report corrupted at byte 1 ({{{{ — JSON.parse throws)",
    expectedExecution:
      "parse fails → caught → zero records (run.ts corruption containment)",
    expectedEvidence:
      "PROVEN (the zero-record state is the honest evidence — nothing fabricated)",
    expectedVerdict:
      "totalTests === 0 → the CLI maps it to exit 2 — PARSER FAILURE ≠ CLEAN, never a green empty suite",
    expectedExitCode: 2,
    expectedReportFields: ["totalTests: ==0"],
    releaseImpact:
      "a corrupt CI report cannot be published as a clean forensic verdict",
    wired: true,
    mutations: [
      {
        id: "fg-parser-corrupt-json/m1",
        transform: "parser-failure→clean (feed a valid passing report instead)",
        build: () =>
          JSON.stringify({
            numTotalTests: 1,
            testResults: [
              {
                testFilePath: "a.spec.ts",
                testResults: [
                  {
                    title: "t",
                    status: "passed",
                    location: { file: "a.spec.ts", line: 1 },
                  },
                ],
              },
            ],
          }),
      },
    ],
  },
  {
    id: "fg-parser-truncated-report",
    className: "parser-failures",
    surface: "forensics/run (runForensics: Playwright JSON report)",
    input:
      "a Playwright JSON report truncated mid-stream (valid prefix, cut at 60% — JSON.parse throws)",
    expectedExecution: "parse fails → caught → zero records",
    expectedEvidence: "PROVEN (the truncation is surfaced, not healed)",
    expectedVerdict:
      "totalTests === 0 → exit 2 — truncation is never healed into a green run",
    expectedExitCode: 2,
    expectedReportFields: ["totalTests: ==0"],
    releaseImpact: "a cut-off report cannot masquerade as a finished run",
    wired: true,
    mutations: [
      {
        id: "fg-parser-truncated-report/m1",
        transform: "partial→complete (complete the report and re-run)",
        build: () =>
          JSON.stringify({
            config: { version: "1.0" },
            suites: [
              {
                specs: [
                  {
                    title: "a",
                    ok: true,
                    file: "a.spec.ts",
                    line: 1,
                    column: 1,
                    tests: [
                      { status: "expected", results: [{ status: "passed" }] },
                    ],
                  },
                ],
              },
            ],
          }),
      },
    ],
  },
  {
    id: "fg-parser-malformed-junit",
    className: "parser-failures",
    surface: "forensics/run (runForensics: JUnit XML report)",
    input: "JUnit XML with unclosed tags and a broken root element",
    expectedExecution: "parse fails → caught → zero records",
    expectedEvidence:
      "PROVEN (the malformed-XML fact surfaces as zero records)",
    expectedVerdict:
      "totalTests === 0 → exit 2 — malformed XML is never a green empty suite",
    expectedExitCode: 2,
    expectedReportFields: ["totalTests: ==0"],
    releaseImpact:
      "a mangled CI XML file cannot read as an empty (green) suite",
    wired: true,
    mutations: [
      {
        id: "fg-parser-malformed-junit/m1",
        transform:
          "parser-failure→clean (a well-formed suite with a passing test)",
        build: () =>
          '<?xml version="1.0"?><testsuites><testsuite name="s" tests="1" failures="0"><testcase name="t" classname="a.spec.ts" time="0.1"/></testsuite></testsuites>',
      },
    ],
  },
  {
    id: "fg-parser-unsupported-schema",
    className: "parser-failures",
    surface: "forensics/run (runForensics: shape sniffing)",
    input:
      "a JSON report with no Jest/Vitest/Playwright markers (unsupported schema)",
    expectedExecution: "no parser recognizes the shape → zero records",
    expectedEvidence:
      "PROVEN (the unsupported fact is recorded as zero records)",
    expectedVerdict:
      "totalTests === 0 → exit 2 — UNSUPPORTED is recorded, never zero-record green",
    expectedExitCode: 2,
    expectedReportFields: ["totalTests: ==0"],
    releaseImpact:
      "an unrecognized report format cannot be read as an empty (passing) suite",
    wired: true,
    mutations: [
      {
        id: "fg-parser-unsupported-schema/m1",
        transform: "unsupported→PASS (make the schema recognized Jest)",
        build: () =>
          JSON.stringify({
            numTotalTests: 1,
            testResults: [
              {
                testFilePath: "a.spec.ts",
                testResults: [
                  {
                    title: "t",
                    status: "passed",
                    location: { file: "a.spec.ts", line: 1 },
                  },
                ],
              },
            ],
          }),
      },
    ],
  },
  {
    id: "fg-parser-duplicate-records",
    className: "parser-failures",
    surface: "forensics/parse-jest-json",
    input:
      "a Jest JSON report with the same test record duplicated 3× (a retry storm)",
    expectedExecution: "parser completes without fabrication",
    expectedEvidence: "PROVEN (records reflect the input, count included)",
    expectedVerdict:
      "records preserved as-is (3) — no silent dedup that could hide a retry storm",
    expectedExitCode: 0,
    expectedReportFields: ["totalTests: ==3"],
    releaseImpact:
      "retry storms stay visible in the record count instead of collapsing to one green row",
    wired: true,
    mutations: [
      {
        id: "fg-parser-duplicate-records/m1",
        transform: "partial→complete (deduplicate the records silently)",
        build: (input) => input,
      },
    ],
  },

  // ── adapter-failures ──────────────────────────────────────────────
  {
    id: "fg-adapter-malformed-workflow",
    className: "adapter-failures",
    surface: "adapters/github-actions",
    input:
      "a .github/workflows/ci.yml whose jobs value is a scalar (invalid GitHub shape)",
    expectedExecution: "parser tolerates without fabricating a jobs model",
    expectedEvidence: "PROVEN (no crash, no fabricated findings)",
    expectedVerdict:
      "no findings — the honest no-analysis of an unreadable shape",
    expectedExitCode: 0,
    expectedReportFields: ["findings: 0", "rulesCrashed: 0"],
    releaseImpact:
      "a malformed workflow cannot crash the scan or fake a reviewed state",
    wired: true,
    mutations: [
      {
        id: "fg-adapter-malformed-workflow/m1",
        transform:
          "exception→empty-result (a hostile shape parsed as a valid gate)",
        build: (input) => input,
      },
    ],
  },
  {
    id: "fg-adapter-malformed-yaml-skipped",
    className: "adapter-failures",
    surface: "adapters/github-actions",
    input: "a workflow file with syntactically broken YAML ({{[[[)",
    expectedExecution: "parse fails → the file is SKIPPED with accounting",
    expectedEvidence: "PROVEN (skippedFiles records the skip)",
    expectedVerdict: "skipped, never silently unanalyzed",
    expectedExitCode: 0,
    expectedReportFields: ["skippedFiles: >=1"],
    releaseImpact: "an unparseable pipeline cannot vanish from the audit trail",
    wired: true,
    mutations: [
      {
        id: "fg-adapter-malformed-yaml-skipped/m1",
        transform: "missing-evidence→PASS (drop the skip accounting)",
        build: (input) => input,
      },
    ],
  },

  // ── rule-failures ─────────────────────────────────────────────────
  {
    id: "fg-rule-crash-isolated",
    className: "rule-failures",
    surface: "engine/rule-runner (local plugin rule)",
    input: "a local .mjs plugin rule whose run() throws on every file",
    expectedExecution: "the crash is isolated to the rule; the scan completes",
    expectedEvidence: "PROVEN (rulesCrashed ≥ 1 is machine-visible)",
    expectedVerdict:
      "RULE CRASH ≠ CLEAN — the degraded surface is recorded on the report",
    expectedExitCode: 0,
    expectedReportFields: ["rulesCrashed: >=1"],
    releaseImpact:
      "a crashed detector can never render as a full-coverage clean bill",
    wired: true,
    mutations: [
      {
        id: "fg-rule-crash-isolated/m1",
        transform: "crashed-rule→clean (drop rulesCrashed from the report)",
        build: (input) => input,
      },
    ],
  },

  // ── evidence-failures ─────────────────────────────────────────────
  {
    id: "fg-evidence-missing-baseline",
    className: "evidence-failures",
    surface: "commands/verify (buildVerifyDigest)",
    input:
      "verify against a repo with NO baseline file (required evidence missing)",
    expectedExecution: "digest builds, hasBaseline=false",
    expectedEvidence: "UNPROVEN → the CLI exits 2 (never a resolved-green)",
    expectedVerdict:
      "no baseline = nothing verified — never a resolution claim",
    expectedExitCode: 2,
    expectedReportFields: ["hasBaseline: ==false"],
    releaseImpact:
      "verify cannot claim debt resolution without the evidence that debt existed",
    wired: true,
    mutations: [
      {
        id: "fg-evidence-missing-baseline/m1",
        transform: "missing-evidence→PASS (fabricate an empty baseline)",
        build: (input) => input,
      },
    ],
  },
  {
    id: "fg-evidence-corrupt-baseline",
    className: "evidence-failures",
    surface: "commands/baseline (loadBaseline)",
    input: "a baseline file corrupted to invalid JSON",
    expectedExecution:
      "loadBaseline degrades to null with a warning — never throws, never accepts",
    expectedEvidence: "UNPROVEN (the corrupt evidence is rejected)",
    expectedVerdict:
      "hasBaseline=false — the CLI exit contract keeps this out of green",
    expectedExitCode: 2,
    expectedReportFields: ["hasBaseline: ==false"],
    releaseImpact:
      "a corrupted evidence file cannot be read as a clean baseline",
    wired: true,
    mutations: [
      {
        id: "fg-evidence-corrupt-baseline/m1",
        transform: "parser-failure→clean (heal the corruption silently)",
        build: (input) => input,
      },
    ],
  },
  {
    id: "fg-evidence-stale-baseline",
    className: "evidence-failures",
    surface: "commands/verify (buildVerifyDigest)",
    input:
      "a baseline whose findings no longer exist in the scan (stale evidence)",
    expectedExecution: "digest computes honestly against the stale snapshot",
    expectedEvidence:
      "PROVEN (resolved[] names what the stale baseline claimed, with its capture metadata)",
    expectedVerdict:
      "resolutions are claimed only against the recorded baseline — never folded into a full-repo clean bill",
    expectedExitCode: 0,
    expectedReportFields: ["hasBaseline: ==true"],
    releaseImpact:
      "stale evidence can claim resolution, but the claim is scoped to the stale capture and auditable",
    wired: true,
    mutations: [
      {
        id: "fg-evidence-stale-baseline/m1",
        transform:
          "stale→CURRENT (strip baselineCapturedAt/Commit so staleness becomes invisible)",
        build: (input) => input,
      },
    ],
  },
  {
    id: "fg-evidence-foreign-execution-id",
    className: "evidence-failures",
    surface: "commands/verify (buildVerifyDigest)",
    input:
      "a baseline carrying a foreign baselineCommit (evidence from another execution)",
    expectedExecution: "digest surfaces the foreign commit id",
    expectedEvidence:
      "PARTIAL — the id is recorded; the binding GATE ships with R4c (plan §7)",
    expectedVerdict:
      "the foreign id is visible on the digest — R4c turns visibility into rejection",
    expectedExitCode: 0,
    expectedReportFields: ["hasBaseline: ==true"],
    releaseImpact:
      "today the id is recorded; R4c's binding makes foreign-execution evidence rejected rather than accepted",
    wired: true,
    mutations: [
      {
        id: "fg-evidence-foreign-execution-id/m1",
        transform: "wrong-execution-ID→accepted (strip the commit id)",
        build: (input) => input,
      },
    ],
  },

  // ── mcp-failures ──────────────────────────────────────────────────
  {
    id: "fg-mcp-unknown-tool",
    className: "mcp-failures",
    surface: "mcp/server (handleToolCall)",
    input: "a JSON-RPC tool call naming a tool that does not exist",
    expectedExecution: "error response with an explicit message",
    expectedEvidence: "PROVEN (the error is the honest response)",
    expectedVerdict: "JSON-RPC error — never a fabricated success result",
    expectedExitCode: 0,
    expectedReportFields: [
      "response.error: defined",
      "response.result: undefined",
    ],
    releaseImpact:
      "an MCP client cannot mistake an unknown tool for an empty scan",
    wired: true,
    mutations: [
      {
        id: "fg-mcp-unknown-tool/m1",
        transform: "unknown→clean (answer unknown tools with an empty success)",
        build: (input) => input,
      },
    ],
  },
  {
    id: "fg-mcp-invalid-params",
    className: "mcp-failures",
    surface: "mcp/server (handleToolCall)",
    input: "a scan tool call with a missing/invalid target argument",
    expectedExecution: "error response naming the bad parameters",
    expectedEvidence: "PROVEN (the rejection is visible)",
    expectedVerdict: "JSON-RPC error — never a default-target silent scan",
    expectedExitCode: 0,
    expectedReportFields: ["response.error: defined"],
    releaseImpact:
      "bad agent calls cannot trigger surprise scans presented as success",
    wired: true,
    mutations: [
      {
        id: "fg-mcp-invalid-params/m1",
        transform: "failure→success (default the target silently)",
        build: (input) => input,
      },
    ],
  },

  // ── agent-failures ────────────────────────────────────────────────
  {
    id: "fg-agent-codegen-unmarked",
    className: "agent-failures",
    surface: "engine/provenance (classifyProvenance)",
    input:
      "a Playwright codegen recording with its default 'test' titles and no generated-header",
    expectedExecution:
      "classification = codegen-like (the fingerprint is detected)",
    expectedEvidence:
      "PROVEN (the provenance classification is machine-visible)",
    expectedVerdict:
      "AGENT CLAIM ≠ VERIFICATION — generated code is classified, never assumed human-reviewed",
    expectedExitCode: 0,
    expectedReportFields: ["provenance: ==codegen-like"],
    releaseImpact:
      "recorded-once code cannot inherit the trust of a reviewed suite",
    wired: true,
    mutations: [
      {
        id: "fg-agent-codegen-unmarked/m1",
        transform: "unknown→clean (classify everything as reviewed)",
        build: (input) => input,
      },
    ],
  },
  {
    id: "fg-agent-generated-header",
    className: "agent-failures",
    surface: "engine/provenance (classifyProvenance)",
    input: "a test file carrying an auto-generated header comment",
    expectedExecution: "classification = generated-marked",
    expectedEvidence: "PROVEN (the header marker is honored)",
    expectedVerdict:
      "the generated share is counted into the agentic profile — recorded, never hidden",
    expectedExitCode: 0,
    expectedReportFields: ["provenance: ==generated-marked"],
    releaseImpact:
      "generated-code share stays visible in the agentic trust profile",
    wired: true,
    mutations: [
      {
        id: "fg-agent-generated-header/m1",
        transform: "missing-evidence→PASS (ignore generated headers)",
        build: (input) => input,
      },
    ],
  },

  // ── UNSURFACED rows (recorded per Constitution §5) ───────────────
  {
    id: "fg-mcp-transport-interruption",
    className: "mcp-failures",
    surface: "mcp/server (serialized queue)",
    input:
      "client disconnects mid-tool-call; the serialized queue must drain honestly",
    expectedExecution:
      "transport interruption surfaced per-tool (never a hung queue)",
    expectedEvidence: "PROVEN (per the R8 matrix)",
    expectedVerdict: "per-tool error isolation",
    expectedExitCode: 0,
    expectedReportFields: [],
    releaseImpact: "a dead client cannot leave the queue silently poisoned",
    wired: false,
    shippedIn: "1.3.0",
    mutations: [],
  },
  {
    id: "fg-agent-unsafe-action",
    className: "agent-failures",
    surface: "agent skill (R8)",
    input: "an agent attempting an unsafe action without rescan evidence",
    expectedExecution:
      "the skill refuses; success claims require verification evidence",
    expectedEvidence: "PROVEN (per the R8 contract)",
    expectedVerdict: "AGENT CLAIM ≠ VERIFICATION, enforced",
    expectedExitCode: 1,
    expectedReportFields: [],
    releaseImpact: "no agent success without verification",
    wired: false,
    shippedIn: "1.3.0",
    mutations: [],
  },
  {
    id: "fg-artifact-mismatch",
    className: "evidence-failures",
    surface: "Trust Artifact (R9)",
    input:
      "a published artifact whose execution id does not match its evidence chain",
    expectedExecution: "the binding check rejects the artifact",
    expectedEvidence: "PROVEN (per the R9 binding)",
    expectedVerdict: "artifact/report mismatch surfaced — never published",
    expectedExitCode: 1,
    expectedReportFields: [],
    releaseImpact: "unbound artifacts cannot ship",
    wired: false,
    shippedIn: "1.4.0",
    mutations: [],
  },
];
