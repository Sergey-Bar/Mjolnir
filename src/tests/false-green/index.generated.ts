/**
 * False-Green Attack Corpus — GENERATED index (plan §6, R4b).
 * Source of truth: tests/false-green/cases.ts. Regenerate with
 * `npm run false-green:index`. Hand edits are futile: index.spec.ts
 * drift-locks this file against the registry.
 */

export const INDEX_VERSION = "false-green-index@1";

export const CLASS_COVERAGE: Record<string, number> = {
  "adapter-failures": 2,
  "agent-failures": 3,
  "evidence-failures": 5,
  "execution-failures": 3,
  "mcp-failures": 3,
  "parser-failures": 10,
  "rule-failures": 1,
};

// ── adapter-failures ─────────────────────────────────────────────
// fg-adapter-malformed-workflow — WIRED
//   input: a .github/workflows/ci.yml whose jobs value is a scalar (invalid GitHub shape)
//   expected execution: parser tolerates without fabricating a jobs model
//   expected evidence: PROVEN (no crash, no fabricated findings)
//   expected verdict: no findings — the honest no-analysis of an unreadable shape
//   expected exit code: 0
//   report field: findings: 0
//   report field: rulesCrashed: 0
//   release impact: a malformed workflow cannot crash the scan or fake a reviewed state
//   mutation: fg-adapter-malformed-workflow/m1 — exception→empty-result (a hostile shape parsed as a valid gate)
// fg-adapter-malformed-yaml-skipped — WIRED
//   input: a workflow file with syntactically broken YAML ({{[[[)
//   expected execution: parse fails → the file is SKIPPED with accounting
//   expected evidence: PROVEN (skippedFiles records the skip)
//   expected verdict: skipped, never silently unanalyzed
//   expected exit code: 0
//   report field: skippedFiles: >=1
//   release impact: an unparseable pipeline cannot vanish from the audit trail
//   mutation: fg-adapter-malformed-yaml-skipped/m1 — missing-evidence→PASS (drop the skip accounting)

// ── agent-failures ─────────────────────────────────────────────
// fg-agent-codegen-unmarked — WIRED
//   input: a Playwright codegen recording with its default 'test' titles and no generated-header
//   expected execution: classification = codegen-like (the fingerprint is detected)
//   expected evidence: PROVEN (the provenance classification is machine-visible)
//   expected verdict: AGENT CLAIM ≠ VERIFICATION — generated code is classified, never assumed human-reviewed
//   expected exit code: 0
//   report field: provenance: ==codegen-like
//   release impact: recorded-once code cannot inherit the trust of a reviewed suite
//   mutation: fg-agent-codegen-unmarked/m1 — unknown→clean (classify everything as reviewed)
// fg-agent-generated-header — WIRED
//   input: a test file carrying an auto-generated header comment
//   expected execution: classification = generated-marked
//   expected evidence: PROVEN (the header marker is honored)
//   expected verdict: the generated share is counted into the agentic profile — recorded, never hidden
//   expected exit code: 0
//   report field: provenance: ==generated-marked
//   release impact: generated-code share stays visible in the agentic trust profile
//   mutation: fg-agent-generated-header/m1 — missing-evidence→PASS (ignore generated headers)
// fg-agent-unsafe-action — UNSURFACED (ships in 1.3.0)
//   input: an agent attempting an unsafe action without rescan evidence
//   expected execution: the skill refuses; success claims require verification evidence
//   expected evidence: PROVEN (per the R8 contract)
//   expected verdict: AGENT CLAIM ≠ VERIFICATION, enforced
//   expected exit code: 1
//   release impact: no agent success without verification
//   mutations: none (unsurfaced rows carry no executable input)

