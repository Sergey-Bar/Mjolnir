# Flake ledger & quarantine policy

Status: **zero known-flaky tests.** This page is the ledger behind that
claim and the policy that keeps it true (Beta-to-Stable 1.0 plan, M3).

## The policy

- `retries` stays **off** by default in vitest and in CI. A retry budget
  hides a flake behind a green check; we prefer the red.
- Any flake observed in CI (same commit, different result) gets a
  tracking issue labeled `flake` **the same day**.
- Fix-or-quarantine within **one week**: either the root cause is fixed
  and the fix verified by re-running the job, or the test is quarantined
  (skipped with a `TODO(flake:<issue>)` comment naming the issue) — a
  quarantined test that is not fixed within the week is deleted.
- **Zero known-flaky tests at 1.0.** The cutover checklist requires this
  page to show an empty open-flakes table.

## Known infra-flake classes (observed, documented, not test flakes)

These are environmental failures recorded here because they already
occurred; each has a mitigation that keeps the job green without hiding
a test problem:

| Date       | Class                                                            | Occurrence                  | Mitigation                                                          |
| ---------- | ---------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| 2026-09-04 | npm registry 503 on `npm audit` (windows runner)                 | commit `e4f4b98` re-trigger | `npm audit` retries once in CI; two consecutive failures still gate |
| 2026-09-04 | coverage-run timeouts at the 5s floor under instrumentation load | local observation, M2       | coverage step already runs with `--testTimeout=120000`              |

## Open flakes

None. (This table is intentionally empty — keep it that way.)

## Closed flakes

None recorded since this ledger exists. New entries go above, with the
issue link and the resolution.
