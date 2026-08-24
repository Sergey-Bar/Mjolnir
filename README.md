<div align="center">

# 🔬 QA Doctor

### Your tests are lying to you. We prove it.

**The quality scanner for QA engineers.** Audits test suites and CI pipelines,
reports a health score, and shows exactly where the trust breaks.

[![npm](https://img.shields.io/npm/v/qa-doctor.svg)](https://www.npmjs.com/package/qa-doctor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/node/v/qa-doctor.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-contributing)

`npx qa-doctor@latest`

[Quickstart](#-quickstart) · [Rules](#-the-rules) · [CI Integration](#-ci-integration) · [Contributing](#-contributing)

</div>

---

## Why

Green checkmarks lie.

Tests get skipped, focused, emptied of assertions. CI pipelines learn to
swallow failures with `|| true` and `continue-on-error`. Coverage numbers go
up while real verification goes down. And nobody notices — until production.

QA Doctor reads your test files and workflow definitions and tells you exactly
where the trust breaks:

```text
                 QA DOCTOR

             SCORE:  72 / 100

        ███████████████░░░░░░░

   Detected: vitest, playwright

   14 issues found (3 errors, 11 warnings)

   ✗ ERROR    Job "security-scan" has continue-on-error: true.
              .github/workflows/ci.yml:12
              FALSE-GREEN — this job can fail every day and CI stays green.

   ⚠ WARNING  Hard sleep: page.waitForTimeout(3000).
              e2e/checkout.spec.ts:88
              FLAKY-RISK — guesses at timing instead of waiting for state.
```

No config. No server. No telemetry. Runs locally in seconds.

## ⚡ Quickstart

```bash
npx qa-doctor@latest
```

That's it. Zero configuration — QA Doctor detects your frameworks, finds your
tests, and reports.

```bash
# Only findings introduced by YOUR changes (perfect for PRs):
npx qa-doctor@latest --scope changed

# Machine-readable output:
npx qa-doctor@latest --json

# GitHub Code Scanning integration:
npx qa-doctor@latest --format sarif > qa-doctor.sarif

# Playwright-only deep scan + Selector Health Score:
npx qa-doctor doctor:playwright
```

## 📋 The Rules

Every rule ships with must-fire **and** must-not-fire fixtures. A rule that
fires on its own negative fixture cannot ship. That's the false-positive firewall.

### Test Hygiene
| ID | Rule | Severity |
|---|---|---|
| QA-TEST-001 | Focused test committed (`.only`, `fit`) | error |
| QA-TEST-002 | Skipped test (`.skip`, `xit`) | warning |
| QA-TEST-003 | Test with no assertions | error |
| QA-TEST-004 | Hard sleep (`waitForTimeout`, `sleep()`) | warning |
| QA-TEST-006 | Retry abuse hiding flakiness | warning |
| QA-TEST-010 | Empty test body | error |

### Test Quality
| ID | Rule | Severity |
|---|---|---|
| QA-TQUAL-001 | Mock-only verification | warning |
| QA-TQUAL-002 | Tautological assertion | error |
| QA-TQUAL-009 | Unawaited promise assertion | error |
| QA-TQUAL-011 | Commented-out tests | warning |

### Playwright 🎭
| ID | Rule | Severity |
|---|---|---|
| QA-PW-002 | Unawaited locator assertion | error |
| QA-PW-003 | `page.pause()` / `test.only()` committed | error |
| QA-PW-004 | Brittle CSS/XPath selectors | warning |
| QA-PW-005 | Business logic inside `page.evaluate()` | warning |
| QA-PW-114 | Legacy element handles (`page.$`) | warning |
| QA-PW-118 | `networkidle` waits (flaky by design) | warning |
| QA-PW-123 | Hardcoded environment URLs | warning |

### CI Integrity
| ID | Rule | Severity |
|---|---|---|
| QA-CI-001 | `continue-on-error` masks failures | error |
| QA-CI-002 | `\|\| true` swallows exit codes | error |
| QA-CI-005 | Report consumed but never generated | error |
| QA-CI-007 | Retry wrappers around tests | warning |
| QA-CI-008 | Always-success step masks failures | error |

### Python / pytest 🐍
| ID | Rule | Severity |
|---|---|---|
| QA-PY-002 | Skipped test (`skip`, non-strict `xfail`) | warning |
| QA-PY-003 | Test function with no assertions | error |
| QA-PY-005 | `time.sleep()` in tests | warning |
| QA-PY-006 | Empty test body (`pass`) | error |
| QA-PY-010 | Random/time dependence without freeze | warning |
| QA-PY-012 | Tautological assertion | error |

## 🎭 Selector Health Score

The headline metric for Playwright suites — how resilient your locators are:

```text
SELECTOR HEALTH — checkout.spec.ts

  ████████████████░░░░░░  72 / 100
  role/text: 18 · testid: 4 · css-chains: 2 ⚠ · xpath: 0
```

Role-based locators score full credit. CSS class chains and XPath tank the
score — they break on any DOM refactor without telling you which behavior
regressed.

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
│   └── integrations/    # CI workflow generator
└── tests/
    ├── fixtures/        # must-fire / must-not-fire per rule
    └── golden/          # frozen score regression locks
```

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

New rules are the easiest first contribution — the fixture harness walks you
through it:

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

</div>
