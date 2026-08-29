# QA-PW-145 — UI suite without accessibility assertions

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                                  |
| ------------------- | -------------------------------------- |
| Severity            | info                                   |
| Confidence          | low                                    |
| Tier                | quarantine                             |
| Evidence level      | E1                                     |
| QA impact           | Test hygiene debt (HYGIENE)            |
| False-positive risk | high                                   |
| Autofix available   | no                                     |
| Languages           | typescript, javascript                 |
| Frameworks          | playwright                             |
| Detection strategy  | absence heuristic over suite directory |
| Introduced in       | v0.3.8                                 |

## Why this fails in production

Suites that drive the UI but never assert accessibility let WCAG regressions through every PR; catching them at the point of interaction is far cheaper than a retrofit audit.

## What gets flagged (real detector output)

```
UI-interacting spec file contains no accessibility assertions.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-145/must-fire/login.spec.ts`

## The fix

Add `@axe-core/playwright` with `expect(await new AxeBuilder({ page }).analyze()).toHaveNoViolations()` on key pages, or snapshot aria snapshots.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-145/must-not-fire/login.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-145`
