# Runtime forensics

Static flakiness detection is guessing. A rule can tell you a test
_looks_ flaky — a hard sleep, a `networkidle` wait — but it cannot tell
you whether that test actually failed last Tuesday.

Forensics reads **real execution data**: Playwright JSON reports and
JUnit XML from any runner.

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

## The TRUE-FLAKE verdict

A test that passes only on attempt ≥ 2 is not a passing test — it's a
lucky test. Mjölnir flags it `TRUE-FLAKE` regardless of the final green
checkmark the runner reported.

This is the difference between the two halves of the tool:

|              | Evidence           | Verdict quality                 |
| ------------ | ------------------ | ------------------------------- |
| Static rules | The source code    | "this pattern causes flakiness" |
| Forensics    | Actual run history | "this test _was_ flaky, here"   |

## Commands

| Command                             | What it does                                        |
| ----------------------------------- | --------------------------------------------------- |
| `mjolnir forensics ./test-results/` | Flakiness leaderboard + writes `FLAKY.md`           |
| `mjolnir triage ./test-results/`    | Quarantine proposal from execution history          |
| `mjolnir pw-report ./test-results/` | Playwright run summary — retries / flakes / slowest |

All three accept a directory or a single report file. They read
Playwright's JSON reporter output and JUnit XML — so pytest, JUnit,
TestNG, NUnit and anything else that emits JUnit XML all work.

## Wiring it up in CI

Point Playwright at the JSON reporter, then run forensics on the
artifacts after the test step — including when it failed:

```yaml
- name: Run tests
  run: npx playwright test --reporter=json --output=test-results/

- name: Flakiness forensics
  if: always()
  run: npx mjolnir-qa@latest forensics ./test-results/
```

`if: always()` matters: the runs worth analysing are exactly the ones
that didn't pass cleanly.

## Selector Health Score

The headline static metric for Playwright suites — how resilient your
locators are to a DOM refactor:

```bash
mjolnir doctor:playwright
```

```text
▚▞ SELECTOR HEALTH — e2e/checkout.spec.ts

  [█████████████████░░░]  83 / 100
  role/text: 2 · testid: 1 · css-chains: 1 ⚠ · xpath: 0
```

Role-based locators score full credit. CSS class chains and XPath tank
the score — they break on any DOM refactor without telling you which
behavior actually regressed, which converts a real regression into a
"just update the selector" chore.
