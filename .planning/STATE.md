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

## Conventions

- User communicates in Hebrew; artifacts in English.
- Tests must stay green before any phase is marked complete (`npm test`, `npm run typecheck`).
