# QA-PY-108 — Hardcoded URL in test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                       |
| ------------------- | --------------------------- |
| Severity            | warning                     |
| Confidence          | high                        |
| Tier                | core                        |
| Evidence level      | E2                          |
| QA impact           | Test hygiene debt (HYGIENE) |
| False-positive risk | low                         |
| Autofix available   | no                          |
| Languages           | python                      |
| Frameworks          | pytest                      |
| Detection strategy  | regex pattern               |
| Introduced in       | v0.4.0                      |

## Why this fails in production

Absolute URLs break when environments change and can hit production by accident from a CI runner.

## What gets flagged (real detector output)

```
Hardcoded URL: `goto("https://app.example.com/dashboard"`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-108/must-fire/test_nav.py`

## The fix

Use `--base-url` / `base_url` fixture, or `os.environ[...]`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-108/must-not-fire/test_nav.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-108`
