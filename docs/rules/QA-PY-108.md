# QA-PY-108 — Hardcoded environment URL in spec

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                         |
| ------------------- | ----------------------------- |
| Severity            | warning                       |
| Confidence          | high                          |
| Evidence level      | E2                            |
| QA impact           | Test hygiene debt (HYGIENE)   |
| False-positive risk | low                           |
| Autofix available   | no                            |
| Languages           | python                        |
| Frameworks          | pytest-playwright, playwright |
| Detection strategy  | regex pattern                 |
| Introduced in       | v0.3.8                        |

## Why this fails in production

Absolute URLs break when environments change and can hit production by accident from a CI runner.

## What gets flagged (real detector output)

```
Hardcoded URL: `goto("https://app.example.com/dashboard"`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-108/must-fire/test_nav.py`

## The fix

Use relative paths against baseURL (set via --base-url / base_url fixture), or read the host from an env variable.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-108/must-not-fire/test_nav.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PY-108`
