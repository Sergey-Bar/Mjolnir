# What Mjölnir checks

Mjölnir looks for evidence that your verification cannot be trusted. Not
style, not formatting — the specific places where a test suite or a
pipeline reports success it hasn't earned.

The complete, always-current list lives in the
**[rule catalog](/rules/)** — generated from the live registry, filterable
by severity, tier and language. This page explains the shape of what it
looks for and how to read it.

## The eight families

Each family name links into the [rule catalog](/rules/), pre-filtered.

| Family                                     | Prefix      | What it catches                                                                                    |
| ------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------- |
| [CI integrity](/rules/?family=CI)          | `QA-CI-`    | `continue-on-error`, `\|\| true`, swallowed exit codes — the tricks that turn a red pipeline green |
| [Test hygiene](/rules/?family=TEST)        | `QA-TEST-`  | Committed `.only`, unjustified skips, empty bodies, tests with no assertions                       |
| [Test quality](/rules/?family=TQUAL)       | `QA-TQUAL-` | Tautological assertions, mock-only verification, unawaited promises                                |
| [Playwright](/rules/?family=PW)            | `QA-PW-`    | Brittle selectors, `networkidle` waits, hardcoded environment URLs, debug artifacts                |
| [Python / pytest](/rules/?family=PY)       | `QA-PY-`    | `time.sleep()`, non-strict `xfail`, random/time dependence without a freeze                        |
| [Java / JUnit · TestNG](/rules/?family=JV) | `QA-JV-`    | `@Disabled`, `Thread.sleep()`, blanket route mocks                                                 |
| [C# / .NET](/rules/?family=CS)             | `QA-CS-`    | `[Ignore]`, `Task.Delay`, `WaitForTimeoutAsync()`                                                  |
| [Environment](/rules/?family=ENV)          | `QA-ENV-`   | Environment coupling that makes a test pass only on one machine                                    |

## The false-positive firewall

Every rule ships with must-fire **and** must-not-fire fixtures. A rule
that fires on its own negative fixture cannot ship — that is the firewall,
and it is enforced by `mjolnir doctor`, not by convention.

Detection also runs on a comment- and string-free view of the source
(TypeScript rules use the compiler AST). A pattern inside a prose comment
or a doc-example string is documentation, not a finding.

## Tiers — and what they actually mean

Every rule is `core`, `extended`, or `quarantine`, assigned from its
**measured** false-positive rate, not from how confident the author feels:

| Tier         | Meaning                                  | Default scan | `--strict` |
| ------------ | ---------------------------------------- | :----------: | :--------: |
| `core`       | ≤ 10 % measured FP                       |      ✅      |     ✅     |
| `extended`   | ≤ 30 % measured FP                       |      ✅      |     ✅     |
| `quarantine` | above 30 %, or not yet measured (n < 10) |      ❌      |     ✅     |

## How much of this is measured

Most rules do **not** yet carry a false-positive rate measured against
real OSS code, and the tool says so rather than implying otherwise:

- The [rule catalog](/rules/) marks every rule either with its measured
  rate or as _on assumption_ — filter with **Measured only** to see the
  audited set.
- Every scan footer reports how many of the rules that _fired_ are
  measured.
- `mjolnir rules --unmeasured` lists the ones that aren't.
- Every rule's `mjolnir explain` page states its status.

Rates are published even when they're unflattering — a rule that audits
badly gets quarantined for it. Method and the full table:
[false-positive audit](/reference/fp-audit).

## Language maturity

| Language        | Adapter                     | Coverage today                                     |
| --------------- | --------------------------- | -------------------------------------------------- |
| TypeScript / JS | compiler AST (ts-morph)     | broadest, most measured — mostly `core`/`extended` |
| Python / pytest | comment/string-masked regex | broad, corpus-audited — mostly `core`/`extended`   |
| Java            | comment/string-masked regex | newer — mostly `extended`/`quarantine`             |
| C# / .NET       | comment/string-masked regex | newer — mostly `extended`/`quarantine`             |

TypeScript and Python have the broadest measured coverage. Java and C#
ship, are documented, and stay out of the headline number until a real
consumer suite — not a binding library's own tests — has been audited.

## Getting the catalog locally

```bash
mjolnir rules --md          # full catalog as Markdown
mjolnir rules --unmeasured  # only the rules running on assumption
mjolnir explain QA-CI-001   # what / why / fix + FP status for one rule
```
