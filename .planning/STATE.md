# QA Doctor — Project State (GSD)

## Project

QA Doctor: linter-grade QA scanner. TypeScript, ESM, Node >= 20, Vitest, tsdown.

## Source plans

- `docs/plans/Product.txt` — long-term vision (Evidence Graph, E0–E4)
- `docs/plans/Product-MVP.txt` — MVP §1–35 (rules, scoring, guardrails, risks)
- `docs/plans/Sprint-Plan.txt` — 13-week plan, Option A (solo dev + AI), ~66 dev-days
- `docs/plans/Upgrade-Plan-v2.txt` — R1 LanguageAdapter refactor → R2 Python adapter → R3 Playwright Deep Mode
- `docs/plans/Upgrade-Plan-v3.txt` — next up: new Playwright layers, Playwright-Python, TS AST precision, Java/.NET Playwright adapters, Plugin API + cross-file analysis (tier-4 "delight" items explicitly deferred)
- `docs/tiers/` — Legendary-Roadmap split by tier (T1 game-changers … T6 stars playbook)

## Frozen contracts

- JSON report `schemaVersion: 1`; exit codes 0/1/2/10/20; rule IDs immutable.

## Laws

- Anti-creep: every addition requires equal-size removal from launch set.
- Fixture firewall: every rule needs must-fire AND must-not-fire fixtures.

## Current phase

Updated 2026-08-25 (second revision) — gap-filling waves 1–3 complete,
supersedes the earlier 2026-08-25 snapshot.

- **R1 — LanguageAdapter refactor: ✅ DONE.** Shipped as v0.3.0.
- **R2 — Python/pytest adapter: ✅ COMPLETE.** All 12 planned rules shipped
  and registered (QA-PY-001..012). FP audit against real OSS repos still
  recommended before a wide announcement.
- **R3 — Playwright Deep Mode: ✅ ~COMPLETE.** All rule families shipped:
  wait/timing (101–105), assertion completeness (107, 108, 110→140),
  selector health (112, 113; engine in `doctor:playwright`), isolation
  (115, 116, 117, 119), config hygiene (121, 122, 124, 125). Remaining:
  QA-PW-106/109/110 are covered by pre-existing rules or QA-PW-140;
  `@qa-doctor/playwright-reporter` npm package still open.
- **R4 — Forensics: ✅ DONE** for the shipped scope. Missing target dirs now
  degrade honestly (exit 2) instead of crashing.
- **Hardening fixes landed:** SARIF driver version synced to package.json;
  `fix` uses atomic temp+rename writes; suppressions (`ignore`) and
  `severityOverrides` are now actually enforced during scans; monorepo
  scope containment (targeting one package no longer scans siblings);
  malformed configs fail fast with clear errors.
- **ts-morph removed** from dependencies (was installed-but-unused).
- Suite: ~1066 tests across 60 files, all green except the pre-existing
  Windows `tar --force-local` failure in package-smoke.spec.ts.

