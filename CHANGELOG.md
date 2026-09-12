# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Rule behavior changes (new rules, FP-rate changes against the corpus,
severity changes) are first-class entries here — rule IDs are immutable
once shipped, so this file is the record of what changed between versions.

## [1.0.10] — 2026-09-12

### Changes since 1.0.9

- Merge remediation/remote-first: complete R1-R10 trust-engineering train onto main
- Merge origin/main into remediation/remote-first
- chore: add testTimeout: 30_000 to vitest.config.ts
- chore: sync smithery.yaml in the release cut step (the registry must match the package)
- test: keep CI fixture scripts off the docs-consistency scanner (npm run e2e -> npx playwright test)
- test: arms-coverage wave for the R1-R10 train (CI gates, adapters, parser, trace, release-trust, trust surfaces)
- docs: resync DEPTH-ADJUDICATION.md to the train's measured state (drift-lock)
- chore: re-baseline coverage ratchet after the R1-R10 train landing
- chore: exclude machine-local agent dirs via .mjolnirignore (self-scan honesty)
- chore: untrack machine-local skill symlinks (leaked in R3 1044461)
- Master-plan M0 docs truth (M0.2/M0.4/M0.5)
- chore: gitignore machine-local agent tool dirs (same class as .kilo/)
- Review hardening: MCP param cap measured in true bytes; pin the WI-18 unsupported-source asymmetry
- Wire provenance=bound invariant (plan 5.2 activation): scope-integrity + artifact-integrity prove the identity chain
- Fix: MCP stdio stream pollution (CLI entry tail in bundle), stale-dist e2e guard, freshness drift classes
- R10: 2.0 preparation — breaking-set inventory, migration draft, boundary-law guards (WI-25, 2.0.0)
- R9: Trust Artifact identity binding + HTML completion (WI-23+24, 1.4.0)
- R8: MCP runtime-evidence tools + Agent Safety (WI-21+22, 1.3.0)
- R7: Playwright capability matrix as a product surface (WI-20, 1.2.x)
- R6: forensic verdict taxonomy + Selector Health v2 (WI-18+19, 1.2.x)
- R5: Playwright trace ingester + false-green trace corpus (WI-17, 1.2.x)
- CI hardening: test-tsconfig conformance + unclassified-ceiling re-record
- R4c follow-up: wire the scope-integrity dimension into release-trust
- R4c: Evidence Graph + Scope Integrity + exit-code proofs (1.1.6)
- R4b: False-Green Attack Corpus + mutation/assertion-strength protocol (1.1.5)
- R4a: Trust Constitution + Release Trust Verdict (1.1.4)
- R4: blast-radius audit + machine-testable boundary contract (1.1.3)
- P6: quarantine remediation ledger + rework-or-retire the >=75 percent set (R3, 1.1.2)
- P3c: Jenkinsfile detection + rule arms + QA-CI-014 (R2, 1.1.1)
- P3b: Azure DevOps detection + rule extensions + QA-CI-013 (R1, 1.1.0)

## [1.0.9] — 2026-09-12

### Changes since 1

