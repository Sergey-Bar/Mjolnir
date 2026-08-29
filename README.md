<div align="center">

<img src="assets/readme/logo.png" alt="Mjölnir — Verification Trust Engine" width="800" />

### Your tests are lying to you. We prove it.

**Verification Trust Engine for QA.** Audits test suites and CI pipelines,
reports a worthiness score, and shows exactly where trust breaks.

<sub>"We prove it" is literal for the deterministic findings — a committed `.only`,
a `continue-on-error` on a test job. The pattern-based rules are labelled
heuristic, and **19 of 91 carry a false-positive rate measured against real
OSS code**; `mjolnir rules --unmeasured` names the rest. See
[docs/FP-AUDIT.md](docs/FP-AUDIT.md).</sub>

[![npm](https://img.shields.io/npm/v/mjolnir-qa.svg?style=flat-square&color=B45309&labelColor=0D0D0D)](https://www.npmjs.com/package/mjolnir-qa)
[![ci](https://img.shields.io/github/actions/workflow/status/Sergey-Bar/Mjolnir/ci.yml?branch=main&style=flat-square&label=ci&labelColor=0D0D0D)](https://github.com/Sergey-Bar/Mjolnir/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-B45309.svg?style=flat-square&labelColor=0D0D0D)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A5%2022.18-146A8C.svg?style=flat-square&labelColor=0D0D0D)](https://nodejs.org)

```bash
npx mjolnir-qa@latest
```

**Are your tests worthy of trust?**

[Quickstart](#-quickstart) · [Rules](#-the-rules) · [Selector Health](#-selector-health-score) · [Runtime Evidence](#-runtime-evidence) · [CI Integration](#-ci-integration) · [Contributing](#-contributing)

</div>

---

## 🔨 What is Mjölnir?

|     |                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------- |
| ⚖️  | **Worthiness Score** — one number, transparent deduction table, no black box                                      |
| 🎭  | **Selector Health Score** — grades your Playwright locators, not just your pass rate                              |
| 🔬  | **Runtime forensics** — reads real Playwright/JUnit run data to catch `TRUE-FLAKE`, not just static guesses       |
| 🚨  | **CI-integrity rules** — catches `continue-on-error`, `\|\| true`, and other false-green tricks                   |
| 🐍  | **All four Playwright bindings** — TypeScript, Python, Java, C#/.NET — plus pytest, JUnit/TestNG and CI workflows |
| 🔒  | **Local-first** — zero network calls while scanning, zero telemetry, runs in seconds                              |

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
| Reads real run data for `TRUE-FLAKE` verdicts |         partial\*         |     partial (tag)     |          ✅           |
| Flaky-triage report from execution history    |            ❌             |          ✅           |          ✅           |
| Integrates with static worthiness score       |            ❌             |          ❌           |          ✅           |

\*Playwright tracks retries internally but does not produce a standalone flakiness report with verdict labels.

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

**The product is one command in CI:**

```bash
npx mjolnir-qa@latest --scope changed
```

It scans the test files, Playwright configs and CI workflows touched in the
branch, and exits non-zero when it finds new problems. Drop that in a PR check
(`mjolnir ci install` writes the workflow) and you're done. Everything below is
optional.

Run it with no flags for a full-repo report and a WORTHINESS score:

```bash
npx mjolnir-qa@latest
```

### Everyday

| Command                             | What it does                                     |
| ----------------------------------- | ------------------------------------------------ |
| `mjolnir --scope changed`           | Only what your branch introduced — the CI form   |
| `mjolnir`                           | Full-repo scan + WORTHINESS score                |
| `mjolnir --json` / `--format sarif` | Machine-readable / GitHub Code Scanning          |
| `mjolnir ci install`                | Generate the advisory PR workflow                |
| `mjolnir explain <RULE-ID>`         | What/why/fix + measured FP rate for one rule     |
| `mjolnir rules --unmeasured`        | The rules running on assumption, not measurement |
| `mjolnir --strict`                  | Also run quarantine-tier rules (higher FP risk)  |

### When something's flaky

| Command                             | What it does                                        |
| ----------------------------------- | --------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Real run data → `TRUE-FLAKE` verdicts, `FLAKY.md`   |
| `mjolnir triage ./test-results/`    | Quarantine proposal from execution history          |
| `mjolnir pw-report ./test-results/` | Playwright run summary — retries / flakes / slowest |
| `mjolnir doctor:playwright`         | Playwright-only deep scan + Selector Health Score   |

<details>
<summary><strong>Occasional / reporting</strong></summary>

| Command                          | What it does                                     |
| -------------------------------- | ------------------------------------------------ |
| `mjolnir fix --dry-run` / `fix`  | Safe auto-fixes with proof                       |
| `mjolnir baseline` / `diff`      | Snapshot findings, then report only new/worsened |
| `mjolnir impact [--since <ref>]` | What changed since a prior commit                |
| `mjolnir debt`                   | Test-debt register with a cost model             |
| `mjolnir handover`               | New-QA onboarding map of the suite               |
| `mjolnir stats`                  | Local all-time counters of fixes seen            |
| `mjolnir badge`                  | shields.io endpoint JSON + snippet               |
| `mjolnir rules` / `rules --md`   | Full rule catalog (JSON or Markdown)             |
| `mjolnir doctor`                 | Self-audit of Mjölnir's own rule base            |
| `mjolnir create-rule <ID>`       | Scaffold a new rule + fixtures                   |
| `mjolnir --format mermaid`       | Test-architecture diagram for a PR comment       |

</details>

---

## ⚖️ Worthiness Score

<p align="center">
  <img src="assets/readme/terminal-hero.svg" alt="Mjölnir terminal output — WORTHINESS 67/100 NEEDS WORK, a diagnostics-by-category breakdown, and a FIX THIS FIRST list" width="760" />
</p>

<sub>Real output of `npx mjolnir-qa ./examples/demo-repo` in this repo. Regenerated by `npm run docs:hero`; [`tests/hero-asset-reproducibility.spec.ts`](tests/hero-asset-reproducibility.spec.ts) fails CI if it drifts from what the reporter actually prints.</sub>

The score is transparent: error −8, warning −3, info −1, then normalized by
suite exposure (deductions per test declaration). Evidence-weighted deductions
mean weak signals cost less. The terminal shows the same discounted numbers the
score uses — no black box.

**Verdicts:**

| Score   | Verdict          |
| ------- | ---------------- |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

**Evidence Levels:**

Every finding carries an evidence level that determines its weight in the score:

| Level | Meaning              | Score impact     | Example                                                                            |
| ----- | -------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| E2    | Deterministic defect | Full deduction   | `.only` committed — structurally provable; downgraded to E1 when confidence is low |
| E1    | Heuristic pattern    | Half deduction   | Regex-matched `sleep()` — strong signal, not proof                                 |
| E0    | Observation          | Zero (info only) | Reported but never gates CI or deducts                                             |

Most rules are **E1** (heuristic). The tagline "we prove it" refers to this
evidence-level system — deterministic findings (E2) are structural proof;
heuristic findings (E1) are correctly-positioned warnings, not formal proofs.

**How much of this is measured.** 19 of 91 rules carry a false-positive rate
measured against real OSS code (≥ 10 hand-classified findings each; see
[docs/FP-AUDIT.md](docs/FP-AUDIT.md)). The other 72 ship on the author's
estimate. Every scan footer tells you how many of the rules that _fired_ are
measured; `mjolnir rules --unmeasured` lists the ones that aren't; every rule's
`mjolnir explain` page states its status. We publish the rate even when it's
ugly — QA-JV-103 audits at 50% and is quarantined for it. Growing that 19
is the project's main open work.

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

20 Python rules total (QA-PY-001…012 pytest hygiene + QA-PY-101…108 Playwright-Python).

</details>

<details>
<summary><strong>Java / JUnit · TestNG ☕</strong></summary>

| ID        | Rule                                     | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-JV-101 | Disabled test (`@Disabled`)              | warning  |
| QA-JV-102 | Hard sleep (`Thread.sleep()`)            | warning  |
| QA-JV-103 | Test method with no assertions           | error    |
| QA-JV-105 | Playwright `waitForTimeout()` hard sleep | warning  |
| QA-JV-106 | Brittle selector instead of role locator | warning  |
| QA-JV-108 | Hardcoded environment URL in test        | warning  |
| QA-JV-111 | Blanket `page.route("**")` mock          | warning  |

</details>

<details>
<summary><strong>C# / .NET — NUnit · xUnit · MSTest 🟣</strong></summary>

| ID        | Rule                                       | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-CS-101 | Skipped test (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | Hard sleep (`Thread.Sleep` / `Task.Delay`) | warning  |
| QA-CS-103 | Test method with no assertions             | error    |
| QA-CS-105 | `WaitForTimeoutAsync()` hard sleep         | warning  |
| QA-CS-106 | Brittle selector instead of role locator   | warning  |
| QA-CS-108 | Hardcoded environment URL in test          | warning  |
| QA-CS-111 | Blanket `page.RouteAsync("**")` mock       | warning  |

</details>

**Rule tiers.** Every rule is `core`, `extended`, or `quarantine`, assigned from
its **measured** false-positive rate ([docs/FP-AUDIT.md](docs/FP-AUDIT.md)):
`core` ≤ 10 % FP, `extended` ≤ 30 %, `quarantine` above that or not yet measured.
The default scan runs core + extended; `--strict` adds quarantine. The Java and
C# families are newer and mostly `extended`/`quarantine` today — they ship,
they're documented, and they stay out of the headline number until a real
consumer suite (not a binding-library's own tests) has been audited.

> The full live catalog — every rule with tier, confidence, false-positive risk,
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
- **Measured, not asserted** — 19 of 91 rules carry a false-positive rate from
  real OSS code; the scan footer, `mjolnir rules --unmeasured`, and every
  `mjolnir explain` page tell you which rules are which.
  [docs/FP-AUDIT.md](docs/FP-AUDIT.md) has the numbers, ugly ones included.

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
merge-base with `main` (the base branch is `main`; a repo that uses `master`
or a shallow clone with no merge-base degrades — see below). It covers test
files (`*.spec.*`, `*.test.*`) plus GitHub workflow files and Playwright
configs changed in the diff. When the merge-base can't be resolved — shallow
clone, detached HEAD, non-git target, different default branch — it degrades
honestly: findings fall back to full-file attribution and the report says so.

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
│   ├── commands/        # badge · baseline+diff · create-rule · debt · doctor · explain · fix · handover · impact · init · pr-comment · pw-report · rules · stats
│   └── integrations/    # CI workflow generator
└── tests/
    ├── fixtures/        # must-fire / must-not-fire per rule
    └── golden/          # frozen score regression locks
```

</details>

Multi-language by design: adding an ecosystem (Ruby/RSpec, Go, PHPUnit…) =
one adapter + its rules. Playwright itself has exactly four official
language bindings — TypeScript, Python, Java, .NET — and all four have an
adapter here.
TypeScript/Playwright uses the compiler AST (ts-morph); Python, Java, and
C#/.NET run on a shared comment/string-masked regex layer. A tree-sitter
WASM AST layer for Java and C# exists (`src/engine/tree-sitter-ast.ts`) and
is the next precision step — it is not yet wired into the synchronous scan
pipeline. TypeScript/Playwright and Python are the most battle-tested by
measured false-positive rate; Java and C# are newer (see **Rule tiers** above).

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
