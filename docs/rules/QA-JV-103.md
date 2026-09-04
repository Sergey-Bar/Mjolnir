# QA-JV-103 — Test without assertions

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Severity                              | error                                                                                                                                |
| Confidence                            | high                                                                                                                                 |
| Tier                                  | extended                                                                                                                             |
| Measured FP rate                      | 26% (n=58)                                                                                                                           |
| Evidence level                        | E2                                                                                                                                   |
| QA impact                             | False-green risk (FALSE-GREEN)                                                                                                       |
| False-positive risk (author estimate) | medium                                                                                                                               |
| Autofix available                     | no                                                                                                                                   |
| Languages                             | java                                                                                                                                 |
| Frameworks                            | junit, testng                                                                                                                        |
| Detection strategy                    | AST (L2 tree-sitter test-method scoping + structural assertion oracle (throwing waits, helper idioms); regex fallback when no parse) |
| Introduced in                         | v0.3.8                                                                                                                               |

## Why this fails in production

A JUnit/TestNG test method with no `assertEquals`/`assertTrue`/ AssertJ-style assertion (and no exception expected via `@Test(expected = ...)` or equivalent) reports green for the same structural reason as every other language's assertion-less test: the runner only fails a test when something throws, and this test throws nothing. Java suites often obscure this further with helper methods and page-object indirection, which makes an assertion-less test method read as more thorough than it is on a quick review.

## What gets flagged (real detector output)

```
Test `shouldCompleteCheckout` contains no assertions.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-JV-103/must-fire/CheckoutTest.java`

## The fix

Add an assertion on the expected outcome (`assertEquals`, `assertThat(locator).isVisible()`), or remove the test.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-JV-103/must-not-fire/CheckoutTest.java` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                          | Occurrences |
| ----------------------------- | ----------- |
| appsmithorg-appsmith          | 75          |
| iluwatar-java-design-patterns | 41          |
| keycloak-keycloak             | 1387        |
| microsoft-playwright-java     | 43          |
| positive-fixtures             | 4           |
| SeleniumHQ-selenium           | 249         |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-JV-103`
