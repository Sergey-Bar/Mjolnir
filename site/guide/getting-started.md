# Getting started

QA Doctor (`qa-doctor-cli` on npm) audits your test suite and CI pipelines, then
reports a single test health score plus prioritized findings — each with a
rule ID, a location, and a fix.

## Install

Run it with no install:

```bash
npx qa-doctor-cli@latest
```

Or install globally:

```bash
npm i -g qa-doctor-cli
```

Requires Node.js ≥ 22.18. Works on Windows, macOS, and Linux.

**Why ≥ 22.18?** The build toolchain sets the floor — tsdown targets
Node 22.18, and that is the oldest runtime the release pipeline
compiles and smoke-tests against; the runtime dependencies themselves
have no such requirement.

## GitHub Action

The Marketplace action runs the same scan from any workflow:

```yaml
- uses: Sergey-Bar/qa-doctor@v1
  with:
    scope: changed
    fail-on: error
```

Pin `@v1` to follow the major line, or an exact tag (`@v0.5.32`) for a
reproducible gate; `qa-doctor ci install` writes a workflow that does
this for you (plain `npx` instead, with `--no-action`).

## Core commands

| Command                               | What it does                                     |
| ------------------------------------- | ------------------------------------------------ |
| `qa-doctor`                           | Full-repo scan + test health score               |
| `qa-doctor --scope changed`           | Only what your branch introduced — the CI form   |
| `qa-doctor ci install`                | Generate the advisory PR workflow                |
| `qa-doctor explain QA-CI-001`         | What / why / fix + measured FP rate for one rule |
| `qa-doctor rules --unmeasured`        | The rules running on assumption, not measurement |
| `qa-doctor --json` / `--format sarif` | Machine-readable / GitHub Code Scanning          |
| `qa-doctor --strict`                  | Also run quarantine-tier rules (higher FP risk)  |

### When something's flaky

| Command                               | What it does                                        |
| ------------------------------------- | --------------------------------------------------- |
| `qa-doctor forensics ./test-results/` | Real run data → `TRUE-FLAKE` verdicts, `FLAKY.md`   |
| `qa-doctor triage ./test-results/`    | Quarantine proposal from execution history          |
| `qa-doctor pw-report ./test-results/` | Playwright run summary — retries / flakes / slowest |
| `qa-doctor doctor:playwright`         | Playwright-only deep scan + Selector Health Score   |

## One finding, up close

```text
▍▞ QA-CI-001 — continue-on-error masks a failing verification gate

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
