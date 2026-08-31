# Getting started

Mjölnir (`mjolnir-qa` on npm) audits your test suite and CI pipelines, then
reports a single worthiness score plus prioritized findings — each with a
rule ID, a location, and a fix.

## Install

Run it with no install:

```bash
npx mjolnir-qa@latest
```

Or install globally:

```bash
npm i -g mjolnir-qa
```

Requires Node.js ≥ 22.18. Works on Windows, macOS, and Linux.

## Core commands

| Command                             | What it does                                     |
| ----------------------------------- | ------------------------------------------------ |
| `mjolnir`                           | Full-repo scan + worthiness score                |
| `mjolnir --scope changed`           | Only what your branch introduced — the CI form   |
| `mjolnir ci install`                | Generate the advisory PR workflow                |
| `mjolnir explain QA-CI-001`         | What / why / fix + measured FP rate for one rule |
| `mjolnir rules --unmeasured`        | The rules running on assumption, not measurement |
| `mjolnir --json` / `--format sarif` | Machine-readable / GitHub Code Scanning          |
| `mjolnir --strict`                  | Also run quarantine-tier rules (higher FP risk)  |

### When something's flaky

| Command                             | What it does                                        |
| ----------------------------------- | --------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Real run data → `TRUE-FLAKE` verdicts, `FLAKY.md`   |
| `mjolnir triage ./test-results/`    | Quarantine proposal from execution history          |
| `mjolnir pw-report ./test-results/` | Playwright run summary — retries / flakes / slowest |
| `mjolnir doctor:playwright`         | Playwright-only deep scan + Selector Health Score   |

## One finding, up close

```text
▚▞ QA-CI-001 — continue-on-error masks a failing verification gate

Severity:    error
Confidence:  high
Evidence:    E2

WHAT WAS FOUND
  Job `security-scan` runs a verification gate under `continue-on-error: true`.

WHY IT MATTERS
  This job can fail every day and CI will still show green. The checkmark
  on this workflow cannot be trusted.

HOW TO FIX
  Remove continue-on-error, or scope it to individual non-blocking steps only.
```

That is the unit of value: not a style nit, but a place where your CI is
telling you something passed when it didn't.
