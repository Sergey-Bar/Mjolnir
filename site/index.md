---
layout: home

hero:
  name: "Mjölnir"
  text: "Your tests are lying to you. We prove it."
  tagline: >
    Verification Trust Engine for QA. Audits test suites and CI pipelines,
    reports a worthiness score, and shows exactly where trust breaks.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: What it checks
      link: /guide/what-it-checks
    - theme: alt
      text: View on GitHub
      link: https://github.com/Sergey-Bar/Mjolnir

features:
  - icon: ⚖️
    title: Worthiness Score
    details: One number, a transparent deduction table, no black box. Gate a PR on it.
  - icon: 🎭
    title: Selector Health Score
    details: Grades your Playwright locators for resilience, not just your pass rate.
  - icon: 🔬
    title: Runtime forensics
    details: Reads real Playwright/JUnit run data to catch TRUE-FLAKE, not just static guesses.
  - icon: 🚨
    title: CI-integrity rules
    details: Catches continue-on-error, "|| true", and other false-green tricks.
  - icon: 🐍
    title: Four languages, one pass
    details: TypeScript, Python, Java and C#/.NET — plus pytest, JUnit/TestNG and CI workflows.
  - icon: 🔒
    title: Local-first
    details: Zero network calls while scanning, zero telemetry, runs in seconds.
---

## Try it now

```bash
npx mjolnir-qa@latest
```

In CI, scan only what the branch touched and exit non-zero on new problems:

```bash
npx mjolnir-qa@latest --scope changed
```

Mjölnir is not another linter. Linters tell you whether code follows rules.
Mjölnir tells you whether your verification can be trusted.
