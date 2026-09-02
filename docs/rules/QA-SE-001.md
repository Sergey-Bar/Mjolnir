# QA-SE-001 — Hard sleep before element lookup (Java, missing WebDriverWait)

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Severity                              | warning                                                                                                           |
| Confidence                            | medium                                                                                                            |
| Tier                                  | quarantine                                                                                                        |
| Measured FP rate                      | not yet measured                                                                                                  |
| Evidence level                        | E2                                                                                                                |
| QA impact                             | Flaky-test risk (FLAKY-RISK)                                                                                      |
| False-positive risk (author estimate) | medium                                                                                                            |
| Autofix available                     | no                                                                                                                |
| Languages                             | java                                                                                                              |
| Frameworks                            | selenium                                                                                                          |
| Detection strategy                    | LEXICAL (sequence shape: Thread.sleep followed by a findElement/interaction call within 3 lines (code-only view)) |
| Introduced in                         | v0.6.0                                                                                                            |

## Why this fails in production

A Selenium `Thread.sleep` before `findElement` encodes a guess about the app's timing: the explicit wait it replaces polls the DOM until the element is interactive, while the sleep waits a constant and then proceeds blindly. Under load the element appears after the sleep ends and `NoSuchElementException` fails the run (flaky); on a fast run the sleep is pure dead time charged to every execution (slow). Selenium's implicit-wait setting cannot rescue this shape — `implicitlyWait` only applies to the lookup itself, not to the sleep before it.

## What gets flagged (real detector output)

```
Hard sleep before an element lookup (sleep at line 17) — the explicit-wait substitute (QA-SE-001).
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-SE-001/must-fire/SearchFlowsTest.java`

## The fix

Replace the sleep with an explicit wait: Java `new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.visibilityOfElementLocated(...))`; C# `new WebDriverWait(driver, TimeSpan.FromSeconds(10)).Until(...)`; Python `WebDriverWait(driver, 10).until(EC.visibility_of_element_located(...))`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-SE-001/must-not-fire/SearchFlowsTest.java` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-SE-001`