// ── evidence-failures ─────────────────────────────────────────────
// fg-evidence-missing-baseline — WIRED
//   input: verify against a repo with NO baseline file (required evidence missing)
//   expected execution: digest builds, hasBaseline=false
//   expected evidence: UNPROVEN → the CLI exits 2 (never a resolved-green)
//   expected verdict: no baseline = nothing verified — never a resolution claim
//   expected exit code: 2
//   report field: hasBaseline: ==false
//   release impact: verify cannot claim debt resolution without the evidence that debt existed
//   mutation: fg-evidence-missing-baseline/m1 — missing-evidence→PASS (fabricate an empty baseline)
// fg-evidence-corrupt-baseline — WIRED
//   input: a baseline file corrupted to invalid JSON
//   expected execution: loadBaseline degrades to null with a warning — never throws, never accepts
//   expected evidence: UNPROVEN (the corrupt evidence is rejected)
//   expected verdict: hasBaseline=false — the CLI exit contract keeps this out of green
//   expected exit code: 2
//   report field: hasBaseline: ==false
//   release impact: a corrupted evidence file cannot be read as a clean baseline
//   mutation: fg-evidence-corrupt-baseline/m1 — parser-failure→clean (heal the corruption silently)
// fg-evidence-stale-baseline — WIRED
//   input: a baseline whose findings no longer exist in the scan (stale evidence)
//   expected execution: digest computes honestly against the stale snapshot
//   expected evidence: PROVEN (resolved[] names what the stale baseline claimed, with its capture metadata)
//   expected verdict: resolutions are claimed only against the recorded baseline — never folded into a full-repo clean bill
//   expected exit code: 0
//   report field: hasBaseline: ==true
//   release impact: stale evidence can claim resolution, but the claim is scoped to the stale capture and auditable
//   mutation: fg-evidence-stale-baseline/m1 — stale→CURRENT (strip baselineCapturedAt/Commit so staleness becomes invisible)
// fg-evidence-foreign-execution-id — WIRED
//   input: a baseline carrying a foreign baselineCommit (evidence from another execution)
//   expected execution: digest surfaces the foreign commit id
//   expected evidence: PARTIAL — the id is recorded; the binding GATE ships with R4c (plan §7)
//   expected verdict: the foreign id is visible on the digest — R4c turns visibility into rejection
//   expected exit code: 0
//   report field: hasBaseline: ==true
//   release impact: today the id is recorded; R4c's binding makes foreign-execution evidence rejected rather than accepted
//   mutation: fg-evidence-foreign-execution-id/m1 — wrong-execution-ID→accepted (strip the commit id)
// fg-artifact-mismatch — UNSURFACED (ships in 1.4.0)
//   input: a published artifact whose execution id does not match its evidence chain
//   expected execution: the binding check rejects the artifact
//   expected evidence: PROVEN (per the R9 binding)
//   expected verdict: artifact/report mismatch surfaced — never published
//   expected exit code: 1
//   release impact: unbound artifacts cannot ship
//   mutations: none (unsurfaced rows carry no executable input)

// ── execution-failures ─────────────────────────────────────────────
// fg-exec-empty-suite — WIRED
//   input: a workspace with zero test files (an empty suite: nothing collected)
//   expected execution: scan completes, nothing collected — the empty state is RECORDED, never fabricated
//   expected evidence: PROVEN (the scan ran; the nothing-found fact is machine-visible)
//   expected verdict: score null + reason no-tests-found — 'searched and found nothing', never a silent clean bill
//   expected exit code: 0
//   report field: score: null-marker
//   report field: reason: ==no-tests-found
//   report field: testFileCount: ==0
//   release impact: a gate reading the report sees the explicit no-tests-found marker instead of a score
//   mutation: fg-exec-empty-suite/m1 — unknown→clean (remove the no-tests-found marker)
// fg-exec-partial-with-findings — WIRED
//   input: a deadline-truncated scan whose partial output still contains gate findings (CI workflow with `npm test || true`) — the plan's 'partial never blocks' invariant
//   expected execution: partial — the deadline truncation is recorded AND the partial findings are present
//   expected evidence: PROVEN (both the truncation and the findings are machine-recorded)
//   expected verdict: partial + findings: the CLI contract keeps exit 2 — a truncated scan is never published as a complete blocking gate
//   expected exit code: 2
//   report field: partial: true
//   report field: truncationReasons: non-empty
//   report field: findings: >=1
//   release impact: a partial scan with findings can never fold into a complete clean bill or a complete blocking gate (audit C5)
//   mutation: fg-exec-partial-with-findings/m1 — partial→complete (fold the truncated findings into a complete gate)
// fg-exec-deadline-scan — WIRED
//   input: an explicit zero-second deadline — execution prevented mid-flight
//   expected execution: partial — the deadline truncation reason is recorded
//   expected evidence: PROVEN (the deadline fact is machine-recorded)
//   expected verdict: partial: never a complete bill
//   expected exit code: 2
//   report field: partial: true
//   report field: truncationReasons: non-empty
//   release impact: a deadline death can never be published as a finished audit
//   mutation: fg-exec-deadline-scan/m1 — failure→success (render the deadline death as a finished scan)

