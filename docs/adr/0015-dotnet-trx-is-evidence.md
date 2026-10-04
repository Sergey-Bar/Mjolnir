# ADR 0015 — .NET runs are evidence, not an absence of it

**Status:** accepted · 2026-10-04 · bumps `evidenceSchemaVersion` and
`forensicsSchemaVersion` to 2

## The problem

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

## The decision

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

## What this deliberately does NOT infer

**File paths.** TRX carries `className` as a dotted CLR type name
(`Shop.Tests.CartTests`) and never a source path. `TestRecord.file` is therefore
`"unknown"`, exactly as for JUnit. A dotted type name is not a path, and mapping
one onto the other would invent a source location no run ever reported.

The cost is real and is stated here rather than buried: test-level runtime
corroboration matches a finding's _line_ against a test's declaration span, so
it stays unavailable for .NET exactly as it is for JUnit. This ADR buys L3 file
and test-level corroboration for .NET. It does not buy span-level corroboration,
and no consumer should assume it.

**Per-attempt history.** A TRX `UnitTestResult` carries ONE outcome. Retries
appear as `<Execution>` entries under the test definition, cross-referenced by
id — that is a lookup table, not an ordered attempt log. So each record has
exactly one attempt and `TRUE-FLAKE` can never fire from this source. The
alternative, synthesizing a retry from two definitions sharing a name, would
invent evidence.

**Unknown outcomes.** Every `outcome` value this engine has not seen maps to
`skipped`, never to `passed`. `skipped` contributes nothing to "the suite passed",
so the default is the non-claiming direction. A silent default the other way
would let a new producer's vocabulary manufacture green runs.

## Why the version bump

Both constants move 1 → 2 because this changes what "the engine reached L3" can
_mean_: for a .NET repository it can now mean something it previously could not.
The `version-bump` compatibility policy on both entries is literal — an artifact
written by a 1.x engine carries an assumption (no TRX source exists) that no
longer holds.

`schemaVersion` and `trustModelVersion` are untouched. The trust ladder did not
move; only the set of runs that can produce evidence for it grew.

## What this does not change

No rule, tier, score or finding output changes. `csharp-*` rules are unchanged.
A repository that already had a recognised run report is unaffected — the new
convention only ever adds a candidate that did not previously exist, and the
parser returns nothing for a document that is not TRX.

## What remains open

Per-rule defect recipes, so a MUST-NOT-FIRE fixture can be _generated_ as the
must-fire fixture with the defect neutralised rather than hand-written a second
time and left to drift. `docs/SENSITIVITY-RATCHET.json` records the current
state: of 40 rules carrying both fixture legs, 2 have a negative fixture that is
plausibly the positive one with the defect removed. The remaining 38 are a
different program, so the pair shows the detector is directional and not that
the predicate is sensitive. This ADR does not touch that.
