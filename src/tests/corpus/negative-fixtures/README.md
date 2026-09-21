# Negative fixture corpus (§08 class C)

Realistic legitimate code, one directory per rule. A rule firing on its
own directory MUST NOT happen — every fire classifies FP in the verdict
jsonl (`tests/corpus/verdicts/negative-fixtures.jsonl`), which is real
precision evidence: it catches over-firing against valid idioms.

Files are excluded from Mjölnir's own self-scan via mjolnir.config.json
and from vitest via the test exclude list — they are DATA.
