<div align="center">

```
  ██████╗  █████╗      ██████╗  ██████╗  ██████╗████████╗ ██████╗ ██████╗
 ██╔═══██╗██╔══██╗    ██╔═══██╗██╔═══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗
 ██║   ██║███████║    ██║   ██║██║   ██║██║        ██║   ██║   ██║██████╔╝
 ██║▄▄ ██║██╔══██║    ██║▄▄▄██║██║   ██║██║        ██║   ██║   ██║██╔══██╗
 ╚██████╔╝██║  ██║    ╚██████╔╝╚██████╔╝╚██████╗   ██║   ╚██████╔╝██║  ██║
  ╚══▀▀═╝ ╚═╝  ╚═╝     ╚══▀▀═╝  ╚══▀▀═╝  ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
```

### Your tests are lying to you. We prove it.

**The quality scanner for QA engineers.** Audits test suites and CI pipelines,
reports a health score, and shows exactly where the trust breaks.

[![npm](https://img.shields.io/npm/v/qa-doctor.svg?style=for-the-badge&color=39FF14&label=npm&labelColor=0D0D0D)](https://www.npmjs.com/package/qa-doctor)
[![downloads](https://img.shields.io/npm/dm/qa-doctor.svg?style=for-the-badge&color=39FF14&label=downloads&labelColor=0D0D0D)](https://www.npmjs.com/package/qa-doctor)
[![license](https://img.shields.io/badge/license-MIT-39FF14.svg?style=for-the-badge&labelColor=0D0D0D)](LICENSE)
[![node](https://img.shields.io/node/v/qa-doctor.svg?style=for-the-badge&color=39FF14&labelColor=0D0D0D)](https://nodejs.org)
[![status](https://img.shields.io/badge/status-●_ONLINE-39FF14.svg?style=for-the-badge&labelColor=0D0D0D)](#-quickstart)

```bash
npx qa-doctor@latest
```

[Quickstart](#-quickstart) · [Rules](#-the-rules) · [Selector Health](#-selector-health-score) · [Runtime Evidence](#-runtime-evidence) · [CI Integration](#-ci-integration) · [Contributing](#-contributing)

<br>

<img src="assets/readme/terminal-hero.svg" alt="qa-doctor scan report — SCORE 72/100 NEEDS WORK, error on QA-CI-001 continue-on-error, warning on QA-TEST-004 hard sleep" width="720">

<sub>Real scan output, not a mockup — run it on your own repo above.</sub>

</div>

---

## ▓▓▓ At a glance

|     |                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------- |
| 🩺  | **Health score** — one number, transparent deduction table, no black box                                    |
| 🎭  | **Selector Health Score** — grades your Playwright locators, not just your pass rate                        |
| 🔬  | **Runtime forensics** — reads real Playwright/JUnit run data to catch `TRUE-FLAKE`, not just static guesses |
| 🚨  | **CI-integrity rules** — catches `continue-on-error`, `\|\| true`, and other false-green tricks             |
| 🐍  | **Multi-language** — TypeScript/Playwright and Python/pytest today, one adapter away from more              |
| 🔒  | **Local-first** — zero network calls while scanning, zero telemetry, runs in seconds                        |

---

## » Not another linter

ESLint checks your code's _syntax_. Coverage checks whether a line _executed_.
Neither one checks whether the test that ran actually _proved_ anything.
QA Doctor is the layer underneath both:

|                                                            | ESLint / SonarQube | Coverage tools | Manual review | **QA Doctor** |
| ---------------------------------------------------------- | :----------------: | :------------: | :-----------: | :-----------: |
| Catches syntax & style bugs                                |         ✅         |       ❌       |   ✅ (slow)   |       —       |
| Flags tests with no real assertions                        |         ❌         |       ❌       |   sometimes   |      ✅       |
| Catches CI false-greens (`\|\| true`, `continue-on-error`) |         ❌         |       ❌       |    rarely     |      ✅       |
| Reads **real** run data for `TRUE-FLAKE` verdicts          |         ❌         |       ❌       |      ❌       |      ✅       |
| Grades Playwright locator resilience                       |         ❌         |       ❌       |    rarely     |      ✅       |
| Runs in seconds, zero network calls                        |         ✅         |       ✅       |       —       |      ✅       |

## Why

Green checkmarks lie.

Tests get skipped, focused, emptied of assertions. CI pipelines learn to
swallow failures with `|| true` and `continue-on-error`. Coverage numbers go
up while real verification goes down.

And nobody notices — until production. QA Doctor reads your test files and
workflow definitions and tells you exactly where the trust breaks.

No config. No server. No telemetry. Runs locally in seconds.

## ⚡ Quickstart

```bash
npx qa-doctor@latest
```

That's it. Zero configuration — QA Doctor detects your frameworks, finds your
tests, and reports.

| Command                                                 | What it does                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| `npx qa-doctor@latest --scope changed`                  | Only findings introduced by **your** changes — perfect for PRs |
| `npx qa-doctor@latest --json`                           | Machine-readable output                                        |
| `npx qa-doctor@latest --format sarif > qa-doctor.sarif` | GitHub Code Scanning integration                               |
| `npx qa-doctor doctor:playwright`                       | Playwright-only deep scan + Selector Health Score              |
| `npx qa-doctor forensics ./test-results/`               | Runtime evidence — retries, true flakes, `FLAKY.md` artifact   |
| `npx qa-doctor triage ./test-results/`                  | The flaky-triage meeting, in 10 minutes instead of 45          |
| `npx qa-doctor fix --dry-run` / `fix`                   | Safe auto-fixes with proof (dry-run first)                     |
| `npx qa-doctor debt`                                    | Test debt register — presentable to management                 |
| `npx qa-doctor handover`                                | New-QA-onboarding map of the suite                             |
| `npx qa-doctor pw-report ./test-results/`               | Playwright run summary — retries / flakes / slowest            |
| `npx qa-doctor badge`                                   | Evidentiary badge (shields.io endpoint JSON)                   |
| `npx qa-doctor doctor`                                  | Self-audit — prove QA Doctor's own rule base is healthy        |
| `npx qa-doctor rules` / `rules --md`                    | Rule catalog with trust metadata (JSON or markdown)            |

## 📋 The Rules

Every rule ships with must-fire **and** must-not-fire fixtures. A rule that
fires on its own negative fixture cannot ship. That's the false-positive
firewall.

<details>
<summary><strong>Test Hygiene</strong></summary>

| ID          | Rule                                                | Severity |
| ----------- | --------------------------------------------------- | -------- |
| QA-TEST-001 | Focused test committed (`.only`, `fit`)             | error    |
| QA-TEST-002 | Skipped test without justification                  | error    |
| QA-TEST-002 | Skipped test with tracked justification             | warning  |
| QA-TEST-003 | Test with no assertions                             | error    |
| QA-TEST-004 | Hard sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Retry abuse hiding flakiness                        | warning  |
| QA-TEST-010 | Empty test body                                     | error    |

</details>

<details>
<summary><strong>Test Quality</strong></summary>

| ID           | Rule                        | Severity |
| ------------ | --------------------------- | -------- |
| QA-TQUAL-001 | Mock-only verification      | warning  |
| QA-TQUAL-002 | Tautological assertion      | error    |
| QA-TQUAL-009 | Unawaited promise assertion | error    |
| QA-TQUAL-011 | Commented-out tests         | warning  |

</details>

<details>
<summary><strong>Playwright 🎭</strong></summary>

| ID        | Rule                                     | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-PW-002 | Unawaited locator assertion              | error    |
| QA-PW-003 | `page.pause()` / `test.only()` committed | error    |
| QA-PW-004 | Brittle CSS/XPath selectors              | warning  |
| QA-PW-005 | Business logic inside `page.evaluate()`  | warning  |
| QA-PW-114 | Legacy element handles (`page.$`)        | warning  |
| QA-PW-118 | `networkidle` waits (flaky by design)    | warning  |
| QA-PW-123 | Hardcoded environment URLs               | warning  |

</details>

<details>
<summary><strong>CI Integrity</strong></summary>

| ID        | Rule                                                              | Severity |
| --------- | ----------------------------------------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` masks failures                                | error    |
| QA-CI-002 | `\|\| true` swallows exit codes                                   | error    |
| QA-CI-005 | Report consumed but never generated                               | error    |
| QA-CI-007 | Retry wrappers around tests                                       | warning  |
| QA-CI-008 | Always-success step masks failures                                | error    |
| QA-CI-009 | Test exit code not propagated (`\|` without pipefail, `;` chains) | error    |
| QA-CI-010 | Tests skipped where they must block (skip-on-PR guards)           | error    |

</details>

<details>
<summary><strong>Python / pytest 🐍</strong></summary>

| ID        | Rule                                      | Severity |
| --------- | ----------------------------------------- | -------- |
| QA-PY-002 | Skipped test (`skip`, non-strict `xfail`) | warning  |
| QA-PY-003 | Test function with no assertions          | error    |
| QA-PY-005 | `time.sleep()` in tests                   | warning  |
| QA-PY-006 | Empty test body (`pass`)                  | error    |
| QA-PY-010 | Random/time dependence without freeze     | warning  |
| QA-PY-012 | Tautological assertion                    | error    |

</details>

> The full live catalog — every rule with confidence, false-positive risk,
> and autofix availability — is generated from the registry:
>
> ```bash
> npx qa-doctor rules --md
> ```

## 🎭 Selector Health Score

The headline metric for Playwright suites — how resilient your locators are:

```text
▚▞ SELECTOR HEALTH — checkout.spec.ts

  [████████████████░░░░░░]  72 / 100
  role/text: 18 · testid: 4 · css-chains: 2 ⚠ · xpath: 0
```

Role-based locators score full credit. CSS class chains and XPath tank the
score — they break on any DOM refactor without telling you which behavior
regressed.

## 🔍 Runtime Evidence

Static flakiness detection is guessing. QA Doctor reads **real execution
data** — Playwright JSON reports and JUnit XML from any runner:

```bash
npx qa-doctor forensics ./test-results/
```

```text
▚▞ FLAKINESS LEADERBOARD

3 tests · 1 failed · 1 flaky · 1 retried

TRUE-FLAKE checkout (pay.spec.ts)
           ██████████░░░░░░░░░░░ 4.5s · 2 attempts
```

A test that passes only on attempt ≥ 2 is not a passing test — it's a lucky
test. It gets flagged `TRUE-FLAKE` regardless of the final green checkmark.

`triage` turns the same data into `TRIAGE.md` — the artifact that ends the
weekly flaky-test meeting. Quarantine proposals are deterministic:
retried ≥ 2 and failed at least once.

## 🤖 CI Integration

One command generates a PR workflow — advisory by default, never blocking:

```bash
npx qa-doctor ci install
```

Or wire it into GitHub Code Scanning natively via SARIF:

```yaml
- run: npx qa-doctor@latest --format sarif > qa-doctor.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: qa-doctor.sarif
```

## 🧠 Principles

- **Local-first** — zero network calls during scanning. Ever.
- **No false proof** — we'd rather say "unknown" than "verified". An empty
  repo gets `score: null`, never a fake 100.
- **Transparent scoring** — public deduction constants: error −8, warning −3,
  info −1. No black box.
- **Partial honesty** — if analysis was cut short, the output says so.
  Never "complete" when it isn't.
- **QA-native language** — findings speak your vocabulary:
  `FALSE-GREEN`, `FLAKY-RISK`, `BLOCKS-RELEASE`, `HYGIENE`.

## 🏗️ Architecture

<details>
<summary>Expand tree</summary>

```
qa-doctor/
├── src/
│   ├── engine/          # LanguageAdapter interface + rule runner
│   ├── adapters/        # typescript · python · github-actions
│   ├── rules/           # 28 deterministic rules across 5 families
│   ├── playwright/      # Selector Health Score engine
│   ├── discovery/       # workspace, frameworks, safe-YAML parser
│   ├── scope/           # git merge-base changed-scope engine
│   ├── scorer/          # transparent deduction table
│   ├── reporter/        # terminal · JSON · SARIF 2.1
│   ├── forensics/       # run-data ingestion · flake verdicts · triage
│   ├── commands/        # fix · badge · debt · handover · init · create-rule · doctor · rules-catalog
│   └── integrations/    # CI workflow generator
└── tests/
    ├── fixtures/        # must-fire / must-not-fire per rule
    └── golden/          # frozen score regression locks
```

</details>

Multi-language by design: adding a language = one adapter + its rules.
Python is live; Java, Go, and C# adapters follow the same path.

## 📦 Install

```bash
# Run directly (recommended):
npx qa-doctor@latest

# Or install globally:
npm i -g qa-doctor
```

Requires Node.js ≥ 20. Works on Windows, macOS, and Linux.

## 🤝 Contributing

New rules are the easiest first contribution — one command scaffolds
everything (anti-creep law enforced by the fixture harness):

```bash
npx tsx src/cli.ts create-rule QA-PW-140 --title "Screenshot without diff bound"
```

That generates the rule file plus must-fire AND must-not-fire fixture
skeletons. The generated rule intentionally fails its fixtures until you
implement real detection — a stub cannot ship.

Manual path:

1. Fork + clone, `npm install`
2. Copy any rule folder under `src/rules/` as a template
3. Add must-fire AND must-not-fire fixtures under `tests/fixtures/<YOUR-ID>/`
4. `npx vitest run` — both directions green? Ship the PR.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## ⭐ About

Built for QA engineers who are tired of defending releases with numbers
they can't trust.

If this saved you from a fake-green release, consider starring the repo —
it helps other QAs find it.

<div align="center">

**Star ⭐ · Watch 👀 · Contribute 🤝**

Baked with ❤️ by [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
