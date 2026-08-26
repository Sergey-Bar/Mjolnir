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

Remaining known gaps: `@qa-doctor/playwright-reporter` package, Python FP
audit, Legendary tiers 2/4 items (plugin API, roast mode, Mermaid output).

Full audit trail: see status markers added throughout
`docs/plans/Implementation-Master-Plan.txt` and `docs/plans/Upgrade-Plan-v2.txt`.

## Conventions

- User communicates in Hebrew; artifacts in English.
- Tests must stay green before any phase is marked complete (`npm test`, `npm run typecheck`).