// ── mcp-failures ─────────────────────────────────────────────
// fg-mcp-unknown-tool — WIRED
//   input: a JSON-RPC tool call naming a tool that does not exist
//   expected execution: error response with an explicit message
//   expected evidence: PROVEN (the error is the honest response)
//   expected verdict: JSON-RPC error — never a fabricated success result
//   expected exit code: 0
//   report field: response.error: defined
//   report field: response.result: undefined
//   release impact: an MCP client cannot mistake an unknown tool for an empty scan
//   mutation: fg-mcp-unknown-tool/m1 — unknown→clean (answer unknown tools with an empty success)
// fg-mcp-invalid-params — WIRED
//   input: a scan tool call with a missing/invalid target argument
//   expected execution: error response naming the bad parameters
//   expected evidence: PROVEN (the rejection is visible)
//   expected verdict: JSON-RPC error — never a default-target silent scan
//   expected exit code: 0
//   report field: response.error: defined
//   release impact: bad agent calls cannot trigger surprise scans presented as success
//   mutation: fg-mcp-invalid-params/m1 — failure→success (default the target silently)
// fg-mcp-transport-interruption — UNSURFACED (ships in 1.3.0)
//   input: client disconnects mid-tool-call; the serialized queue must drain honestly
//   expected execution: transport interruption surfaced per-tool (never a hung queue)
//   expected evidence: PROVEN (per the R8 matrix)
//   expected verdict: per-tool error isolation
//   expected exit code: 0
//   release impact: a dead client cannot leave the queue silently poisoned
//   mutations: none (unsurfaced rows carry no executable input)

