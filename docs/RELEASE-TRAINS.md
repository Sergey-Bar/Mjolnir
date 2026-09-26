# Release trains and version families

This document is the tracked authority for the milestone → version-family
mapping. `docs/ROADMAP.yaml` cites it; it previously cited a planning note that
lived under an ignored `.kilo/` directory, so the program had a source of truth
that no clone could read. A gate that only the authoring machine can satisfy is
not a gate.

The 25 trains in `docs/ROADMAP.yaml` are **not** "ten release trains". The name
of the superseded design note is a historical artifact; the mapping below is the
mapping the program actually runs on.

## Why the v5 family expresses trust state, not feature count

Every 5.x version is a trust-state transition. A version number that counts
features measures how much was written, which is not the question a release
audit asks. The question is: _what can this build prove, and what can it not?_

| Version | Trust state reached                                                                                                                                                               | Depends on                    |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 3.x     | published frozen core                                                                                                                                                             | —                             |
| 4.0     | trustworthy baseline (Wave 0)                                                                                                                                                     | —                             |
| 4.x     | honest product surface (Waves 1–6, 9 partial)                                                                                                                                     | 4.0                           |
| **5.0** | **Verification Core** — canonical proof, candidate identity, evidence atoms, runtime ingestion, CI-IR with GitHub Actions, capability catalog, a narrow certified capability core | 4.x stable, external evidence |
| 5.1     | QA-IR and language/framework capability depth (Python/Java/C#, more JS frameworks), pack loader                                                                                   | 5.0                           |
| 5.2     | CI-IR depth (Azure/GitLab/Jenkins providers, command resolution breadth, false-green family)                                                                                      | 5.1                           |
| 5.3     | Rule Encyclopedia expansion (universal failure-mode families)                                                                                                                     | 5.2                           |
| 5.4     | API/contract/mobile expansion                                                                                                                                                     | 5.3                           |
| 5.5     | performance/accessibility/security-test intelligence                                                                                                                              | 5.4                           |
| 5.6     | mutation/coverage/visual intelligence                                                                                                                                             | 5.5                           |
| 5.7     | long-tail ecosystem expansion                                                                                                                                                     | 5.6                           |
| 5.8     | universal certification milestone (broad catalog, many certified capabilities)                                                                                                    | 5.7                           |

## The hard rule for every 5.x

1. No shipped verb renders a value that is not derived from a measurement.
2. No shipped file is excluded from the per-file coverage floor
   (`docs/COVERAGE-EXEMPTIONS.json` records the current debt, with owners and
   expiry dates).
3. One new verb requires one removal or one merge.

## Certified capability core for 5.0 GA

Everything outside this list ships as `DETECTED`, `GENERIC`, `PARTIAL`, or
`EXPERIMENTAL`, with an explicit `nextLevelGap`. A framework name is never a
support claim; the unit of support is a capability.

- **Languages:** TypeScript/JavaScript — parse, symbols, imports, calls,
  test discovery, framework discovery, config discovery, source location.
- **Frameworks:** Playwright, Jest, Vitest — discovery, configuration,
  assertions, hooks, retries, timeouts, skip, CI invocation, runtime evidence.
- **Reports:** JUnit XML, Playwright JSON, Jest JSON — ingest with
  candidate-bound provenance.
- **CI:** GitHub Actions — parse, trigger, conditions, matrix, permissions,
  artifacts, failure propagation, exit provenance.
- **Universal rules:** a representative set of assertion, async,
  CI-failure-propagation, E2E/mocking honesty, and flakiness rules, proven on
  the cohort above.

## Explicitly deferred past 5.0

Hosted control plane; SSO/CMK; compliance automation; air-gapped enterprise;
plugin marketplace; hosted telemetry; autonomous remediation; cross-repository
systems beyond a catalog row; the research lab; sandbox-escape,
tool-poisoning, and prompt-injection cells (these stay `BLOCKED` until a
sandbox exists); full localization, assistive-tech, and mobile-output support;
CI provider execution beyond GitHub Actions; performance/accessibility/visual/
security-test deep intelligence. These stay catalogued and gated, never claimed.

### Verb removals, and why the reason differs per verb

`npm run verbs:budget` caps the command surface at **50** today, with a **44**
target for 5.0. Six verbs are scheduled for removal, deprecated through 4.1
with notices and a migration row. The removals are NOT justified uniformly, and
the original plan said they were — a source audit on 2026-09-26 found the two
groups behave differently:

| Verb                | The reason it goes                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `business-case`     | **Fabricated values.** Multiplied a measured FP rate by a table of invented incident costs (fintech $50 000, healthcare $100 000, …) and printed the product as "Expected Savings". `--history` promised estimates from scan history and read none. `--projected` divided the total by six. Fixed in-tree 2026-09-26: a dollar figure now requires `--incident-cost`, so the number is the reader's.                                                                             |
| `enterprise`        | **Fabricated artifacts.** Wrote a config declaring `"authentication": "sso-saml"` (no server, no session, no SAML in the product), an SSO guide telling readers to add a config key nothing reads, and three auditor-facing SOC 2 / HIPAA / PCI-DSS templates mapping controls to capabilities that do not exist. Fixed in-tree 2026-09-26: `sso` and `compliance` refuse and write nothing; `config` emits a capability manifest whose `notProvided` list records the absences. |
| `maturity`          | **Redundant, not dishonest.** It did emit hardcoded dimension scores (75/70/65/30) and an invented `ruleCount = 79`; those were already removed. What remains is a presence report over named QA artifacts that explicitly says a signal is not a score.                                                                                                                                                                                                                         |
| `quarantine`        | **Redundant, not dishonest.** It did invent an attempt count from severity and print "Quarantines updated." after changing nothing; those were already removed. It now refuses to propose without runtime evidence.                                                                                                                                                                                                                                                              |
| `release-report`    | **Redundant, not dishonest.** It did hardcode five zeros as measured figures and ignore `partial`; those were already fixed. The GO/CONDITIONAL GO/NO-GO verdict is real.                                                                                                                                                                                                                                                                                                        |
| `report-playwright` | **Redundant, not dishonest.** It did present static findings as Playwright `suites`/`tests` with a `passed` status, publishing "0 tests, all passed" on a clean scan; the execution block is now empty and says so.                                                                                                                                                                                                                                                              |

The distinction matters for the deprecation notice. A user who depended on
`business-case` was reading a number that was never real, and the notice must say
so — "this verb's output was unsound, do not carry the figure into a decision" is
a different message from "this verb is going away, use `trend`". Telling all six
the same thing would be the same class of error in a different file.

## External validation is the long pole

`docs/M26-EXTERNAL-VALIDATION.json` is `BLOCKED` with no owner, no consent, and
no holdout. GA cannot pass without `REMOTE_PROVEN` evidence for every required
class, and recruitment for design partners is a Wave 0 activity — not a Wave 11
activity — because it is capacity-bound, not code-bound. Downloads are not a
success metric.
