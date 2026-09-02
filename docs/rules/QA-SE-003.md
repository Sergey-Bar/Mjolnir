# QA-SE-003 — Hard sleep before element lookup (Python, missing WebDriverWait)

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Severity                              | warning                                                                                                          |
| Confidence                            | medium                                                                                                           |
| Tier                                  | quarantine                                                                                                       |
| Measured FP rate                      | not yet measured                                                                                                 |
| Evidence level                        | E2                                                                                                               |
| QA impact                             | Flaky-test risk (FLAKY-RISK)                                                                                     |
| False-positive risk (author estimate) | medium                                                                                                           |
| Autofix available                     | no                                                                                                               |
| Languages                             | python                                                                                                           |
| Frameworks                            | selenium                                                                                                         |
| Detection strategy                    | LEXICAL (sequence shape: time.sleep followed by a find_element/interaction call within 3 lines (code-only view)) |
| Introduced in                         | v0.6.0                                                                                                           |

## Why this fails in production

The sleep is standing in for an explicit wait: the element lookup after it still races the app, so the test is both slow (always sleeps) and flaky (races when the app is slow to render).

## What gets flagged (real detector output)

```
Hard sleep before an element lookup (sleep at line 12) — the explicit-wait substitute (QA-SE-003).
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-SE-003/must-fire/test_inventory.py`

## The fix

Replace the sleep with an explicit wait: Java `new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.visibilityOfElementLocated(...))`; C# `new WebDriverWait(driver, TimeSpan.FromSeconds(10)).Until(...)`; Python `WebDriverWait(driver, 10).until(EC.visibility_of_element_located(...))`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-SE-003/must-not-fire/test_inventory.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-SE-003`
