# Backlog Triage — Merge Decision Record

Date: 2026-09-22
Scope: 46 remote branches not merged into `main` (no open GitHub PRs exist;
the backlog is branch-based, so triage = rebase-and-merge, not PR review).

## Merge order (dependency-first, smallest first)

### Train 1 — small scoped branches (merge first)

| Branch                                  | Commits | Behind | Disposition                     |
| --------------------------------------- | ------- | ------ | ------------------------------- |
| `codex/mvp-003-help-spacing`            | 2       | 6      | MERGE                           |
| `codex/mvp-004-ci-install-messaging`    | 9       | 6      | MERGE                           |
| `codex/mvp-005-fix-this-first-report`   | 4       | 6      | MERGE                           |
| `codex/mvp-006-next-actions`            | 1       | 6      | MERGE                           |
| `codex/mvp-007-explain-review-language` | 2       | 6      | MERGE                           |
| `codex/mvp-008-demo-path`               | 9       | 6      | MERGE                           |
| `codex/mvp-009-clean-unknown`           | 10      | 6      | MERGE                           |
| `codex/fix-npm-oidc-upgrade`            | 3       | 18     | MERGE (verify no CHANGELOG dup) |
| `codex/fix-pack-audit-path-comment`     | 1       | 18     | MERGE (verify no CHANGELOG dup) |
| `codex/extract-install-fix`             | 1       | 4      | MERGE                           |
| `m2`–`m14` milestone singles            | 1 each  | 4      | MERGE (13 branches)             |

### Train 2 — feature trains (merge after Train 1)

| Branch                             | Commits | Disposition |
| ---------------------------------- | ------- | ----------- |
| `codex/core-117-false-green`       | 11      | MERGE       |
| `codex/core-151-noise-budget`      | 12      | MERGE       |
| `codex/core-178-diagnostics`       | 13      | MERGE       |
| `codex/core-186-ux-design`         | 14      | MERGE       |
| `codex/core-187-html-report`       | 15      | MERGE       |
| `codex/core-189-onboarding`        | 16      | MERGE       |
| `codex/core-191-wow-path`          | 17      | MERGE       |
| `codex/core-193-screenshot`        | 18      | MERGE       |
| `codex/core-198-zero-config`       | 19      | MERGE       |
| `codex/core-206-install-smoke`     | 20      | MERGE       |
| `codex/core-210-no-findings-proof` | 21      | MERGE       |
| `codex/core-211-support-bundle`    | 22      | MERGE       |
| `milestone-m4-m6-combined`         | 4       | MERGE       |
| `milestone-m10-m13`                | 4       | MERGE       |
| `feat/ws-0-and-forensics`          | 14      | MERGE       |
| `train1/engine-production-trust`   | 14      | MERGE       |

### Train 3 — drop (superseded / dead / stale)

| Branch                             | Commits | Behind | Reason                            |
| ---------------------------------- | ------- | ------ | --------------------------------- |
| `codex/qa-doctor`                  | 0       | 0      | superseded by rebrand; main-based |
| `codex/harden-qa-gates`            | 0       | 0      | superseded; main-based            |
| `fix/review-trust-completion`      | 0       | 0      | superseded; main-based            |
| `release/v1.1.1`                   | 1       | 19     | stale release branch, pre-2.0     |
| `mvp-003-help-spacing`             | 1       | 17     | superseded by `codex/mvp-003-*`   |
| `mvp-004-ci-install-messaging`     | 1       | 17     | superseded by `codex/mvp-004-*`   |
| `mvp-004-ci-install-messaging-fix` | 5       | 6      | superseded by `codex/mvp-004-*`   |
| `codex/fix-npm-oidc-upgrade`       | 3       | 18     | see Train 1 — verify first        |

## Per-merge guardrails

For every branch merged: `npm run docs:regen && git diff --exit-code` and
`npm run changelog:check` must pass, otherwise the merge is reverted and
the branch is re-triaged.

## Frozen contracts hold during the train

- `schemaVersion: 1`, exit codes `0/1/2/10/20`, rule IDs are immutable
  (`CONTRIBUTING.md:268`).
- Anti-creep law: every rule addition requires an equal-size removal
  (`CORE_CAP = 65`, `src/commands/doctor.ts`).
- No `mjolnir.config.json` suppression merge without written justification
  (`CONTRIBUTING.md:264`).

## After the train

Re-cut all remaining branches from the new `main` (`git rebase main`),
re-run `npm run ci-local` on each, and re-merge. Then release per
`docs/PUBLISHING.md`.