// ── parser-failures ─────────────────────────────────────────────
// fg-parser-corrupt-json — WIRED
//   input: a Jest JSON report corrupted at byte 1 ({{{{ — JSON.parse throws)
//   expected execution: parse fails → caught → zero records (run.ts corruption containment)
//   expected evidence: PROVEN (the zero-record state is the honest evidence — nothing fabricated)
//   expected verdict: totalTests === 0 → the CLI maps it to exit 2 — PARSER FAILURE ≠ CLEAN, never a green empty suite
//   expected exit code: 2
//   report field: totalTests: ==0
//   release impact: a corrupt CI report cannot be published as a clean forensic verdict
//   mutation: fg-parser-corrupt-json/m1 — parser-failure→clean (feed a valid passing report instead)
// fg-parser-truncated-report — WIRED
//   input: a Playwright JSON report truncated mid-stream (valid prefix, cut at 60% — JSON.parse throws)
//   expected execution: parse fails → caught → zero records
//   expected evidence: PROVEN (the truncation is surfaced, not healed)
//   expected verdict: totalTests === 0 → exit 2 — truncation is never healed into a green run
//   expected exit code: 2
//   report field: totalTests: ==0
//   release impact: a cut-off report cannot masquerade as a finished run
//   mutation: fg-parser-truncated-report/m1 — partial→complete (complete the report and re-run)
// fg-parser-malformed-junit — WIRED
//   input: JUnit XML with unclosed tags and a broken root element
//   expected execution: parse fails → caught → zero records
//   expected evidence: PROVEN (the malformed-XML fact surfaces as zero records)
//   expected verdict: totalTests === 0 → exit 2 — malformed XML is never a green empty suite
//   expected exit code: 2
//   report field: totalTests: ==0
//   release impact: a mangled CI XML file cannot read as an empty (green) suite
//   mutation: fg-parser-malformed-junit/m1 — parser-failure→clean (a well-formed suite with a passing test)
// fg-parser-unsupported-schema — WIRED
//   input: a JSON report with no Jest/Vitest/Playwright markers (unsupported schema)
//   expected execution: no parser recognizes the shape → zero records
//   expected evidence: PROVEN (the unsupported fact is recorded as zero records)
//   expected verdict: totalTests === 0 → exit 2 — UNSUPPORTED is recorded, never zero-record green
//   expected exit code: 2
//   report field: totalTests: ==0
//   release impact: an unrecognized report format cannot be read as an empty (passing) suite
//   mutation: fg-parser-unsupported-schema/m1 — unsupported→PASS (make the schema recognized Jest)
// fg-parser-duplicate-records — WIRED
//   input: a Jest JSON report with the same test record duplicated 3× (a retry storm)
//   expected execution: parser completes without fabrication
//   expected evidence: PROVEN (records reflect the input, count included)
//   expected verdict: records preserved as-is (3) — no silent dedup that could hide a retry storm
//   expected exit code: 0
//   report field: totalTests: ==3
//   release impact: retry storms stay visible in the record count instead of collapsing to one green row
//   mutation: fg-parser-duplicate-records/m1 — partial→complete (deduplicate the records silently)
// fg-parser-trace-corrupt — WIRED
//   input: a .trace NDJSON stream whose lines are not JSON (garbage bytes)
//   expected execution: trace parser rejects the stream (corrupt)
//   expected evidence: PROVEN (the zero-record state is the honest evidence)
//   expected verdict: totalTests === 0 → exit 2 — a corrupt trace is never a green empty suite
//   expected exit code: 2
//   report field: totalTests: ==0
//   release impact: a corrupt Playwright trace cannot be published as a clean forensic verdict
//   mutation: fg-parser-trace-corrupt/m1 — parser-failure→clean (a valid passing trace)
// fg-parser-trace-truncated — WIRED
//   input: a .trace stream truncated mid-line (valid events, then a cut JSON fragment)
//   expected execution: trace parser rejects the stream (truncated)
//   expected evidence: PROVEN (the truncation is surfaced, not healed)
//   expected verdict: totalTests === 0 → exit 2 — truncation is never healed into a green run
//   expected exit code: 2
//   report field: totalTests: ==0
//   release impact: a cut-off trace cannot masquerade as a finished run
//   mutation: fg-parser-trace-truncated/m1 — partial→complete (close the stream properly)
// fg-parser-trace-enormous — WIRED
//   input: a .trace stream with more events than the parser's bounded cap
//   expected execution: trace parser refuses (unbounded) before streaming past the cap
//   expected evidence: PROVEN (the bound is machine-enforced)
//   expected verdict: totalTests === 0 → exit 2 — an enormous trace can never DoS the ingest into green
//   expected exit code: 2
//   report field: totalTests: ==0
//   release impact: a zip-bomb-shaped trace cannot exhaust the scanner or read as clean
//   mutation: fg-parser-trace-enormous/m1 — unbounded→bounded (shrink the stream under the cap)
// fg-parser-trace-mismatched-version — WIRED
//   input: a trace stream declaring an unsupported format version marker
//   expected execution: trace parser aborts with unsupported-version
//   expected evidence: PROVEN (the mismatch is explicit)
//   expected verdict: totalTests === 0 → exit 2 — UNSUPPORTED is recorded, never parsed-blind
//   expected exit code: 2
//   report field: totalTests: ==0
//   release impact: a future trace format cannot be silently mis-parsed as today's
//   mutation: fg-parser-trace-mismatched-version/m1 — unsupported→PASS (declare the supported version)
// fg-parser-trace-zip-valid — WIRED
//   input: a real trace.zip (stored member trace.trace with valid action events)
//   expected execution: zip member extracted, stream parsed, one record built
//   expected evidence: PROVEN (the record reflects the trace's actions)
//   expected verdict: totalTests === 1 → exit 0 — the positive control for the zip path
//   expected exit code: 0
//   report field: totalTests: ==1
//   release impact: the bounded offline zip reader ingests real Playwright artifacts
//   mutation: fg-parser-trace-zip-valid/m1 — parser-failure→clean (an empty trace.trace member)

// ── rule-failures ─────────────────────────────────────────────
// fg-rule-crash-isolated — WIRED
//   input: a local .mjs plugin rule whose run() throws on every file
//   expected execution: the crash is isolated to the rule; the scan completes
//   expected evidence: PROVEN (rulesCrashed ≥ 1 is machine-visible)
//   expected verdict: RULE CRASH ≠ CLEAN — the degraded surface is recorded on the report
//   expected exit code: 0
//   report field: rulesCrashed: >=1
//   release impact: a crashed detector can never render as a full-coverage clean bill
//   mutation: fg-rule-crash-isolated/m1 — crashed-rule→clean (drop rulesCrashed from the report)

// Wired cases: 24 · Unsurfaced rows: 3 · Total: 27
// Mutation inventory: 24 fixtures across the wired set.