- chore: add testTimeout: 30_000 to vitest.config.ts
- test: MR-7A release-verification machinery contract (#84)
- feat: SC-8 determinism verifier + SC-11 control-state record (MR-8.C/D) (#83)
- feat: pack-audit gate wired before publish (SC-6, MR-8.B) (#82)
- test: SC-3/SC-4/SC-7 supply-chain hygiene gates (MR-8.A) (#81)
- docs: PR template + CONTRIBUTING targeted-slice ladder (MR-4, GC-2) (#80)
- feat: docs:regen aggregate — one idempotent command for every generated surface (MR-5) (#79)
- test(site): negative proof for the D-2 emitted-HTML link gate (MR-6) (#78)
- fix(release): recognize the '(Merged PR #N)' squash subject so PR labels drive the bump (#77)

## [1.0.8] — 2026-09-11

### Changes since 1.0.7

- chore: sync smithery.yaml in the release cut step (Merged PR #76)

## [1.0.7] — 2026-09-11

### Changes since 1.0.6

- docs: 1.0.6 CHANGELOG section lead-ins (Merged PR #75)

## [1.0.6] — 2026-09-11

### R10 2.0 preparation: breaking-set inventory + boundary-law guards (remediation/remote-first WI-25)

Preparation-only increment: the 2.0 breaking-set proposal sheet, its migration draft, and the boundary-law guard tests — nothing breaking ships in this release.

### Added

- **2.0 breaking-set inventory** (`docs/2.0-BREAKING-SET.md`, WI-25): the
  proposal sheet per the strategic blueprint's §28/§18 — two justified
  breaking candidates (BS-1 default suppression expiry with the explicit
  never-expire opt-out; BS-2 retirement completion into `RETIRED_RULE_IDS`),
  each carrying its benefit>cost justification, its migration pointer, and a
  PROPOSED decision line awaiting owner ratification, plus the locked
  NOT-breaking list (`schemaVersion 1` additive extension, exit codes,
  additive verbs, Node matrix, frozen surfaces). **Nothing is implemented in
  this release** — nothing enters 2.0 "because large", and no frozen surface
  breaks without evidence that `schemaVersion 1` cannot represent the
  behavior.
- **Migration guide draft** (`docs/MIGRATION-2.0-DRAFT.md`): the working
  draft of the 2.0.0 guide (publication law: CHANGELOG + site with the
  release itself) covering BS-1 (init config check → explicit `expires` /
  `expires: false`; no silent retroactive expiry) and BS-2 (retired-rule
  list, suppression cleanup, §15-lifecycle-honest disappearance causes).
- **Boundary-law + non-goal guards** (`tests/contract/boundary-law.spec.ts`,
  blueprint §9.1/§24/§36): the canonical layers (engine, forensics,
  adapters, rules) never import upward into commands/ or the transports;
  the MCP transport imports no detection machinery and rides the canonical
  machine contract (pipeline → contract → runtime evidence → agent
  transport is never reversed); the zero-network contract holds; the
  dependency list carries no telemetry/cloud/hosted-backend package; src/
  reads no telemetry configuration; and the breaking-set discipline is
  drift-locked (every entry carries a Decision, nothing is implemented).

### Changed

- **Final capability matrix update** (`src/capabilities.ts`,
  `docs/PLAYWRIGHT-CAPABILITIES.md`): the `to agents` column now carries the
  foundational Agent Skill's evidence pointer (`src/commands/install-agents.ts`,
  shipped with R8/WI-22) on every row — a `no → yes` flip in the same change
  set that shipped its evidence, per the claim law.

### Fixed

- **MCP stdio bundle no longer prints the terminal Trust Report onto the
  JSON-RPC stream** (`src/mcp/server.ts`): the standalone entry
  (`node dist/mcp/stdio.mjs`, `npm run mcp`) dragged the CLI module in via
  `import { runScan, CLI_VERSION } from "../cli.js"`, and cli.ts's entry
  tail fired inside the bundle (`import.meta.url === argv[1]`), emitting the
  full terminal Trust Report before/between JSON-RPC frames — a fatal
  protocol violation for any MCP client. The transport now imports the
  canonical homes directly (`engine/scan-pipeline.js`, `engine/version.js`),
  the bundle contains no CLI entry tail, and the boundary-law guard bans the
  `../cli.js` import from the MCP layer permanently. Found by the R10
  bug-hunt smoke against the real stdio transport.
- **Stale dist can no longer mask new code in spawned-binary tests**
  (`tests/e2e/global-setup.ts`): the EXISTS-ONLY guard skipped the build
  whenever a bundle was present, so the spawned stdio binary kept answering
  from a pre-R8 catalog ("unknown tool: triage") while the suite stayed
  green. The setup now rebuilds whenever any `src/**/*.ts` is newer than the
  bundle (the same freshness discipline as the generated-docs drift gates).
- **Freshness diagnosis names each drift class** (`checkArtifactFreshness`):
  a revision bump (`rule@old -> new`), a rule retired since the render
  (`rule@rev (retired)`), and a rule added since the render
  (`rule@rev (new)`) are distinct remediations — a flat list hid which one
  happened.
- **`trust-report --from` reports the complete artifact set** it writes
  (md + html + json), not just the MD path.
- **The `provenance = bound` system-invariant item is now WIRED** (plan
  §5.2 activation; `src/commands/release-trust.ts`): the release-trust
  invariant previously hardcoded `provenance: UNSUPPORTED` even after the
  machinery it waited for shipped. It is now PROVEN exactly when the
  machine-anchored identity chain is proven — scope-integrity (runIdentity +
  evidence graph, R4c) AND artifact-integrity (artifact scanId binding, R9)
  both PASS — and stays UNSUPPORTED (recorded, non-blocking) otherwise. The
  contract doc's activation sentence and the drift-lock are updated
  accordingly; the shipped verdict is unchanged (PASS 12/12, provenance
  bound).

### R9 Trust Artifact integrity + HTML completion (remediation/remote-first WI-23+24)

Trust Artifacts gain machine-anchored identity and a deterministic HTML surface; stale, wrong-run, revision-drifted, and unbound artifacts are now detectable.

### Added

- **Artifact integrity binding** (`src/commands/trust-report.ts`, R9): every
  Trust Artifact (md · json · html) now embeds its IDENTITY — the machine
  anchor (`scanId` from runIdentity), the bound commit when resolvable
  (offline git read; null, never fabricated), the fired rule(rev) inventory
  (deduped, sorted, undeclared revisions omitted — never a fabricated rev),
  and the evidence inventory (totals, runtime-corroborated count, per-level
  counts). Consumers detect **stale artifacts** (a scanId from another run),
  **mismatched revisions** (rule-set drift, named per rule), and **unbound
  artifacts** (pre-R9 producers) via `checkArtifactFreshness` — an unbound or
  stale artifact is RECORDED, never assumed current.
- **HTML Trust Artifact** (WI-23 completion, §18): deterministic,
  self-contained `mjolnir-trust-report.html` — inline CSS only, zero external
  resources, hostile interpolations escaped, byte-identical regen (same
  ScanResult + label + commit → same bytes), the same five-question structure
  as the MD. The command writes all three formats; `--from` gains an optional
  `--commit <sha>` so the Action binds the artifact to the executing run's
  HEAD.
- **Artifact Integrity dimension wired** (`check:artifact-integrity` in
  `src/commands/release-trust.ts`, R9 surface): the structural evaluation
  asserts the identity binding, the three-format output, the freshness
  detection, and the byte-regen/hostile-safety contract locks. The
  release-trust contract's documented-unwired list is now EMPTY — all 12
  canonical dimensions are wired and machine-evaluated.

### R8 MCP runtime-evidence tools + Agent Safety (remediation/remote-first WI-21+22)

The MCP transport learns the runtime-evidence tools, and every installed agent surface inherits the safety contract.

### Added

- **MCP runtime-evidence tools** (`src/mcp/server.ts`, WI-21): `forensics`,
  `triage`, `pw-report` join the tool catalog as 1:1 mappings onto the SAME
  engine functions the CLI verbs call — no MCP-only semantics. Parity is
  drift-locked table-driven (`tests/mcp/parity.spec.ts`): for every new tool ×
  every fixture class (Playwright JSON · JUnit XML · hostile corrupt report ·
  no-reports directory) the MCP result deep-equals the canonical CLI
  derivation, hostile inputs degrade to zero records on BOTH surfaces, and the
  hostile parameter matrix (missing / empty / non-string / nonexistent path)
  yields INVALID_PARAMS naming the target, never a crash. A crashing tool
  never kills the server (`tests/mcp/crash-containment.spec.ts`): the failure
  lands in the transport's existing catch as a structured INTERNAL error and
  the server keeps answering. One scan in flight; zero network; the plugin
  gate applies unchanged.
- **Agent Safety dimension wired** (`check:agent-safety` in
  `src/commands/release-trust.ts`, R8 surface): the structural evaluation
  asserts the §17 safety wording on every installed skill surface, that the
  MCP tool surface never opens the plugin trust gate, and that the agent edge
  case (`fg-agent-unsafe-action`) stays registered in the False-Green Attack
  Corpus. The release-trust contract's documented-unwired list shrinks to
  artifact-integrity only (ships R9).

### Changed

- **Agent brief inherits the Constitution** (`src/commands/install-agents.ts`,
  WI-22): every installed instruction surface (.claude/, .cursor/, .kilo/,
  AGENTS.md) now carries the non-negotiable agent-safety contract — NEVER
  declare trustworthiness without evidence · AGENT CLAIM ≠ VERIFICATION ·
  NEVER manufacture, edit, or synthesize evidence · NEVER convert INCONCLUSIVE
  to pass · NEVER suppress findings or weaken rules to get green — plus the
  loop preconditions (FIX requires a proven actionable defect; RESCAN requires
  changed-scope identification; PROOF requires fresh post-fix execution
  evidence). Drift-locked by `tests/contract/agent-skill-surface.spec.ts`
  (frozen surfaces only; safety wording asserted).

### R7 Playwright capability matrix (remediation/remote-first WI-20)

The Playwright capability matrix becomes a product surface with its own drift lock.

### Added

- **Playwright Capability Matrix** (`docs/PLAYWRIGHT-CAPABILITIES.md`,
  `src/capabilities.ts`, WI-20): the product-depth surface — 12 Playwright
  capabilities × 8 depth columns (detect · explain · produce evidence ·
  correlate runtime · trust verdict · CLI · MCP · agents), every cell
  explicitly classed (zero UNCLASSIFIED), every `yes` backed by a resolvable
  evidence pointer (registered rule ID or in-repo artifact) with FAIL-CLOSED
  validation: the generator refuses to render a claim on a dangling pointer.
  Generated (`npm run docs:capabilities-playwright`) and drift-locked
  (tests/contract/playwright-capabilities.spec.ts). The `to agents` column is
  uniformly **no** until R8 ships the Agent Skill — stated, not implied.
  Claims never exceed proven capability; rule counts stay out of the claim
  surface entirely.

### R6 forensic taxonomy + Selector Health v2 (remediation/remote-first WI-18+19)

Forensic verdicts gain the semantic taxonomy, and Selector Health v2 replaces the locator heuristic.

### Added

- **Forensic verdict taxonomy** (`src/forensics/classify.ts`, WI-18): the
  canonical §6 verdict set (likely-real-defect · environmental-failure ·
  infrastructure-failure · flaky · retry-dependent · unstable-construction ·
  **inconclusive default**) applied by a deterministic minimum-signal table —
  a single weak signal can never classify confidently; conflicting signal
  families force INCONCLUSIVE with an explicit `contradictory` evidence-state.
  Every `TestVerdict` now carries a machine-visible `forensic` classification
  (attempts + captured error text; sources without error text mark
  `unsupported`, never a guess). Contradiction reconciliation
  (`corroborates | contradicts | insufficient`) implements Contract H: the
  runtime can corroborate but never silently weakens a static claim — a
  contradiction renders the PAIR inconclusive while the claim stands.
- **Selector Health v2** (`correlateSelectorHealth`, WI-19): runtime
  correlation + concrete safe next actions; **no correlation ⇒ no claim** —
  absent or merely-green runtime evidence yields no health claim in either
  direction; the v1 static score is secondary and never altered here.

### Changed

- `TestRecord` gains an optional `errors` text surface (the trace ingester
  populates it); `TestVerdict` gains the additive `forensic` field.

### R5 trace ingester (remediation/remote-first WI-17)

Trace forensics: bounded ingestion of Playwright trace.zip artifacts into the evidence core.

### Added

- **Playwright trace ingester** (`src/forensics/trace.ts`, WI-17): deterministic,
  offline, bounded, version-aware ingestion of per-test traces — `trace.zip`
  (a bounded, dependency-free ZIP reader: EOCD scan, central-directory
  enumeration, stored/deflate members via `node:zlib` with a decompressed-output
  cap) or raw `.trace`/`.ndjson` NDJSON streams. Action pairs become
  Evidence-Core `TestRecord`s (start/end pairing, durations, per-action
  errors; timeout errors render `timedOut`). `runForensics` recognizes trace
  artifacts in both file and directory modes; the report source union gains
  `playwright-trace` additively (`contractVersion 1` unchanged).
- False-Green corpus cases for the trace surface: corrupt stream, truncated
  stream, event-count overflow, unsupported version marker, zip without
  `trace.trace` — all degrade to the zero-record exit-2 state, never a green
  empty suite; plus positive controls (real stored zip + valid stream ingest
  with paired durations) proving the rejections are precision, not blindness.

### Changed

- `ForensicsReport.source` + `RuntimeCorroboration.source` widened additively
  with `"playwright-trace"`.

### R4c Evidence Graph + Scope Integrity + Exit-Code proofs (remediation/remote-first)

Every verdict now carries a machine-anchored evidence graph, scope-integrity accounting, and exit-code proofs.

### Added

- **Run Identity** (`src/engine/run-identity.ts`): the deterministic anchor —
  `scanId = sha256(input snapshot fingerprint + rulesDigest + config
fingerprint + engine version)`; set-identity semantics (input order does not
  matter); every scan report carries `runIdentity` + `evidenceGraph` — the
  chain-law links VERDICT ← EVIDENCE ← EXECUTION ← SCOPE ← SOURCE ← RULE(rev)
  ← FIXTURE ← REPRODUCTION, each `ref` present only when its identity input
  exists (no fabrication). The engine-version literal moved to the leaf module
  `src/engine/version.ts` (cli.ts re-exports it as CLI_VERSION;
  sync-sarif-version.cjs + version-consistency spec follow).
- **Scope Integrity** (`ScanResult.scopeIntegrity`, additive): discovered /
  analyzed / ignored / unrecognized / parseFailed / truncated counts +
  `scopeVerdict` — PROVEN only when analyzed ≡ claimed scope; else PARTIAL
  with named reasons. The terminal reporter renders the scope block and the
  "repository verified" phrasing is forbidden output unless PROVEN. Walk-level
  accounting: matcher exclusions (`onIgnored`) and unclaimed files
  (`onUnrecognized`) are counted at the shared walk; parse failures are
  counted at the rule stage.
- **Exit-code decision proofs** (tests/blast-radius/scope-and-exit.spec.ts):
  the frozen decision points exercised in both directions — trigger present →
  frozen code, trigger absent → a different code — plus the closed frozen set
  {0,1,2,10,20}.
- Machine-contract doc regenerated with the three additive blocks
  (`contractVersion 1` unchanged — additive within the schema).

### Changed

- Discovery accounting: the shared walk counts matcher-excluded files and
  unclaimed files (ScanContext gains optional `onIgnored`/`onUnrecognized`;
  all shared-walk adapters pass them through).

### R4b False-Green Attack Corpus (remediation/remote-first)

The False-Green Attack Corpus: hostile failure classes with mutation-based detection proofs.

### Added

- **tests/false-green/** — the adversarial corpus (plan §6, P0): 20 cases
  across the plan's seven hostile classes (execution · parser · adapter ·
  evidence · rule · mcp · agent failures), each declaring the seven
  owner-required fields (INPUT / EXPECTED EXECUTION / EVIDENCE / VERDICT /
  EXIT CODE / REPORT FIELDS / RELEASE IMPACT) and executed against real
  surfaces with specific field bindings:
  - execution: empty suite (score null + no-tests-found recorded), deadline
    truncation, and the partial+findings never-blocks invariant (audit C5);
  - parsers (through the real `runForensics` entry): corrupt JSON, truncated
    Playwright report, malformed JUnit, unsupported schema → zero records →
    exit-2 state — PARSER FAILURE ≠ CLEAN; duplicate retry-storm records stay
    visible;
  - adapters: scalar-jobs workflow fabricates nothing; broken YAML is SKIPPED
    with accounting;
  - rules: a throwing local plugin rule (QA-ACME-666) → `rulesCrashed ≥ 1`
    with the scan completing — RULE CRASH ≠ CLEAN;
  - evidence: missing/corrupt baseline → hasBaseline=false (exit 2); stale
    baseline resolutions stay scoped to their capture; the foreign
    baselineCommit is recorded (binding gate ships R4c);
  - MCP: unknown tool / invalid params answer JSON-RPC errors, never success;
  - agent: codegen and generated-header provenance classification — AGENT
    CLAIM ≠ VERIFICATION.
- **Mutation / assertion-strength protocol** (tests/false-green/mutation-
  protocol.spec.ts): for every wired case and every report-field binding, the
  false-green twin of the honest report (failure→success, partial→complete,
  unknown→clean, crashed-rule→clean…) is injected and the case's assertion
  must FAIL on it — a decorative assertion fails CI. Parser input twins flip
  the hostile input to its benign form and require the observed verdict to
  flip with it.
- **Generated, drift-locked index** (npm run false-green:index + index.spec.ts):
  one row per case with all seven declarations, the mutation inventory, and
  the UNSURFACED rows (MCP transport internals / agent-action policy → R8;
  artifact binding → R9) — recorded per Constitution §5, never silently
  dropped. All seven plan classes present.

### R4a Trust Constitution + Release Trust Verdict (remediation/remote-first)

The Trust Constitution and the two-layer release-trust verdict algebra.

### Added

- **docs/TRUST-CONSTITUTION.md** — canonical law: CERTIFICATION-POLICY A1–A4
  adopted as §1; the 18 PASS-forbidden conditions (verbatim); the closed status
  algebra (PROVEN evidence-state → PASS/FAILED derivation, terminality rule,
  record shape); the core law (`PASS = conclusion backed by sufficient
evidence`); per-dimension applicability (UNSUPPORTED surfaces are recorded,
  non-blocking, and drift-locked); publication honesty.
- **docs/RELEASE-TRUST-CONTRACT.md** — the canonical 12 dimensions (fixed set,
  fixed order, governance-locked): Engine/Evidence/Rule Integrity, Failure
  Containment, Corpus Integrity, Contract Compatibility, Determinism, Scope
  Integrity (ships R4c), Reproducibility, Zero-Network Compliance, Agent Safety
  (R8), Artifact Integrity (R9).
- New verb **`mjolnir release-trust`** emitting `mjolnir.release-trust@1` —
  byte-deterministic (frozen key order, no timestamps, zero absolute paths),
  per-dimension `evidence` + `determination` via the status algebra, verdict =
  contract satisfaction (never a PROVEN count) with the binding system
  invariant. Exit contract: 0 PASS · 1 non-PASS · 2 blocked context · 10 usage ·
  20 internal. Drift-locked by tests/contract/release-trust-contract.spec.ts
  (canonical set/order, binding resolution, derivation table + terminality,
  byte-stability, path-freedom).

### Changed

- **release.yml**: the Release Trust Verdict gate is wired RELEASE-BLOCKING
  pre-publish (Tests → Certification → CHANGELOG Gate → … → release-trust gate
  → publish), running the BUILT binary; the verdict block + machine contract
  ship with the GitHub Release (publication honesty — a missing proof renders
  UNPROVEN, never omitted). No waiver path.

### R4 blast radius audit (remediation/remote-first R4)

The blast-radius audit: a machine-verified surface manifest with its own drift lock.

### Added

- **docs/BLAST-RADIUS-AUDIT.md** — the machine-verified surface manifest
  (`npm run docs:blast-radius`): src inventory with per-area LOC, the internal
  import fan-in ranking (change-blast candidates), the external dependency
  allowlist, and the shipped surface (adapters, rules census, CLI flags, report
  formats, frozen exit codes).
- **tests/contract/blast-radius.spec.ts** — the machine-TESTABLE boundary
  contract: the committed manifest must equal a fresh render; every external
  import in src/ must belong to the allowlist (`yaml`, `ts-morph`,
  `web-tree-sitter`, `tree-sitter-wasms`; node builtins are platform
  contracts); every CLI flag parsed must appear in the manifest; every
  `process.exit(N)` in src/ must be inside the frozen set (0/1/2/10/20).

### P6 quarantine remediation (remediation/remote-first R3)

Quarantine remediation: measured verdicts recorded, the quarantine ledger reconciled, and three rules restored to the live set.

### Added

- **docs/QUARANTINE-REMEDIATION.md** — the ledger-first quarantine view, generated
  from the live registry (`npm run docs:quarantine-ledger`) and drift-locked
  (tests/contract/quarantine-ledger.spec.ts): one row per live quarantine rule
  with failure-mode class, disposition, and re-measure gate; historical section
  records the governed retirements.
- Python tree-sitter parse stage: `parsePythonAst` wired into the python
  adapter's async `parseAst` hook (the §10 parse-or-fallback contract), with
  `src/engine/python-ast.ts` structural queries — the first real python AST
  substrate (the Sprint-8 "unwired" caveat is closed and re-pinned honestly).

### Changed

- **QA-PY-007** (detectorRevision 4, AST rework): fires only on ≥2-statement
  with-blocks or broad root exception types — the adjudicated FP core
  (single-statement/specific-type) suppressed. Corpus: pytest-dev 167 → 11,
  pallets-click 16 → 1 live findings.
- **QA-TQUAL-009** (detectorRevision 2, AST rework): skips Cypress command
  chains (`cy.`-rooted — the driver awaits them) and deliberate `void`
  discards. Corpus: cypress-realworld-app 10 → 0.
- **QA-PW-147** (detectorRevision 2, final attempt): AST arm fires only on real
  test/it declarations — code-as-data (`test('test')` inside lint-rule test
  strings) can never fire. Corpus: eslint-plugin repo 32 → 0.
- **QA-ENV-001** (detectorRevision 4, final attempt): OS-path sub-pattern
  dropped (20/20 adjudicated FP — deliberate path fixtures, same undecidability
  as the wave-2 host drop); locale/local-time families kept. Corpus: grafana
  7 → 4.
- Measurement: orphaned verdicts (findings the reworks suppressed) archived to
  `tests/corpus/verdicts/archive/` per the established prune flow; the three
  fully-reworked rules fall below the n ≥ 10 threshold and ship UNMEASURED
  until owner re-adjudication (measured census 77 → 74 of 79; the
  certification floor test documents the P6 invalidations).

### P3c Jenkins (remediation/remote-first R2)

Jenkins support: a bounded Jenkinsfile scanner and the QA-CI Jenkins arms (retry masking, catchError rescue, silent swallow).

### Added

- Jenkinsfile detection: the root `Jenkinsfile` (declarative and scripted
  pipelines) is now discovered and scanned as a TEXT-target kind — a bounded,
  string-aware Groovy block scanner (`sh` segments, `catchError` blocks,
  `try`/`catch` pairs); no new language grammar (master-plan P3c wording).
- New rule **QA-CI-014** "try/catch swallows a verification-stage failure" —
  a `try` running a gate whose `catch` neither rethrows, calls `error(...)`,
  marks `currentBuild.result`, nor downgrades via `unstable()`. BORN
  QUARANTINE (§15.5): opt-in via `--strict` until corpus-measured.

### Changed

- **QA-CI-002** (detectorRevision 4): Jenkinsfile routing — the lexical
  `|| true` scan now reaches `sh` strings.
- **QA-CI-008** (detectorRevision 4): Jenkinsfile arms —
  `catchError(buildResult: 'SUCCESS')` wrapping a gate, and `unstable()` used
  as a rescue for a failed verification stage (master-plan P3c shapes;
  `buildResult: 'UNSTABLE'` is a visible downgrade and never fires).
- **QA-CI-009** (detectorRevision 3): Jenkinsfile arm — `sh` running a
  verification gate with `returnStatus: true` discards the exit code.
- Measurement: sidecar + `MEASURED_FP` re-recorded for QA-CI-002/008/009
  (corpus re-run: no corpus repo carries a root Jenkinsfile, so the
  classified verdict evidence carries over unchanged).

### P3b Azure DevOps (remediation/remote-first R1)

Azure DevOps support: guarded azure-pipelines.yml parsing, the QA-CI Azure arms, and the adapter's honest accounting.

### Added

- Azure DevOps pipeline detection: `azure-pipelines.yml` at the repo root is now
  discovered and scanned (`azure-pipelines` adapter, safe-YAML machinery shared
  with the GitHub Actions parser — alias-bomb guard, depth cap, prototype-safe
  keys; docs/AZURE-DEVOPS.md).
- New rule **QA-CI-013** "Verification gate conditioned so it can never fail the
  pipeline" — `condition: failed()` rescue, `condition: false`, `enabled: false`
  on Azure verification gates. BORN QUARANTINE (§15.5): opt-in via `--strict`
  until corpus-measured; never silent-core.
- docs/AZURE-DEVOPS.md — platform recipe with the frozen exit-code contract.

### Changed

- **QA-CI-001** (detectorRevision 3): Azure DevOps arm — `continueOnError: true`
  on a verification step or a gate-bearing job (same mechanism, framework-tagged
  `azure-pipelines`).
- **QA-CI-002** (detectorRevision 3): Azure routing — the lexical `|| true` scan
  now reaches `bash:`/`pwsh:` script blocks in azure-pipelines.yml.
- **QA-CI-007** (detectorRevision 3): Azure DevOps arm — `retryCountOnTaskFailure`
  on verification tasks.
- **QA-CI-008** (detectorRevision 3): Azure DevOps arm — verification gate jobs
  conditioned `always()` / `succeededOrFailed()` (master-plan P3b shape).
- Measurement: sidecar + `MEASURED_FP` re-recorded at detectorRevision 3 for
  QA-CI-001/002/007/008; corpus re-run showed zero QA-CI count drift (no corpus
  repo carries a discoverable azure-pipelines.yml), so the existing classified
  verdicts remain the measurement evidence.

## [1.0.5] — 2026-09-10

### Changes since 1

- chore: resync managed surface stamp to v1.0.4

## [1.0.4] — 2026-09-10

### Changes since 1

- P15: adversarial suites — parser fuzz, determinism soak, bench advisory CI (#72)

## [1.0.3] — 2026-09-10

### Changes since 1

- Brand system unification: one source of truth, and a gate that proves it (#71)
- docs(brand): certification to its final state — v1.0.2, 9 rules, CI green
- ci: the lockfile-marker guard needs an explicit bash shell
- ci: run the site build on PRs, and guard against lockfile conflict markers
- fix: resolve committed merge-conflict markers in package-lock.json
- Merge origin/main (v0.6.1 → v1.0.2) into brand/unification
- feat(brand): close the two gaps that were closable — 9.4 → 9.6
- docs(brand): record the v0.6.1 merge in the certification
- refactor(reporter): the Trust Report takes its rungs from the symbol module
- feat(brand): rebuild every asset on the merged reporter, and adopt flow.svg
- fix(docs): a placeholder was breaking the site build again
- chore: one blank line, so `npm run lint` is green again
- Merge origin/main (v0.5.31 → v0.6.1) into brand/unification
- docs(brand): record D16 and the CI surfaces in the certification
- feat(brand): Phase 13 — the badge the product emits joins the brand
- docs(brand): stop the shipped docs pointing at an untracked file
- docs(brand): Phase 12 — certification, and the score it actually earned
- docs(brand): Phases 9 and 11 — write the system down, once each
- feat(brand): Phase 10 — the reporter's diagrams stop lying about UNKNOWN
- feat(brand): Phase 8 — the website says what the product says
- fix(video): the shipped demo is now reproducible, and checked
- feat(brand): Phase 6 — the badges join the brand, in all 23 READMEs
- feat(brand): Phase 5 — one geometry for evidence and trust
- feat(brand): Phase 4 — one palette, and the AA failure it was hiding
- feat(brand): Phase 3 — one typography system across every surface
- fix(site): the site build has been broken since 9f59bc5 — repair it
- feat(brand): Phase 2 — the brand gate, proven able to fail
- feat(brand): Phase 1 — one source of brand truth, zero visual change
- docs(brand): Phase 0 — freeze the tree and measure the before-state
- docs(brand): carry forward in-flight README asset work
- chore: resync managed surface stamp to v0.5.31

## [1.0.2] — 2026-09-09

### Changes since 1

- P8: depth adjudication — no unexplained depth (all 89 LEXICAL rules + matrix completion + migration deferral) (#70)

## [1.0.1] — 2026-09-09

### Changes since 0

- chore(release): v1.0.0 — Core Certification cut (WI-16)

## [1.0.0] — 2026-09-09

### Added

- **Core Certification (WI-16): 1.0.0 is the first fully-measured
  release.** Every active canonical rule (77) satisfies the
  measurement law — n ≥ 10 hand-classified verdicts at the current
  detectorRevision, zero PROVISIONAL, zero denominator games. The
  2026-09-09 harvest waves (WI-14) measured the final 15 rules via the
  class-B fixture corpus and closed the census; QA-PY-102 was retired
  as a structural dead duplicate (its measured sibling QA-PY-005
  declares overlapWith, so it could never fire). Certification report:
  docs/CERTIFICATION-1.0.md. Evidence chain: doctor self-audit WORTHY
  (77/77), full suite 7,054 green, determinism replay byte-identical,
  adversarial + benchmark suites green, CHANGELOG integrity gate
  active.

### Removed

- **QA-PY-102 retired** (22nd retirement, WI-14 closeout): structural
  dead duplicate — QA-PY-005 (the measured survivor) declares
  overlapWith QA-PY-102, so every finding dedups away and the rule can
  never fire, never be measured. Frozen IDs are never reused.

## [0.6.12] — 2026-09-09

### Changes since 0.6.11

- fix(lint): no-regex-spaces in sync-census tooling ({2} quantifier)

## [0.6.11] — 2026-09-09

### Changes since 0.6.10

- fix(lint): exclude scripts/*.mts from the typed-parser project route

## [0.6.10] — 2026-09-09

### Changes since 0.6.9

- fix(lint): scripts/*.mts one-shot tooling runs under the plain JS ruleset

## [0.6.9] — 2026-09-09

### Changes since 0.6.8

- feat(measurement): WI-14 closeout — 77/77 measured, 0 PROVISIONAL (1.0.0 census achieved)

## [0.6.8] — 2026-09-09

### Changes since 0

- feat(corpus): WI-14 harvest waves 1-5 — census 60 → 72 of 78 measured

## [0.6.7] — 2026-09-09

### Changes since 0.6.6

- fix(tests): fresh-install gate asserts the Trust Report surface (WI-5 follow-through)

## [0.6.6] — 2026-09-09

### Changes since 0.6.5

- fix(release): format the collapsed CHANGELOG before the lint gate (bot fix)

## [0.6.5] — 2026-09-09

### Changes since 0.6.4

- chore(test): re-baseline the coverage ratchet for the 0.6.x line (measured 99.8/99.37/99.81/99.82; per-file pause documented)

## [0.6.4] — 2026-09-09

### Changes since 0.6.3

## [0.6.3] — 2026-09-09

### Added

- `trust-report --from <mjolnir.json> [--stdout]` (WI-9): the Trust
  Artifact rendered from a SAVED canonical scan result — the GitHub
  Action's comment/annotation steps derive from the exact saved report
  (one semantic truth, no second scan). Includes honest error paths:
  read / parse / write failures each surface their own catch via the
  consolidated `errorMessage` derivation in cli-io.ts.

### Fixed

- Error-path hardening across the trust-report verb: read and parse
  failures split into separate honest catches; artifact-write failures
  (disk-full / permission) exit 20 instead of crashing; the
  no-positional default-target arm covered.

## [0.6.2] — 2026-09-09

### Changes since 0.6.1

- Create FUNDING.yml

## [0.6.1] — 2026-09-09

### Changes since 0.6.0

## [0.6.0] — 2026-09-09

### Changed

- Version line opens: **0.6.x = Productized Core (plan §31)**. The full
  workstream-A capability set (Trust Report hero surface, Canonical
  Evidence Core, trustSummary metrics, machine contract extension,
  explain v2, triage v2 guided workflow, Action Trust-Report
  consumption, zero-config evidence discovery, CHANGELOG integrity
  gate, mvp-demo corpus + golden harness, E-1 retirement of 21 rules —
  active census 78 rules: 57 measured, 21 PROVISIONAL) shipped in
  **0.5.40**, the first release produced under the active CHANGELOG
  integrity gate. 0.6.0 establishes the 0.6.x version line; no code
  changes in this release.

## [0.5.40] — 2026-09-09

### Added

- **Trust Report — the hero product surface (WI-5).** `mjolnir` now leads
  with the five questions — TRUST VERDICT (trust level + headline),
  CONFIDENCE (confidence, evidence coverage, inconclusive rate, measured-FP
  of fired rules, tests analyzed), WHY THIS VERDICT (evidence-backed
  reasons), TOP TRUST RISKS (corroboration-ranked), NEXT ACTION (concrete
  command) — all rendered from the canonical scan result only (every
  number exists in `--json`). `--classic` escapes to the previous render;
  rendering flag only, semantics and exit codes unchanged.
- **`mjolnir trust-report` (WI-6).** Emits deterministic, self-contained
  `mjolnir-trust-report.{md,json}` — no cloud/telemetry; PR-attachable,
  agent-consumable; byte-identical for the same scan.
- **`trustSummary` on the scan JSON (WI-3, plan §6).** Scan-level trust
  measurement: level, ceiling-capped confidence (partial 0.5 /
  truncation 0.6 / rules-crashed 0.8 / framework-unknown 0.9),
  evidenceCoverage, inconclusiveRate, measuredFpOfFiredRules with
  PROVISIONAL disclosure of unmeasured fired rules. Formulas published in
  `docs/SCORING.md`.
- **Machine contract extension (WI-4).** `buildMachineContract` now
  carries `trustSummary` and `provenance` verbatim from the canonical
  result, plus a reserved `forensicVerdicts` slot (unpopulated until the
  1.1.x forensic taxonomy). `contractVersion` stays 1; additive only.
- **Canonical Evidence Core (WI-2).** `src/engine/evidence-core.ts` — one
  normalized `EvidenceRecord` shape with deterministic ordering; the scan
  pipeline fans all runtime evidence through it; stamping semantics
  preserved byte-identically (differential preservation suite).
- **Explain v2 (WI-7).** `mjolnir explain` gains verdict mode
  (`mjolnir explain verdict --json <mjolnir.json>`) and finding mode
  (file:line delegates to `mjolnir why`); every mode now answers the §8
  checklist including WHAT WOULD CHANGE THE VERDICT and NEXT ACTION.
- **Triage v2 (WI-8).** `mjolnir triage` now runs the §9 guided workflow —
  CLASSIFY → EVIDENCE → TRUST VERDICT → NEXT ACTION per row, every row
  ending in a concrete command; `--classic` keeps the table, `--json`
  emits the structured twin.
- **Zero-config evidence discovery (WI-11).** The scan auto-discovers
  run evidence from conventional layouts (mjolnir.report.json, PW JSON
  reporter names, test-results/, JUnit XML) at depth ≤ 2; scans without
  evidence state exactly what is missing and the honest trust ceiling.
- **Canonical MVP evidence corpus + golden harness stage 1 (WI-13A/B).**
  `examples/mvp-demo/` covers all 12 evidence case classes (9 active / 3
  awaiting-ingestion, trace.zip deferred to WI-17); the stage-1 harness
  proves same-evidence → same-verdict across CLI + JSON with
  INCONCLUSIVE-as-pass semantics.
- **CHANGELOG integrity gate (WI-12A).** `scripts/check-changelog.ts` is
  release-blocking in the release workflow (before publish, before
  Release creation) and runs on every main CI build: released version
  must have a dated CHANGELOG section; gate-era headings strictly
  ordered; rule changes must be documented.

### Removed

- **21 rules retired and unregistered (E-1 retirement reconciliation, owner
  ruling 2026-09-08).** `RETIRED_RULE_IDS` (in `src/rules/index.ts`) is now the
  canonical, auditable record of retirement: a rule explicitly marked RETIRED by
  `docs/RULE-LIFECYCLE.md`'s Phase 2 quarantine-cluster triage no longer counts
  toward the active registry, the census, or the measurement KPI — quarantine
  does not equal retirement. The active registry is now **78 rules (57 measured,
  21 author-estimated)**. Every removed rule was measured at 100% FP with zero
  true positives (n ≥ 10 each, `docs/FP-AUDIT.md`), i.e. its premise is wrong on
  real code, not its tuning. Behavioral impact: none on default scans (all 21
  were quarantine-tier, which runs only under `--strict`); `--strict` scans stop
  reporting these advisory findings. Evidence level of every removed finding was
  E0 (observation only, never gating). Measurement status: all 21 measured at
  1.0 FP rate (detector revision 1) — the measurements and their verdict rows
  are preserved as history (`tests/corpus/verdicts/archive/`,
  `docs/RULE-LIFECYCLE.md`). User-visible impact: fewer false-positive advisory
  findings under `--strict`; the "99 rules" claim everywhere becomes the honest
  count of active canonical rules (78). Frozen IDs are never reused; the
  retired IDs are listed with per-rule rationale in `RETIRED_RULE_IDS`.
  Removed IDs — Playwright TS: QA-PW-005, QA-PW-103, QA-PW-105, QA-PW-107,
  QA-PW-108, QA-PW-112, QA-PW-114, QA-PW-118, QA-PW-119, QA-PW-120, QA-PW-145;
  quality: QA-TQUAL-001; Python: QA-PY-006, QA-PY-008, QA-PY-010; family
  variants: QA-JV-108, QA-CS-108 (hardcoded-URL), QA-JV-110, QA-CS-110
  (no-a11y), QA-JV-111, QA-CS-111 (blanket-route).

## [0.5.39] — 2026-09-09

### Changes since 0

- P9: bus-factor program — MAINTAINERS ladder, OWNER-RUNBOOK, ADJUDICATION-KIT, CODEOWNERS (#69)

## [0.5.38] — 2026-09-09

### Changes since 0

- P7: agent loop — mjolnir verify + MCP verify tool + install surfaces (#68)

## [0.5.37] — 2026-09-08

### Changes since 0

- P5: mutation evidence reader — Stryker/mutmut, E1→E2 derivation, report-only (#67)

## [0.5.36] — 2026-09-08

### Changes since 0

- P4: forensics breadth — Jest + Vitest JSON ingestion (honest degradation) (#66)

## [0.5.35] — 2026-09-08

### Changes since 0

- P3a: GitLab CI — Code Quality report, MR recipe, exit-code discipline (#65)

## [0.5.34] — 2026-09-08

### Changes since 0

- p2: structural anti-dilution — deduction-mass ceilings close the padding vector (plan 1788853205786 P2, decision 4) (#64)

## [0.5.33] — 2026-09-08

### Changes since 0.5.32

- P1: distribution — root action, moving v1 tag, action-based ci install (#63)

## [0.5.32] — 2026-09-08

### Changes since 0.5.31

- P0: repo state + truth drift — single measured count with drift lock (#62)

## [0.5.31] — 2026-09-08

### Changes since 0.5.30

- chore: resync managed surface stamp to v0.5.30 (docs narrative landed on the release state)
- docs: README narrative refresh + reproducible flow/architecture assets with contract locks (docs:flow, docs:architecture)

## [0.5.30] — 2026-09-08

### Changes since 0.5.29

- Cross-language side-by-side review aid for rule families 106/107 (§19 review tool, decides nothing) (#60)

## [0.5.29] — 2026-09-08

### Changes since 0.5.28

- fix(corpus-sample): never delete review sheets of rules not sampled in the current run — scoped runs used to wipe pending §19 owner classifications

## [0.5.28] — 2026-09-08

### Changes since 0.5.27

- feat(corpus-sample): --repo resumability + --budget override — one-process-per-repo avoids V8 OOM on large monorepos; budget raise is the documented chronic-truncation remedy

## [0.5.27] — 2026-09-08

### Changes since 0.5.26

- fix(corpus-sample): refuse PARTIAL scans — findings from a truncated scan are not evidence (same refusal as corpus/audit.ts, D14/§19 discipline)

## [0.5.26] — 2026-09-08

### Changes since 0.5.25

- Certification findings remediation: F1-F5 + P3 (plan 1788806598818) (#57)

## [0.5.25] — 2026-09-08

### Changes since 0.5.24

- docs: CERTIFICATION-POLICY.md — consolidated owner-ratified lawbook (1-22 + L1-L6), contradiction pass, verdict semantics; eslint/prettier ignore machine-local .mjolnir scratch (#59)

## [0.5.24] — 2026-09-08

### Changes since 0.5.23

- L4 ruling: tier-enforcement INCONCLUSIVE without live verdicts (MEASURED_FP = historical artifact only) (#58)

## [0.5.23] — 2026-09-08

### Changes since 0.5.22

- docs(corpus): D14 as amended by owner — re-baseline-per-wave is blocking, PARTIAL repos are tracked debt (never baselines, never a certification gate); zero-PARTIAL is the end state, not the gate

## [0.5.22] — 2026-09-07

### Changes since 0.5.21

- chore: gitignore bench artifacts (machine-local timings + fixture scratch)
- test(corpus): D14 re-baseline after Wave-1 merges — QA-PW-124 now adapter-gated (configRule metadata), QA-TEST-003/010 surface on repos whose baselines predate the TS project split, corpus regen of partial scans pending quiet-machine rerun
- chore(qa): eslint-ignore the verbatim QA evidence area (raw probes are committed DATA, certification protocol)
- chore(qa): commit FINAL-RELEASE certification evidence verbatim (cycle 0, RC 151186b) + lint/format exclusions for raw evidence area (certification plan 1788804968910 protocol)

## [0.5.21] — 2026-09-07

### Changes since 0.5.20

- Integrity layer: category + measurement consistency, measurement census, §27 design pass (Phases 1+4+7) (#56)

## [0.5.20] — 2026-09-07

### Changes since 0.5.19

- Doctor status model + --json contract + certification CI gate (Phase 5, G2/G5/G6) (#55)

## [0.5.19] — 2026-09-07

### Changes since 0.5.18

- Detector revision integrity: manifest, doctor check, CI WARN base-diff (D8v2, G4) (#54)

## [0.5.18] — 2026-09-07

### Changes since 0.5.17

- README: add npm downloads badge

## [0.5.17] — 2026-09-07

### Changes since 0.5.16

- Fixture integrity gate: Layer A structural typecheck, doctor fixture-integrity, Python tier (F1, D9, G3) (#53)

## [0.5.16] — 2026-09-07

### Changes since 0.5.15

- Curation + mechanical hygiene: QA-PW-124 D3 alignment, F7-F10 closures (#51)

## [0.5.4] — 2026-09-06

### Agent Handoff + Minimized Reporting (plan 1788599400000)

### Added

- **`mjolnir why <file>:<line>`** — occurrence-level evidence query
  (informational, NOT a gate): exact file+line match, severity icon,
  message/why/fix, evidence level, trust level, measured FP rate
  (or the honest "ships on assumption"), runtime corroboration when
  present, and the suppression contract (reason required, 90-day
  expiry). Saved-report mode (`--json <mjolnir.json>`) is
  authoritative; live scan runs otherwise. Exit 0 match / 1 no match.
- **`mjolnir handoff [mjolnir.json]`** — the deterministic fix-handoff
  artifact: per-rule remediation sections (what is wrong / why
  Mjölnir believes it / evidence boundary by level / occurrences
  capped at 25 / fix / constraints / occurrences list), a per-rule
  fenced copy block and a one-shot handoff prompt, and the formal
  verification contract (TARGET_RESOLVED / TARGET_REMAINS /
  NEW_FINDINGS_INTRODUCED / VERIFICATION_NOT_RUN, correlated by the
  fingerprint ruleId+file+message; the standing caveat that a clean
  `--scope changed` run verifies the changed surface only). Generated
  solely from Mjölnir's own rule metadata — offline, deterministic,
  escapeMarkdown'd. Zero findings → exit 0, non-actionable clean
  artifact with no prompt. `--category`/`--rules` are presentation
  filters.
- **`mjolnir install`** — installs the agent instruction surfaces
  (`.claude/commands/mjolnir.md`, `.kilo/command/mjolnir.md`,
  `.cursor/rules/mjolnir.mdc`, marker-appended `AGENTS.md`): the
  version-pinned trust loop brief (scan `--scope changed` before
  finishing, never suppress to green, report files changed and checks
  not run). `--staged-hook` adds a NON-BLOCKING pre-commit hook
  (`mjolnir --staged --blocking warning`, reusing `.husky`/
  `core.hooksPath` when present). Marker-based idempotency;
  `--dry-run` writes nothing; refusal (exit 10) before overwriting
  any non-Mjölnir file; `--force` overwrites only Mjölnir-marked
  files; never @latest.
- **`--score`** — prints only the numeric score (`unknown` when no
  tests exist — never a fake 0); pure rendering flag, exit code
  unchanged; stderr note when --json was also requested.
- **`--category <cat>`** (repeatable) — presentation filter on the
  terminal findings display (and handoff/why): NEVER filters the
  scan, the JSON/SARIF output, or the score; the terminal prints
  `filtered view: N of M findings shown; score reflects the full
scan`. Unknown categories are a usage error (exit 10).
- **`--staged`** — scan-surface restriction: intersects discovered
  test files with the git staged list; score reflects the staged
  surface and is labeled as such (`staged surface: N file(s)`); not a
  git repo → honest degraded fallback; empty staged set → exit 0.
- **`--blocking error|warning|none`** — exit-status override only:
  maps onto the existing gate model (none→advisory, error→errors
  block, warning→errors+warnings block). Detection and rendering are
  identical under all three values; E0 findings never block; partial
  scans stay exit 2.
- **`fixGroupId`** (additive JSON field): the stable semantic identity
  of a remediation group — intentionally distinct from `ruleId`
  (which identifies the detector). Current strategy: one rule = one
  group, so fixGroupId equals ruleId today; consumers must not rely
  on that permanently.

### Changed

- help registry gained `why`, `handoff`, `install` and the new flags;
  site/reference/cli.md documents the handoff trust model.

## [0.5.15] — 2026-09-07

### Changes since 0.5.14

- Close-out: complete the 21-rule fixture program (blueprint §19) (#50)

## [0.5.14] — 2026-09-07

### Changes since 0.5.13

- Merge pull request #47 from Sergey-Bar/claude/readme-demo-video-4rzxij
- Cover the mjolnir mcp dispatch branch — CI's 100% ratchet caught it
- README: define Selector Health, state the limits, lock the samples
- Expose the MCP server, and document the agent surface in the README
- See it work: embed the real demo video inline
- Rework See it work and the score section: real video, fixed-size cards
- Replace the See it work poster+MP4 and shorten the score hero image
- Replace the score/verdict table with an animated hammer sweep

## [0.5.13] — 2026-09-07

### Changes since 0.5.12

- Merge pull request #33 from Sergey-Bar/claude/readme-demo-video-4rzxij
- fix(video): resolve ffmpeg/ffprobe without a shell
- Resync generated assets after merging origin/main (v0.5.12)
- Merge remote-tracking branch 'origin/main' into claude/readme-demo-video-4rzxij
- merge: catch up to main again (v0.5.6) — a second PR landed underneath this one
- Merge remote-tracking branch 'origin/main' into claude/readme-demo-video-4rzxij
- fix: explain's fixture path was OS-native, breaking Windows CI
- merge: bring in main's UX overhaul, reconcile the reporter conflicts
- Merge remote-tracking branch 'origin/main' into claude/readme-demo-video-4rzxij
- video: adopt react.doctor's terminal palette and font
- video: fix invisible command text, and guard the whole class
- video: present the terminal as a window, not a maximised screenshot
- video: re-render both demos against the fixed reporter
- report: one hammer, and output that fits the terminal it prints to
- video: add the manual render workflow and document the pipeline
- docs: restructure the README around the demo, and lead with the video
- video: add the media-format contract, and ship the hero MP4
- video: render the committed scripts to 1440p H.264, frame by frame
- video: capture the demo scripts from real scans, and contract them
- video: vendor the render font stack, gated by a cmap-exact glyph probe
- docs: fix the stale numbers in the honesty section, and guard them

## [0.5.12] — 2026-09-07

### Changes since 0.5.11

- Product-Experience Master Plan: content integrity, canonical terminology, brand cleanup, CI path integrity (#44)

## [0.5.11] — 2026-09-07

### Changes since 0.5.10

- Merge pull request #45 from Sergey-Bar/eng/closeout-recommendations
- docs: FP-AUDIT status column settles on the second generator pass (stale module import in single-pass)
- docs: regenerate QA-ENV-001 + QA-PW-147 rule docs (now measured)
- close-out: 39 verdicts adjudicated (AI-assisted, owner-authorized) — 78/99 measured

## [0.5.10] — 2026-09-06

### Changes since 0.5.9

- Merge pull request #43 from Sergey-Bar/eng/closeout-2.4
- docs: close-out eligibility audit + final 2.0 certification report (five-way verification classification)

## [0.5.9] — 2026-09-06

### Changes since 0.5.8

- Merge pull request #42 from Sergey-Bar/eng/lane-a-qamodel-2.3
- docs: regenerate all generated artifacts under the Lane A rev-2 rules
- feat: Lane A — hard-sleep JV/CS family migrated to the QA-model substrate (blueprint §10)

## [0.5.8] — 2026-09-06

### Changes since 0.5.7

- Merge pull request #41 from Sergey-Bar/eng/mcp-transport-2.2
- feat: MCP stdio transport — pure transport over the machine contract (blueprint §21, Phase 4)

## [0.5.7] — 2026-09-06

### Changes since 0.5.6

- Merge pull request #40 from Sergey-Bar/eng/machine-contract-2.1
- test: plural + unknown-cause arms for inconclusive resolution rendering
- feat: machine verification contract + finding detectorRevision + lifecycle resolution (blueprint §12-§15, §17, §25)

## [0.5.6] — 2026-09-06

### Changes since 0.5.5

- Merge pull request #39 from Sergey-Bar/eng/verification-trust-2.0
- docs: regenerate readme SVGs under the revision-2 CI-rule measurements
- docs: regenerate rule-doc occurrence tables (yarnpkg-berry corpus lane)
- fix: eslint pragma for the file-wide consumer fallback regex
- fix: rev-2 enforcement arm in QA-CI-008 was dead code + coverage arms for CI rules
- ci-family trust repair: M2 detector re-adjudication, revision 2 re-measurement, workflow corpus lane

## [0.5.5] — 2026-09-06

### Audit Remediation 1.0 (engine correctness + trust boundary)

### Changed — plugin execution gate (audit C2, contract-visible, pre-1.0)

- **`--enable-plugins` / `MJOLNIR_ENABLE_PLUGINS=1`** — npm plugins and
  JS-module external rules (`mjolnir-rules/*.mjs`) now load and execute
  only behind an explicit opt-in (default OFF). Declared-but-gated
  sources are listed on a loud stderr notice; they are never imported.
  JSON rule manifests execute no code and load without the gate. See
  SECURITY.md (trust model) and docs/VERSIONING.md (gate contract).

### Fixed — engine correctness (audit M1)

- **C1/W9 (`--cache`)**: the cache key folds in the repo-relative path,
  adapter id, and parse mode — byte-identical files no longer share
  verdicts (findings carried the first-scanned file's path), and
  regex-fallback verdicts are never served as AST ones. `CACHE_VERSION`
  bumped to 2: one-time invalidation, first post-upgrade scan cold.
- **C3**: the default console sinks are variadic —
  "mjolnir internal error:" now carries the actual cause (the message
  used to be dropped).
- **C5**: a partial (truncated) scan never writes the
  first-clean-scan milestone; `mjolnir diff` on a truncated head
  returns exit 2 and folds no resolved findings into stats.
- **W1**: the Java/C# maskers keep code after a closed block comment
  live (`/*x*/y` used to blank `y`).
- **W2/W3**: parse-semaphore re-check (cap holds under fan-out) and
  parser-creation retry on rejection (a transient WASM load failure no
  longer disables the AST path for the process).
- **W4**: unchecked grammar-shape casts removed in the QA-model
  extractor; `parseTsFile`'s undefined contract honored.
- **W8**: runtime corroboration claims "test" level only when the
  finding's line falls inside the verdict's span; lineless reports
  degrade to file level.
- **W10**: malformed rule records at the rule→Finding boundary are
  rejected with a diagnostic (crash channel), never silently scored.
- **S5 (QA-CI-001, detectorRevision 2)**: step-level line resolution
  falls back to the anchor line instead of crashing — the rule no
  longer vanishes into crash isolation on workflows where the raw
  `continue-on-error: true` literal sits outside the search window.
  Behavior changes from crash-dropped to reported; sidecar +
  measured-FP regenerated per policy.
- **masking.ts**: outer-delimiter search fixes misclassification of
  string values ending in a nested quote.
- **changed.ts**: hunk-content lines that look like diff headers no
  longer abandon the hunk; one unreadable untracked file degrades only
  itself (treated fully changed), never the whole scope.
- **shared-walk.ts**: unreadable directories and skipped symlinks are
  counted skips with reasons; deadline/cap checks run inside the entry
  loop.
- **workflow-parser.ts**: the documented nesting-depth cap is enforced;
  `jobs` builds on a null-prototype object; step `with` is copied.

### Changed — suppressions expiry (audit S4, contract-visible, pre-1.0)

- The 90-day default for hand-authored `ignore` entries is no longer
  anchored at the config file's mtime — any config edit used to reset
  every suppression window. Expiry is the entry's explicit `expires`
  date; entries without one stay active and are labeled accordingly in
  `mjolnir suppressions`.

### Hardened — trust boundary (audits S1/S2/S3/S7)

- **S1**: git resolves to an absolute path from PATH (never the scanned
  CWD) — a planted `git.exe`/`git.bat` cannot hijack Mjölnir's git
  calls on Windows.
- **S2**: ignore/glob patterns and external JSON-rule regexes are
  length/wildcard-capped at compile time; `**/` compiles segment-aware.
- **S3**: config/ignore/plugins resolve from the explicit scan target's
  project; the resolved anchor prints in verbose mode.
- **S7**: `ignore[].files` must be `string[]` (exit 10 on typo);
  unknown top-level config keys warn; baseline `schemaVersion` is
  checked (future versions degrade to "no baseline" with a warning).

## [0.5.3] — 2026-09-05

### Terminal + CI UX Overhaul (plan 1788579907109)

### Added

- **Design-system core** (`src/reporter/ui.ts`): one canonical visual
  language — `▚ TITLE` section headers (ASCII fallback `= TITLE`),
  `✗/⚠/ℹ` severity icons (ASCII `X/!/i`), rounded panels, 58-glyph
  dividers, and a dim `$ command` next-step affordance. All
  subcommand renderers (`baseline`, `debt`, `init`, `doctor`, `fix`,
  `impact`, `stats`, `handover`, `triage`, `pw-report`, `explain`,
  `rules-catalog`, `create-rule`, `suppressions`, forensics,
  selector-health) now render through it; per-renderer `▚▞`/`🔨`/`╔══╗`
  headers and `╞══╡` tables are gone. `FORCE_COLOR` is honored
  (chalk convention: `0`/`false`/empty = plain, other values force
  color even piped, winning over `NO_COLOR`).
- **`mjolnir help` + per-command help** (`src/commands/help.ts`): the
  grouped overview (Scan · CI & PRs · Forensics · Maintenance · Meta,
  copy-pasteable starts, exit-code table, docs link) and
  `mjolnir help <verb>` / `mjolnir <verb> --help` pages for every
  registered verb. **Behavior call-out:** `help` now dispatches as a
  verb BEFORE the scan fall-through — bare `mjolnir help` no longer
  scans the CWD (it never was a documented behavior); a folder named
  `help/` is still scanned via `mjolnir ./help`. `--help`/`-h` on the
  root scan still print usage and exit 10 (frozen contract).
- **Friendly usage errors** (exit 10 preserved): unknown flags name
  themselves on stderr, suggest up to three nearest real flags
  (hand-rolled Levenshtein ≤ 2 — no new dependencies), and point at
  `mjolnir --help`. The exit-20 crash path says "this is a bug in
  Mjölnir, not your repo", carries the message, and prints the stack
  trace only under `--debug`.
- **Live scan progress** (`src/reporter/progress.ts`): an event-driven
  stderr line (`Discovering files… → Parsing frameworks… → Running
rules… → Scoring…`) fed by the new additive `ScanHooks.onProgress`.
  Render-on-event only — no timers, deterministic under a fake stream.
  Auto-off when stderr is not a TTY, in machine formats, under
  `GITHUB_ACTIONS=true`/`CI=true`, or with the new additive
  `--no-progress` flag. stdout purity and `--json` byte-identity are
  unchanged.
- **`mjolnir summary [mjolnir.json]`** (`src/commands/summary.ts` +
  `src/reporter/github.ts`): reads a saved `--json` report and emits
  GitHub annotations (only when `GITHUB_ACTIONS=true`, per-finding
  `::error|warning|notice` with spec-exact `%25/%0D/%0A/%3A/%2C`
  escaping, messages truncated at ~250 chars) and a step-summary
  markdown document (score + band, text score bar, dimensions table,
  collapsible per-severity `<details>` with `Fix:` lines, honesty
  notice for `partial`/`score:null` reports). `--stdout` forces
  stdout; `--path-prefix <dir>` re-scopes paths for subdirectory
  scans. Exit `0` on success — the gate step decides; `10` missing
  file; `2` invalid JSON.
- **CI template v2** (`ci install`): the inline `SUMMARY_SCRIPT` step
  is replaced by `mjolnir summary mjolnir.json`; the gate script is
  unchanged. v1-generated workflows are still recognized on
  overwrite-refusal, so `ci install` upgrades stay frictionless. The
  dogfooded `.github/workflows/mjolnir.yml` and `ci.yml` self-scan use
  the same command.
- **PR comment redesign** (`pr-comment`): header
  `### 🔨 Mjölnir — Verification Trust` with score + band + verdict
  headline, dimensions mini-table, findings grouped in collapsible
  `<details>` (errors open, warnings/infos collapsed) with explicit
  `Fix:` lines and evidence tags, a "what to run next" footer with the
  pinned `npx mjolnir-qa@<ver>` commands, and the
  `✨ N pre-existing findings fixed in this PR` callout. Same
  idempotency marker; same markdown escaping.
- **Site**: new `site/reference/cli.md` (help, usage errors, summary,
  progress, `FORCE_COLOR`) in the Reference sidebar.

### Changed

- README output examples and all 22 translations: the `▚▞` header
  glyph in rendered-output samples is now `▚` (the design-system
  token). English README is canonical; translation sync dates unchanged
  (glyph-only diff, advisory parity script).
- Regenerated committed assets: `assets/readme/terminal-hero.svg`,
  `demo.svg` (`docs:hero`, `docs:demo`), and the forensics/selector
  samples (`docs:forensics-samples`).

### Removed

- The hand-rolled `╔══╗`/`▚▞`/`🔨` per-command header styles and the
  `╞══╡` ASCII tables they wrapped (replaced by the shared `ui.ts`
  primitives; no CLI surface change).

### Fixed — review hardening (post-implementation audit)

- **`ci install` v1 recognition actually works now:** the v1 inline
  summary script is matched in its INDENTED form (`indentBlock(…, 10)`)
  — the raw unindented needle never appeared in a real v1 workflow, so
  the first cut of the recognition would have refused every genuine v1
  file despite the "frictionless upgrade" promise. Spec reconstructs
  the embedded form from the real v1 output and pins that
  hand-customized files are still refused.
- **Advisory template stays green on a crashed scan:** the generated
  "Annotations + Job Summary" step is now `continue-on-error: true` —
  a crashed scan leaves `mjolnir.json` empty and `summary` exits 2,
  which must not turn the advisory job red (v1's inline script never
  did). The gate step still owns the verdict.
- **Step summary escapes hostile finding metadata:** `ruleId`, `file`,
  `message` and `fix` are markdown-escaped before `$GITHUB_STEP_SUMMARY`
  (GitHub renders HTML there) — a hostile report can no longer break
  out of the `<details>` structure. Annotations additionally sanitize
  `file`/`ruleId`/`message` through the same `sanitizeData` layer the
  terminal uses (OSC/C0 bytes), closing the gap its own docs assumed.
- **Progress line sanitizes the detail path** through `sanitizeData` —
  a filename with ANSI/OSC bytes can no longer hijack the terminal.
- **PR comment overflow counts are honest:** the "...and N more
  overall" line now subtracts the actually rendered count
  (Σ min(group, 25)) instead of a flat 25 — no more phantom hidden
  findings, and per-group overflow lines name their group
  ("...and 5 more errors").
- **Usage-error contract completed:** the 8 scan-backed subcommands
  (badge, debt, fix, impact, baseline, diff, pr-comment, handover) no
  longer print the full usage wall after the friendly stderr error;
  `mjolnir summary` rejects unknown flags with the shared
  did-you-mean machinery (exit 10) instead of silently swallowing a
  typo'd `--stdout`; `mjolnir ci --help` / `mjolnir help ci install` /
  `mjolnir ci install --help` now reach the `ci install` help page
  (two-word verb lookup).
- **Dead surface removed:** `theme.severityTag` (byte-identical twin of
  `ui.severityIcon`, test-only) deleted with the two plugin specs
  re-pointed; the new-module exports nothing without a caller
  (`severityGlyph`, `wrapFor`, `centerIn` dropped; `keyValue` and
  `bullet` remain — the plan's primitive list mandates them).

## [0.5.2] — 2026-09-05

### npm 12 pack-shape repair of the release pipeline

### Fixed

- The fresh-install gate (`tests/integrations/registry-install.spec.ts`),
  `tests/integrations/package-smoke.spec.ts`, and
  `tests/e2e/journey-1-first-run.spec.ts` parse `npm pack --json` through
  a shared shape-tolerant helper
  (`tests/helpers/npm-pack-json.ts`): npm 12 changed the output from an
  array to an object keyed by package name, which stopped the v0.5.1
  publish at the gate — tag cut, nothing shipped, by design.
- `release.yml` upgrades to `npm@11` (the proven line) instead of
  `npm@latest`: toolchain majors must be deliberate, verified changes,
  never implicit drift on the publish path.
- `registry-install.spec.ts` cleanup no longer cascades a second error
  when `beforeAll` fails early (the cascade buried the real diagnosis).

## [0.5.1] — 2026-09-05

### Verification Trust Evolution, Phase 8 — Local Extensibility (plan §18)

### Added — folder-based external rules, zero network

### Added — folder-based external rules, zero network

- **`mjolnir-rules/` contract** (`src/plugins/local-rules.ts`): a
  workspace directory loaded from the scan target root alongside npm
  plugins. Two file kinds: **JSON rule manifests** (declarative regex
  patterns — NO code executed; id/title/severity/category/appliesTo/
  patterns/message/why/fix/languages/frameworks) and **JS modules**
  (`rules: QADoctorRule[]`, full-Node trust, same posture as npm
  plugins). Missing directory → no-op.
- **Same trust contract as core/npm plugins:** reserved core prefixes
  rejected (case-insensitive spoofing guard); bad metadata/regexes
  degrade to warning entries (QA-PLUGIN-000), never a crash; external
  rules carry the full trust metadata shape and are born
  quarantine/unmeasured. **Core-tier clamp**: an external rule
  declaring `tier: "core"` is clamped to `extended` with a load
  warning — core requires a measured FP rate from the committed corpus
  sidecar, which external rules cannot have.
- **Tier caps obeyed, filter unified:** the quarantine exclusion filter
  in `buildUniversalRules` now consults the tier map that includes
  plugin/external tiers — plugin-declared quarantine rules were
  previously excluded only when the core registry knew the ID; the
  unified filter excludes them from non-strict scans exactly like core
  (post-scan cap still observable under `--strict`; the cli-scan-arms
  test updated to cover both sides).
- **Drift-checked:** `mjolnir rules --md --external` renders the
  catalog from the LOADED external rules with a provenance column
  (`core`/`external`) — an on-disk edit changes the next render; the
  catalog can never drift from what actually ships.
  `scripts/generate-capability-matrix.ts --external <root>` writes a
  workspace-local `MJOLNIR-RULES-MATRIX.md` with provenance "external"
  (unmeasured by definition — outside the corpus sidecar). The
  committed matrix stays core-registry-only and byte-stable.
- **S-8 disclosure:** external rule surfaces appear in the scan's
  plugin disclosure block.

Registry/marketplace explicitly deferred (plan §18).

### Verification Trust Evolution, Phase 7 — Agentic QA Trust (plan §17)

### Added — Agentic Trust Profile (plan §17.2, §17.4)

- **Provenance detection** (`src/engine/provenance.ts`): per-file static
  markers, EXTRACTED not invented — the industry-wide generated-file
  header convention ("auto-generated"/"generated by"/"do not edit") and
  the Playwright codegen recorder fingerprint (its default test title
  is exactly `'test'`). Honest boundary, documented in the module:
  healed and MCP-edited files WITHOUT markers are statically
  indistinguishable from hand-written ones — the classifier returns
  `unmarked`, never a guess.
- **`ScanResult.agenticProfile`** (additive): share of test files with
  detected generative markers + the findings split across those
  surfaces, with the boundary in the profile's own `note`. Surfaced in
  the terminal report only when something was actually detected
  (silence over noise); JSON carries it on every scan.
- **§17.4 — same evidence standard regardless of author:** the profile
  is metadata only. It never changes scoring, evidence levels, tier
  caps, or rule behavior. AI tests earn trust through exactly the same
  evidence as human ones.

### Added — locator.normalize() framework-standards rules (plan §17.3)

Two new frozen `QA-PW-*` rules, BORN QUARANTINE (§17 exit gate:
measured before leaving provisional), fixtures both directions:

- **QA-PW-146 — CSS/XPath string selector instead of a normalized
  locator** (warning, heuristic): `css=`/`xpath=` engine prefixes, bare
  id/class/attr CSS, and `nth-child` chains inside
  `.locator()`/`waitForSelector()`/`page.$` — aligned with Playwright's
  locator standard. Fills the TS gap (the brittle-selectors family
  covers Java/C#/Python; the retired QA-PW-112 was style police, this
  is markup-coupling detection). Not auto-fixable: the normalized
  getter depends on app semantics only a human knows — the fix field
  carries the concrete `getByRole`/`getByTestId`/`getByText`
  suggestion. Both fixtures + all three cached OSS corpora (0 fires —
  real suites use normalized locators) recorded.
- **QA-PW-147 — codegen default test title** (info, observation): a
  committed spec still titled `'test'`/`'test N'` is an unreviewed
  recording artifact — the §17.1 provenance marker as a finding.

Registry: 99 rules (73 measured). Docs pages + capability matrix
regenerated.

### Verification Trust Evolution, Phase 6 — Runtime Evidence (plan §16)

### Added — runtime corroboration + the honest L0–L5 trust ladder

Built on the existing forensics ingestion (no greenfield):
`packages/playwright-reporter` → `mjolnir.report.json` → the
`ForensicsReport` pipeline that `forensics`/`triage`/`pw-report`
already consume. Findings gain two additive, optional fields
(schemaVersion 1 unchanged):

- **`runtimeCorroboration`** — what a real run report vouches for:
  `level: "file" | "test" | "defect"`, the report source, executed-test
  count, and (test/defect level) the containing test's full verdict
  (attempts, final status, passed-on-retry, ever-failed, skipped).
- **`trustLevel`** — the L0–L5 ladder, derived deterministically:
  L0 (E0 observation) / L1 (E1 heuristic) / L2 (E2 deterministic) are
  the static-only ceiling; L3 (file executed) / L4 (the containing
  test executed — matched via the report's spec declaration lines) /
  L5 (the run verdict directly corroborates the defect class — a
  FLAKY-RISK finding whose test actually flaked, retried, or timed
  out) exist ONLY when runtime corroboration is present. The
  no-static-only-L4/L5 invariant is structurally enforced in
  `deriveTrustLevel` and locked by tests across the full
  findingType×confidence×evidenceLevel matrix.

- **Matching is honest by construction:** Playwright JSON reports now
  carry the spec declaration line (additive `line` on
  `TestRecord`/`TestVerdict`); a finding is tied to a specific test
  only when the report's declaration spans place it there — otherwise
  corroboration stays at file level, and files the report never ran
  get NOTHING (no fabricated evidence). JUnit XML has no locations:
  file-level only.
- **Scan wiring:** `runScan` auto-discovers a run report next to the
  scan target (`mjolnir.report.json` — the reporter package's default
  output — or a `test-results/` directory), runs the existing
  forensics ingestion, and stamps findings. No report → findings
  unchanged (honest "runtime evidence: not available"). A hostile
  report degrades the scan, never fails it.
- **Reporters split verified vs assumed (plan §16):** the terminal
  footer reports `Runtime evidence: N/M findings corroborated by a
real run report (trust L3–L5)` or the explicit not-available line;
  finding cards show `trust L4 · runtime: test executed`. SARIF
  results carry `trustLevel` + `runtimeCorroboration` in properties.

### Verification Trust Evolution, Phase 5 — Framework Expansion (plan §15, D7 closed)

### Added — FrameworkDimension enforced (plan §15.1, defect D7 closed)

- **Real dependency parsing per build system:** `package.json` (JSON),
  `pom.xml` (Maven `<dependency>` blocks), `build.gradle(.kts)`
  (dependency-statement coordinates), and EVERY `.csproj` at the root
  (`<PackageReference Include="…">` attributes — the old "first
  `.csproj` only" defect is closed), plus requirements*.txt for Python.
- **Per-file framework tags** (`ParsedFile.frameworkTags`): derived from
  the file's OWN imports/usings/import-lines — `@playwright/test` →
  "playwright", `cypress` → "cypress", `org.junit.*` → "junit",
  `NUnit` → "nunit", `import selenium` → "selenium", etc. AST-truth for
  Java/C#/TS; import-line scan for Python (no AST seam by design).
- **`rule.frameworks ∩ file.frameworkTags` filtering** with
  open-when-unknown: a rule that declares `frameworks` runs on a file
  only when the file's tags intersect it; files without tags and rules
  without `frameworks` are always analyzed — the dimension narrows, it
  never silently drops evidence. Shared in
  `src/engine/adapter.ts` (`frameworkFilterApplies`), enforced in the
  TS/Java/C#/Python adapters' `runRules`.
- **Generalized config-gating (§15.2):** `configRule: true` +
  `configFiles: string[]` (regex sources) replaces the hard-coded
  `playwright.config.*` regex that lived in the TS adapter and
  duplicated inside all five config rules (QA-PW-121/122/141/143/144
  migrated). Discovery knows the config filename conventions
  (`cypress.config.*` added alongside `playwright.config.*`).

### Added — Cypress integration (first framework per the §15 order)

Three rules in the new frozen `QA-CYP-*` namespace, BORN QUARANTINE
(§15.5) with fixtures both directions (`tests/fixtures/QA-CYP-*/`):

- **QA-CYP-001 — fixed `cy.wait(n)`** (warning): numeric-literal
  `cy.wait(3000)` — the Cypress hard-sleep idiom. Alias waits
  (`cy.wait('@route')`) are the legitimate form and never fire.
  File gate: framework tag, `.cy.*` extension, or `cy.*` API usage in
  the file (real Cypress suites rarely import cypress — surfaced by the
  first measurement against cypress-example-kitchensink). MEASURED on
  the kitchensink corpus: 12 TP (viewport-switch fixed waits) / 3 FP
  (doc-example artifacts, the suite intentionally demonstrates the API
  — QA-PY-003 precedent) → 20% FP at n=15, 95% Wilson
  [7.1%, 45.2%]; tier extended (band-consistent), corpus
  cypress-io-kitchensink added with baselines.
  cypress-realworld-app scanned as precision evidence: 0 fires (the
  suite uses alias waits exclusively), baseline recorded.
- **QA-CYP-002 — focused test (`.only`)** (error): committed
  `it.only`/`describe.only`/`context.only` de-schedules the rest of the
  suite. Quarantine, unmeasured (fixtures only) pending a measured
  Cypress corpus with the pattern.
- **QA-CYP-003 — `chromeWebSecurity: false`** (error): deterministic
  config defect via the generalized `configFiles` gate. Quarantine,
  unmeasured pending corpus.

### Added — Selenium cross-language reach (plan §15.3, JV/CS/Py reuse)

Three rules in the new frozen `QA-SE-*` namespace sharing one sequence
detector (hard sleep followed by an element lookup within 3 lines —
the sleep standing in for an explicit `WebDriverWait`), all BORN
QUARANTINE:

- **QA-SE-001** (Java): `Thread.sleep` → `findElement`/`click`/
  `sendKeys` within 3 lines.
- **QA-SE-002** (C#): `Thread.Sleep`/`Task.Delay` →
  `FindElement`/`Click`/`SendKeys` within 3 lines. MEASURED on the
  SeleniumHQ/selenium .NET webdriver suite: 3 TP + 1 FP (a
  sleep-inside-polling-loop cadence — loop-body containment is the
  documented residue) → 25% FP at n=4; below the n≥10 measurement bar,
  stays quarantine/unmeasured with verdicts recorded
  (tests/corpus/verdicts/SeleniumHQ-selenium.jsonl, baseline added).
- **QA-SE-003** (Python): `time.sleep` → `find_element`/`click`/
  `send_keys` within 3 lines.

### Registry

- 97 rules (was 91); registry/doctor/scaffolder ID validators widened
  for the new frozen namespaces (QA-CYP-_, QA-SE-_, QA-WDIO-_,
  QA-PPTR-_, QA-APM-* reserved). Measured coverage 73/97 (75%); the
  §20.1(a) unmeasured-count ratchet now tracks the PRE-EXISTING set
  mechanically (`introduced` ≤ 0.5.0) — new waves onboard under §20.1(b)
  - the per-framework exit gate, not the global count freeze.
- Defect ledger: **D7 closed** (target phase 5). Capability matrix
  regenerated (97 rules); docs pages regenerated; corpus baselines
  added for the three Phase 5 measurement repos.

### Verification Trust Evolution, Phase 4 — Common QA Semantic Model (plan §14, behavior-neutral)

### Added — `src/engine/qa-model.ts`: the normalized QA concept IR (extract-only, no scan wiring)

The plan-§14 vocabulary — Test, TestBoundary, Setup/Teardown, Fixture,
Action, Locator, Wait, Assertion, Mock, NetworkInteraction, Retry,
Navigation, Interaction, Lifecycle — now exists as a typed model
(`QaNode`/`QaSemanticModel`, all 14 concepts in `EXTRACTOR_COVERAGE`)
with per-language extractors over the ALREADY-existing parse stage:
ts-morph for TS/JS (tests/hooks via the scorer's it/test vocabulary,
calls via the measured rule vocabularies of qa-pw-002/004/005/101–145,
qa-test-001/003/004/006, jest/vi mock+retry), tree-sitter for Java/C#
(test boundaries REUSE `javaTestMethods`/`csharpTestMethods` verbatim —
the model cannot drift from the rules' scoping; call/hook/retry
vocabularies copied from the QA-JV-_/QA-CS-_ rules), regex boundaries
for Python (def test_, @pytest.fixture, time.sleep, assert).

- **Extracted, not invented:** every classification table cites the
  rule whose measured vocabulary it copies (headers in qa-model.ts);
  the shared `isHelperIdiom` helper moved to `jv-cs-ast.ts` so the
  QA-CS-103 rule and the model share ONE implementation.
- **Adoption is additive:** NOTHING in the scan pipeline imports the
  module — BEHAVIOR-NEUTRAL by construction, golden/corpus locks
  untouched (proven: locks byte-identical with the model present).
- **Coverage is honest:** `EXTRACTOR_COVERAGE` documents per-language
  gaps (e.g. Java has no fixture/interaction/lifecycle extractor;
  Python extracts only test/fixture/assertion/wait) — visible gaps,
  never silent claims (No False Proof).
- **Equivalence proven:** `tests/qa-model.spec.ts` re-expresses the
  QA-JV-103 / QA-CS-103 / QA-CS-102 oracles over the model
  (`testVerifies`, ancestor-chain containment via the
  `firstAncestorCallNamed` generalization now carried as
  `node.ancestors`) and asserts FINDING-IDENTICAL results against the
  rules on the committed fixture corpora + synthetic edge shapes —
  the model can carry these rules without changing any output.
  Awaitedness (qa-pw-002's consumption oracle) rides on TS nodes as
  `node.awaited`.

### Verification Trust Evolution, Phase 3 — Java/C# semantic upgrade (plan §13)

### Changed — three JV/CS rules migrated to L2 tree-sitter analysis (EVIDENCE-BACKED, detectorRevision 2)

The Phase 0.5 parse stage's tree-sitter trees (`parseJavaAst`/`parseCSharpAst`,
delivered via `ParsedFile.ast`) are now consumed by rules: a new L2
structural-analysis layer (`src/engine/jv-cs-ast.ts`) provides test-method
scoping by annotation/attribute, invocation structure, and call/argument
containment; the rule contract gains an optional `astQuery` hook whose
regex path is a MANDATORY fallback (no AST ⇒ regex, never a second
detector, plan §13.2). No type/symbol semantics are promised for JV/CS
(no Roslyn, no classpath) — semantic depth is L2 per plan §13.4.

- **QA-JV-103 (test without assertions), 50% FP (n=20) → 25.9% FP
  (n=58), quarantine → extended.** Test boundaries now come from real
  `method_declaration` nodes (any `@Test`/`@org.junit.Test`, argumented
  TestNG forms included). The assertion oracle adds the two measured
  rev-1 FP classes: Playwright's THROWING waits (`waitFor*` except
  `waitForTimeout` — they throw on timeout, so the wait IS the
  verification; 6 rev-1 FPs) and `verify*/check*/assert*` helper
  calls (4 rev-1 FPs). Remaining FP class, documented as the L2
  boundary: assertions behind arbitrarily-named helpers (keycloak's
  `testValidationValid`, playwright-java's `testEnterKey`,
  appsmith's `check`).
- **QA-CS-103 (test without assertions), 95% FP (n=20) → 0% FP (n=9),
  quarantine → core.** The rev-1 oracle missed the whole Shouldly
  extension family — 17 of the 19 FPs were `ShouldBeOfType<...>(
...).Message.ShouldBe(...)`-style assertion-rich tests (spectre-console,
  310 count-lock fires → 0). The rev-2 oracle counts Shouldly chains,
  `Assert`/`Should` receivers, the Verify snapshot framework,
  PascalCase `verify*/check*/assert*` helpers (Humanizer's
  `VerifyAnalyzerAsync` — the lowercase-only form was a Java camelCase
  inheritance bug), C# throwing waits (`WaitFor*Async` except
  `WaitForTimeoutAsync`), and conditional `throw new
*Assertion*Exception` (playwright-dotnet's ConventionTests). Grammar
  error-node guard: a truncated parse never produces a finding.
- **QA-CS-102 (`Thread.Sleep`/`Task.Delay` hard sleep), 65% FP (n=20) →
  8.3% FP (n=24), quarantine → core.** Tree-sitter invocation scoping
  excludes the measured environment-simulation classes: delays inside
  route/expose/server delegates (`Route*Async`, `SetRoute`,
  `ExposeFunction*`, 10 rev-1 FPs + delta), deliberate infinite/negative
  blocks (`Task.Delay(-1)`, `int.MaxValue`, `Timeout.Infinite*`),
  `Task.WhenAny` timeout races, and runner payload fixtures
  (`RunAndWaitFor{Request,RequestFinished,Response}Async(() => Task.Delay…)`,
  `UnrouteAllAsync` timing-window sleeps stay flagged — their delay
  creates the timing window the assertion measures). Documented
  trade-off: one rev-1 TP (a sub-second artificial-timing delay inside a
  route delegate) is no longer flagged; the structural boundary cannot
  read that intent.

All three: verdict corpus reconciled per the §07 loop (41 superseded rows
removed, 49 fresh rows adjudicated from source with per-row notes, class-B
positive fixtures for QA-CS-102/QA-JV-103 and class-C negative fixtures
for all three), count-lock baselines refreshed (microsoft-playwright-java
QA-JV-103 97→43, microsoft-playwright-dotnet QA-CS-102 52→21,
spectre-console QA-CS-103 310→0, Humanizer 34→2; keycloak +602 is a
recall gain — the rev-1 regex missed `void x() throws Exception`
signatures, tree-sitter scoping does not), and
`detector-revisions.json` bumped (sidecar entries stay; measurements
stamped rev 2). QA-JV-102 stays LEXICAL rev 1 — no migration for
symmetry (plan §12.4).

### Verification Trust Evolution, Phase 2 — quarantine-cluster triage (plan §12.2)

### Deprecated — 21 rules retired per docs/RULE-LIFECYCLE.md (measured 100% FP, premise wrong)

Every rule below measured 100% FP (zero TPs at n ≥ 10, `docs/FP-AUDIT.md`)
on real-world code. Per the lifecycle policy the severity is downgraded to
`info` (non-blocking everywhere) and `falsePositiveRisk` is set to `high`;
the code and fixtures stay in the repo, the frozen ID is never reused, and
any salvageable detection idea ships under a NEW rule ID. If you gated CI
on these findings, they no longer block at `info` severity; add an explicit
`severityOverrides` entry in `mjolnir.config.json` to restore blocking.

- **QA-PW-005** (business logic in `page.evaluate()`): in test files,
  branching inside evaluate is the only way to reach browser state — every
  measured use was browser-only test instrumentation or the API under test,
  never leaked app logic. No successor.
- **QA-PW-103** (missing timeout on navigation): bare `goto()` to the app
  under test is the universal navigation idiom; per-call budgets are
  config territory. No successor.
- **QA-PW-105** (`expect.poll` without timeout): the default poll timeout
  is a hard bound that raises — the claimed masking harm cannot occur.
  No successor.
- **QA-PW-107** (`toBeVisible` on toast/banner/modal): presence +
  auto-retry semantics is what suites assert; viewport visibility is a
  different question the suites are not asking. No successor.
- **QA-PW-108** (`toHaveText` coupling): asserting self-owned markup's
  exact text is a legitimate strong assertion; "whose markup is this" is
  not statically decidable. No successor.
- **QA-PW-112** (testid naming convention): hardcoding kebab-case as _the_
  convention is the defect — conventions are repo-local. Successor idea
  (mixed-conventions-within-one-repo check) requires a NEW ID.
- **QA-PW-114** (legacy element handles): the auto-wait harm needs a
  timing window; every measured use was immediate reads or deliberate
  existence checks. No successor.
- **QA-PW-118** (`networkidle` waits): the flake source is environmental
  background traffic, absent by construction where the rule fired; harm is
  not code-detectable. No successor.
- **QA-PW-119** (module-level state order dependence, was `error`): FPs
  scatter across ≥5 legitimate infrastructure idioms (per-test teardown
  harnesses, counters, vi.hoisted fixtures, memoized shared infra) — an
  error-severity rule at 0 TP / 24 is actively misleading. Successor idea
  (cross-test write→read dataflow analysis) requires a NEW ID.
- **QA-PW-120** (missing environment guard): file-level keyword
  co-occurrence does not imply engine dependence; even the corpus's e2e
  specs are engine-agnostic. No successor.
- **QA-PW-145** (no a11y assertions): absence of optional coverage is not
  a defect finding; the heuristic fires on every UI spec by construction.
  Successor idea (a11y-coverage reporting) requires a NEW ID.
- **QA-TQUAL-001** (mock-only verification, 0 TP / 26): spies observe the
  real unit's output — the mock call IS the observable contract;
  stand-in vs observer is not statically decidable. No successor.
- **QA-PY-006** (empty test body `pass`): 18/20 FPs were pytester
  test-data scripts; genuinely collected empty tests don't occur in real
  code. No successor.
- **QA-PY-008** (mock-only verification): boundary mocking and real-output
  spies are contract testing, not mock theater. No successor.
- **QA-PY-010** (random/time without freeze): wall-clock reads are the
  measured subject in timing/throttle tests; freezing would defeat them.
  No successor.
- **QA-JV-108 / QA-CS-108** (hardcoded environment URL): FPs split across
  HAR-replay fixtures, route-mocked origins, and proxy-failure tests — no
  mechanically discriminable shape (the M-06 header concedes a fake-TLD
  lookahead fixes zero measured FPs). No successor.
- **QA-JV-110 / QA-CS-110** (no a11y assertions): same absence-heuristic
  premise failure as QA-PW-145. Successor idea requires a NEW ID.
- **QA-JV-111 / QA-CS-111** (blanket route mock): route-API self-tests and
  fixture setup; no provable exclusion, and framework gating cannot help.
  Revival on an application-repo corpus would need a NEW ID.

### Changed — Phase 2 retunes (EVIDENCE-BACKED, detectorRevision 2 per plan §07)

Each retune targets the single fixable root cause its measured FP cohort
shares (full evidence table: docs/RULE-LIFECYCLE.md "Phase 2
quarantine-cluster triage"). Detection-logic changes bump the rules'
`detectorRevision` to 2, invalidating the revision-1 measurements (stale →
provisional → re-measure, plan §07); must-not-fire fixtures now encode the
measured FP shapes so the retunes are regression-locked in both directions.
Tier stays quarantine until re-measurement says otherwise.

- **QA-PW-102** (load-wait instead of assertion): the wait now fires only
  when it is the TERMINAL wait (no `expect`/assert/`expect.poll` follows)
  and is skipped when consumed by `expect(...).rejects` — the "instead of
  an assertion" premise, now actually checked. Clears all 20 measured FPs
  (vite HMR synchronization waits); keeps the must-fire no-assertion shape.
- **QA-ENV-001** (environment coupling): the fixed-port sub-pattern no
  longer matches loopback endpoints (`localhost`/`127.x`) — they are the
  suite's own fixture containers (Azurite / DynamoDB Local / Mongo), the
  entire measured FP cohort. Dotted hostnames and non-loopback IPv4
  literals with ports still fire; OS-path, locale, and local-time-getter
  sub-patterns are unchanged.
- **QA-PY-003** (no-assertion test): the verification vocabulary gains
  `pytest.warns` / `pytest.deprecated_call` / `pytest.fail`, and a
  `test_*` function referenced by name elsewhere in its file (pytester-
  style test data) is skipped — the collected assertion lives in the
  parent test.
- **QA-PY-004** (bare truthiness assert): boolean-predicate calls are
  skipped — `assert isinstance(x, T)` type guards and
  `assert s.startswith(...)`-style content predicates are real checks
  (the measured FP clusters). Bare identifier/attribute asserts still
  fire. This rule was measured at 45% FP (n=20), not 100%; with the
  clusters removed the re-measurement is expected to approach the
  extended band (≤30%), pending delta classification.
- **QA-PY-007** (raises without match): `pytest.raises(X) as exc_info`
  followed by an assert/expect on `exc_info.value` is skipped — the
  message IS verified without `match=` (8 of 13 measured FPs). The
  genuinely vague raises blocks still fire; remaining FP residue
  (single-possible-exception blocks) is not statically decidable.
- **QA-PY-105** (Playwright-Python test without assertions): a called
  helper whose name asserts (`assert_*`/`expect_*`/`verify_*`/`check_*`)
  or waits (`wait_for_*`) counts as verification — assertions delegated
  to imported helpers, the entire measured FP cohort (streamlit e2e).
- **QA-JV-106 / QA-CS-106 / QA-PY-104** (brittle selectors): no pattern
  change — the measured 100% FP rows predate Bug Map M-06's removal of
  the querySelector/QuerySelectorAsync/query_selector patterns, so the
  measurement described a detector that no longer ships. The §07 fix is
  the detectorRevision bump to 2 (stale → provisional → re-measure);
  the surviving xpath=/nth-child/absolute-path patterns stay
  quarantine-tier until re-measured.

### Changed — §07 loop closed: rev-3 delta re-measurement (corpus rescans + verdict reconciliation)

The revision-2/3 detectors were re-run over the corpus repos that
produced the retuned rules' original verdicts, and the committed verdict
corpus was reconciled to the current detectors (the §07 loop the
capability matrix calls "re-measure"):

- **Delta method:** every committed row whose finding no longer fires
  was removed (superseded — it described a pre-retune detector); every
  NEW finding was adjudicated from source context per
  `tests/corpus/verdicts/README.md` criteria, with a quota sample of 20
  per rule on the largest surfaces (QA-PY-004/007) and full coverage on
  the small ones. Net: 157 rows retired, 71 adjudicated rows appended,
  1423 → 1337 classified verdicts, measured coverage 78 → **72/91**
  (the six rules whose remaining classified counts fell below n=10 —
  QA-PW-102, QA-PY-104, QA-PY-105, QA-ENV-001, QA-JV-106, QA-CS-106 —
  are now unmeasured at their current revisions; their sidecar entries
  were removed accordingly and they stay quarantine/extended-tier
  pending re-measurement).
- **Re-measured envelopes (rev 3):** QA-PY-003 82% FP (n=17; remaining
  FPs are pytest doc examples and pytester collection fixtures —
  accepted residue), QA-PY-004 76% (n=21; remaining FPs are
  pytest's own predicate-call idiom families: fnmatch/samefile/
  isimportable membership checks and deliberate `assert False`
  fail-marker DATA), QA-PY-007 79% (n=34; remaining FPs are
  single-possible-exception API-error contracts where the raised type
  IS the assertion — not statically decidable). All three stay
  quarantine-tier with their detectorRevision 3 stamped in the sidecar
  and FP-AUDIT; their accepted-residue FP causes are documented in
  docs/RULE-LIFECYCLE.md's triage table.
- **QA-PW-102 / QA-PY-105: fully cleared** — 0 findings on the
  previously-20/20-FP corpus slices at revision 2.
- **QA-ENV-001 (rev 3):** the wave-2 delta (20/20 FP on the rev-2
  detector) showed no host shape is statically decidable — the
  fixed-port sub-pattern is dropped entirely; OS-path, locale, and
  local-time-getter sub-patterns stay (their remaining 6 findings on
  vite are path-literal test DATA, adjudicated FP and recorded).
- **§07 comparability guard:** the FP regression governor
  (`checkFpRegression`) no longer compares measurements across
  detectorRevision boundaries — a revision mismatch means the old rate
  does not describe the current detector, so it is neither flagged nor
  blessed.

### Verification Trust Evolution, Phase 2 — detectionStrategy enum (D6 closed, scan-behavior-neutral)

### Changed — D6 enum migration (plan §12.1; metadata-only)

- **`detectionStrategy` is now the enforced §09.6 enum** (`LEXICAL | AST |
SEMANTIC | FRAMEWORK | RUNTIME`) instead of free text: `src/rules/rule.ts`
  types `RuleMeta.detectionStrategy` as the union, and a registry ratchet
  (tests/rules.registry.spec.ts) fails CI when any rule omits it or carries
  a non-enum value — the "free text" drift class cannot reintroduce itself.
  All 91 registry rules were migrated in place. This is a metadata migration,
  not a detection change: no `run()` body, pattern, or scoping was touched,
  so scan findings, golden fixtures, and corpus baselines are byte-identical
  (the Phase 0 classification of this work as BEHAVIOR-NEUTRAL for scan
  findings, plan §06). Per §11.3 the enum conversion is metadata naming only
  and does NOT bump any `detectorRevision` — every measurement stays valid.
- **Legacy nuance preserved, not deleted:** the richer free-text
  declarations ("regex pattern + inside-string oracle", "parsed YAML +
  test-command gate", …) moved verbatim into a new optional
  `detectionNotes` field rendered alongside the enum in the rule docs
  pages. The capability matrix now renders the declared enum directly in a
  single "Detection strategy (enum)" column (the provisional
  "Enum (proposed)" guess column is gone — the declared value IS the
  enum); `UNCLASSIFIED` renders only for an undeclared value.
- Mapping applied: regex-over-text/absence-sweep detectors → `LEXICAL`
  (incl. QA-TQUAL-002's AST-stripped text pattern, which is a text pass
  over code-only text); ts-morph node-walk detectors (QA-PW-002,
  QA-PW-005) → `AST`; GitHub-Actions workflow-structure detectors
  (QA-CI-001/009/010) → `FRAMEWORK`. `SEMANTIC` and `RUNTIME` remain
  reserved (no rule ships either yet).

### Verification Trust Evolution, Phase 1 exit — dedicated corpora + wave-5 measurement (plan §11.5/§08)

### Added — dedicated corpora (§11.5) and the wave-5 measurement

- **CORPUS 19 → 34 repos** (`tests/corpus/audit.ts`): 14 new real-world
  repos chosen by evaluating each candidate's unmeasured-rule fire count
  at HEAD before committing (`vitest-dev-vitest`, `streamlit-streamlit`,
  `apache-airflow`, `iluwatar-java-design-patterns`,
  `spectreconsole-spectre-console`, `Humanizr-Humanizer`,
  `cypress-realworld-app`, `keycloak-keycloak`, `appsmithorg-appsmith`,
  `getsentry-sentry`, `github-docs`, `vercel-next-js`, `hashicorp-vault`,
  `nocodb-nocodb`). This is the plan's dedicated-Corpora requirement for
  §11.5: CI-workflow density for the starved QA-CI-* rules and JV/CS
  application repos so the QA-JV/QA-CS rules measure on consumer code,
  not just the Playwright bindings themselves (D5). Candidates whose scan
  truncated against the budget (`n8n`, `posthog`, `vscode`) were rejected —
  a partial scan can never be count-locked.
- **Committed class-B/C fixture corpora (§08):**
  `tests/corpus/positive-fixtures/` (realistic anti-pattern exhibits that
  MUST fire — class-B recall evidence, every fire classifies TP) and
  `tests/corpus/negative-fixtures/` (realistic legitimate code that must
  NOT fire — class-C precision evidence, any fire is a recorded FP).
  These give rules whose patterns are rare in the wild a measurement-grade
  verdict surface, versioned with the verdicts that classify them via
  `local:` corpus URLs. Excluded from self-scan, vitest, eslint, prettier
  and the test tsconfig — they are DATA.
- **`corpus-sample.ts --unmeasured-only`:** the verdict-harvesting loop
  can sample only rules without a valid measurement, so classification
  effort goes to the exit gate instead of re-sampling measured rules.
- **`audit.ts --only=<name>,<name>`:** re-check or re-record a corpus
  subset (used to re-verify a repo after a transient truncation without
  rescanning everything); the completeness threshold now applies to the
  filtered set. Clones use `git -c core.longpaths=true` (scoped, not a
  global config change) and the per-repo scan budget is 60s → 120s; the
  audit job gets `NODE_OPTIONS=--max-old-space-size=8192` (sentry's
  repo-scale parse OOMs the default heap) and a 60-minute timeout.
- **Measured coverage 43 → 78 of 91** (1423 classified verdicts, 0 blank,
  0 UNSURE): 35 rules newly measured at n ≥ 10 — QA-TEST-001, QA-TEST-006,
  QA-TEST-010, QA-TQUAL-002, QA-TQUAL-009, QA-TQUAL-011, QA-CI-001,
  QA-CI-002, QA-CI-005, QA-CI-008, QA-PW-003, QA-PW-004, QA-PW-104,
  QA-PW-113, QA-PW-115, QA-PW-117, QA-PW-121, QA-PW-123, QA-PW-140,
  QA-PW-141, QA-PW-142, QA-PW-144, QA-PY-001, QA-PY-009, QA-PY-011,
  QA-PY-012, QA-PY-103, QA-PY-105, QA-JV-101, QA-JV-102, QA-JV-109,
  QA-CS-103, QA-CS-107 (plus the four previously counted). **Phase 1
  exit gate MET: unmeasured 48 → 13 (≤ 20).**
- **Explicit tier declarations for all 35 newly measured rules, set from
  the measured FP band (§11.2: ≤10% core, ≤30% extended, >30%
  quarantine):** core — QA-PW-003, QA-PW-104, QA-PW-113, QA-PW-117,
  QA-PW-121, QA-PW-140, QA-PY-001, QA-PY-009, QA-PY-011, QA-PY-103,
  QA-JV-101, QA-JV-109; extended — QA-TQUAL-011, QA-CI-002, QA-CI-007,
  QA-PW-141, QA-PW-142, QA-PW-144; quarantine — QA-TEST-001, QA-TEST-006,
  QA-TEST-010, QA-TQUAL-002, QA-TQUAL-009, QA-PW-004, QA-PW-115,
  QA-PW-123, QA-PY-012, QA-PY-105, QA-CI-001, QA-CI-005, QA-CI-008,
  QA-CI-010, QA-CS-103. Every measured entry carries `detectorRevision`
  in the sidecar. **Evidence-backed, not silent:** the quarantine
  demotions remove error-severity deductions from default scans, which is
  the tier policy working as designed — the failing specs were updated
  with their reasoning inline (gate tests re-anchored on QA-CI-009, the
  demo repo's CI grew real CI-009 exhibits, the demo/hero assets and
  `fix` command scan with `--strict`).
- **Recall-floor + corpus baselines:** 34 count-locked baselines recorded
  (non-partial scans only); the §20.6 recall floor extends to the
  expanded registry.

### Changed — scan-behavior fallout of the measured demotions (explained)

- `mjolnir fix` now scans with `--strict`: an auto-fixable rule that is
  measured into quarantine (QA-TEST-001's `.only` fix) must still be
  fixable — hiding it would make `fix` a no-op on its own target debt.
- The demo repo's CI workflow gained genuine CI-009 exhibits (piped and
  `;`-sequenced test commands) so the demo keeps demonstrating the
  NEEDS-WORK band now that its QA-TEST-001/QA-CI-001/PW-004 debt is
  quarantine-capped to info (non-deducting); `docs:demo`/`docs:hero` scan
  with `--strict` so the committed assets and their drift locks stay in
  sync with the precision-contract spec.

### Verification Trust Evolution, Phase 1 — measurement infrastructure

### Added — UNSURE adjudication gate + QA-PW-101 measured (plan §11.5)

- **UNSURE ceiling ratchet:** `npm run fp-audit:generate` now fails when the
  UNSURE backlog grows beyond the committed
  `tests/corpus/verdicts/unsure-ceiling.json` (the §11.5 mechanism: UNSURE
  never counts into `n` but always triggers review). The ceiling only moves
  DOWN via documented adjudication; upward movement requires an explicit
  `--update` whose diff names every rule that grew. Criteria live in
  `tests/corpus/verdicts/README.md`.
- **QA-PW-101 is measured (the D5 "parked on 20 UNSURE" defect resolved):**
  all 20 UNSURE verdicts were adjudicated by reading the cited sources at
  repo HEAD — **20 TP, 0 FP, n=20** (next-auth's session-sync sleeps before
  reading session state; sveltejs/kit's 100 ms request-observation windows
  that false-pass when a stray refresh starts after the window). The rule
  now declares `tier: "core"` (0% FP ≤ 10%, n ≥ 10, revision 1, recall
  floor satisfied: fires in 4 corpus baselines) — the measurement-dependent
  default would resolve it to core anyway, but measured rules declare
  their tier explicitly (the D3 Step 2 invariant).
- **QA-TQUAL-009 UNSURE row resolved → FP** (tanstack-query angular
  inject-query:529 — a deliberate `void` fire-and-forget whose assertions
  still fail the run via vitest's unhandled-rejection handling; the
  FALSE-GREEN diagnosis does not hold). n=2 — below the measurement bar,
  still unmeasured/PROVISIONAL.
- **Coverage:** 42/91 → **43/91** measured rules; UNSURE backlog 21 → **0**.

### Changed — D3 two-step tier fix (plan §11.2; scan-behavior-neutral)

- **Step 1 (explicit tiers):** every rule now declares its `tier`
  explicitly — the 42 formerly implicit-core rules received an explicit
  `tier: "core"` matching their effective tier. Byte-identical scan
  behavior (the declared value equaled the omitted-tier default);
  generated docs updated with an explained diff (the matrix's
  "explicit tier declarations" line moved 49/91 → 91/91).
- **Step 2 (measurement-dependent default):** the omitted-tier default is
  no longer unconditionally core. A rule that omits `tier` resolves via
  `effectiveTier` (new `src/rules/measurement.ts`): **core** only with a
  valid corpus measurement (n ≥ 10 at a matching `detectorRevision`),
  otherwise **extended**, displayed with the new **PROVISIONAL** status.
  PROVISIONAL is a display status (`tier extended/unmeasured`), not a
  tier value — no schema churn. Scan findings are byte-identical: the
  pipeline enforces only `quarantine` (severity/info + E0 caps, --strict
  filter), and every quarantine rule declares its tier explicitly;
  overlap-dedup consumes declared tiers only, and no demoted rule
  participates in an `overlapWith` tier comparison that could change a
  survivor set (all overlap groups are single-declarer/single-target).
- **The D3 demotion (38 rules drop from effective core to
  extended/PROVISIONAL):** QA-TEST-001, QA-TEST-006, QA-TEST-010,
  QA-TQUAL-002, QA-TQUAL-009, QA-TQUAL-011, QA-PW-003, QA-PW-004,
  QA-PW-101, QA-PW-104, QA-PW-113, QA-PW-115, QA-PW-116, QA-PW-117,
  QA-PW-121, QA-PW-123, QA-PW-124, QA-PW-125, QA-PW-140, QA-PW-141,
  QA-PW-142, QA-PW-144, QA-CI-001, QA-CI-002, QA-CI-005, QA-CI-007,
  QA-CI-008, QA-CI-009, QA-CI-010, QA-PY-001, QA-PY-009, QA-PY-011,
  QA-PY-012, QA-PY-101, QA-PY-103, QA-PY-105, QA-PY-106, QA-PY-107.
  The 4 measured implicit-core rules (QA-PW-002, QA-PY-002, QA-JV-105,
  QA-CS-101) keep core. Unmeasured-effective-core count: 38 → **0**.
  **Suite-invalidating callout (plan §11.2):** QA-TEST-001 (focused test
  committed, `suiteInvalidating: true`) is among the demoted rules — its
  findings still void the suite's pass claim and still gate CI at
  severity=error; only its tier/statistics status changed. QA-PY-001 is
  the suite-invalidating Python sibling (same class).
- **Registry ratchet (plan §20.3, enforced in code):** new
  `tests/registry-ratchet.spec.ts` fails CI on ANY unmeasured rule in
  effective core (`tier core ⇒ valid MEASURED_FP with matching
detectorRevision, FP ≤ 10%, n ≥ 10`), on any detectorRevision mismatch
  (§20.5: stale ⇒ provisional), and — recall floor (§20.6) — on a core
  rule that fires nowhere in the corpus baselines. §20.1 evidence-state
  monotonicity: the measured ratio may only improve without a
  machine-detectable `MEASUREMENT-EXCEPTION` marker in this CHANGELOG.
- **`mjolnir doctor`**: `MAX_UNMEASURED_CORE` lowered 40 → **0** (Phase 1
  exit gate: 0 unmeasured in effective core, now enforced); tier checks
  consume `effectiveTier` + stale-measurement logic. Display surfaces
  (`mjolnir explain`, `mjolnir rules`, generated rule docs, capability
  matrix) render the PROVISIONAL status honestly.

### Verification Trust Evolution, Phase 0 + Phase 1 prep

### Added — Rule Capability Matrix (Phase 0)

- **Capability Matrix v0** (`docs/RULE-CAPABILITY-MATRIX.md` +
  `docs/RULE-CAPABILITY-MATRIX.json`): generated per-rule inventory of all
  91 rules from the registry + `MEASURED_FP` + the verdict corpus —
  category, languages, frameworks, declared detection strategy with a
  provisional enum mapping (Phase 0 contract proposal), semantic depth,
  measured flag, FP rate with sample size, corpus size and diversity.
  Unknown fields render as `UNCLASSIFIED` — visible gaps are the
  deliverable. Regenerated with `npm run docs:capability`; drift-locked by
  `tests/capability-matrix.spec.ts` and the generated-docs-drift CI job.
- **Declared-vs-measured cross-check report** (ledger class D9): the
  matrix names every measured rule whose declared tier violates the FP
  ceilings (core > 10%, extended > 30%) and produces the D3 demotion list
  (38 unmeasured rules currently in effective core — Phase 1 input).
  Current run: **0 D9 mismatches** (all measured > 30% FP rules already
  declare `quarantine`).
- **Defect ledger recorded** into the matrix metadata (plan §02, D1–D8
  with owning phase per defect).

### Added — detectorRevision scaffold (Phase 1 prep)

- **`tests/corpus/detector-revisions.json` sidecar**: hand-maintained,
  one entry per measured rule (all at revision 1 today), diffable.
  `MEASURED_FP` entries now carry `detectorRevision` stamped from the
  sidecar by `fp-audit:generate`; `docs/FP-AUDIT.md` gains a
  `detectorRev` column. Measurement inheritance law (§07): a measurement
  belongs to a specific detector implementation, not merely to a rule
  ID. Drift lock extended in `tests/measured-fp-generated.spec.ts`
  (sidecar covers exactly the measured set; revisions are positive
  integers matching the sidecar).

### Fixed — packaging: offline grammar loading (Phase 0.5 spike, D2)

- **`tree-sitter-wasms` and `web-tree-sitter` moved to `dependencies`**
  (web-tree-sitter keeps its exact `0.25.6` pin — 0.26.x cannot load the
  prebuilt grammar files). The published CLI's dependency tree now
  carries the tree-sitter Java/C# grammars, so `npm install mjolnir-qa`
  can load them offline once the Phase 0.5 parse-stage wiring consumes
  them. Removed the misleading `!dist/**/*.wasm` files exclusion (the
  grammars ship via the dependency, not the bundle).
- **Pack-smoke regression test**: `tests/package-smoke.spec.ts` asserts
  the packed package declares both as runtime dependencies and that the
  java/c_sharp grammars resolve inside the installed dependency tree.

### Fixed — adapter header claims (D4)

- `src/adapters/java.ts` no longer claims to be a "Second tree-sitter
  consumer" — it is a regex-layer adapter; the tree-sitter-java grammar
  and the async `parseJavaAst` seam exist but are not wired into the
  synchronous scan (D1). Same honest correction for
  `src/adapters/csharp.ts` and `src/engine/adapter.ts` (whose header
  still claimed tree-sitter "arrives in R2 with Python").

### Verification Trust Evolution, Phase 0.5 — async parse stage (D1)

### Changed — parse stage wired into the scan pipeline (D1 closed, BEHAVIOR-NEUTRAL)

- **Async parse stage between discovery and rule execution** (plan §10.1):
  `runScan`'s per-file loop now awaits an optional `LanguageAdapter.parseAst`
  hook before running rules. `runRules` and every rule stay synchronous and
  consume the tree via `ParsedFile.ast` — the engine is NOT async end-to-end,
  only the one inherently-async seam (WASM grammar load) is. `main()` and the
  script entry points await the returned promise.
- **Java and C# adapters implement `parseAst`** backed by the previously-dead
  `parseJavaAst`/`parseCSharpAst` (defect D1: tree-sitter AST was built and
  tested in Sprint 8 but never consumed). Parse failure or a missing grammar
  resolves `undefined` and rules fall back to the regex path — never fatal.
  No rule consumes the AST yet (Phase 3 wires specific JV/CS rules), so scan
  findings are byte-identical: golden lock, corpus baselines, and generated
  assets all unchanged (BEHAVIOR-NEUTRAL mode, plan §06).
- **Parser lifecycle management** (plan §10.3): one memoized `Parser` per
  grammar, bounded by a fixed-size parse-slot semaphore
  (`MAX_CONCURRENT_PARSES`); every per-file tree is released via
  `ParsedAst.dispose()` (`tree.delete()`) in a `finally`-equivalent position
  that runs on normal completion, rule crash, per-file budget expiry, and
  adapter throw; `releaseTreeSitterResources()` tears down the memoized
  parsers after each scan (library-consumer hygiene). No leak path depends
  on rules completing successfully.
- **Call-graph consequences**: `computeImpact` (and therefore
  `runImpactCommand`) is async; `scripts/corpus-sample.ts`,
  `scripts/generate-readme-demo.ts`, and `scripts/generate-readme-hero.ts`
  await `runScan`; the full test suite (~40 call sites across 25 spec files)
  awaits the now-async commands. No behavior change anywhere.
- **Verification evidence** (exit gate §10): golden lock byte-identical
  (3/3), corpus count-lock unaffected (no JV/CS rule reads the AST),
  capability-matrix + FP-AUDIT generated docs byte-identical, pack smoke
  re-proven manually: `npm pack` → clean `npm install` → offline grammar
  load + parse of real Java and C# source → offline `mjolnir` scan of a
  Java fixture detecting QA-JV-102. `web-tree-sitter` stays pinned to
  exactly `0.25.6` (§10.5, documented 0.26.x breakage).

### Added — score instrument redesign (hammer states)

- **ScoreState model** (`src/reporter/score-state.ts`): one pure source of
  truth for band / verdict / color / headline per score — critical 0–49,
  warning 50–79, trusted 80–99, forged 100. `verdictFor`, the terminal
  gauge and the badge all delegate to it.
- **The hammer is now the score instrument** (terminal): a state-colored
  hammer block renders above the WORTHINESS line — cracked (0–49),
  strained with partial runes (50–79), charged with energy arcs (80–99),
  halo + lightning at 100. A plain-text caption (`[CRACKED]` /
  `[STRAINED]` / `[CHARGED]` / `[FORGED]`) carries the state without
  color; ASCII fallback included.
- **Trusted is aurora-cyan, forged is white-gold** on every surface
  (terminal palette, web tokens, brand README). Green is no longer a
  score color — it survives for non-score success contexts only.
- **Findings render as cards** (terminal): Problem → Impact → Fix →
  Verify with the evidence tag and measured FP rate beside the title;
  rules with >3 findings collapse under one "same fix applies" header;
  non-verbose shows 10 cards with an overflow line, `--verbose` shows
  everything.
- **FORGED block at 100** replaces the bare FLAWLESS VICTORY line in
  unicode mode (trophy retained inside; the `*** FLAWLESS VICTORY ***`
  ASCII contract string is preserved).
- **PR comments show score drift** (`Score: 72/100 (+5 since baseline
<sha>)`) using the new additive `score` field in the baseline JSON, and
  carry per-finding evidence tags.
- **Badge thresholds aligned** with the reporter: ≥80 / ≥50 / 100
  (was ≥90 / ≥75 / ≥50), colors `red` / `yellow` / `important` /
  `success`; the message at 100 reads `100/100 · forged`.

### Fixed — security & detection-regression audit (`.planning/AUDIT-2026-08-30-QA.md`)

- **QA-1 (P0, detection regression):** QA-TEST-003's M0-#4 header rewrite
  required a space after `async` — `async()=>{` bodies silently stopped
  matching. `\s*` restores them without reopening the bare-`return` exemption.
- **QA-2 (P0, detection regression):** single-walk discovery applied the
  UNION of every adapter's `dirSkips`, so Python's `env` (= virtualenv)
  and Java's `build` (= Gradle output) hid directories from every other
  language — real TS test dirs (e.g. withastro/astro's `test/units/env/`)
  silently vanished from scans. `dirSkips` are now applied per owning
  language at file level.
- **QA-3 (P1):** `isInsideEmbeddedCode` truncated the masked run at the
  first space inside a literal, so embedded test-data
  (`'test(" foo", function () {})'`) was classified as live code and
  fired 6 FP findings on eslint-plugin-playwright's ruleTester tables.
- **QA-4 (P1):** config `exclude` was never validated —
  `exclude: [1, {}, null]` crashed the scan (exit 20). Non-string entries
  are now a fixable usage error (exit 10), with a defense-in-depth filter
  in pattern compilation.
- **QA-5 (P1):** an unparseable suppression `expires` value silently
  degraded to "expired" via NaN comparisons; it is now a fixable
  validation error at load time.
- **QA-6 (P1, documented-behavior fix):** the README's 90-day suppression
  policy was only applied at write time by the `ignore` command —
  hand-written entries without `expires` stayed active forever. The
  default is now enforced at enforcement time, anchored at the config
  file's mtime; `mjolnir suppressions` labels the default explicitly.
- **QA-7 (P1):** plugin reserved-prefix spoof rejection was
  case-sensitive — `"qa-test-001"` walked straight past it. Matching is
  now case-insensitive.
- **QA-8 (P2):** suppression `files` globs written with Windows
  backslashes could never match the normalized finding paths; both sides
  are normalized before matching.
- **QA-9 (P2, defense in depth):** option-shaped `--base` values are
  refused at the git layer even when a programmatic caller bypasses
  `parseArgs` (option-injection → `--upload-pack=` command execution).
- **QA-10 (P2):** finding metadata (hostile filenames, plugin messages)
  reached the terminal and markdown PR comments unsanitized — ANSI
  escapes and control characters are now stripped, and the PR comment
  escapes markdown-significant characters.
- **QA-11 (P2):** the JUnit XML scan was quadratic on unclosed
  `<testcase` floods (minutes of CPU for a 20 MB hostile report); the
  scanner is now linear with a bounded-time regression test.
- **QA-12 (P2):** `loadBaseline`/`loadStats` are now total over arbitrary
  JSON — `null` finding entries used to crash `diff`, and hostile stats
  shapes leaked string junk into totals.
- **QA-13 (P3, defense in depth):** SARIF artifact URIs normalize
  backslashes — `encodeURI` leaves `\` literal, which is not a valid
  RFC 3986 uri-reference character.
- **QA-15 (P1):** the code-text mask iterated code points instead of
  UTF-16 code units — one emoji made the mask shorter than the text and
  silently disabled masking for the whole file.
- **QA-16 (P2):** files larger than the 1 MiB discovery cap were dropped
  silently; the skip is now counted and flagged (`file-size`), keeping
  the scan honest about what it did not read.

### Changed — corpus baseline

- Regenerated after review: M0-#2's QA-TEST-004 duplicate-count fix
  (−5 on withastro-astro — every removed finding was a same-position
  duplicate), M0-#4's function-body/return-narrowing detections (net
  +1/+1/+8/+6 across vite/svelte-kit/tanstack-query/eslint-plugin-playwright,
  spot-reviewed on real code), QA-3/QA-6 masking suppressions
  (embedded-code test data no longer fires), and QA-15's mask-alignment
  fix (QA-PW-105/108 match against `codeText`, whose offsets were
  misaligned after any astral character — +27/+22/+1 restored matches on
  vite/astro/tanstack-query).

### Added — Open-Beta E2E test plan (Tier 1–5, ~1,700 new test assertions)

- **Coverage ratchet:** statements/branches/functions/lines at literal
  100% per file (`perFile: true`). Every branch arm, catch path, and
  fallback in `src/**` is exercised or provably dead — ~30 dead guards
  (unreachable `?? ""` fallbacks, unreachable-`if` arms behind
  `noUncheckedIndexedAccess`, a dead proof-abort block in `fix`) were
  removed or exported as testable pure helpers with the golden lock,
  self-scan and determinism tripwires green throughout.
- **E2E journeys** (`tests/e2e/`): nine spec files run the built
  `dist/cli.mjs` as a real child process — tarball first-run (the path
  that historically caught macOS-only CLI breakage), CI PR flow with
  changed-scope attribution against real git fixtures, the baseline →
  diff → stats loop, the fix flow, the forensics flow, explain/rules,
  create-rule onboarding, the config journey (gate/severityOverrides/
  ignore/expiry honored end-to-end), and a full exit-code contract sweep
  across every documented command.
- **Precision & accuracy:** every scorer number verified against the
  documented benchmark (deductions 8/3/1, E2/E1/E0, honesty cap 99,
  error ceiling 95, suite-invalidating ceiling 49, smoothing) with
  fast-check property invariants (≥1,000 iterations: score bounds,
  monotonicity, order-symmetry), Selector Health exact score vectors,
  hand-computed forensics math, terminal-footer/JSON deduction
  consistency, Mermaid well-formedness, and a three-verdict-band proof
  (WORTHY / NEEDS WORK / UNWORTHY each reached for its stated reason).
- **Regression & integration:** adapter→reporter matrix (one finding
  asserted on terminal, JSON, SARIF, and Mermaid), plugin flow
  integration (valid plugin + reserved-prefix rejection), cross-file
  analysis, monorepo containment (a workspace scan never reports
  siblings), a mutation guard (each sampled rule's finding drops to zero
  when the offending line is removed), and baseline forward-compat.
- **Nightly stress workflow** (`.github/workflows/stress.yml`, never
  PR-blocking): 10k-file mixed-language synthetic repo under a 120 s
  budget with no partial degradation, pathological trees (200-deep
  nesting, 10k-char lines, unicode filenames, LF/CRLF/BOM mixes,
  junctions, malformed specs), a 20-run byte-identical + flat-RSS soak,
  the networked registry-install smoke (previously skipped locally), and
  4 concurrent scans of one read-only target. Fixture generators live in
  `tests/stress/`.
- **Stability:** the 1 MB masking budget now takes the median of 3 runs
  with a 15 s ceiling (coverage instrumentation slows string-heavy loops
  ~3x and there is no in-worker marker to detect it; the ratio-based
  linearity test remains the true non-quadratic guard), and the
  scale-benchmark's 3k-file budget moved 20 s → 25 s with the same
  rationale. The vitest global-setup builds `dist/` once before any
  worker starts — parallel-file builds used to wipe dist mid-suite
  (tsdown cleans `outDir`) and fail unrelated E2E spawns with
  module-not-found.
- **Fixed (flagged by the new E2E sweep):** `doctor --bogus` ignored the
  unknown flag and scanned the CWD as a surprise full run; it now prints
  usage and exits 10, matching the flag-error parity of every other
  subcommand (unit + E2E regression tests added).
- **Soak drift artifacts** moved from `coverage/` (a CI-generated dir the
  tool's own QA-CI-005 rule correctly flags as "consumed but never
  generated" in stress.yml) to a dedicated `soak-drift/` dir.

## [0.5.0] — 2026-08-29

### Added — measurement is now visible at the point of use

- Only 15 of 91 rules carry a false-positive rate measured against real OSS
  code; that fact previously lived only in `docs/FP-AUDIT.md` and
  `mjolnir doctor`. Now surfaced everywhere a user looks:
  - The scan footer reports how many of the rules that _fired_ are measured.
  - `mjolnir rules --unmeasured` / `--measured` filter the catalog; a new
    "FP (measured)" column in `rules --md`; a "Measured FP rate" row on every
    `docs/rules/` page and in `mjolnir explain`.
  - JSON findings carry `measuredFpRate` and `measuredFpN` (additive —
    `schemaVersion` is still 1).
- `src/rules/measured-fp.generated.ts` bakes the rates into the shipped
  package (the raw verdicts are not packed); regenerated by
  `npm run fp-audit:generate`, drift-locked by a test, and now the single
  source `mjolnir doctor` reads.
- Scoring is unchanged — this is visibility only.
- **Corpus expanded 6 → 13 repos** so the previously-silent rule families
  (QA-TEST, QA-TQUAL, most QA-PW, QA-CI-001) fire on real consumer code:
  added `next-auth`, `vite`, `sveltekit`, `astro`, `TanStack/query`,
  `eslint-plugin-playwright`, `playwright-pytest`. `corpus:sample` and
  `corpus:regression` now scan with `--strict` (quarantine rules were
  invisible to both before). `docs/FP-AUDIT.md` is 15/91 (down from 19 —
  see the dispatch fix below, which retired the leaked cross-language
  verdicts for QA-PW-101/112 and QA-TEST-004/QA-ENV-001 on Java/Python
  repos); the ~250 new corpus findings are queued for classification in
  `tests/corpus/verdicts/`, not counted until read.

### Changed — help and README lead with the one command

- `mjolnir --help` and the README quickstart now open with
  `mjolnir --scope changed` as _the_ product, and group the other subcommands
  into Everyday / When-something's-flaky / Occasional instead of a flat list
  of 16 equals. A one-line first-run hint appears after a bare full-repo scan
  with no config. No subcommand removed or renamed.

### Fixed (rule-bug-hunt wave)

- **Cross-language dispatch leak**: `appliesTo: "test-files"` mapped to all
  four language adapters, so the 42 TypeScript/Playwright-only rules that
  use it (QA-PW-\*, QA-TEST-\*, QA-TQUAL-\*) ran against `.py`, `.java` and
  `.cs` files too. On the corpus this produced ~140 false positives on
  `microsoft/playwright` Java bindings alone (QA-PW-101, QA-PW-112,
  QA-TEST-004, QA-ENV-001) and inflated several baselines. `legacyAppliesTo`
  now maps `"test-files"` to `["typescript"]` only; cross-language coverage
  is the QA-PY/QA-JV/QA-CS families' job. Regression test added.
- **QA-PW-103** (missing timeout): no longer fires on assertion strings that
  contain Playwright code as _test data_ (`code: "await page.goto('/x')"` in
  playwright-mcp) — guarded by `isInsideEmbeddedCode`.
- **QA-TEST-004** (hard sleep): dropped the bare `sleep(N)` pattern and now
  requires `await` and a non-zero argument. `sleep(10).then(...)` and
  `queryFn: () => sleep(10)` are mock-latency, not test-body pauses — this
  cut TanStack Query's count from 1648 to 157.
- **QA-PW-002** (unawaited assertion): matches only Playwright's 31
  web-first async matchers instead of any `to*` name, so
  `expect(res.status()).toBe(200)` on a variable named `page` is no longer
  flagged.
- **QA-TQUAL-009** (assertion in unawaited promise chain): the `.then()`
  callback body is now paren-matched instead of grabbing the next `{`, so a
  sibling `.then(res => res.text())` inside an awaited `Promise.all` no
  longer reaches into an unrelated block; the await/return check also sees
  an `await` sitting one line above the `.then(`.

### Fixed (rule-bug-hunt wave 2 — CI + Python + order-dependence)

- **QA-CI-002** (`|| true` swallows exit code): only fires now when the
  swallowed command is a verification gate. `docker compose down || true`,
  `pkill … || true`, `rm -rf … || true` are ordinary teardown — flagging
  them as FALSE-GREEN was wrong. Gate detection is now shared with QA-CI-001
  (`src/rules/ci/verification-gate.ts`).
- **QA-CI-009** (exit code not propagated): `playwright` alone was treated as
  a test command, so `npx playwright install --with-deps; npx playwright
test` (install first, test last) was flagged even though the test's exit
  code IS the step's. Now requires `playwright test`, and skips any
  `setup; <test>` sequence where the test command runs last.
- **QA-CI-010** (tests skipped where they must block): the condition matcher
  used `[!=]=`, which also matched `==` — so `if: github.event_name ==
'pull_request'` (run **only** on PRs) was flagged as _skipping_ tests on
  PRs. Now `!=` only, plus positive matches on `== 'push'` / `'schedule'` /
  `'workflow_dispatch'`.
- **QA-PY-012** (tautological assertion): the patterns lacked the `g` flag,
  so `regex.exec()` never advanced — only the **first** `assert True` and the
  first `assert x == x` in a file were reported; every later one was missed
  (and the loop spun to its 1000-iteration guard each time). Fixed; corpus
  count rose 4 → 5 as the previously-missed assertions surfaced.
- **QA-PY-009** (commented-out test): `# main()` in a comment ("call main()
  here") was flagged as a disabled test. The `main(` pattern now requires
  the `pytest.main` namespace.
- **QA-PW-119** (order dependence): three bugs. (1) `let [a, b] = …` /
  `let { page } = …` destructuring was split on `,` into junk names like
  `[a` that were interpolated into `new RegExp(…)` — a crash risk; it is now
  skipped. (2) typed module-level `let x: Foo<T> = …` was invisible to the
  declaration regex (the `<>` broke it) and is now detected. (3) a `before*`
  hook with a destructured param — `beforeEach(async ({ page }) => {` — had
  its body located at the _param_ brace, so assignments in the hook body
  were treated as in-test and flagged; corpus count dropped 45 → 11 on the
  worst-affected repo.
- **QA-PW-116** (storageState without expiry): the canonical Playwright auth
  pattern — a `setup` project / `*.setup.ts` / `globalSetup` regenerating
  the state each run — is now recognised as a freshness mechanism, not
  flagged.

### Fixed (adversarial-audit hardening wave)

- **QA-TEST-003**: the assertion-detection regex contained a literal tab
  character (`\t`) instead of `to`, so `.toThrow()`, `.rejects.toThrow()`
  and `.resolves.*` were never recognized as assertions — tests whose only
  assertion was `await expect(p).rejects.toThrow()` were flagged as
  "no assertions" with error severity. Fixed; must-not-fire fixture now
  covers `rejects`/`resolves` forms.
- **workflow-parser**: the YAML alias-bomb guard ran AFTER parsing, i.e.
  after a billion-laughs document had already expanded. Alias counting now
  happens before parse, and the parser additionally enforces
  `maxAliasCount` during parse.
- **CRLF/BOM robustness**: files are normalized once at read time (BOM
  stripped, CRLF → LF). Previously `$`-anchored Python rules missed every
  assertion line on Windows checkouts.
- **Terminal deduction table** now uses the same evidence-discounted math
  as the score (`deductionFor`), so displayed numbers reconcile with the
  reported score when E0/E1 findings exist.
- **JSON/SARIF truncation removed**: results were silently capped at 50
  findings, including machine consumers. The full finding set is now in
  JSON/SARIF; only terminal display is capped (with an honest count).
- **`mjolnir fix` path containment**: plugin-supplied finding paths can
  no longer write outside the scan root (`../` traversal refused).
- **Symlinks are no longer followed** during test-file discovery in any
  adapter — prevents scanning outside the repo and link cycles.
- Plugin reserved-prefix blocklist extended to all core families
  (`QA-JV`, `QA-CS`, `QA-PLUGIN`).
- `doctor:playwright` bad-usage exit code unified to 10 (was 2).

### Fixed — false positives confirmed by reading source, each locked by a fixture

Every entry below was verified by opening the cited file and reading the
surrounding code, not inferred from the rule's description. Each is now locked
by a `must-not-fire` fixture so the class cannot return silently.

- **QA-TQUAL-011** matched a test identifier anywhere inside a comment block,
  so any JSDoc header containing the sequence `test (` fired. Confirmed on
  `tests/package-smoke.spec.ts:2` — `* Package publish integrity smoke test
(Test Hardening Plan, P0 #2).` Now requires the identifier to be the first
  token on the commented line. Locks:
  `tests/fixtures/QA-TQUAL-011/must-not-fire/prose-mentioning-test.spec.ts`.
- **QA-PW-004** fired on selectors passed as arguments to the function under
  test. Confirmed on `tests/selector-health.spec.ts:33` —
  `expect(classifyLocator("page.locator('xpath=//div')")).toBe("xpath")`. The
  rule must read raw text to see selector content, so masking cannot fix it;
  it now consults `codeText` as an oracle about the match position instead.
  Locks: `tests/fixtures/QA-PW-004/must-not-fire/selector-as-argument.spec.ts`.
- **QA-ENV-001**, **QA-PW-123**, **QA-PW-142** fired on code samples embedded
  in strings as test data. Confirmed on
  `tests/rule-sprint8-java-csharp.spec.ts` lines 147, 157, 603 — e.g.
  `text: 'page.navigate("http://localhost:3000/checkout")'`. Now skipped when
  the enclosing string literal holds both a nested quote and call syntax.
  Locks: `tests/fixtures/QA-ENV-001/must-not-fire/code-as-test-data.spec.ts`.
- **QA-CI-001** fired on `continue-on-error` regardless of what the step did.
  Confirmed on this repo's own workflows: `ci.yml:48` (badge artifact
  generation) and `mjolnir.yml:35` (advisory diff, which carries a comment
  explaining that exit 1 is expected there). Now gated on an allowlist of
  verification commands. Locks:
  `tests/fixtures/QA-CI-001/must-not-fire/reporting-steps.yml`.

### Fixed — true positive acted on

- **QA-TQUAL-001** on `tests/adapters.spec.ts:110` was correct. The test was
  named "counts skipped files on stat failure", its own comment admitted it
  could not simulate a stat failure, it asserted the skip callback was _not_
  called, and it never asserted on `ctx.testFiles` — the actual output of
  `discoverTestFiles`. The test was rewritten to assert on real output and
  renamed to match what it verifies. The rule was left unchanged.

### Changed — BREAKING: scoring

- **Normalization denominator is now test declarations, not test files.**
  File count was gameable: adding empty spec files raised the score without
  adding verification.
- **`SMOOTHING_C` is 1 (Laplace), was 5.** At 5 it tripled the denominator of a
  two-declaration repo, diluting real density away.
- **Findings may declare `suiteInvalidating: true`**, capping the score at 49
  (UNWORTHY) regardless of exposure. Density can express how much of a suite is
  questionable; it cannot express whether the suite ran at all. Applied to
  QA-TEST-001 and QA-PY-001. Deliberately not applied to QA-PW-003, which
  detects both `test.only()` and `page.pause()` — the flag is per-rule.
- **A score of 100 now requires zero deductions.** Normalization could
  previously round a real finding up to a perfect score.
- `NORMALIZATION_K` remains **unfitted**. See `docs/SCORING.md`.

### Changed — QA-CI-001 severity

- Step-level `continue-on-error` findings are now `error`, previously `warning`.
  The self-scan gate filters on `severity === "error"`, so a warning could never
  fail CI — which is how `continue-on-error` stayed live in this repo's own
  workflows while the tool reported zero errors.
- Title broadened to "continue-on-error masks a failing verification gate",
  accurate to the allowlist now used.

### Removed

- **All 49 FABRICATED verdicts removed.** They had been produced by reasoning
  about what each rule's description implied rather than by reading the source
  at the cited file and line — fabricated evidence with a real-looking
  provenance, inside the mechanism built to prevent exactly that.
  Subsequently, 381 verdicts were classified from real source reading via
  corpus:sample (see docs/FP-AUDIT.md).

### Changed (adversarial-audit hardening wave)

- QA-TQUAL-002 and QA-PW-004 detection now runs on a comment-stripped /
  comment-and-string-free AST view of the file: patterns inside prose
  comments or string literals no longer fire (FP firewall).
- QA-TQUAL-011 (commented-out test) now scans actual comment ranges via
  the compiler scanner instead of raw-text regex — `it(` inside a string
  literal is no longer flagged, and without an available AST the rule
  conservatively reports nothing rather than flooding false positives.
- `--scope changed` now includes GitHub workflow files and Playwright
  configs changed in the diff, not just `*.spec/test.*` files.

### Added

- Upgrade-Plan-v3 Phase 0.1: expanded the false-positive corpus with two
  additional Python repos (`pytest-dev/pytest`, `psf/requests`) so all
  QA-PY-001..012 rules are exercised against real code via
  `npm run corpus:regression`.
- Added `CHANGELOG.md` (this file) per Upgrade-Plan-v3 critical item #3:
  user-visible rule behavior changes get a first-class entry from now on.
- Upgrade-Plan-v3 Phase 1: five new TypeScript/Playwright rules —
  QA-PW-141 (retries without flake-triage loop), QA-PW-142 (blanket
  `page.route()` mocking), QA-PW-143 (no screenshot/video on failure),
  QA-PW-144 (single-browser project matrix), QA-PW-145 (no accessibility
  assertions; absence-based, `falsePositiveRisk: high`).
- Upgrade-Plan-v3 Phase 2: eight new Playwright-Python rules on the
  Python adapter — QA-PY-101 (sync/async API mix), QA-PY-102 (`time.sleep`
  in Playwright tests), QA-PY-103 (`wait_for_timeout` as sync),
  QA-PY-104 (brittle selectors), QA-PY-105 (UI-driving test without
  assertions), QA-PY-106 (shared page/context across tests), QA-PY-107
  (`networkidle` wait), QA-PY-108 (hardcoded environment URLs).
- Upgrade-Plan-v3 Phase 6: Plugin API — declare third-party rule packages
  in `mjolnir.config.json` (`"plugins": [...]`). Security model: no
  sandbox (same trust as ESLint/Vitest plugins); reserved core rule-ID
  prefixes rejected; load failures degrade honestly as QA-PLUGIN-000
  warnings without affecting exit codes. Plus cross-file duplicate-test-name
  detection (`src/engine/cross-file.ts`).
- Upgrade-Plan-v3 Phase 0.2: new `mjolnir-qa-playwright-reporter` package
  (`packages/playwright-reporter/`) — official Playwright JSON reporter
  wrapper for Mjölnir's forensics pipeline; default output
  `mjolnir.report.json` is the CLI's auto-discovery convention.
- Upgrade-Plan-v3 Phase 3: ts-morph AST precision layer behind the `ast`
  seam (`src/engine/ts-ast.ts`). QA-PW-002 and QA-PW-005 migrated from
  regex to syntax-tree detection (legacy regex kept as fallback). No
  scoring changes — golden lock byte-identical.
- Upgrade-Plan-v3 Phases 4+5: new language adapters — Java
  (`src/adapters/java.ts`, rules QA-JV-101..105) and C#/.NET
  (`src/adapters/csharp.ts`, rules QA-CS-101..104). Core Playwright rule
  families ported: disabled/skipped tests, hard sleeps, missing assertions,
  shared browser state, wait-timeout misuse. Rule-ID registry now accepts
  QA-JV/QA-CS families.

### Changed — rule tiers assigned from measured FP rates

- Every rule with a measured rate in `docs/FP-AUDIT.md` now carries the tier
  its rate warrants (`core` ≤ 10% FP · `extended` ≤ 30% · `quarantine` above
  that or unmeasured). Demoted to quarantine: QA-CS-102, QA-CS-106, QA-CS-108,
  QA-CS-111, QA-ENV-001, QA-JV-103, QA-JV-106, QA-JV-108, QA-JV-111,
  QA-PY-004, QA-PY-006, QA-PY-007. Set to extended: QA-CS-105, QA-TEST-004.
  Promoted to core: QA-CS-101 (0% FP, n=20), QA-JV-105 (10% FP, n=20).
  Quarantined rules still ship and are still documented — they are opt-in via
  `--strict` rather than shaping the default report.
- `mjolnir rules` (`--json` and `--md`) now exposes each rule's `tier`, and
  every generated page under `docs/rules/` shows it in the metadata table.

### Fixed — documentation claims a `grep` disproved

- Every generated rule page told the reader to reproduce corpus counts with
  a `corpus:audit` script. That script had been renamed to `corpus:regression` in
  the Tempering plan and the generator string was never updated — the command
  printed on 91 published pages did not exist. Same dead name in
  `docs/PUBLISHING.md`
  (`corpus:audit:update` → `corpus:regression:update`).
- **`docs/FP-AUDIT.md` under-reported the rule base as 84 rules when the
  registry holds 91.** The coverage denominator was built by grepping source
  for `id: "QA-…"`, which silently missed the seven rules that the Phase 6
  families declare as positional factory arguments — QA-CS-106/110/111,
  QA-JV-106/110/111 and QA-PY-104, every one of them Java/C#/Python. The
  honesty document was quietly shrinking the newest adapters' coverage. The
  generator now imports the registry directly (and is TypeScript, so the
  `.d.mts` shim is gone); a regression test locks the denominator to
  `RULES.length`.
- `docs/README.md` described a `docs/plans/` directory that no longer exists
  and called a completed plan "current work".
- Residual `qa-doctor` naming removed from user-facing CLI output
  (`mjolnir explain`, `mjolnir stats`), from comments that contradicted the
  code they described (`baseline.ts` cited `.qa-doctor/` while writing
  `.mjolnir/`), and from this changelog's own unreleased section.
- The Playwright reporter package is renamed throughout:
  `mjolnirReporter` / `MJOLNIR_REPORT_FILE` / `mjolnir.report.json`. The
  package is unpublished, so no consumer breaks.

### Added — guards

- CI now runs `npm run test:coverage`. Its absence is why coverage fell from
  ~96% to 92.6% between releases without anyone noticing.
- `tests/docs-consistency.spec.ts` now asserts that every `npm run <script>`
  referenced in tracked docs and source actually exists in `package.json` —
  the general fix for the dead-command class above, not a one-off patch.
- ~130 unit tests recovering branch coverage on the code-text maskers, the
  shared position helpers, ignore-pattern resolution, and the per-arm
  behavior of ten Playwright rules plus QA-PY-010.

### Infrastructure — automated npm publishing is live

- `0.5.0` is the first version published to npm by CI. `release.yml` now
  publishes via **OIDC trusted publishing** (no `NODE_AUTH_TOKEN`
  anywhere) with `--provenance`; the published tarball carries a SLSA
  provenance attestation (`npm audit signatures`). Every subsequent
  release is `git push --follow-tags` and nothing else.
- The blocker was a mismatch in the npmjs.com Trusted Publisher config
  (`Sergey-bar` vs the real `Sergey-Bar` — npm matches the OIDC
  `repository` claim case-sensitively), which surfaced as
  `OIDC token exchange error - package not found` / `ENEEDAUTH`. Fixed on
  npmjs.com; re-run against the existing `v0.5.0` tag via
  `workflow_dispatch`.

### Known gaps

- **19 of 91 rules carry a measured FP rate** (n ≥ 10, from 381 hand-classified
  corpus verdicts). The other 72 ship on an unverified assumption; `mjolnir
doctor` reports this and will fail once a majority is classified.
- `NORMALIZATION_K` is unfitted.
- Statements/branches coverage sits at 94.8%/87.7% against a 95/88 aspiration;
  the enforced floor is 94/87 with the gap documented in `.planning/STATE.md`.

## [0.4.0] — 2026-08-27

### Changed

- **BREAKING: Rebranded from QA Doctor to Mjölnir.** Package name is now
  `mjolnir-qa` (bin: `mjolnir`). Config file: `mjolnir.config.json`.
  Data directory: `.mjolnir/`. Badge: `mjolnir-badge.json`.
- Score label: "SCORE" → "WORTHINESS".
- Verdicts: "HEALTHY" → "WORTHY", "CRITICAL" → "UNWORTHY".
- Environment variable: `QA_DOCTOR_ASCII` → `MJOLNIR_ASCII`.
- SARIF tool.driver.name: "Mjölnir".
- Repository: `github.com/Sergey-Bar/Mjolnir`.
- CLI: all help text, error messages, usage strings reference `mjolnir`.
- Generated workflows: `mjolnir.yml`, `npx mjolnir-qa@latest`.

### Added

- `--format mermaid` — test-architecture diagram (Sprint 9).
- `--tone blunt` — opt-in blunter messages (Sprint 9).
- Milestones — first flawless scan / first debt reduction announced once.
- New MJÖLNIR ASCII art logo (minimal Nordic hammer).

## [0.3.x] — prior releases

See git history; per-rule Trust Metadata `introduced` fields record the
first released version of each rule.
