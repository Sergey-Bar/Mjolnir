# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Rule behavior changes (new rules, FP-rate changes against the corpus,
severity changes) are first-class entries here — rule IDs are immutable
once shipped, so this file is the record of what changed between versions.

## [Unreleased] — QA-2026-08-30 audit wave

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
