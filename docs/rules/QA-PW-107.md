# QA-PW-107 — toBeVisible where toBeInViewport fits better

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | info                        |
| Confidence                            | low                         |
| Tier                                  | quarantine                  |
| Measured FP rate                      | not yet measured            |
| Evidence level                        | E1                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | high                        |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | regex pattern               |
| Introduced in                         | v0.3.0                      |

## Why this fails in production

Toasts and banners can be 'visible' in the DOM while rendered off-screen; the user sees nothing but the test passes.

## What gets flagged (real detector output)

```
`toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-107/must-fire/toast-visible.spec.ts`

## The fix

Assert `toBeInViewport()` when what matters is that the user actually sees it.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-107/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-107`
