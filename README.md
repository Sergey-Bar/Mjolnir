<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Your tests are lying to you. We prove it.

**Verification Trust Engine for QA.** Audits test suites and CI pipelines,
reports a worthiness score, and shows exactly where trust breaks.

[![license](https://img.shields.io/badge/license-MIT-B45309.svg?style=flat-square&labelColor=0D0D0D)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-146A8C.svg?style=flat-square&labelColor=0D0D0D)](https://nodejs.org)
[![status](https://img.shields.io/badge/status-●_ONLINE-15803D.svg?style=flat-square&labelColor=0D0D0D)](#-quickstart)

```bash
npx mjolnir-qa@latest
```

**Are your tests worthy of trust?**

[Quickstart](#-quickstart) · [Rules](#-the-rules) · [Selector Health](#-selector-health-score) · [Runtime Evidence](#-runtime-evidence) · [CI Integration](#-ci-integration) · [Contributing](#-contributing)

</div>

---

## 🔨 What is Mjölnir?

|     |                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Worthiness Score** — one number, transparent deduction table, no black box                                   |
| 🎭  | **Selector Health Score** — grades your Playwright locators, not just your pass rate                           |
| 🔬  | **Runtime forensics** — reads real Playwright/JUnit run data to catch `TRUE-FLAKE`, not just static guesses    |
| 🚨  | **CI-integrity rules** — catches `continue-on-error`, `\|\| true`, and other false-green tricks                |
| 🐍  | **Multi-language** — TypeScript/Playwright, Python/pytest, Java, and C#/.NET today, one adapter away from more |
| 🔒  | **Local-first** — zero network calls while scanning, zero telemetry, runs in seconds                           |

---

## ⚡ Mjölnir is not another linter

Linters tell you whether code follows rules.
Mjölnir tells you whether your verification can be trusted.

|                                                          | ESLint / SonarQube | Coverage tools | Manual review | **Mjölnir** |
| -------------------------------------------------------- | :----------------: | :------------: | :-----------: | :---------: |
| CI workflow integrity (`continue-on-error`, `\|\| true`) |         ❌         |       ❌       |    rarely     |     ✅      |
| Cross-language (TS, Python, Java, C#) from one tool      |         ❌         |       ❌       |      ❌       |     ✅      |
| Grades Playwright locator resilience (Selector Health)   |         ❌         |       ❌       |    rarely     |     ✅      |
| Flags tests with no real assertions                      |   ✅ (plugin)\*    |       ❌       |   sometimes   |     ✅      |
| Catches hard sleeps (`waitForTimeout`, `time.sleep`)     |   ✅ (plugin)\*    |       ❌       |   sometimes   |     ✅      |
| Runs in seconds, zero network calls while scanning       |         ✅         |       ✅       |       —       |     ✅      |

\*`eslint-plugin-jest` (`expect-expect`) and `eslint-plugin-playwright` (`expect-expect`, `no-wait-for-timeout`) cover these for their respective frameworks.

**Runtime Analysis** — a separate category from static linting:

|                                               | Playwright retry reporter | Allure / ReportPortal | **Mjölnir forensics** |
| --------------------------------------------- | :-----------------------: | :-------------------: | :-------------------: |
| Reads real run data for `TRUE-FLAKE` verdicts |            ❌             |     partial (tag)     |          ✅           |
| Flaky-triage report from execution history    |            ❌             |          ✅           |          ✅           |
| Integrates with static worthiness score       |            ❌             |          ❌           |          ✅           |

---

## 🤖 Why not just use AI code review?

AI reviewers are powerful — but they're expensive, intermittent, and reactive.
Mjölnir is cheap, continuous, and structural. They complement each other, but
only one of them catches the `continue-on-error` that's been silently hiding
failures since the repo was created.

|                                       | AI code review (Copilot, etc.) |         **Mjölnir**         |
| ------------------------------------- | :----------------------------: | :-------------------------: |
| Cost per scan                         | Tokens (scales with diff size) | **Zero** (local, installed) |
| Sees the whole suite + all CI configs |  Only the PR diff you show it  | **Everything, every time**  |
| Deterministic (same input → same out) |     ❌ (non-deterministic)     |           **✅**            |
| Catches patterns dormant for months   |  Only if it's in the context   |  **✅** (scans all files)   |
| Remembers findings between runs       | ❌ (no memory across sessions) |  **✅** (baseline + diff)   |
| Runs without human triggering         |      Needs a PR or prompt      | **✅** (CI hook, 3 seconds) |
| Attention budget                      |   Limited by context window    | **Unlimited** (every file)  |

**The honest answer:** Use both. AI catches nuance, intent, and design flaws
that no regex can find. Mjölnir catches the structural patterns that AI
overlooks because they look "intentional" — a committed `.only`, a swallowed
exit code, a `continue-on-error` on a test job. Those aren't bugs that need
reasoning; they're facts that need scanning. And scanning is what a
deterministic tool does better, faster, and for free.

---

## ⚡ Quickstart

```bash
npx mjolnir-qa@latest
```

That's it. Zero configuration — Mjölnir detects your frameworks, finds your
tests, and reports.

| Command                                                | What it does                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| `npx mjolnir-qa@latest --scope changed`                | Only findings introduced by **your** changes — perfect for PRs      |
| `npx mjolnir-qa@latest --json`                         | Machine-readable output                                             |
| `npx mjolnir-qa@latest --format sarif > mjolnir.sarif` | GitHub Code Scanning integration                                    |
| `npx mjolnir-qa@latest --format mermaid`               | Test-architecture diagram — paste into a GitHub comment or a slide  |
| `mjolnir doctor:playwright`                            | Playwright-only deep scan + Selector Health Score                   |
| `mjolnir forensics ./test-results/`                    | Runtime evidence — retries, true flakes, `FLAKY.md` artifact        |
| `mjolnir triage ./test-results/`                       | The flaky-triage meeting, in 10 minutes instead of 45               |
| `mjolnir fix --dry-run` / `fix`                        | Safe auto-fixes with proof (dry-run first)                          |
| `mjolnir debt`                                         | Test debt register — presentable to management                      |
| `mjolnir handover`                                     | New-QA-onboarding map of the suite                                  |
| `mjolnir pw-report ./test-results/`                    | Playwright run summary — retries / flakes / slowest                 |
| `mjolnir badge`                                        | Evidentiary badge (shields.io endpoint JSON)                        |
| `mjolnir doctor`                                       | Self-audit — prove Mjölnir's own rule base is worthy                |
| `mjolnir rules` / `rules --md`                         | Rule catalog with trust metadata (JSON or markdown)                 |
| `mjolnir explain <RULE-ID>`                            | What/why/fix for one rule, with a real example from its own fixture |
| `mjolnir impact [--since <ref>]`                       | What changed since a prior commit — fixes and new debt              |
| `npx mjolnir-qa@latest --strict`                       | Include quarantine-tier rules (higher FP risk) in the scan          |

---

## ⚖️ Worthiness Score

```text
🔨 MJÖLNIR

WORTHINESS 80/100 — WORTHY
████████████████████████░░░░░░

DETECTED [playwright]

▚ FIX THIS FIRST
+8 pts  QA-CI-001 · .github/workflows/ci.yml:48
+3 pts  QA-TEST-004 · e2e/checkout.spec.ts:6
```

The score is transparent: error −8, warning −3, info −1. Evidence-weighted
deductions mean weak signals cost less. The terminal shows the same discounted
numbers the score uses — no black box.

**Verdicts:**

| Score   | Verdict          |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Evidence Levels:**

Every finding carries an evidence level that determines its weight in the score:

| Level | Meaning              | Score impact     | Example                                            |
| ----- | -------------------- | ---------------- | -------------------------------------------------- |
| E2    | Deterministic defect | Full deduction   | `.only` committed — structurally provable          |
| E1    | Heuristic pattern    | Half deduction   | Regex-matched `sleep()` — strong signal, not proof |
| E0    | Observation          | Zero (info only) | Reported but never gates CI or deducts             |

Most rules are **E1** (heuristic). The tagline "we prove it" refers to this
evidence-level system — deterministic findings (E2) are structural proof;
heuristic findings (E1) are correctly-positioned warnings, not formal proofs.

---

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
> mjolnir rules --md
> ```

---

## 🎭 Selector Health Score

The headline metric for Playwright suites — how resilient your locators are:

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Role-based locators score full credit. CSS class chains and XPath tank the
score — they break on any DOM refactor without telling you which behavior
regressed.

---

## 🔬 Runtime Evidence

Static flakiness detection is guessing. Mjölnir reads **real execution
data** — Playwright JSON reports and JUnit XML from any runner:

```bash
mjolnir forensics ./test-results/
```

```text
▚▞ FLAKINESS LEADERBOARD

3 tests · 1 failed · 1 flaky · 1 retried

TRUE-FLAKE completes checkout with saved card (e2e/checkout.spec.ts)
           ████████████████████ 6.0s · 2 attempts
FAILING    declines an expired card (e2e/checkout.spec.ts)
           ████░░░░░░░░░░░░░░░░ 1.1s · 1 attempt
```

A test that passes only on attempt ≥ 2 is not a passing test — it's a lucky
test. It gets flagged `TRUE-FLAKE` regardless of the final green checkmark.

---

## 🤖 CI Integration

One command generates a PR workflow — advisory by default, never blocking:

```bash
mjolnir ci install
```

Or wire it into GitHub Code Scanning natively via SARIF:

```yaml
- run: npx mjolnir-qa@latest --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

---

## 🛡️ Trust Model

- **Local-first** — zero network calls during scanning. Ever.
- **No false proof** — we'd rather say "unknown" than "verified". An empty
  repo gets `score: null`, never a fake 100.
- **Transparent scoring** — public deduction constants: error −8, warning −3,
  info −1. No black box. Verdict thresholds: **≥80 WORTHY**, **50–79 NEEDS
  WORK**, **<50 UNWORTHY**.
- **Evidence-weighted deductions** — every finding carries an evidence level:
  **E2** (deterministic defect, full deduction), **E1** (heuristic pattern,
  half deduction), **E0** (observation — reported but costs nothing and never
  gates CI).
- **Partial honesty** — if analysis was cut short, the output says so.
  Never "complete" when it isn't.
- **QA-native language** — findings speak your vocabulary:
  `FALSE-GREEN`, `FLAKY-RISK`, `BLOCKS-RELEASE`, `HYGIENE`.
- **FP firewall** — detection runs on a comment/string-free view of the code
  (TypeScript rules use the compiler AST): a pattern inside a prose comment
  or a doc-example string is documentation, not a finding.
  See [docs/FP-AUDIT.md](docs/FP-AUDIT.md) for measured false-positive rates per rule.

---

## 🔌 Plugin Trust Model

Plugins are npm packages you declare in `mjolnir.config.json`. There is **no
sandbox**: plugin code executes with full Node privileges against the scanned
tree — the same trust model as ESLint or Vitest plugins. Only install plugins
you'd trust as devDependencies. Core rule-ID prefixes (`QA-TEST`, `QA-TQUAL`,
`QA-PW`, `QA-CI`, `QA-PY`, `QA-ENV`, `QA-JV`, `QA-CS`) are reserved and
rejected from plugins to prevent spoofing.

---

## 🔍 Changed-Scope Coverage

`--scope changed` attributes findings to lines added in your branch vs the
merge-base with `main`. It covers test files (`*.spec.*`, `*.test.*`) plus
GitHub workflow files and Playwright configs changed in the diff. On shallow
clones or non-git targets it degrades honestly: findings fall back to
full-file attribution and the report says so.

---

## 🏗️ Architecture

<details>
<summary>Expand tree</summary>

```
mjolnir/
├── src/
│   ├── engine/          # LanguageAdapter interface + rule runner
│   ├── adapters/        # typescript · python · java · csharp · github-actions
│   ├── rules/           # deterministic rules across 8 families
│   ├── playwright/      # Selector Health Score engine
│   ├── discovery/       # workspace, frameworks, safe-YAML parser
│   ├── scope/           # git merge-base changed-scope engine
│   ├── scorer/          # transparent deduction table
│   ├── reporter/        # terminal · JSON · SARIF 2.1 · Mermaid
│   ├── forensics/       # run-data ingestion · flake verdicts · triage
│   ├── commands/        # fix · badge · debt · handover · init · create-rule · doctor · rules-catalog · explain · impact · baseline · diff · pr-comment · stats
│   └── integrations/    # CI workflow generator
└── tests/
    ├── fixtures/        # must-fire / must-not-fire per rule
    └── golden/          # frozen score regression locks
```

</details>

Multi-language by design: adding a language = one adapter + its rules.
TypeScript/Playwright and Python are the most mature; Java and C#/.NET
adapters ship a regex-based core rule family with tree-sitter WASM AST
precision as the next step.

---

## 📦 Install

```bash
# Run directly (recommended):
npx mjolnir-qa@latest

# Or install globally:
npm i -g mjolnir-qa
```

Requires Node.js ≥ 22.18 (required by the tsdown bundler for native ESM support). Works on Windows, macOS, and Linux.

---

## 🤝 Contributing

New rules are the easiest first contribution — one command scaffolds
everything (anti-creep law enforced by the fixture harness):

```bash
mjolnir create-rule QA-PW-140 --title "Screenshot without diff bound"
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

---

<div align="center">

**Are your tests worthy of trust?**

```bash
npx mjolnir-qa@latest
```

**Star ⭐ · Watch 👀 · Contribute 🤝**

Built by [Sergey Bar](https://www.linkedin.com/in/sergeybar/)

</div>
