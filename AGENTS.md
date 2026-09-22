# AGENTS.md

This document describes how to run CI locally, what each gate does, and available test commands.

## Running Full CI Locally

```bash
npm run ci
```

This runs the complete CI pipeline (lint → typecheck → build → test) — the same as the pre-push hook and GitHub Actions.

## Gates

| Gate           | Trigger      | Runs                                                              | Purpose                                                     |
| -------------- | ------------ | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| **pre-commit** | `git commit` | `lint-staged` (auto-fix staged `.ts/.js/.mjs` + `.json/.md/.yml`) | Fast; prevents dirty-lint commits from leaving your machine |
| **pre-push**   | `git push`   | `npm run ci` (lint + typecheck + build + test)                    | Catches all failures **before** GitHub sees them            |

## Hook Behavior

- **Pre-commit**: Runs `lint-staged` on staged files only. Auto-fixes Prettier formatting and ESLint issues. Does NOT run tests (too slow for every commit).
- **Pre-push**: Runs full `npm run ci`. If it fails, push is blocked. Use `git push --no-verify` to bypass in emergencies.

## Test Commands

| Command                 | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `npm test`              | Run all tests once (`vitest run`)                     |
| `npm run test:coverage` | Run tests with coverage report                        |
| `npm run test:watch`    | Run tests in watch mode                               |
| `npm run test:stress`   | Run stress/performance tests (opt-in, not in CI gate) |

## Build

```bash
npm run build
```

Runs tsdown bundling + workspace builds.

## Golden Files

```bash
npm run golden:update
```

Updates golden/test fixture files.

## Other Useful Commands

| Command             | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `npm run lint`      | Run ESLint + Prettier check                               |
| `npm run format`    | Auto-fix Prettier formatting                              |
| `npm run typecheck` | TypeScript type checking (main + test configs + fixtures) |
| `npm run self-scan` | Run Mjölnir self-scan on this repo                        |

## Notes

- Stress tests (`npm run test:stress`) are separate from the CI gate — they are opt-in performance tests.
- The pre-push hook runs `npm run ci` which mirrors `.github/workflows/ci.yml` exactly.
- ESLint config is in `eslint.config.mjs` (flat config, ESLint v10).

# Mjölnir — verification trust loop (AGENTS.md)

<!-- mjolnir:managed v2.0.0 -->

Run `npx mjolnir-qa@2.0.0 . --scope changed` before finishing any task that touched test code.

- Exit 0 = clean. Exit 1 = new findings on changed lines: fix them (smallest behavior-preserving change) or justify them to the user.
- npx mjolnir-qa@2.0.0 why <file>:<line> explains any finding (evidence level, measured FP rate, fix).
- npx mjolnir-qa@2.0.0 handoff renders a full remediation plan from a saved --json report.
- Agent loop: establish the before-state once with npx mjolnir-qa@2.0.0 baseline (commits .mjolnir/baseline.json); after fixing, npx mjolnir-qa@2.0.0 verify prints the before/after digest — resolved (per §15 lifecycle) / new / unchanged by ruleId+location, and the score delta. Exit 0 clean, 1 new errors, 2 partial or no baseline.
- NEVER suppress a finding merely to obtain a green scan (suppressions live in mjolnir.config.json, require a reason, and expire after 90 days).
- After fixing: re-run the scan, report files changed, report checks not run, report unresolved findings honestly.

## Agent safety contract (non-negotiable)

- NEVER declare trustworthiness without evidence. AGENT CLAIM ≠ VERIFICATION: a claim you did not verify with a fresh scan is not a result, it is a guess.
- NEVER manufacture, edit, or synthesize evidence. Evidence exists only as Mjölnir's own deterministic output (scan / verify / triage / forensics / trust-report).
- NEVER convert INCONCLUSIVE to pass. INCONCLUSIVE is integrity — insufficient evidence is recorded honestly, never laundered into success.
- NEVER suppress findings or weaken rules to get green. A green scan obtained by suppression is a false-green, not a fix.
- Loop preconditions: FIX requires a proven actionable defect; RESCAN requires changed-scope identification; PROOF requires fresh post-fix execution evidence. A "fixed" claim without rescan evidence is a contract violation.
- All agent actions stay auditable: report the commands you ran and their outputs; never summarize an unrun check as run.

<!-- /mjolnir:managed -->
