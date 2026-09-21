# Positive fixture corpus (§08 class B)

Realistic anti-pattern variants, one directory per rule. Every file in a
rule directory MUST fire that rule — a scan fire here classifies TP in the
verdict jsonl (`tests/corpus/verdicts/positive-fixtures.jsonl`).

These exist because class-A OSS repos under-represent rare patterns
(deep frameLocator chains, trial clicks, TestNG retry analyzers). They
are measurement-grade surfaces, not a substitute for class A: precision
evidence still comes from real repos and the negative corpus.

Files are excluded from Mjölnir's own self-scan via mjolnir.config.json
(`tests/**` fixture coverage) and from vitest via the test exclude list —
they are DATA.
