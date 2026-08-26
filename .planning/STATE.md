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

## Conventions

- User communicates in Hebrew; artifacts in English.
- Tests must stay green before any phase is marked complete (`npm test`, `npm run typecheck`).
