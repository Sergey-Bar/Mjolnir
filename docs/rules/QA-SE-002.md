# QA-SE-002 — Hard sleep before element lookup (C#, missing WebDriverWait)

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Severity                              | warning                                                                                                                      |
| Confidence                            | medium                                                                                                                       |
| Tier                                  | quarantine                                                                                                                   |
| Measured FP rate                      | not yet measured                                                                                                             |
| Evidence level                        | E2                                                                                                                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK)                                                                                                 |
| False-positive risk (author estimate) | medium                                                                                                                       |
| Autofix available                     | no                                                                                                                           |
| Languages                             | csharp                                                                                                                       |
| Frameworks                            | selenium                                                                                                                     |
| Detection strategy                    | LEXICAL (sequence shape: Thread.Sleep/Task.Delay followed by a FindElement/interaction call within 3 lines (code-only view)) |
| Introduced in                         | v0.6.0                                                                                                                       |

## Why this fails in production

The sleep is standing in for an explicit wait: the element lookup after it still races the app, so the test is both slow (always sleeps) and flaky (races when the app is slow to render).

## What gets flagged (real detector output)

```
Hard sleep before an element lookup (sleep at line 17) — the explicit-wait substitute (QA-SE-002).
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-SE-002/must-fire/LoginFlowsTests.cs`

## The fix

Replace the sleep with an explicit wait: Java `new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.visibilityOfElementLocated(...))`; C# `new WebDriverWait(driver, TimeSpan.FromSeconds(10)).Until(...)`; Python `WebDriverWait(driver, 10).until(EC.visibility_of_element_located(...))`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-SE-002/must-not-fire/LoginFlowsTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                | Occurrences |
| ------------------- | ----------- |
| SeleniumHQ-selenium | 4           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-SE-002`
