# ADR 0015 — .NET runs are evidence, not an absence of it

**Status:** accepted · 2026-10-04 · bumps `evidenceSchemaVersion` and
`forensicsSchemaVersion` to 2

## Context

A rule's runtime evidence level is derived from a real test run report. Which
reports count is `EVIDENCE_CONVENTIONS` in `src/discovery/evidence-discovery.ts`,
and until this ADR it held four entries: Mjölnir's own report, Playwright JSON,
a `test-results/` directory, and JUnit XML.

.NET was in none of them.

`dotnet test` writes Visual Studio TRX, which is XML but not JUnit XML. So a C#
or F# repository had no path to evidence at all: its findings stayed at `INFERRED`
however carefully the rule was written and however often the suite actually ran.
The rules were not the problem. The evidence was unreadable, and unreadable
evidence and absent evidence look identical from the outside — which is exactly
the ambiguity §16 exists to prevent by making absence a _state_.

Python had the same shape of problem until `--junitxml` was understood, and
Java until a JUnit convention existed. .NET was simply the next one.

## Decision

Add TRX as a fifth evidence convention and a parser for it.

1. **`src/forensics/parse-trx.ts`** — a bounded, dependency-free, tag-targeted
   scanner over `<UnitTestResult>` and `<UnitTest>`, following the discipline of
   `parse-junit.ts`. Not a general XML parser.
2. **`dotnet-trx` added to the source union** in both `src/forensics/types.ts`
   and `src/types.ts`. Two places, because the report's provenance label and the
   corroboration record's label are separate unions and a source that exists in
   only one of them is a source that cannot be represented.
3. **The convention is the `./TestResults` DIRECTORY**, not a `*.trx` file
   pattern. `dotnet test` names the file `<timestamp>_<machine>.trx`, and nothing
   about that is predictable. Discovery matches exact names by design, so adding
   globbing for one convention would have meant the finder and the runner
   disagreeing about what a convention _is_.
4. **TRX is dispatched BEFORE the JUnit branch**, and this ordering is load
   bearing. The JUnit branch is reached by an `<?xml` sniff, so a TRX file used
   to be handed to a parser looking for `<testsuite>`, match nothing, and return
   an empty run — which reads as "the suite ran and passed nothing". For a .NET
   project whose tests were never examined, that is the most reassuring possible
   wrong answer, and it was the answer the engine was giving.

## Rejected alternatives

**A `*.trx` glob in `EVIDENCE_CONVENTIONS`.** The file name
`dotnet test` writes is `<timestamp>_<machine>.trx`, so nothing about it is
predictable and the convention has to be the `./TestResults` directory. The
alternative was teaching discovery to glob, which would have made one convention
work by a different mechanism than the other four — and the finder and the
runner would then disagree about what a convention is. The directory is a name,
and names are what the finder already understands.

**Parsing TRX with the JUnit parser.** Both are XML and both describe test runs.
The shapes are different enough that a shared parser would have been a
heuristic: JUnit's `<testcase>` nests `<failure>`/`<error>`/`<skipped>`, TRX's
`<UnitTestResult>` carries an `outcome` attribute and puts the message in an
`<Output><ErrorInfo>` block. The dangerous failure of one parser for both is not a
wrong count — it is an EMPTY count, which reads as a passing run.

**Mapping `className` onto a file path.** Tempting, because a dotted CLR type
name looks like a path and test-level corroboration needs one. Rejected: the run
never reported a path, so any mapping is a guess, and a guess that is sometimes
right is worse than a recorded `"unknown"` because it fails silently in exactly
the cases that matter.

## Enforcement

- `tests/forensics/parse-trx.spec.ts` — 11 assertions over a real TRX fixture,
  including that the JUnit parser returns **zero** records for it and that
  dispatch reports `dotnet-trx`. The ordering guarantee is tested, not assumed.
- `tests/discovery/dotnet-evidence.spec.ts` — `./TestResults` is discovered at
  depth 1, is not discovered where absent, and is named in the missing-evidence
  message.
- `tests/engine/contract-versions.spec.ts` pins both schema versions to `2`. The
  previous assertions were "is a positive integer", which accepted any value
  including the one this bump exists to reject.
- `docs/ENGINE-FREEZE.md` records that both constants carry the `version-bump`
  policy, so a consumer holding an artifact from a 1.x engine is told the
  assumption it carries.

## Consequences

No rule, tier, score or finding output changes. `csharp-*` rules are unchanged.
A repository that already had a recognised run report is unaffected — the new
convention only ever adds a candidate that did not previously exist, and the
parser returns nothing for a document that is not TRX.

**What .NET gains, and what it does not.** L3 file- and test-level corroboration
becomes available. Span-level corroboration does **not**: test-level runtime
corroboration matches a finding's _line_ against a test's declaration span, and
TRX carries no line, so \`TestRecord.line\` stays undefined exactly as it does for
JUnit. A consumer must not assume it.

**\`TRUE_FLAKE\` can never fire from TRX.** A \`UnitTestResult\` carries ONE outcome.
Retries appear as \`<Execution>\` entries under the test definition, cross-referenced
by id — a lookup table, not an ordered attempt log — so every record has exactly
one attempt.

**An unrecognised \`outcome\` maps to \`skipped\`, never to \`passed\`.** \`skipped\`
contributes nothing to "the suite passed", so the default is the non-claiming
direction. A silent default the other way would let a new producer's vocabulary
manufacture green runs.

**Durations are parsed by splitting, not by one pattern.** A single regex needs
\`^(\\d+):(\\d{2}):(\\d{2})(?:\\.(\\d+))?$\`, and those nested quantifiers are what
\`security/detect-unsafe-regex\` flags — correctly in general, since this shape is
the usual ReDoS source. Splitting removes the question instead of asserting the
pattern is safe today.

Both constants move 1 → 2 because this changes what "the engine reached L3" can
_mean_: for a .NET repository it can now mean something it previously could not.
The `version-bump` compatibility policy on both entries is literal — an artifact
written by a 1.x engine carries an assumption (no TRX source exists) that no
longer holds.

`schemaVersion` and `trustModelVersion` are untouched. The trust ladder did not
move; only the set of runs that can produce evidence for it grew.

## What remains open

Per-rule defect recipes, so a MUST-NOT-FIRE fixture can be _generated_ as the
must-fire fixture with the defect neutralised rather than hand-written a second
time and left to drift. `docs/SENSITIVITY-RATCHET.json` records the current
state: of 40 rules carrying both fixture legs, 2 have a negative fixture that is
plausibly the positive one with the defect removed. The remaining 38 are a
different program, so the pair shows the detector is directional and not that
the predicate is sensitive. This ADR does not touch that.
