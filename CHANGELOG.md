# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Rule behavior changes (new rules, FP-rate changes against the corpus,
severity changes) are first-class entries here — rule IDs are immutable
once shipped, so this file is the record of what changed between versions.

## [Unreleased] — Verification Trust Evolution, Phase 1 exit — dedicated corpora + wave-5 measurement (plan §11.5/§08)

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

## [Unreleased] — Verification Trust Evolution, Phase 1 — measurement infrastructure

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

## [Unreleased] — Verification Trust Evolution, Phase 0 + Phase 1 prep

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

## [Unreleased] — Verification Trust Evolution, Phase 0.5 — async parse stage (D1)

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
