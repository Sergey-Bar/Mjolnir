# QA Doctor — Copilot Instructions

## Project

`qa-doctor/` is a linter-grade QA scanner (TypeScript, ESM, Node >= 22.18). `npx qa-doctor` → score + findings → `--scope changed` → `ci install`. React Doctor clone model.

## Frozen contracts — NEVER change without explicit user approval

- JSON report contract: `schemaVersion: 1`
- Exit codes: `0` success, `1` findings, `2` usage error, `10` no tests found, `20` internal error
- Rule IDs are immutable once shipped (`QA-<FAMILY>-NNN`)

## Laws

1. **Anti-creep law:** every addition to the launch set requires an equal-size removal.
2. **Fixture firewall:** every rule MUST have fixtures that must-fire AND must-not-fire (`tests/fixtures/<RULE-ID>/`). A rule without both fixture classes is not done.
3. **North-star metric:** false-proof rate ≈ 0. Never weaken a must-not-fire fixture to make tests pass.

## Conventions

- Rules live in `src/rules/<family>/qa-<fam>-NNN-name.ts`; every new rule MUST be registered in `src/rules/index.ts`.
- Engine is regex/text-based; the `ast?: unknown` seam exists in adapters but is unpopulated for test files (Upgrade-Plan-v2 R1 will refactor this).
- Tests: Vitest. Run `npm test` in `qa-doctor/`. Golden lock via `tests/golden/` — update only with `npm run golden:update` and explicit intent.
- Build: `npm run build` (tsdown). Typecheck: `npm run typecheck`.
- Do NOT touch files under `node_modules/`, `dist/`, or root-level `scan-*.{json,txt,sarif}` scratch outputs.

## Current state (audited 2026-08-24)

- 19 rule files, 17 registered; orphan rules awaiting registration: retryAbuse (QA-TEST-006), retryMasking (QA-CI-007).
- ts-morph + yaml deps installed but unused; `parseMinimalWorkflow` is a naive placeholder in `cli.ts`.
- Next milestone: Upgrade-Plan-v2 R1 (LanguageAdapter refactor) → R2 (Python adapter) → R3 (Playwright Deep Mode).

## Communication

- User communicates in Hebrew; code, docs, and plans in English.