- **Upgrade-Plan-v3 progress (2026-08-25):**
  - Phase 0.1 Python FP corpus: ✅ corpus expanded (pytest-dev/pytest,
    psf/requests); baseline regeneration needs one networked
    `npm run corpus:audit --update` run.
  - CHANGELOG.md added (critical item #3).
  - Phase 1 (QA-PW-141..145): ✅ shipped — 5 new Playwright layers,
    fixture pairs complete, golden lock updated with reviewed diff,
    suite/typecheck/lint green. FP audit against real PW repos still open.
  - Phase 2 (QA-PY-101..108): ✅ shipped — Playwright-Python rule family
    on the existing Python adapter; 8 rules + fixture pairs complete;
    suite green (1215 passed). FP audit vs real pytest-playwright repos open.
  - Phase 3: ✅ shipped — ts-morph behind the ast seam (src/engine/ts-ast.ts);
    QA-PW-002 + QA-PW-005 migrated with regex fallback; golden lock intact;
    package-smoke updated for transitive deps. Suite green (1232).
  - Checkpoint 4/5: ✅ superseded by direct implementation request —
    both adapters SHIPPED 2026-08-26:
    - Phase 4 Java: src/adapters/java.ts + QA-JV-101..105 (5 fixture pairs).
    - Phase 5 .NET: src/adapters/csharp.ts + QA-CS-101..104 (4 fixture pairs).
      Rules run on the regex layer; tree-sitter WASM grammars are the next
      precision step behind the existing seam. Registry/doctor ID validation
      extended to JV/CS families. Suite green (1243 passed).
  - Phase 6: ✅ shipped — Plugin API (src/plugins/load.ts, no-sandbox model
    documented, reserved-prefix guard, honest degradation via QA-PLUGIN-000)
    - cross-file duplicate-test-name analysis (src/engine/cross-file.ts).
      Suite green (1228 passed), typecheck + lint clean.
  - Phase 0.2 reporter package: ✅ shipped — `packages/playwright-reporter/`
    (qaDoctorReporter wrapper, contract tests, README). npm publish on
    next tagged release.
  - Remaining open: FP audits (networked),
    tier-4 delight items (explicitly unscheduled).

Remaining known gaps: Python FP audit (networked, not yet run), Legendary
tiers 2/4 items (roast mode, Mermaid output — plugin API is now shipped,
see Master-Stabilization-Plan Sprint 0 note below).

Full audit trail: see status markers added throughout
`docs/plans/Implementation-Master-Plan.txt` and `docs/plans/Upgrade-Plan-v2.txt`.

## Master-Stabilization-Plan.md — Sprint 0 (2026-08-26): ✅ COMPLETE

Executed against a real shell (previous plan revisions were written with
no shell access — see that document's §1 "Explicitly NOT verified").
Verified, dated baseline replacing every conflicting count in prior docs:

- `npm run typecheck`: **exit 0**, clean.
- `npm run lint`: **exit 0**, clean (eslint + prettier --check).
- `npm test`: **69 files passed, 1 skipped (70); 1656 tests passed, 3
  skipped (1659).** Windows `tar --force-local` package-smoke bug is
  confirmed already fixed — no failure observed.
- `npm run build`: succeeds, `dist/cli.mjs` 279.20 kB / gzip 65.93 kB.
- `npm run test:coverage`: **known flake, not fixed in Sprint 0** —
  `tests/scale-benchmark.spec.ts`'s two tests intermittently hit Vitest's
  default 5000ms per-test timeout under coverage instrumentation before
  the test's own 20000ms budget gets evaluated. Passes reliably under
  plain `npm test`. Logged as a known-unknown; a fix (raising Vitest's
  `testTimeout` for this file, or excluding it from coverage runs) is
  unscheduled — first candidate for a Sprint 1 follow-up.
- `npm run self-scan`: **was actually red** — 20 error-severity findings
  on a clean run, meaning CI's real self-scan gate
  (`.github/workflows/ci.yml`, fails on any `severity==='error'`
  finding) would have failed on the next push. Root cause:
  `qa-doctor.config.json`'s fixture-noise suppression list was missing
  entries for QA-CS-103, QA-JV-103, QA-PY-003/105, QA-TEST-002, and did
  not cover `examples/demo-repo/**` at all. Fixed; verified 0
  error-severity findings on a fresh build. Score itself is still
  0/100 self-scanning this repo — expected and **not fixed**, since the
  test corpus (`tests/fixtures/**`) is intentionally full of the exact
  anti-patterns the tool detects; the CI gate only checks for new
  error-severity findings, not overall score, so this is not a release
  blocker. A structural fix (excluding fixtures from score calculation
  entirely for self-scan purposes) is unscheduled.
- Golden lock (`tests/golden/golden.spec.ts`): **byte-identical**, 3/3
  passing — none of the Sprint 0 changes affected scoring.
- `npm run corpus:audit`: **not run** (requires network; unchanged from
  prior sessions' "still open" status).

**Repository structure finding (not anticipated by the plan as written):**
there are two git repos nested at different levels — `c:\Work\QA-Doctor\
.git.bak-outer` (the original flat-layout clone of this project, renamed/
disabled, missing 2 local-only release commits that never reached
`origin/main`) and `c:\Work\QA-Doctor\qa-doctor\.git` (the active repo,
fully in sync with `origin/main`, continuing the same history from the
point the repo was restructured under a `qa-doctor/` subdirectory). The
outer folder's `docs/plans/**` and `.planning/STATE.md` existed only in
that untracked outer folder — the active repo had **none** of its own
"source of truth" planning docs tracked at all, a strictly worse version
of finding #4 than the plan anticipated (it assumed one repo with a
`.gitignore` problem, not two repos where the real one was missing the
files entirely). Fixed by copying the whole `docs/` tree and `.planning/`
into the active repo. `.git.bak-outer` is inert and left in place —
its two extra commits (`2a5db8d` v0.2.2, `f1aec4e`) were confirmed to be
pre-restructure, flat-layout releases fully superseded by the current
nested layout, not at-risk work.

**Task 1** (verified baseline): done, numbers above.
**Task 2** (`.gitignore`/CHANGELOG.md): done. `CHANGELOG.md` was
git-ignored (along with `.gitignore` self-referencing itself twice) and
therefore untracked despite existing on disk. Fixed; added to
package.json `files`; now ships in the packed tarball (verified via
`tests/package-smoke.spec.ts`).
**Task 3** (recover source plans): done, via the repo-structure fix above
— broader than the plan's original framing but resolves the same root
problem (a fresh clone previously received none of these files).
**Task 4** (identity/URLs/version): done. Confirmed via `gh repo view`
that GitHub already redirects/resolves the repo as `Sergey-Bar/QA-Doctor`
(old `QA-Dodctor` path was stale, not current — the rename step the plan
called for had already happened upstream of this session). Updated
`package.json` repository/bugs/homepage, the local git remote, the
reporter package's `repository` field, `SECURITY.md`,
`src/reporter/sarif.ts`'s `informationUri`, `src/commands/badge.ts`'s
default `repoUrl`, and the README clone command. Reporter README now
states plainly it is unpublished and gives a from-source install
path instead of a 404ing `npm install` command. `docs/PUBLISHING.md`
release checklist: **not written** — deferred, not blocking Sprint 0's
exit criteria, candidate for Sprint 3 (governance/docs).
Npm package name itself: **untouched, per the plan's explicit parking
(§5)**.

**QA tests added** (fail before fix, pass after — verified both states):
`tests/repo-hygiene.spec.ts`, `tests/link-integrity.spec.ts`,
`tests/package-smoke.spec.ts` (extended). `tests/version-consistency.spec.ts`
was reviewed and left as-is — its single hardcoded-version-surface check
(`sarif.ts`) was already correct and sufficient for Sprint 0's scope;
widening it to cover every surface is Sprint 1 territory per the plan's
own sprint map.

**Not done in Sprint 0** (explicit known-unknowns, not rounded to green):

- `test:coverage` scale-benchmark timeout flake (see above).
- `npm run corpus:audit` (networked).
- `docs/PUBLISHING.md`.
- Standing gate has only been run on Windows this session — Linux/macOS
  verification not performed locally (CI matrix already covers both;
  not independently re-verified here).

Two commits landed this session: one consolidating pre-existing
uncommitted feature work (Java/C# adapters, Playwright-Python rules,
plugin API, cross-file analysis, ts-ast seam, playwright-reporter
package — all previously sitting only in the working tree, undocumented
as a git-level risk until this session), one for Sprint 0's fixes
proper.

## Master-Stabilization-Plan.md — Sprint 1 (2026-08-26): ✅ COMPLETE

**Task 5** (extend typecheck to tests+packages): done. Added
`tsconfig.test.json`, wired `npm run typecheck` to run both configs.
Surfaced ~320 initial errors; 272 were from `tests/fixtures/**`
(rule-detection test _data_ consumed via `readFileSync`/regex, never
imported as TS modules — correctly excluded, not fixed) and
`tests/golden/repo/**` (a sample repo scanned by the tool, same
reasoning). The remaining ~50 were real: incomplete mock
`Finding`/`FixResult` objects in test helpers missing required fields,
two genuinely invalid literal values (`findingType: "static"`,
`qaImpact: "Flaky tests reach main"` — neither is a valid enum member;
real bugs predating this sprint, not just strict-mode noise), several
`noUncheckedIndexedAccess` violations on array indexing (fixed with
explicit runtime checks — never `!`, which this repo's own eslint config
bans), and one call site missing a required argument. All fixed without
weakening any compiler option. Verified with a negative control (a
deliberately broken type placed in a `.spec.ts`, confirmed caught at
exit 2, then removed) that the new coverage is real, per the plan's own
QA table.

**Task 6** (lint `scripts/`): done. Removed `scripts/` from eslint
`ignores`; added a scoped override for `scripts/**/*.cjs` declaring the
Node CommonJS global scope, since `sync-sarif-version.cjs` legitimately
needs `require`/`__dirname` as a plain CJS release script (the ESM
`src/` codebase does not) — this is a correctness fix, not a weakened
rule.

**Task 7** (de-orphan the reporter package): done. Added
`workspaces: ["packages/*"]`; added `@playwright/test` as a real root
devDependency (was completely absent — finding #7); wired
`packages/*/build` into the root `build` script (verified both root
`dist/cli.mjs` and `packages/playwright-reporter/dist/index.mjs` build
in one `npm run build`). Rewrote
`tests/playwright-reporter-package.spec.ts` to feed
`qaDoctorReporter()`'s output through Playwright's real
`defineConfig({ reporter: [...] })` — the actual integration point every
consumer hits — instead of only asserting a bare tuple shape.

**Task 8** (publish integrity): done. Added a `package-smoke.spec.ts`
check against a fresh `npm pack --dry-run --json` listing (not the
shared `pkgDir` fixture, which deliberately copies `node_modules` in
_after_ extraction for its own CLI-invocation tests — checking that
fixture for `node_modules` would have been a false positive) asserting
the tarball never contains `scratch/`, `coverage/`, `node_modules/`,
`tests/`, `.git/`, `docs/`, or `.planning/`. Currently packs clean (6
files, 77.1 kB) — `package.json`'s `files` whitelist was already
correct; this test guards it from regressing.

**Standing gate, verified green after all four tasks:** `typecheck`
(both configs) exit 0; `lint` clean; **69 files / 1658 tests passed, 1
skipped, 3 tests skipped**; root+workspace `build` succeeds (both
`dist/` outputs produced); golden lock byte-identical (3/3); self-scan
gate 0 error-severity findings.

**Not done in Sprint 1** (explicit known-unknowns): `docs/PUBLISHING.md`
still not written (carried over from Sprint 0, still Sprint-3-adjacent
territory, not blocking). `test:coverage` scale-benchmark flake (Sprint
0 finding) not revisited. Linux/macOS gate still only verified via CI
matrix, not independently re-run locally.

## Master-Stabilization-Plan.md — Sprint 2 (2026-08-26): ✅ COMPLETE

**Task 9** (corpus audit): done, networked run executed for real. First
run against a leftover `.cache` from earlier manual testing produced
misleading output (stale content from an interrupted prior clone);
re-ran against a clean cache and got consistent, reproducible numbers.
`pallets-click`'s near-total drop to 0 across `QA-PW-*`/`QA-TEST-*`/
`QA-TQUAL-*` families is a genuine accuracy improvement — those rules
should never fire on a pure-Python repo, and a direct scan confirmed
only `QA-PY-*`/`QA-ENV-001` findings remain (adapter-scoping working
correctly), not a regression masked as "quieter". The three real
"fires more" flags (`QA-PW-103`, `QA-PW-120`, `QA-PW-145` on
`microsoft-playwright-mcp`) were individually inspected against their
actual finding text — all legitimate `info`/`low-confidence`/`E1`
detections of real code patterns (unguarded `goto()` timeouts, an
engine-specific test without a browser guard, a UI spec with no a11y
assertions). Ran `--update`, added two new baselines
(`pytest-dev-pytest`, `psf-requests`) that had none before, confirmed
non-update mode now passes clean (`OK: no FP-count regressions`).

**Task 10** (FP-table generator): done. `scripts/generate-fp-audit-table.mjs`
reads the committed baselines (plus a `CORPUS_NOTES` map kept in sync
with `tests/corpus/audit.ts`'s `CORPUS` list via a cross-check test) and
writes `docs/FP-AUDIT.md` — cannot drift from the baselines because it's
generated, not hand-written. Wired as `npm run fp-audit:generate`.
Fixed `tests/corpus/audit.ts` to guard its own networked `main()` behind
an `import.meta.url` check so other scripts can import its exports
without triggering a full audit as a side effect.

**Task 11** (self-scan artifact): done. The self-scan CI gate already
existed but only ever printed to a log; `ci.yml`'s `self-scan` job now
writes `self-scan.json`, generates `qa-doctor-badge.json`, and uploads
both as a downloadable build artifact with `if: always()` (a red run —
the one someone most needs to inspect — still gets uploaded). Caught a
real instance of the exact anti-pattern this tool detects while writing
this: an initial draft used `|| true` for the best-effort badge step,
which the tool's own `QA-CI-002` rule correctly flagged when self-scanned.
Fixed with step-scoped `continue-on-error: true` (the honest mitigation
`QA-CI-001`'s own fix message recommends) and added
`tests/ci-self-scan-workflow.spec.ts` as a regression guard.

**Task 12** (evidence metadata in every reporter): done, audited. There
is no `--format markdown` for scan findings — only `terminal`/`json`/
`sarif` ship (`qa-doctor rules --md` is a separate rule-catalog
reporter, audited too as this repo's one markdown output). All three
carry `evidenceLevel`: JSON via the raw `Finding` field, SARIF via
`result.properties.evidenceLevel` (already present, verified), terminal
via a per-finding `[E0]`/`[E1]`/`[E2]` tag plus an honest advisory-count
footer (already present — `appendTopIssues`/`appendFooter` in
`terminal.ts`, this sprint only added the test proving it, no source
change needed here). Added `tests/reporter-evidence-contract.spec.ts`.

**Standing gate, verified green:** typecheck (both configs) exit 0;
lint clean; **72 files / 1677 tests passed**, 1 skipped, 3 tests
skipped; build succeeds; golden lock byte-identical; **networked
corpus audit clean** against the reviewed baseline; self-scan gate 0
error-severity findings.

**Not done in Sprint 2:** `docs/PUBLISHING.md` still outstanding
(Sprint 3 territory). The `qa-doctor.yml` PR-annotation workflow still
calls `npx --yes qa-doctor@latest`, which resolves to the parked/
unrelated npm package (finding #1) — out of scope for this sprint's
tasks specifically, but a real, separate risk worth flagging: that
workflow would currently run a stranger's software, not this repo's
CLI, on every PR that has it enabled.

## Master-Stabilization-Plan.md — Sprint 3 (2026-08-26): ✅ COMPLETE

**Task 13** (CONTRIBUTING.md): done. Dev setup, every standing-gate
command, the anti-creep/fixture-firewall laws (linked to
Master-Stabilization-Plan.md, not duplicated), how to propose a rule —
documenting that `create-rule`'s scaffold deliberately fails its own
fixtures until implemented, which is surprising without explanation —
or a plugin, and PR expectations.

**Task 14** (rule deprecation/lifecycle policy): done.
`docs/RULE-LIFECYCLE.md` — severity-downgrade-first path, mandatory
CHANGELOG entry, a full worked example. Backed by a real mechanism, not
just prose: `src/rules/index.ts` now exports `RETIRED_RULE_IDS` (empty
until the first full removal), and `tests/rules.registry.spec.ts`
enforces a retired ID can never simultaneously be an active one.

**Task 15** (documentation truth pass): done.

- `docs/README.md`'s plan-status table rewritten: `Master-Stabilization-
Plan.md` now listed as current; `Implementation-Master-Plan.txt`
  marked superseded with a matching header note in that file itself;
  removed a self-referential "qa-doctor/ is the source" line (this file
  now lives _inside_ `qa-doctor/`) and a `demos/` reference to a folder
  that only exists in the untracked outer directory.
- README.md's "TypeScript/Playwright and Python today" line fixed
  (finding: understated the shipped Java and C# adapters) — now names
  all four, honestly noting Java/C# ship a regex-only core family with
  tree-sitter WASM AST as the next precision step (not full parity
  with Python's real AST yet).
- `tests/docs-consistency.spec.ts` added: every rule ID README's tables
  cite is checked against the real registry (existence + severity, with
  a reviewed allowlist for `QA-TEST-002`, whose severity is genuinely
  computed per-occurrence — a justified skip is `warning`, an
  unjustified one escalates to `error` — not a stale README, which my
  first draft of this test incorrectly assumed). Also guards the
  specific stale-gap-claim bug class in findings #3/#10 (Windows tar,
  CI OS matrix) so a future revert can't silently un-fix the docs
  alongside the code.

**Unplanned but necessary — coverage was fully unmeasured until this
sprint.** Sprint 0's own findings list said coverage thresholds were
"explicitly NOT verified" (no shell access that session). Running
`npm run test:coverage` for real for the first time (blocked earlier by
the scale-benchmark timeout flake, fixed properly this sprint by
raising that one file's Vitest `testTimeout` to exceed its own internal
budget assertion — confirmed fixed by re-running the full suite and
coverage back-to-back with no recurrence) surfaced a real, previously
invisible gap: **88.41% lines / 81.02% branches / 92.13% functions /
89.57% statements** against 95/88/96/95 floors — failing on three of
four axes. Root causes, each fixed with real unit tests, never by
lowering the thresholds:

- `javaAdapter`/`csharpAdapter` (~35-40%, no dedicated test file existed
  at all) → `tests/adapter-java-csharp.spec.ts`.
- The 9 Java/C# rules (~18-25%, only exercised indirectly via the
  fixture-firewall completeness check) →
  `tests/rule-branch-coverage-java-csharp.spec.ts`.
- `src/plugins/load.ts` (81.81%/56% branches) → extended
  `tests/plugins.spec.ts` (malformed config, object-form declarations,
  non-array entries, no-rules-export, mixed valid/invalid rules).
- `src/commands/doctor.ts` (65.62% — the single worst file in the repo)
  → extended `tests/trust-upgrade.spec.ts` (`checkEvidenceHonesty` and
  `renderDoctorReport` were never called directly before this).
- `src/scorer/scorer.ts` (92.3%/75% branches; the module doc comment
  promises idempotency nothing had verified) → new
  `tests/scorer-unit.spec.ts`.
- `src/forensics/triage.ts` (67.64% branches; only the empty state and
  `renderTriageMd` were tested, never `renderTriage`'s real path) →
  extended `tests/commands.spec.ts`.
- `src/rules/ci/qa-ci-009-exit-code.ts` (75% branches, worst CI rule) →
  extended `tests/ci-exit-code.spec.ts`.
- `src/commands/rules-catalog.ts` (61.9% branches — every _real_
  registered rule has full Trust Metadata, so the "field absent" arm of
  every optional-field spread was structurally unreachable from `RULES`
  itself) → extended `tests/rules-catalog.spec.ts` with synthetic
  minimal/full rules.

**`npm run test:coverage` now passes (exit 0) for the first time this
session: 95.61% lines / 88.27% branches / 97.69% functions / 96.24%
statements.**

**Standing gate, verified green:** typecheck (both configs) exit 0;
lint clean (also fixed several non-null-assertion violations my own
new tests introduced — this repo's eslint config bans `!`); **76 files
/ 1903 tests passed**, 1 skipped, 3 tests skipped; coverage passes;
build succeeds; golden lock byte-identical (none of this sprint's work
changed real scan behavior — confirmed, not assumed); self-scan gate 0
error-severity findings.

**Not done in Sprint 3:** `docs/PUBLISHING.md` (release checklist)
still outstanding — genuinely Sprint 4 territory now (beta readiness),
not deferred further. The `qa-doctor.yml` npm-name risk flagged in
Sprint 2 remains open, still correctly out of scope (parked per §5).

## Master-Stabilization-Plan.md — Sprint 4 (2026-08-26): ✅ COMPLETE

**Task 16** (clean-machine first-run validation): done, and genuinely
executed rather than simulated. Packed a real tarball
(`npm pack`), extracted it, copied in runtime dependencies the way a
real `npm install` would, and ran every one of the README's 14
documented commands against a fresh fixture repo. All work as
described, including honest degradation on missing inputs (`badge`
falls back to `commit="unknown"` outside a git repo; `doctor` explains
it needs the qa-doctor repo root; `forensics`/`triage`/`pw-report`
report "nothing found" instead of crashing without a `test-results/`
dir). Verified on this session's OS (Windows) only — Linux/macOS rely
on the existing 3-OS CI matrix (Sprint 0 finding #10 confirmed that
matrix is real), not independently re-run here. Added
`tests/readme-commands.spec.ts`: extracts every documented command and
checks its subcommand token against `src/cli.ts`'s real dispatch
strings, read from source so the check can't drift.

**Task 17** (feedback channel): done.
`.github/ISSUE_TEMPLATE/bug-report.yml`, `false-positive.yml` (the
highest-value beta signal — collects rule ID, minimal repro, and the
"why this isn't the problem" explanation that becomes the must-not-fire
fixture), `rule-request.yml`, `language-request.yml`, `config.yml`
(blank issues disabled, security reports routed to `SECURITY.md`'s
private channel instead of a public issue). `tests/issue-templates.spec.ts`
validates YAML structure and GitHub's required issue-form fields.

**Task 18** (provenance publishing prep): done. `release.yml` was
correctly noted by the plan as never publishing to npm at all (tarball

- GitHub Release only) — now has a written `npm publish --provenance`
  step, gated via `if: false` (not merely absent — a real regression
  guard via `tests/release-workflow.spec.ts` checks specifically for
  `false`, not just "no publish step"), plus `id-token: write` on the job
  for the future OIDC token. `docs/PUBLISHING.md` documents the
  per-release checklist and the one-time npmjs.com trusted-publisher
  (OIDC) runbook a maintainer must do manually on npmjs.com — explicit
  that this cannot be automated from inside the repo, and why there's
  deliberately no `NODE_AUTH_TOKEN` secret (OIDC trusted publishing
  replaces long-lived tokens).

**Standing gate, verified green:** typecheck (both configs) exit 0;
lint clean; **79 files / 1937 tests passed**, 1 skipped, 3 tests
skipped; coverage passes; build succeeds; golden lock byte-identical;
self-scan gate 0 error-severity findings.

**Not done in Sprint 4:** nothing outstanding from this sprint's own
task list. Carried-forward, still-open items: the `qa-doctor.yml`
npm-name risk (Sprint 2, correctly parked), the `test:coverage`
scale-benchmark flake (fixed properly in Sprint 3 — no longer open),
Linux/macOS gate independent re-verification (relies on CI matrix, not
blocking).

## Master-Stabilization-Plan.md — Sprint 5 (2026-08-26): ✅ COMPLETE

**Task 19** (`qa-doctor explain <RULE-ID>`): done.
`src/commands/explain.ts` — presentation layer only, per the plan.
Metadata renders offline from `RuleMeta`; the concrete example is real
detector output from running the rule's own `run()` against its own
committed must-fire fixture, never hand-written prose. Building the
plan's own required "100% of registered rules" test caught two real
bugs before they shipped: (1) passing the fixture's raw Windows path
broke every filename-gated rule (e.g. `QA-PW-121` matching
`playwright.config.ts` via `ctx.path.split("/")`, which never finds a
`\` separator) — fixed by normalizing to forward slashes as the real
engine guarantees; (2) every `QA-CI-*` rule reads a parsed YAML AST
from `ctx.ast`, never populated unless `explainRule` parses the
workflow fixture the same way `githubActionsAdapter.runRules` does —
fixed. Without the test, 12 of 78 rules (15%) would have shipped
"explainable" in name only.

**Task 20** (fix-this-first prioritization): done.
`src/scorer/prioritize.ts` ranks by `deductionFor` (the scorer's own
already-computed, evidence-discounted score-gain — not an invented
second number) with ties broken by `RuleMeta.autofix` (the only
non-fabricated effort signal available — a coarse tier, not invented
effort-hours). New terminal "FIX THIS FIRST" section shows the top 3.
Confirmed display-only: golden lock stays byte-identical because it
only checks per-rule finding counts, never terminal text — verified by
running it, not assumed from the plan's own framing.

**Task 21** (empty states): done. Consolidated
`tests/empty-states.spec.ts` asserting guidance text **and** the
documented exit code together for every real dead end. Added an
explicit note to `create-rule`'s report explaining that seeing failing
tests immediately after scaffolding is intentional (the plan's own
called-out risk: "surprising and alarming without explanation").
Slightly improved the framework-unknown message to state what to do
next, not just what happened.

**Task 22** (terminal robustness): done. `box()` now reflows via a new
`wrapText()` word-wrapper instead of assuming unbounded width; `--width`
CLI flag (defaults to `process.stdout.columns`, then 80) threads through
to the score gauge and deduction box; `shouldUseAscii()` auto-detects
cmd.exe/legacy consoles (absence of `WT_SESSION`/`TERM_PROGRAM`/
`ConEmuANSI` plus `win32` plus no `TERM`) and swaps box-drawing/emoji for
plain ASCII, with a `QA_DOCTOR_ASCII=1/0` env override and `--ascii`/
`--no-ascii` CLI flags for when the heuristic guesses wrong. Verified
interactively at 40/80/120 columns and in explicit ASCII mode on this
session's real terminal, not only unit-tested in isolation.

**Standing gate, verified green:** typecheck (both configs) exit 0;
lint clean; **83 files / 2167 tests passed**, 1 skipped, 3 tests
skipped; coverage passes; build succeeds; golden lock byte-identical;
self-scan gate 0 error-severity findings.

**Not done in Sprint 5:** nothing outstanding from this sprint's own
task list. This closes the last sprint before the Open Beta Gate
checklist.

## OPEN BETA GATE checklist — verified 2026-08-26

Checked against the plan's own criteria (§ "OPEN BETA GATE"), with
real evidence for each line, not assumption:

- [x] **Sprints 0–5 complete**, each passed its own QA tests and the
      standing gate — all committed, all recorded above with real numbers.
- [x] **Standing gate green on Linux, macOS and Windows** — verified via
      a real GitHub Actions run, not assumed: checking `gh run list` on
      `origin/main` surfaced that the actual remote CI had been **red on
      macOS for the prior 5+ pushes** (`package-smoke.spec.ts`: the packed
      CLI produced zero output when invoked as a real child process — no
      crash, no stderr, no stdout). Several earlier commits had already
      attempted to fix this (symlink → copy for `node_modules`) without
      success. Root-caused to the module-is-entry-point guard at the bottom
      of `cli.ts` comparing `import.meta.url` to
      `pathToFileURL(process.argv[1]).href` by raw string equality — on
      macOS a symlinked temp-directory component (`/var/folders` →
      `/private/var/folders`) resolves differently through Node's ESM
      loader than through `process.argv[1]`, so the comparison silently
      never matched and `main()` never ran. Fixed by comparing
      `realpathSync()`-resolved paths instead (`isEntryPoint()`, now
      exported and unit-tested in `tests/cli-entry-point.spec.ts`). Could
      **not** be directly reproduced/confirmed locally before pushing (no
      macOS access this session) — pushed as a well-reasoned, non-regressing
      hypothesis and verified against the real CI run that followed:
      **`package-smoke.spec.ts` now passes 7/7 on all three OSes, including
      macOS — this really was the root cause.**
      A second, separate, self-introduced bug surfaced in that same CI run:
      `tests/terminal-render.spec.ts`'s new "narrower width produces a
      narrower gauge" test (Sprint 5, Task 22) used a naive line search that
      could pick either the SCORE gauge or a fixed-width DIAGNOSTICS gauge
      depending on rendering details — comparing a constant against itself.
      Passed on Windows locally by coincidence; failed on Linux and macOS
      CI. Fixed by explicitly indexing the line after "SCORE". **Confirmed
      CI run 32997442199: `build-test` green on `windows-latest`,
      `ubuntu-latest`, and `macos-latest`, plus `self-scan` green** — the
      first fully-green 3-OS run recorded this session, on real remote
      infrastructure, not a local approximation.
- [x] **Every documented command verified on a clean machine from a
      packed tarball** — done on Windows directly (Sprint 4 Task 16);
      Linux/macOS now additionally covered by the real green CI run above
      (which packs and smoke-tests the tarball as part of `npm test`).
- [x] **Every published accuracy claim reproducible via one public
      command** — `npm run corpus:audit` verified working (Sprint 2).
- [x] **No documentation claim contradicted by a source read** —
      `tests/docs-consistency.spec.ts` guards the specific bug class found
      in Sprint 0 findings #3/#10; not an exhaustive audit of every doc file
      in the repo, but the mechanism that would have caught this session's
      stale claims is now in place and enforced by CI.
- [x] **Remaining unknowns listed as unknowns** — this file has recorded
      every known-unknown as it was found, throughout every sprint.
- [ ] **npm distribution name resolved (§5)** — explicitly **not**
      resolved. This is, per the plan's own text, "the one blocker this plan
      cannot close" — parked by deliberate decision, not an oversight.

**Verdict: every gate this plan can close from inside the repo is now
closed and verified with real evidence. The sole remaining blocker to
public launch is the parked npm-name decision (§5), which requires a
choice only the project owner can make (scoped package name vs.
product rename vs. acquiring the existing name).**

## Sprint 6 — Proof of value (post-beta-gate) — done 2026-08-26

Tasks 23–26 of `docs/plans/Master-Stabilization-Plan.md`. Explicitly
post-beta per the plan (highest-leverage but not blocking beta).

**Task 23** (`qa-doctor impact [--since <ref>]`): compares the current
scan against a real prior commit. Materializes that commit's tree into
a temp directory via `git ls-tree -r` + `git show <ref>:<path>` per
file — deliberately walks git's own object model rather than shelling
out to `tar`/`unzip`, so this stays dependency-free beyond git itself
(already required by `--scope changed`). Re-runs the exact same rule
engine against the reconstructed tree, then diffs findings against the
current scan by a `ruleId+file+message` fingerprint — never by line
number, which shifts on every unrelated edit. **Hard honesty
constraint, verified by test:** the CI-minutes/engineer-hours-saved
field is always and only `UNKNOWN`, with an explicit explanation of
why it can't be computed — never an estimated number. The plan's own
required test (`reports UNKNOWN when data is absent`) passes.

**Task 24** (`qa-doctor baseline` / `qa-doctor diff`): `baseline`
snapshots the current finding set to `.qa-doctor/baseline.json`
(local by default, not gitignored — a team can commit it for a shared
baseline, a deliberate choice this command doesn't make for them).
`diff` compares the live scan against that snapshot and reports only
**new or worsened** debt — pre-existing findings are counted but never
re-reported as new, closing the exact gap Plan.md Phase 10 / plan §24
names: existing debt blocking every PR is what drives tools to be
disabled.

**Task 25** (PR feedback loop): audited the existing
`.github/workflows/qa-doctor.yml` before building on it, per the task's
own instruction — and found it was actually broken in two ways: an
`annotate` step referenced `github.rest.checks` without ever calling
it (a complete no-op — the "annotation" never did anything), and
findings only ever landed in a `qa-doctor.json` file inside the runner,
which no PR reviewer ever opens. Added `qa-doctor pr-comment`
(pure-function Markdown renderer, scoped to the baseline diff when one
exists) and rewrote the workflow to actually post/update a PR comment
via `actions/github-script`'s issues API, keyed on the render's own
idempotency marker so repeated pushes update one comment instead of
spamming new ones. Self-scanning my own first draft of this workflow
caught a real anti-pattern I'd just written: a `|| true` on the `diff`
step (QA-CI-002, "swallowed exit code") plus a redundant always-succeeds
tail step (QA-CI-008) — fixed per the rules' own documented advice
(`continue-on-error: true` on the specific step, remove the redundant
tail step) rather than suppressing either finding, since both were
mine and directly fixable, not legitimate exceptions. One `git checkout
... || echo "..."` fallback line for an intentionally-optional file
_is_ a legitimate exception (documented in `qa-doctor.config.json`'s
`ignore` list with reasoning, matching the project's established
suppression-with-justification pattern) — the difference: that `||`
branch never hides a test/build command's real pass/fail signal, it's
an informative fallback for a file that may legitimately not exist yet.
The parked npm-package-name issue (`qa-doctor@latest` resolving to an
unrelated package) is called out in a workflow comment, not hidden.

**Task 26** (`qa-doctor stats`): local-only, no telemetry (verified —
`tests/privacy-network-isolation.spec.ts` scans this file too, along
with every other new file this sprint). Accumulates strictly from what
`qa-doctor diff` has personally witnessed being resolved, ever — does
NOT attempt to reconstruct history from before tracking started,
because a finding disappearing from a scan could mean "fixed" or "the
file was deleted," and conflating those into one number would be
exactly the invented-precision this product exists to catch in other
tools. A repo with no recorded history reports an honest zero, not a
fabricated total.

**Real bug this sprint's own tests caught before shipping:** an
off-by-one in `runImpactCommand`'s argv filtering. `argv.indexOf("--since")`
returns `-1` when absent; the original code computed
`argv.filter((a, i) => i !== sinceIdx && i !== sinceIdx + 1)`
unconditionally, and `-1 + 1 === 0` — so whenever `--since` was NOT
passed, the filter silently dropped `argv[0]`, which is normally the
scan target path. A CLI usage-error test
(`runImpactCommand(["--bogus"], ...)` should return exit 10) instead
ran a real 17-second scan and returned exit 0, because `--bogus` had
been silently stripped, leaving an empty argv that defaulted the target
to `.`. Fixed by only applying the filter when `--since` is actually
present.

**Standing gate, verified green:** typecheck (both configs) exit 0;
lint clean; **90 files / 2244 tests passed**, 1 skipped, 3 tests
skipped; coverage 95.86% lines / 88.24% branches / 97.39% functions /
96.42% statements (all above the 95/88/96/95 thresholds); build
succeeds; golden lock byte-identical; self-scan gate 0 error-severity
findings (after fixing the two self-introduced findings above and
documenting the one legitimate exception).

**Known pre-existing condition, NOT introduced this sprint** (verified
by `git stash`-ing all Sprint 6 changes and re-running self-scan against
the exact prior commit): this repo's own self-scan reports **score: 0**
despite **0 error-severity findings** — confirmed present before any
Sprint 6 work. The `QA-PW` (21) and `QA-TEST` (15) dimension scores are
dragged down by warning/info-level findings concentrated in test files
that embed sample anti-pattern code as string literals for testing the
scanner itself (dogfooding noise, not real production bugs) — most of
this class is already suppressed via `qa-doctor.config.json`'s `ignore`
list for specific rule+path combinations, but evidently not
exhaustively for every file that contains such literals (e.g.
`tests/rule-branch-coverage-java-csharp.spec.ts`,
`tests/trust-upgrade.spec.ts` are not covered by the existing `tests/**`
suppression entries, which are scoped per-rule rather than blanket).
This is a real, pre-existing rough edge in the self-scan badge/score
story worth a future look — out of scope for Sprint 6's own task list,
recorded here rather than silently fixed mid-sprint or silently ignored.

**Not done in Sprint 6:** nothing outstanding from this sprint's own
task list (Tasks 23–26 and their full QA table are complete).

## Sprint 7 — Living docs and workflow integration — done 2026-08-26

Tasks 27–30 of `docs/plans/Master-Stabilization-Plan.md`.

**Task 27** (rule documentation generator, `npm run docs:rules`):
generates `docs/rules/<RULE-ID>.md` for all 78 registered rules plus an
index page, built directly on Sprint 5's `explainRule` machinery so
docs cannot drift from actual behavior — each page shows real detector
output from the rule's own must-fire fixture, confirms the must-not-fire
fixture correctly does not fire, and (when measured) real corpus
occurrence counts from Task 10's FP-audit baselines, UNKNOWN rather
than a fabricated zero when no corpus data exists for that rule. 100%
rule coverage enforced by test. **Real pre-existing bug found and
fixed while building this:** `renderCatalogMd` (the existing
`qa-doctor rules --md` command, shipped since Sprint 2) never escaped
`|` characters inside rule titles — QA-CI-002's real title is literally
`"Ignored exit code (|| true)"`, which silently broke that table row's
own markdown every time anyone ran the command. Fixed in both the
existing catalog renderer and the new generator, pinned with a
regression test on that exact rule so it can't silently reland.

**Task 28** (SARIF editor integration docs, `docs/SARIF-INTEGRATION.md`):
VS Code (SARIF Viewer extension) and JetBrains (native SARIF report
loading) setup instructions for the existing `--format sarif` output.
**Caught myself fabricating two claims while drafting this, before
either shipped:** an invented `--output` CLI flag that does not exist
anywhere in `parseArgs`, and a claim that GitHub Code Scanning upload
is "already wired into `ci.yml`" — verified false by grep (no
`upload-sarif` step exists in this repo's CI at all). Rewrote both
sections to be accurate: real shell-redirection syntax instead of the
invented flag, and the Code Scanning section reframed as "how to add
this yourself" rather than a false "already done" claim. Added a new
`docs-consistency.spec.ts` guard specifically for this document so
either fabrication class can't silently reland.

**Task 29** (README hero asset reproducibility): the committed
`assets/readme/terminal-hero.svg` was a hand-crafted, one-off SVG with
**no generator and no drift check** — and had, in fact, already
drifted for real: it was missing the "FIX THIS FIRST" section entirely
(shipped in Sprint 5, after the SVG was made) and showed stale
deduction numbers from before evidence-discount scoring landed. Added
`scripts/generate-readme-hero.ts` (`npm run docs:hero`), which renders
the SVG directly from `renderTerminal`'s real ANSI output against a
live scan of `examples/demo-repo` — parsing the actual ANSI SGR color
codes into SVG `<tspan fill>` elements, so the asset cannot drift from
real behavior because it IS real behavior, just recolored. Regenerated
the asset for real; `tests/hero-asset-reproducibility.spec.ts` asserts
every section header and every rule ID/message appearing in the
committed SVG matches what the current reporter actually produces for
that exact scan, closing the exact gap that let the old asset drift
silently for at least one full sprint.

**Task 30** (anti-pattern catalog content,
`src/commands/anti-pattern-catalog.ts`): extends Task 27's generated
pages with a fuller, mechanism-grounded "why this fails in production"
explanation for all 22 error-severity rules — exceeds the plan's own
"top 20" bar. **Deliberately does NOT implement two further ideas from
the plan's own source material** (Tier 1 #4): linking to GitHub
Discussions threads where users debate severity, and a video/GIF per
rule. The former would require fabricating citations to discussions
that do not exist for a pre-launch product; the latter is a production
asset genuinely outside what can be produced truthfully in this
context. Every claim in this content about GitHub Actions status-check
semantics (`continue-on-error`'s effect on job conclusion, a skipped
required check reporting "success," an always-succeed trailing step)
was verified against GitHub's own `actions/runner` ADR docs and
official GitHub Docs before being written — not asserted from memory —
and is cited by URL in the commit history for this change.

**Standing gate, verified green:** typecheck (both configs) exit 0;
lint clean; **93 files / 2455 tests passed**, 1 skipped, 3 tests
skipped; coverage 95.91% lines / 88.17% branches / 97.45% functions /
96.48% statements (all above the 95/88/96/95 thresholds); build
succeeds; golden lock byte-identical; self-scan gate 0 error-severity
findings.

**Not done in Sprint 7:** nothing outstanding from this sprint's own
task list (Tasks 27–30 and their full QA table are complete).

## Sprint 8 — Java/.NET Playwright parity — done 2026-08-26

Tasks 31–37 of `docs/plans/Master-Stabilization-Plan.md`. The largest
sprint by scope this session — 11 new rules, a real dependency bug
found and fixed, a genuinely new architecture layer built and tested,
and two real corpus-audit false positives found and fixed against real
OSS code.

**Task 31** (idiom-mapping spike, `docs/JAVA-CSHARP-IDIOM-MAPPING.md`):
done first, per the plan's own instruction — every rule's exact
Java/.NET syntax verified against the official Playwright API
references before a single regex was written. Two real, non-obvious
findings from that verification alone: **Java navigation is
`page.navigate(url)`, not `page.goto(url)`** like every other
Playwright language binding (JS, Python, C#) — a hardcoded-URL rule
copy-pasted from the JS/Python regex would have silently never fired on
a single real Java file. And both `tree-sitter-java.wasm` and
`tree-sitter-c_sharp.wasm` grammars were already present in the
existing `tree-sitter-wasms` dependency — Task 36 needed zero new
grammar dependencies, just a compatible runtime version (see Task 36).

**Task 32/33** (Java + C# core-family rules): QA-JV-106/107/108,
QA-CS-105/106/107/108 — brittle selectors, networkidle wait
(`LoadState.NETWORKIDLE`/`LoadState.NetworkIdle` enum constants,
verified against official docs, not Python's string-literal idiom),
hardcoded URL. C# also gets QA-CS-105 (`WaitForTimeoutAsync`),
completing the plan's own explicitly-named "same three plus
WaitForTimeoutAsync" set for C#.

**Task 34** (retry/flake masking, QA-JV-109/QA-CS-109):
framework-specific per the idiom spike's own finding — one regex
cannot honestly cover TestNG/JUnit or NUnit/xUnit. TestNG's first-class
`retryAnalyzer` and NUnit's first-class `[Retry(n)]` get
high-confidence/`deterministic-defect` detection; JUnit's
rerun-extension convention and xUnit's fragmented third-party-package
convention get medium-confidence/`heuristic-risk` detection instead of
claiming false parity with the stronger two.

**Task 35** (remaining layers, QA-JV-110/111/QA-CS-110/111): blanket
route mocking and absence-based a11y coverage, ported to the REAL,
verified Playwright a11y integrations —
`com.deque.html.axe-core:playwright`'s `new AxeBuilder(page).analyze()`
for Java, `Deque.AxeCore.Playwright`'s `page.RunAxe()` for .NET (both
confirmed against their official READMEs during this sprint's
research, not assumed from the JS package name). **Single-browser
matrix and failure-artifact config were assessed and deliberately NOT
ported**: Java/C# Playwright has no equivalent to a single
`playwright.config.ts` file — both languages are automation libraries
invoked directly from JUnit/TestNG/NUnit/xUnit, not TS-style
test-runner configs. Forcing a port onto a genuinely different
architecture would have produced a rule that's either always-false or
based on an invented convention — the same honesty-first call already
made for the sync/async-mix rule drop.

**Task 36** (tree-sitter WASM AST, `src/engine/tree-sitter-ast.ts`):
**corrects two real, previously-undetected false claims** found while
implementing this task — `src/adapters/python.ts`'s own header comment
says "First tree-sitter consumer. Uses web-tree-sitter (WASM)" and
`src/engine/adapter.ts`'s header says "Tree-sitter arrives in R2 with
Python, where it's actually required." **Neither is true** — grep
confirmed zero tree-sitter usage anywhere in `python.ts` or any Python
rule; every Python rule is pure regex over raw text, architecturally
identical to the Java/C# rules this sprint ported. This module is the
first real tree-sitter consumer in this codebase for any language, not
a port of an existing pattern; both stale comments are corrected.
**Found and fixed a second real, previously-undetected bug** while
building this: the already-installed `web-tree-sitter@^0.26.13`
(caret-ranged) cannot load `tree-sitter-wasms`'s prebuilt grammar files
at all — `Language.load()` throws inside `getDylinkMetadata` for every
grammar, reproduced directly. Verified `web-tree-sitter@0.25.6` loads
and parses both grammars correctly via an isolated scratch install
_before_ committing to the fix — not guessed. Pinned to that exact
verified-working version (no caret), with a dedicated regression test
guarding the pin itself so a future `npm install` can't silently
reintroduce the breakage. **Architectural scope decision, stated
honestly rather than worked around:** `web-tree-sitter`'s
`Parser.init()`/`Language.load()` are async, but this repo's entire
scan pipeline (`main()` → `runScan()` → every adapter's `runRules()` →
every rule's `run()`) is synchronous end-to-end with zero prior async
precedent anywhere. The new `parseJavaAst`/`parseCSharpAst` functions
are complete, real, and independently tested (parse real valid source,
tolerate malformed source via tree-sitter's own error-node recovery,
never throw) — but deliberately **not yet wired into the synchronous
rule engine**. That wiring requires converting the entire call chain to
async, a real, invasive change touching every existing rule and,
transitively, the golden lock across every language — it deserves its
own reviewed, standalone piece of work, not something to rush inside an
already-large sprint. The seam this module plugs into
(`ParsedFile.ast?: unknown`) already exists, unchanged, ready for that
follow-up.

**Task 37** (corpus audit, `microsoft/playwright-java` +
`microsoft/playwright-dotnet` — exactly the plan's own starting
proposal, library-suite caveat documented in each entry's note field):
ran the real, networked audit and **manually reviewed every finding
before committing baselines**, per the plan's own instruction — not
just recording numbers. This surfaced two more real, previously-
undetected false-positive bugs: **QA-JV-103** matched only a fixed
suffix list (`assertThat/True/False/Equals/NotNull/Throws`), missing
real JUnit/custom assertions (`assertArrayEquals`, `assertNotEquals`,
`assertNull`, `assertSame`, `assertJsonEquals`) — verified against real
`playwright-java` source, fixed with a generic `assert[A-Z]\w*\(`
pattern, real-world false positives eliminated 132 → 101. **QA-CS-103**
had no boundary after the `Test` alternative in its attribute regex,
so `[TestInitialize]`/`[TestCleanup]` (MSTest's setup/teardown
attributes, NOT test methods) matched as `[Test]` with extra
constructor arguments — verified against real `playwright-dotnet`
source (`BrowserSetup`/`BrowserTearDown` wrongly flagged as "tests with
no assertions"), fixed by requiring the attribute name to end exactly
at `Test`/`Fact`/`TestMethod`, real-world false positives eliminated
9 → 2 (the 2 remaining manually verified as reasonable edge cases, not
chased further). Both fixes pinned with regression tests reproducing
the exact real-world patterns found.

**Standing gate, verified green:** typecheck (both configs) exit 0;
lint clean; **95 files / 2731 tests passed**, 1 skipped, 3 tests
skipped; coverage 96.01% lines / 88.19% branches / 97.62% functions /
96.53% statements (all above the 95/88/96/95 thresholds); build
succeeds; golden lock byte-identical (unaffected — Java/C# rules never
touch the TS/JS golden fixtures); self-scan gate 0 error-severity
findings; **CI run `33008944946` confirmed fully green on all 3 OSes
plus self-scan.**

**Not done in Sprint 8:** single-browser-matrix and failure-artifact-config
rules for Java/C# — deliberately dropped per the architectural-mismatch
reasoning in Task 35 above, not an oversight. Tree-sitter AST parsing
is built and tested but not wired into the synchronous rule engine —
deliberately deferred per Task 36's reasoning above, a real follow-up
item, not a gap in this sprint's own stated scope.

## Conventions

- User communicates in Hebrew; artifacts in English.
- Tests must stay green before any phase is marked complete (`npm test`, `npm run typecheck`).
