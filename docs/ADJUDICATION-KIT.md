# Adjudication kit — classifying verdicts to the project standard

Product-gap-remediation master plan P9 (plan 1788853205786, decision
10): the measured-FP corpus gates the entire registry (a rule cannot
claim a tier without measured evidence), so classification quality is
the project's spine. This kit makes classification **operable by a
second human, to the same standard** — A4 keeps adjudication human; P9
makes it _any_ careful human, not only the owner.

Normative reading order: [CERTIFICATION-POLICY](CERTIFICATION-POLICY.md)
(the laws) → this kit (the procedure) →
[tests/corpus/verdicts/README.md](../tests/corpus/verdicts/README.md)
(the format).

## The loop, end to end

```text
1. npm run corpus:sample -- --rule QA-PW-004 --budget 20
      → writes finding rows into tests/corpus/verdicts/<repo>.jsonl
        (blank verdict = awaiting classification) and a review sheet
        tests/corpus/review/<RULE-ID>.md with the cited code inline
2. human: read each row's review sheet → call TP / FP / UNSURE
      → edit the .jsonl rows' verdict + note (the note is REQUIRED —
        it is the evidence trail the next human reads)
3. npm run fp-audit:generate    → recomputes measured FP rates
4. npm run corpus:regression    → the baselines + ceiling ratchet
      (fails if unclassified rows remain — by design, fix is step 2)
5. npm run corpus:regression:update  → re-record baselines after review
6. docs/rules + RULE-CAPABILITY-MATRIX + census regenerate; the drift
   gates keep every number honest
```

Nothing in step 2 is mechanical. The kit's job is to make the STANDARD
mechanical.

## The standard: what each verdict means

- **TP** — the finding describes a real verification-weakening pattern
  in this exact location, reading the code AS WRITTEN. Intent guesses
  ("they probably don't care") are not evidence for FP.
- **FP** — the pattern is benign at this location for a reason the
  _rule could have known from its inputs_ (fixture setup, helper idiom,
  framework artifact). A reason the rule could not know is a RETUNE
  candidate, not an FP — record it in the note with the words "retune
  candidate".
- **UNSURE** — you read it, you cannot say. UNSURE rows are honest
  contributions; they do NOT count toward FP rates and they gate the
  rule's measured-status upgrade (n counts only classified rows).

The one forbidden move: deciding without opening the cited file. A
verdict from the ruleId alone is a fabricated classification.

## Worked example (fully worked — reproduce it before classifying)

Scenario: `QA-PY-003` (bare `except:` detection) fires on
`tests/test_utils.py:15` during a corpus-sample run.

1. Open `tests/corpus/review/QA-PY-003.md` — the sheet shows the cited
   lines with context:
   ```python
   try:
       row = cache[key]
   except:
       row = slow_load(key)
   ```
2. Read AS WRITTEN: a bare `except:` swallowing every exception in a
   caching fallback. Does this weaken verification? The finding claims
   an assertion-less/test-weakening pattern is present; here the pattern
   is production-flavored error handling inside a test helper — the
   test still exercises assertions elsewhere; the bare except does not
   mask test outcomes.
3. Verdict: **FP** — with the note stating the rule-could-have-known
   boundary: "cache-miss fallback in a helper, not test-outcome
   masking; bare-except detection cannot see helper context — retune
   candidate".
4. Enter it: edit the row in
   `tests/corpus/verdicts/<repo>.jsonl`:
   ```json
   {
     "ruleId": "QA-PY-003",
     "file": "tests/test_utils.py",
     "line": 15,
     "verdict": "FP",
     "note": "cache-miss fallback in a helper, not test-outcome masking; retune candidate"
   }
   ```
5. Reconcile:
   - `npm run fp-audit:generate` — the FP count moves; the Coverage line
     updates; the generator FAILS if the measured rate crosses a tier
     boundary (that failure is the §11 loop starting, not an error).
   - `npm run corpus:regression` — the ceiling ratchet: 0 unclassified
     rows expected after step 4.
   - Regenerate the derived docs (`npm run docs:rules`,
     `npm run docs:capability`, `npm run docs:counts`) — the drift gates
     in CI do exactly this and fail on a stale copy.

## Disagreement protocol

- A classifier verdict may be disputed by another classifier in the PR
  thread; the note field records both readings, and the resolution is
  whichever reading cites more code, not more seniority.
- Systematic disagreement (the same pattern splitting the room twice) →
  the rule gets an UNSURE re-sample and a RULE-LIFECYCLE entry naming
  the ambiguity. The corpus records uncertainty; it does not resolve it
  by vote.

## The ratchet rules (non-negotiable)

- Blank-verdict rows block `corpus:regression` — the ceiling is 0; the
  fix is classification, never `--update`.
- `--update` after re-classification is a REVIEWED act: the diff must
  show counts moving because verdicts moved, not because rows were
  deleted.
- Verdict rows are never rewritten to fit a metric target — that is the
  Goodhart failure the whole measured-FP design exists to prevent.
