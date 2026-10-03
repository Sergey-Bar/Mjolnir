# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Rule behavior changes (new rules, FP-rate changes against the corpus,
severity changes) are first-class entries here — rule IDs are immutable
once shipped, so this file is the record of what changed between versions.

## [Unreleased]

### Two core rules, measured: QA-PW-117 and QA-JV-101 - `ANTI-CREEP-EXCEPTION`

Law 1 requires an equal-size removal for every addition to the governed set.
This is an addition of **two** with nothing to remove, because the governed set
held **zero** core rules until now. The exception is recorded rather than the
baseline being edited, because `previousBaselineCore` is `0` on purpose: lowering
`baselineCore` to match the grown tier would make the growth read as zero and
switch the law off in one uncross-checked JSON edit.

The reason is that both are **measured** promotions, not declared ones.
`QA-PW-117` reached n=35 and `QA-JV-101` reached n=35, both with zero observed
false positives and a Wilson upper bound of **9.89%** against the 10% ceiling,
both adjudicated row by row against pinned source, and both found by a
corpus-wide `--core-candidates` sweep rather than by any global cap raise.
`measurementTier` returns `core` for each on its own evidence and
`declaredCoreWithoutEvidence` is null, so each declaration records a decision the
measurement had already reached.

Both had been demoted from core in 6.0 for exactly this reason, and
`src/rules/tier-evidence.ts` ranked `QA-PW-117` first among the nineteen most
likely to clear on a re-sample.

### Verification and enforcement overhaul

Track A of the verification-enforcement plan: the checks that could fail but
never ran, the readouts that disagreed with each other, and the two places where
a claim was made without a mechanism behind it. Nothing here changes what a
finding says except where stated (core tier, scoring model).

#### Added

- **`docs/PRECISION-RATCHET.json` — the PRECISION arm.** `check-fixture-quad`
  failed only on an over-claim (a capability advertising M3 without its four
  fixture legs). It had no arm for the leg that a fixture directory cannot
  satisfy: PRECISION needs someone to have classified the detector _silent_ on a
  real input. `npm run check-fixture-quad -- --update-precision` records the
  count of live rules holding a classified TN verdict; the gate fails below the
  recorded floor. **Recorded at 32, not 0** — 32 rules already hold a TN leg
  from the generated `--verdicts` pass, so a floor of 0 would have been
  decoration. The ratchet note says plainly that these are scanner-executed
  fixture legs: a _wiring_ proof, not an accuracy proof.
- **`docs/HOLDOUT-SPLIT.json` + `npm run holdout:split`** — the deterministic
  partition of corpus repositories into measurement and holdout that
  `claim-registry.json` blocked `rule-registry-census` on. The unit is the
  repository, never the row (a per-row split puts the same test in both halves
  and can be searched until the halves agree); the assignment is a salted hash
  of the repository id, not a list; and the single exclusion — repositories
  holding rows for an `isCoreCandidate` rule — is _derived_ from that predicate
  rather than declared, so it moves with the candidate set and cannot be edited
  into place. The holdout **validates, it does not gate**: core promotion reads
  the measurement partition, because a gating holdout would be sized by the
  corpus rather than by the question.
- **`docs/QUARANTINE-OWNERSHIP.json` — the quarantine exit ramp.** 34 rules were
  quarantined with no disposition recorded for any of them; `checkQuarantineOwnership`
  _reported_ that count and explained that a cap "would have to start at 34".
  The defect was not the number, it was that silence passed. A quarantined rule
  must now carry either a `quarantinePromotion` or a typed disposition with an
  owner, a rationale and a review date, and doctor **fails on silence**.
  Dispositions are derived from the Wilson interval: 26 `pending-samples`,
  3 `pending-measurement`, 4 `pending-remeasure` (a rework shipped and the
  verdict predates it), 1 `structural` (QA-TEST-003, whose proposed fix was
  implemented, measured, and rejected).
- **`RETRACT` in `corpus:apply-verdicts`, and `--verdicts-dir=`.** The orphan
  rule in `tests/corpus/verdicts/README.md` said an orphaned row "must be
  removed" and there was no mechanism for it — only a tool that fills blanks.
  A verdict recorded on a row whose finding is not there is worse than a stray
  row, because it becomes evidence. `RETRACT` removes a blank row and records
  nothing, and **refuses** a row that already carries a verdict. The
  `--verdicts-dir` flag exists because the retraction path was otherwise
  untestable without writing into the live corpus mid-run.
- **`mjolnir doctor` runs from an installed package.** It defaulted its target
  to `process.cwd()`, so a user who installed the CLI and ran `doctor` in their
  own project got `No fixtures directory … Run from the mjolnir repo root.` — a
  self-audit reachable only from the source tree. With no target it now resolves
  the installed package from `import.meta.url`. `package.json#files` ships what
  the self-audit reads (`tests/fixtures`, `tests/corpus/verdicts`,
  `src/rules`, the two baseline JSONs, CHANGELOG) — without `src/rules` the
  installed audit is INCONCLUSIVE on detector identity. Verified by packing a
  tarball, installing it into a fresh project and running the published binary.
- **Doctor check `core-floor-declaration`.** The interlock that makes the core
  floor safe to ship: a core rule may not declare `evidenceLevel: "E0"` in its own
  metadata. `checkEvidenceHonesty` cannot catch it and the gap is structural —
  it fails a rule for claiming _more_ than its `findingType` supports, and E0 is
  the bottom of the ladder.
- **`tests/corpus/verdicts/proposed/`** — the staging area for adjudications
  awaiting ratification. Committed verdicts are immutable
  (`tests/corpus/verdicts/README.md:191`), so staging is the only reversible
  form.

#### Changed

- **The core tier carries a floor** (ADR 0014). `capForTier` becomes
  `policyForTier`; core gains `CORE_FLOOR = { evidenceLevel: "E1" }`. Until this,
  core and extended were enforced _identically_ — `capForTier` returned `null`
  for every non-quarantine tier, so reaching core changed the dedup tie-break,
  the M3 ceiling and the census readout, and nothing a scan consumer could see.
  `E1` and not `E2`: E2 is a claim that a finding is _proven_, which is what
  runtime corroboration asserts per finding, not what a tier policy may.
  Severity is deliberately untouched — one bounded field, changed on purpose,
  two is a rewrite.
- **`SCORING_MODEL_VERSION` 1.0.0 → 2.0.0.** A core finding's deduction moves
  from 0 (E0) to `floor(base/2)` (E1). `semver + ADR required` per the entry's
  own policy. **`TRUST_MODEL_VERSION` stays at `1.0.0`** and ADR 0014 states why
  rather than leaving it implicit: `deriveTrustLevel` _does_ consume
  `evidenceLevel`, but the E→L mapping is unchanged — what moved is the
  distribution of inputs, and a consumer reading `evidenceLevel` sees the same
  fact. Bumping both would teach the version that "something moved".
- **An absent tier is no longer treated as core.** `policyForTier(undefined)`
  returns an empty policy. `buildUniversalRules` resolves every _registry_ rule
  through `effectiveTier` and adds a plugin only when it declares a tier, so a
  missing entry means "a third-party rule that claimed nothing". The old
  docstring said "undefined tier = core"; with a floor that would have raised
  every plugin's E0 finding to E1 and started charging third-party detections —
  the trust escalation TI-013 exists to prevent, introduced by the ADR written
  to close a trust gap.
- **`npm run rules:quality:check` is a claim-integrity leaf.** It was declared
  as the nightly gate `gate:rule-quality` and wired to nothing, so the gate ran
  on a schedule that never reached it.
- **`check-fixture-quad` writes `docs/FIXTURE-QUAD.json` by default.** It wrote
  only under `--write`, and nothing in this repository passes `--write`, so the
  gate printed a census to a terminal nobody reads and left no artifact — a
  backfill in progress was invisible in a diff. `--check` verifies the committed
  artifact instead.
- **The measured/unmeasured census is 73/6, not 74/5.** Six documents asserted
  74/5. Note the trap: 74 is _also_ the number of rules declaring a tier
  explicitly (79 − 5 omitted), so "74" was accidentally right about a different
  population.

#### Fixed

- **`src/rules/registry-census.ts` answered `stale` and `tier` with local
  predicates, and both were wrong.** `stale` asked `MEASURED_FP[rule.id] !==
undefined` about a map the generator pre-filters to revision-matching rows, so
  it was false for every stale rule and `staleCount` was structurally 0. `tier`
  re-derived the ladder as `declared ?? (measured ? core : extended)` — a third
  copy of the tier resolution and the only one not reading `effectiveTier` — so
  the five rules with no declared tier printed `core` here and `extended`
  everywhere else. A census that disagrees with doctor is not a census.
- **`scripts/v6/check-rule-quality.ts` had the mirror defect.** Its `stale` loop
  re-derived from the revision-filtered map, so a stale row was never in it and
  `measuredAtStaleRevision` read **0** while two rules (`QA-PY-004`, `QA-PY-007`)
  carried hand-classified verdicts taken against an earlier detector. It now
  reads **2**, and the registry skeleton agrees with the census at 73/6.
- **`checkQuarantineOwnership`, `checkAntiCreep` and the disposition read all
  resolved files from `process.cwd()`.** With `doctor` reachable with no target,
  CWD is wherever the user happened to be — their project, not the checkout — so
  the audit read the wrong CHANGELOG and the wrong baseline. All three now take
  the checkout root as an explicit parameter.

#### Not changed, and why

- **Retired-rule fixture directories were not deleted.** The plan called for
  removing `tests/corpus/positive-fixtures/QA-PW-145/` and
  `tests/corpus/negative-fixtures/QA-PY-102/`. That contradicts a binding owner
  ruling (`docs/RULE-LIFECYCLE.md:193-196`, 2026-09-08, E-1): _"fixture dirs
  stay on disk (the doctor's fixture-integrity check discloses them instead of
  failing)"_, implemented at `src/commands/doctor.ts:1136-1139`. The directories
  and the exemption stand; the ruling is recorded, not overruled.
- **No core rule was promoted.** See below.
- **`claim-registry.json` claim 2 stays BLOCKED.** `candidateSha` is `null`, and
  the checker refuses a non-BLOCKED claim on an unproven candidate, so the
  artifact/digest/authority the plan asked for could not be recorded without
  asserting independence nobody observed. The blocker is narrowed to what is
  actually missing: the split exists, but no holdout _evaluation_ has been run
  against it, and it is still produced by this repository.

### Adjudication: 23 rows, 6 orphans, and the FIRST defect in the sampler

Every row was read at the corpus's pinned commit (`keycloak @ 421c23f5221d`,
`playwright-java @ c17b6060bd39`, `sveltejs-kit @ bf6833a639c9`), and each cited
line independently re-verified by enumerating every `@Ignore`/`@Disabled` /
`test.describe.serial` in the pinned file rather than trusting the ±6-line window.

**Six rows were orphans and were removed rather than judged** — and finding them
turned up a defect that made orphans inevitable:

> **`scripts/corpus-sample.ts` cloned the default branch and ignored `repo.ref`.**
> It ran `git clone --depth 1 <url>` — HEAD — then `rm -rf .git`, so nothing
> downstream could tell. Every verdict is adjudicated against the _pinned_ commit
> via `npm run corpus:verdict-context`. Those are two trees, and they drift.
>
> On keycloak that produced a repeating phantom: the pinned `JWETest.java` has
> exactly three `@Ignore`, on lines 73, 113 and 202, all three already adjudicated
> `TP` — and the sweep kept emitting rows citing **74, then 114, then 203**, the
> same three annotations cited one line late, each arriving as a fresh
> unclassified row that looked like new evidence.
>
> Four of those were caught by hand during the first adjudication pass. That was
> luck, not a control: a row whose drifted line happened to still land on a
> trigger would have been judged against source the verdict claims to describe and
> does not. `cloneRepo` now fetches `repo.ref` the way `tests/corpus/audit.ts`
> always did, **verifies** the checked-out SHA and hard-stops on a mismatch, and a
> cached clone is verified rather than trusted by existence.

Retracting a row also proved non-durable: `corpus-sample.ts` de-dupes on the
`ruleId|file|line` keys present in a `.jsonl`, so the instant an orphan was
removed the next sweep re-found and re-appended it. `apply-verdicts` now writes
**tombstones** to `tests/corpus/verdicts/retracted.jsonl` and the sampler reads
them alongside the verdicts — because an orphan rule that regenerates its own
evidence is not an orphan rule. The generator and its spec then needed the same
exclusion, since a tombstone has no `file`/`line` and parses as a verdict with
`undefined` fields.

**The two rules that earned core, and how:**

| Rule        |           n |             ciHigh | the last row                                                                                 |
| ----------- | ----------: | -----------------: | -------------------------------------------------------------------------------------------- |
| `QA-PW-117` | 24 → **35** | 13.80% → **9.89%** | sveltejs-kit `test.describe.serial('Errors')` — six tests, each its own URL, no shared state |
| `QA-JV-101` | 23 → **35** | 14.31% → **9.89%** | keycloak `@Disabled("Only for PUT/POST")` on an **empty-bodied** override                    |

Both cleared by the same arithmetic — `z²/(n+z²)` ≤ 10% first holds at n=35 — and
both were funded by a corpus-wide `--core-candidates` sweep rather than by any
global cap raise. The `QA-JV-101` row is the purest instance of the rule's
diagnosis in the whole corpus: a disabled test with **no assertions** cannot hide
a defect, because it could not have detected one.

Neither sweep was unbounded: `CORE_CANDIDATE_CAP` stayed at 35 and the cap was not
raised to chase a number. `QA-JV-101`'s file carries two further
`@Disabled("Only for PUT/POST")` overrides at `:107` and `:113` that remain
**unfunded and unclassified**, because at n=35 the budget is zero. That is the cap
doing its job, not an oversight.

A third core rule now needs no hand record: `conformity`'s `CLAIM_OWNED` accepts a
claim the measurement derives independently, which is what `checkRegistry` and
`declaredCoreWithoutEvidence` already did. `QA-JV-101`'s entry in the 6.0 demotion
table also carried a justification describing a _different_ rule's premise
("static mutable shared across tests"); it is gone with the entry, and the
remaining eighteen are unaudited — named here as a finding, not fixed.

### Adjudication of the 23 sampled rows — staged, then applied

Every row was read at the corpus's pinned commit (`keycloak @ 421c23f5221d`),
following the convention the already-committed rows in the same file establish.
**19 rows are adjudicable; 4 are orphaned and are removed rather than judged.**

Three of the orphans are `QA-JV-101` rows citing `JWETest.java:74`, `:114` and
`:203`, where the `@Ignore` is on line 73/113/202 — the same annotations already
adjudicated `TP` one line up. A verdict on any of them would have counted one
annotation twice and moved a rule's `n` on the strength of a finding that is not
at that line. The fourth is `QA-PW-117` citing `details.spec.ts:20`, a
`const clientId = …` line with no `test.describe.serial` on or beside it; the
serial block at `:16` is already adjudicated.

### Added: a Conformity Monkey for the rule registry

Netflix's Simian Army does not decide what a good cloud is. It applies a set of
**declared** rules to every resource, marks the ones that do not conform, records
which rule broke on which resource, and notifies the owner. Three properties make
it work, and this gate reproduces all three:

- the human is **not in the detection loop** — a machine decides, every run, for
  every rule;
- the human **is in the response loop** — a nonconformity is fixed, or explicitly
  opted out, and the opt-out is recorded;
- **`leashed`** runs every check, writes the report and sends nothing. That is
  the mode a new check ships in; arming is a separate, deliberate act.

`npm run conformity` (`scripts/check-conformity.ts`) computes four checks per
rule, all decidable by the tree — **no judgement, and therefore no queue**:

| Check              | Question                                                               |
| ------------------ | ---------------------------------------------------------------------- |
| `MEASURED`         | does a current measurement exist?                                      |
| `DETECTOR_CURRENT` | was it taken at the detector revision that produced the finding?       |
| `CLAIM_OWNED`      | does a core/quarantine claim carry an owner and an unexpired date?     |
| `QUAD_COMPLETE`    | do all four fixture legs exist? (RECALL and PRECISION are _generated_) |

**What it found: 17 of 79 rules are clean.** 62 fail at least one check, and the
sharpest one is about a field in this repository's own registry:

> `quarantinePromotion` carries the docstring "a rule in quarantine WITHOUT one is
> a rule whose quarantine is permanent by default, which is the outcome the tier
> exists to avoid" — and **0 of 34** quarantined rules have one.

Also: 2 rules carry a false-positive rate measured against an **earlier detector
revision**, displayed everywhere as if current; 6 have never been measured at all;
21 have an incomplete quad; 39 have no MUST-FIRE or MUST-NOT-FIRE fixture.

### Added: the opt-out registry as a ratchet, not a gate that is red forever

`docs/conformity-opt-outs.json` records every known nonconformity with a named
owner, a reason a reader can check, and **a date it lapses**. The gate fails on a
nonconformity with no entry, on an entry whose date has passed, and on an entry
for a rule that now conforms — so the set can only shrink, and known debt decays
on a schedule instead of persisting because nobody re-looked at it.

This is why it is a ratchet and not a plain gate. A gate that went red on all 62
rules on day one would stay red and read as noise — which is how raising
`MAX_SAMPLES_PER_RULE` produced **1,121 unadjudicated rows nobody looked at**.
Adding an opt-out is the only way to make the gate green for a known defect, and
an added entry is a **smaller diff than the evidence that would retire it**. That
asymmetry is the enforcement.

Expiry is the engine: 34 entries lapse **2026-11-01** and 28 lapse **2026-12-01**.
Nothing in the corpus opinion-measurement chain does, which is why the 23 pending
adjudications were debt with no date.

### Why this does not replace the corpus false-positive rate

That measurement asks a human "is this code legitimate?", which is the one
question no tree can answer. Deriving it from the detector's own declaration
would be circular — the detector fired, so the detector is right, so every rule's
rate is zero — and that is the shape GAP-M26-002 records: "a 429-row ledger with
zero judgement got certified against its own output". This gate checks what the
tree CAN answer; the opinion stays where it was.

### Fixed: an unreachable state, found by the gate that shipped it

The first version of `src/rules/conformity.ts` modelled "unmeasured" as a third
state beside CONFORMING and NONCONFORMING. The gate printed `unproven: 0` on its
first run — the state was **unreachable**, because every unmeasured rule here also
fails something else and so read NONCONFORMING. A law that can never fire is not a
law, and `registry-ratchet.spec.ts` already says that about its own floor.
`unmeasured` is now an orthogonal flag beside the state, and reports 6.

`--opt-outs=`/`--report=`/`--today=` exist because the tests need them, and each
one is a place the gate could have been right for the wrong reason: the first
fixture attempt copied the module graph behind `src/rules/index.ts` into a temp
tree and died in the ESM resolver before reading a single rule.

**Verified by planting each defect in the real registry before writing any of
this**: a lapsed date reported 34 gaps, a deleted entry reported one UNRECORDED,
and an entry added to a conforming rule reported one STALE. Each reverted to
`gaps: 0`. 20 arms in `tests/contract/conformity-gate.spec.ts` keep that.

One new npm script (`conformity`) and one new leaf in `gates:claim-integrity`.
`entry-points:check` still reports 9 commands against a ceiling of 12.

### Changed: the unclassified-backlog assertion is a two-sided ratchet, not a zero

`tests/contract/verdict-context.spec.ts` asserted **zero** unclassified verdict
rows, and 23 pending rows make that false for as long as the work takes — so the
assertion would have been red for the entire classification window.

It now asserts the live backlog **equals the figure `unclassified-ceiling.json`
records**: greater means the backlog grew without review, less-but-not-zero means
classification is half done and the commit captures a state nobody agreed to.
`generate-fp-audit-table` already enforces the same ceiling per FILE, so a second
file's first row cannot hide inside a generous total — which is why the assertion
here is on the total and the generator's is on the parts.

The count this file asserted before that was 28, and it existed so the number
could not go quietly stale. It has been replaced by an assertion that cannot go
stale in either direction, which is what it was for.

### Added: a fourth naming contract — a relative link that resolves to nothing

`check-cli-contract` now fails when a live markdown document links to a file that
does not exist. A link is a name, and it was the only kind of name none of the
three existing contracts could see: the removed-verb pass looks for verbs, the
reference pass looks for `npm run`, and a link to a document deleted two releases
ago looks like neither.

Its five live instances were all real:

| Document                          | Target                         | Now                             |
| --------------------------------- | ------------------------------ | ------------------------------- |
| `docs/PRODUCT-DECISIONS.md` (D-9) | `EXTERNAL-EVIDENCE-REQUEST.md` | reworded; points at the runbook |
| `docs/RELEASE-PATH-RUNBOOK.md`    | `EXTERNAL-EVIDENCE-REQUEST.md` | reworded; names the retirement  |
| `assets/brand/README.md`          | `src/reporter/score-state.ts`  | `presentation.ts`               |
| `docs/design/BRAND-SYSTEM.md`     | `src/reporter/score-state.ts`  | `presentation.ts`               |
| `docs/MAINTAINERS.md`             | `CONTRIBUTING.md#governance`   | `../CONTRIBUTING.md#governance` |

`isLiveSurface` is reused verbatim rather than reimplemented, so archives,
captured artefacts, frozen reports, preserved rule docs, `docs/adr/` and `tests/`
keep the exemptions they already had. A second exemption list would be a second
thing to drift from the first, and the drift shows up as a file protected from
one contract and not the other — exactly how
`docs/RELEASE-3.0.0-READINESS.md` came to be exempt from one and not the other.

Scope is markdown, inline links and images, path resolved and anchor not, on
measurements rather than guesses: a link-reference definition whose value is
itself a link (`[^pit]: PIT, [PIT](https://pitest.org)`) is a footnote, and
guessing produced **30 false positives in one research document** on the first
attempt. Fenced blocks and inline code spans are blanked because documentation
about markdown contains markdown. An extensionless target also resolves as
`<target>.md`, which is the site's clean-URL convention. 239 links are checked.

15 arms in `tests/contract/cli-contract-dangling-links.spec.ts`, each inherited
exemption asserted as an exemption. One of them was written backwards: I assumed
the pass excluded `docs/adr/` and it does — which is why ADR 0012's dangling link
had to be found by hand. The arm now records that.

**Not fixed, and named:** `scripts/check-external-evidence.ts` still reads
`docs/EXTERNAL-EVIDENCE-REQUEST.md`, which the 6.0 M26-M50 retirement deleted, so
`npm run docs:external-evidence` exits 2 and `npm run certify:integrity` cannot
complete. Its `EXTERNAL_BOX_CEILING = 39` is a number about a file that no longer
exists, and lowering it to the 18 rows the runbook actually carries would be a
recorded number lowered to make a gate pass. D-9 now says so in the document
instead of continuing to cite a deleted file as the authority for it.

### Added: every workflow step's file argument resolves

`workflow:scripts` answers "does this NAME resolve". The other half of a step is
"does this FILE resolve", and `.github/workflows/ci.yml` shipped a step naming
`scripts/diff-detector-hashes.ts` — a file that has never existed. The capability
was present throughout (`scripts/check-detector-hashes.ts` documents
`--base <manifest>`) and the step has been corrected to name it, but a corrected
line is not an invariant and nothing said so. **11 file arguments across 21
workflows now resolve**, against the same `working-directory` resolution and the
same `EXEMPT_FROM_SCRIPT_CHECK` list the name check uses.

Verified on the real tree before it was codified: plant the typo in `ci.yml`, the
gate reports the file and the job, revert, the gate passes. 8 arms in
`tests/contract/workflow-scripts.spec.ts` keep that.

Two scope decisions are load-bearing. A token counts as a file only when it is a
bare relative path with a code extension after an interpreter — otherwise
`./actionlint`, which the previous step downloads, would be reported missing on
every run forever, and the fix would be an exemption. And `dist/` is a **build
output**, not a repository file: `node dist/cli.mjs` is how six workflows invoke
the CLI, so checking it would make this gate red on a clean checkout before
`npm run build` — which is what `npm run certify:fast` and a bare
`npm run workflow:scripts` see.

### Fixed: the surface scan counted every document under `docs/` twice

`check-cli-contract` walked `"", "docs", "site", ".github/workflows"`, and
`walk("")` is a walk of the repository root that already descends into the other
three. Every file under `docs/` and `site/` was read twice and reported twice, so
the printed `surfacesScanned` overstated the surface the gate checks.

### Added: ADR 0013, and a kill criterion that is not only a command count

`docs/adr/0013-the-core-ceiling-is-decided.md` records what two independently
chosen constants implied and nobody decided. `src/rules/measurement.ts` carried a
docstring reading `!! UNREACHABLE AT THE CURRENT CORPUS CAP` — arithmetically
correct, and a product decision written as a property of the code. It said _don't
bother_ where it should have said _this is unresolved_.

The ADR holds the ceiling at 10%, keeps `MAX_SAMPLES_PER_RULE` at 20, and gives
funded candidates the cap the arithmetic requires. It also records what it does
**not** decide: re-homing the 39 external-evidence boxes, and anything a core rule
might need beyond the quad and the interval.

`docs/ROADMAP.yaml`'s 6.0 kill criterion said `npm run check` must fit in 12
commands. A command count is necessary and not sufficient — the tier system has
to have a reachable top, or the cut only removed the words. It now says so, names
the arithmetic, and points at the ADR.

### Added: `--core-candidates`, a sampling mode that spends the budget where it can be spent

The core ceiling is 10% on the Wilson upper bound, so a rule earns core at
**n ≥ 35 with zero observed false positives** (`samplesForZeroFp`). The corpus
sampler capped at 20, so the tier was unreachable — and 6.0 found out the
expensive way that raising the cap globally does not fix that: a raise to 40
produced **1,121 unadjudicated rows across 42 rules** and
`unclassified-ceiling.json` refused them, correctly.

The global raise was the wrong ALLOCATION, not the wrong idea. It spends 35+
samples on rules that cannot use them — a rule already observed wrong, or one
whose interval already excludes 10% from below — while the adjudication budget is
finite and belongs to a person.

- `--core-candidates` emits rows **only** for a rule that observes zero false
  positives and whose `straddleDetail` reports that more clean samples would
  settle it, and only those rules may draw up to 35 instead of 20. The predicate
  is derived from the live registry on every run
  (`scripts/lib/core-candidates.ts`), so a rule crossing the line stops being
  sampled without an edit.
- `--core-target <RULE-ID>` (repeatable) says which candidates this pass
  **funds**. The predicate is worth **29 rules** today; the nearest two are 11 and
  12 rows from the ceiling. Conflating "who can earn a tier" with "who gets
  funded this pass" would move the ceiling by an amount nobody decided, so the
  two are separate and naming a rule that is not a candidate is an error rather
  than a silent no-op.

Filtering is on **emission**, not only on the cap. A cap-only change would still
emit rows for every rule below n=20 — the 1,121-row failure with a different
number on it.

No npm script, CLI verb, gate or rule was added.

### Fixed: three defects the first real `--core-target` run found

- **The mode asked for twice the work it promised.** `tests/corpus/verdicts/unclassified-ceiling.json`
  moves by the number of rows a person is shown _before_ they are asked to
  classify anything, so that number has to be exact. The first run collected 35
  samples per rule and appended **46** rows against a projection of 23, because
  de-duplication is per verdict FILE and keycloak's file already held 19
  `QA-PW-117` and 10 `QA-JV-101` rows. The budget is now on **rows**, not
  samples — `cap − classified − already pending` — computed against the same key
  set the writer de-dupes with, by one shared function. Re-running the identical
  command now adds **0** rows, which is the property that stops a scoped pass
  from silently exceeding the ceiling twice.
- **A scoped run deleted the review sheets it claimed to preserve.**
  `writeReviewSheets` carried a comment describing exactly this protection while
  the condition underneath did the opposite: `!sampledRules.has(id)` is true for
  every rule a `--repo` or `--core-candidates` run did not visit. A one-repo
  targeted pass deleted 8 committed sheets (`QA-PY-002/003/004/007/009/011/012`
  and one more) of pending owner work. Sheets are now removed only for rules that
  are no longer live; a rule that was visited and sampled nothing still removes
  its own sheet, because "the queue is empty" is a different statement from
  "nobody looked".
- **The unclassified-ceiling gate named the wrong cause.** It throws
  `(23 > 31)` for a run whose total was 23 and whose ceiling was 31, because the
  trigger is usually a **per-file** regression — a new file's first row exceeds
  its allowance of 0 while the total stays inside the ceiling — and the message
  only ever compared the two totals. It now says which condition fired and names
  the files.

### Changed: the unclassified ceiling, re-recorded at its reviewed value

`31 → 23`, and `byFile` drops three stale entries for files whose pending rows
have since been adjudicated away (`pallets-click` 1, `pytest-dev-pytest` 27,
`new-repo.jsonl` 3) in favour of a new allowance for `keycloak-keycloak.jsonl`.

The 23 rows are the scoped pass above: `QA-PW-117` +11 (n=24 → 35) and
`QA-JV-101` +12 (n=23 → 35), awaiting human adjudication per
`tests/corpus/verdicts/README.md`. **Not** 31 → 54: the live backlog had been
classified down to 0 since the 31 was recorded, so this pass is 0 → 23, and a
ceiling of 54 would have authorised 31 rows of pending work nobody asked for.
Zero slack is the correct reading — the next pass must be acknowledged too.

`measured-fp.generated.ts`, `docs/FP-AUDIT.md` and `docs/COUNT-LOCK.md` are
unchanged, which is the point: blank rows are dropped, not counted, so 23
unadjudicated findings move no rate until a person classifies them.

### Changed: both plan targets already had a complete fixture quad

`docs/CORE-READINESS.md` lists `QA-PW-117` and `QA-JV-101` as needing the
four-leg quad. Measured against the tree, both already have all four:
`MUST-FIRE` and `MUST-NOT-FIRE` fixtures on disk, 17 and 7 adjudicated `TP` rows
and 12 and 8 adjudicated `TN` rows with zero `FP` in
`tests/corpus/verdicts/quad/`. Nothing was authored, and the 10% ceiling still
does not unblock 6.0.0 on its own — D-1 needs both the interval and the quad, and
only the interval is missing.

### Added: agent skills, and the wiring that makes them load

The repository had four agent skills under `.claude/skills/` and no way for
Kilo to see them. Kilo reads that directory only when the user-level Claude
Code Compatibility setting is on, so on a default install the committed skills
were dead weight in that harness — and `.kilo/` cannot hold them instead,
because `.gitignore` ignores it as machine-local agent state. `kilo.json` now
carries a `skills.paths` entry pointing at `.claude/skills/`: one tracked copy,
both harnesses, and the wiring visible in a diff. `docs/EXTERNAL-CONFIG.md`
records what that file now declares.

Nine skills were added alongside the existing four, all written against this
repository's own gates rather than imported wholesale:

- `rule-author` — the full rule lifecycle: ID allocation and non-reuse, the
  must-fire and must-not-fire fixture firewall, the four quad legs, registry
  registration, the gates a rule change invalidates, and the
  deprecation/retirement path from `docs/RULE-LIFECYCLE.md`. The 19-line Copilot
  agent in `.github/agents/` covered the first half of this and nothing else.
- `change-gate` — a diff-to-checks map, because `npm run check` is ~8 minutes
  and the lever that moves it is running the row that covers the change. Names
  only scripts `package.json` defines, which
  `tests/contract/docs-consistency.spec.ts` greps every tracked `.md` for.
- `surface-law` — law 0 as a procedure: what counts as the governed surface,
  the twelve-leaf ceiling, and the two legal ways to grow.
- `evidence` — the agent safety contract, including the rule that
  `INCONCLUSIVE` is a result and never laundered into a pass.
- `skill-author`, `verification-before-completion` — adapted from
  `obra/superpowers` (MIT), the parts that decide whether a skill gets opened
  and whether a claim gets evidence.
- `prose-honesty` — adapted from `blader/humanizer` (MIT), fenced so it cannot
  touch a generated page, an asserted surface, or a registered claim.
- `quarantine-remediation` — the 34 quarantined rules are capped to
  `severity: info` and `evidence: E0`, so they cannot fail a build; 34 of 79
  rules are in that state and seven measure 0.0 % FP. `doctor` reports that
  **none** carries a `quarantinePromotion`, so none has an owner, a review date
  or an exit condition — the mechanism exists on the `Rule` type and has never
  been applied. The skill covers the ladder, the Wilson-interval criterion that
  replaced the point estimate in 6.0, and the promote/rework/retire decision.
- `skill-supply-chain` — the scan procedure for a skill before it is installed,
  since a skill is code that runs with the agent's permissions.

No npm script, CLI verb, gate or rule was added, so law 0's ratchet does not
move.

### Fixed: `check-cli-contract` and `docs-consistency` disagreed about one file

`npm run check` was red on `main`: `check-cli-contract` failed on
`docs/RELEASE-3.0.0-READINESS.md`, which names `npm run m26:audit` in its
command table. `scripts/release-verify.ts` records that script as removed in
6.0 with the M26 ledger, so the name was real when the report was written and
the report is dated 2026-09-25.

`tests/contract/docs-consistency.spec.ts` already exempted exactly that file, by
name, with the reasoning written out: a readiness report for a version that
shipped is a record, not an instruction. Two gates catch the same class of
dangling name, and the file was exempt from one that still tripped the other —
an exemption made by accident rather than by decision. `check-cli-contract.mjs`
now carries the same entry in a named `FROZEN_REPORTS` list, mirroring the
existing `CAPTURED_ARTEFACTS` shape, and skipping it in both the removed-verb
pass and the dangling-name pass. The list is by name, not by pattern, so it can
be argued with per file.

`tests/contract/cli-contract-dangling-names.spec.ts` locks both halves, because
an exemption nobody tests is a blind spot with a comment on it: a dangling name
in a live surface still fails, the frozen report still passes, a live doc beside
the frozen one still fails, and the real tree passes.

### Decided against, on measurement: the 500-word skill budget

`skill-author` carried an upstream rule of "under 500 words". Eight of eight new
skills broke it on the first pass, from 721 to 1222 words — which is the shape
of a target nobody measured rather than a target anybody met. The figure was
wrong for this class of skill: most of the excess is procedure that only runs
once, and in `prose-honesty` a 22-row lookup catalogue that nobody reads to fix
one sentence.

So the rule now sorts by shape — a procedure carries a word budget, a lookup
table is always a sibling file — and the number is measured rather than
guessed. Two lookup structures moved out: `prose-honesty`'s catalogue to
`patterns.md` (body 126 → 85 lines), and `skill-author`'s failure-classification
table plus its no-baseline-run fallback to `baseline-failure.md` (204 → 166
lines). Both are cases the rule's own branch rule covers: a catalogue is
scanned for one row, and the fallback is only read when there is no baseline to
classify.

The ceiling lives in `budget.md` rather than in `skill-author`'s body, and that
placement is the part worth keeping. A meta-skill that states its own budget
counts toward it: writing "1250 words" into the body made the body 1251. Moving
the figure one file over removes the self-reference, so the ceiling can be
1300 against a measured maximum of 1264 and stay checkable.

The record that the number moved, when, and against what measurement sits in
`budget.md`. A ceiling that moves silently is the arithmetic of law 0's
`baselineCore` edit: the arithmetic reads zero and the law reads as satisfied.

### The baseline-failure step: a discoverability audit, and its limit

`skill-author` prescribes a RED step — watch an agent fail the task before
writing the skill. That did not run; these skills were written from
`docs/RULE-LIFECYCLE.md`, `CLAUDE.md` and the gate sources. The substitute that
could run is a discoverability audit: for each load-bearing fact, is it
reachable from the repository today?

| Fact                       | Reachable from                                                   |
| -------------------------- | ---------------------------------------------------------------- |
| a path→gates map           | `docs/archive/` only — nothing live                              |
| directory → rule-ID prefix | `src/rules/index.ts`; no live doc states the mapping             |
| the four quad legs         | `src/v6/fixture-quad-probe.ts` and an archived plan              |
| rule IDs are never reused  | `docs/RULE-LIFECYCLE.md`, `docs/ARCHITECTURE.md`, `src/types.ts` |

So `change-gate`'s content was nowhere to be found, the prefix table and the
quad vocabulary were reachable only from source, and the ID non-reuse rule was
already documented — that line is a guardrail kept for cost, not for novelty.

This proves the knowledge was not already available. It does not prove the
skills work; only watching an agent use one answers that. `skill-author` now
records the substitute and its limit, so the next author knows which of the two
they actually ran.

### Fixed: the quarantine report named a field that does not exist

`CorePromotion` declares five fields — `rationale`, `owner`, `grantedAt`,
`expiresOn`, `evidenceRefs`. There is no exit-condition field, and `rg` finds
the phrase nowhere in `src/`, `docs/` or `tests/` except in two places that
were both telling the reader to go looking for one: the `quarantinePromotion`
doc comment in `src/rules/rule.ts`, and the detail message
`checkQuarantineOwnership` prints about the largest open item in the tree.

A report that describes a shape the contract does not define is the same
defect class as a rule reporting a metric it never measured — the reader is
sent to do work against a field that is not there. The message now names the
three a backfilled record actually has to supply, and the expiry date is
labelled as what it is, since it is the exit condition in substance.

`tests/contract/quarantine-record-honesty.spec.ts` locks it by parsing the
field list out of the type rather than restating it, so it fails if the type
gains a field the message omits and if the message ever names a phantom one.
Verified by mutation: all three arms fail against the previous wording.

### Verification

`npm run test` is 11,992 passing with zero failures across 493 files. `npm run
lint`, `typecheck`, `check-version`, `claims:check`,
`candidate:manifest:check`, `entry-points:check`, `config:consumers`,
`scripts:reachable`, `gates:check`, `check-concepts`, `check-cli-contract`,
`check-certification-surface`, `check-detector-hashes`, `check-fixture-quad`,
`docs:provenance-drift`, `check-carve-manifest`, `qa-ir:parity` and
`docs:roadmap:backlinks` all pass.

### Corrected: what `npm run check` was actually red on

The previous version of this entry named a coverage threshold and blamed
`src/commands/share.ts`. Both halves were wrong, and neither was checked:

- `frontier:contracts` is **not** a leaf of `check`. `package.json` has `check`
  as nine terms (`build`, `typecheck`, `lint`, `test:coverage:ci`,
  `check-version`, `gates:claim-integrity`, `docs:regen`, `self-scan`,
  `doctor`); `frontier:contracts` (`vitest run tests/contract/`) is declared in
  no chain at all, and `certify` invokes that command directly rather than
  through the name.
- A bare `vitest run tests/contract/` collects no coverage — `--coverage` is
  what enables the provider — so `perFile: true` could not be the mechanism
  either.

What was actually red was two generated artifacts that had not been refreshed:

- `docs/BLAST-RADIUS-AUDIT.md` recorded `src/commands` at 11,988 lines against
  a live 11,990, because the `GATE_COMMAND` de-duplication in `share.ts`
  removed two lines from a file the audit counts.
- `candidate-trust-manifest.json` failed `workingTreeSha256 drift`, which is
  what it is for: it hashes the tree it was stamped against.

Both are the same failure mode as the exemption added above — an artifact that
describes a state nobody refreshed — and `scripts/refresh-generated.mjs` is the
tool that fixes them, in the one order that converges.

### Fixed: the convergence tool could not converge

`scripts/refresh-generated.mjs` ran `docs:translations:sync` and
`docs:translations`, both deleted by the v6 positioning carve (#697) along with
the 20 translated READMEs, and formatted `README.*.md`, a glob that has matched
nothing since those READMEs went. Prettier exits 2 on a pattern with no files,
so the refresh reported `FAIL` on three entries and exited non-zero: the tool
whose entire job is "make the tree agree with its generators" could not be run
to completion.

Nothing caught it. `npm run check` does not run this file,
`scripts:reachable` answers the opposite question — is a script reachable FROM
a caller, not does every name it invokes resolve — and `check-cli-contract`'s
dangling-name rule reads `.md`, workflows, the Action and the reviewer config,
not `scripts/**`. Two gates, two different blind spots, one script that could
not do the one thing it exists to do.

The dead entries are removed and the glob is `README.md`. The `npm run <name>`
inside a `.mjs` gap is **not** closed here: the shape a general fix would need
was measured, and the placeholder convention this repository already uses —
`scripts/check-ci-local-parity.mjs` writes `npm run X` chains and `npm run Y`
prose — is indistinguishable from an invocation by regex alone. Recorded rather
than shipped as a gate that reports its own source.

### Decided against, on measurement: the script-layer cut

`npm run check` is ~8 minutes, and the test suite is 79 % of it. All 38 gates
together cost 100 seconds, so cutting the gate surface from 39 to 12 — the plan's
`~60 script files / ~45 npm scripts` target — would save under 15 % of the wait,
while deleting checks that caught six real defects during 6.0. The numbers, the
arithmetic and the alternative levers are recorded in the `6.0.0-rc.1` entry
below and in `CLAUDE.md` law 0, so the question no longer has to be re-argued
from file counts.

## [6.0.0-rc.1] — 2026-10-02

Theme: **two words and one number**. A first run reads `GATE` / `WARN` and
nothing else, and it names the command that makes the scan a gate. Everything
below is either a subtraction or a correction of a surface that stated the
opposite of its own law.

### Fixed: three README claims and the gate that let them ship

`README.md` said the published line was `3.0.0` and the working tree
`4.0.0-rc.1` while `package.json` was `5.1.0`; its Status heading read
`**Version 3.0.0.**`; and its exit-code table documented exit `2` as
"Partial scan… **Never blocks**" — the exact wording
[`docs/VERSIONING.md`](docs/VERSIONING.md) withdrew when it made exit `2` a
failure.

The exit-code one had a gate: `tests/contract/exit-code-contract-docs.spec.ts`
matched `/partial[^.\n|]{0,40}never blocks/`. The character class excluded
`.`, and the README's cell reads as two sentences —
`Partial scan (time budget hit, unreadable files). Never blocks.` — so the one
gate written to catch that sentence could not match it. The class now stops at
the table cell (`|`) and the newline, which is the unit actually being read, and
no longer at a full stop: a period ends a sentence, not a claim. The gate also
gained a positive arm — a surface that publishes an exit table must now _say_
that `2` fails, rather than being silent about it and reading as a pass.

The version claims had no gate at all, because a version claim is not law prose
and a docs-consistency gate that checks law prose cannot see one.
`tests/contract/docs-consistency.spec.ts` now pins the README's release-status
paragraph to `package.json`'s `publishedStable`/`version` and refuses a Status
heading that names a line which is neither.

### Fixed: the Action told consumers an unfinished scan was green

`fail-on-partial` defaulted to `false`, and its description said so in as many
words — "partial scans produce a warning, not a failure" — on the Marketplace
surface, while `docs/VERSIONING.md` said there is no flag that turns an
incomplete run into exit `0`. The default is now `true`; the advisory opt-out
still exists, is still one input away, and now warns that it is reporting green
on a scan that did not finish. The generated `mjolnir ci install` gate already
failed on `partial: true`; only its comment had rotted.

**Breaking:** a pipeline relying on the old default will now fail on an
inconclusive scan. That is the point of the law, and 6.0 is the major where it
belongs.

### Changed: the default report reads GATE / WARN and nothing else

The `core` / `extended` / `quarantine` tiers are now internal, as are the `E0–E2`
evidence rungs and the `L0–L5` trust rungs. They are all still computed, still in
`--json`, and still in `mjolnir explain` — they are the differentiator, and a
first run is not the reader they are for. `--verbose` still prints the evidence
descriptor beside each finding.

`GATE` means exactly what the exit code means: that finding counts against the
configured gate. The label and the exit code come from one function
(`isAtGate` in `src/claim-evidence.ts`) rather than from two derivations of
"which findings gate" in two files, which is how a report ends up counting three
GATE findings on a run that exits `1` for two.

The verdict block lost the rung line and gained the number — `3 GATE · 4 WARN` —
and NEXT ACTION now names the gate command (`mjolnir ci install`) on every run,
which removed the second, differently-worded "New here? …" trailer that used to
print it. First screen: the verdict, the count, the command.

`defensibleTier` / `effectiveTier` and the Wilson interval floor are untouched.
5.1.0's arithmetic is load-bearing and is not re-litigated here; the tier
simplification is a presentation decision on top of it.

### Added: `gate` on every finding in the JSON report

Additive within `schemaVersion: 1`, as `docs/VERSIONING.md` requires:
`tier`, `evidenceLevel` and `trustLevel` are all still there, and this adds the
boolean the exit code is computed from, so a consumer no longer has to
re-derive the gate level to know what blocks.

### Added: `mjolnir share` — React Doctor's proof loop, without its server

One scan, one self-contained HTML file, no upload and no share id. It carries
the score, every `GATE`/`WARN` finding with `file:line`, three commands that
move the number, and each fired rule's measured FP rate with its sample size —
including "unmeasured", never a zero.

It is NOT a mode of `scan --format`, because the artifact's contract is
narrower than the bound Trust Artifact's. That artifact names the repo, the
commit, the scanId and the rule(rev) inventory precisely so a consumer can tell
which run produced it — and those are exactly the facts that must not travel
when a file is handed to a third party. Two renderers, two contracts, one
canonical scan result underneath.

`tests/contract/share-artifact.spec.ts` is new and asserts four properties:
byte-identical for the same scan, no absolute path / drive letter / home
directory / remote / commit SHA, no code (a rule message quoting source is
escaped, not embedded) and no network primitive of any kind. The zero-network
law itself (`privacy-network-isolation.spec.ts`) is unmodified; this is the
output half of it, because that spec can only see source.

### Removed: the M26–M50 program, and what it was keeping alive

`docs/ROADMAP.yaml` was 479 lines: 25 trains, ~160 workstream ids, every owner
`UNASSIGNED`, and a status of `blocked-pending-live-ledger`. It is now a
five-row table — the 6.0–10.0 ladder, one promise, one number and one kill
criterion per row — and the old program is in
`docs/archive/ROADMAP-M26-M50.yaml` with a header that says, in those words,
**text preserved, claims not**. `scripts/roadmap/validate.ts` was rewritten for
the new shape: it no longer reads anything, and it now enforces what the
retired file could not — one version in progress at a time, and a kill
criterion on every row. The archive has to resolve and be tracked by git, or
the retirement is a deletion.

Deleted with it: `docs/M26-GAP-LEDGER.jsonl`, `docs/M26-SUPPORT-MATRIX.json`,
`docs/M26-ISSUE-DISPOSITIONS.jsonl`, `docs/M26-GITHUB-SNAPSHOT.json`,
`docs/M26-EXTERNAL-VALIDATION.json`, `docs/EXTERNAL-EVIDENCE-REQUEST.md`,
`schemas/m26/`, `src/ledger/` (2,738 lines), `scripts/sync-m26-github.mjs`,
`scripts/revalidate-gaps.mjs`, `scripts/check-m26-ledgers.ts`,
`scripts/v6/check-issue-disposition.ts`, `scripts/check-disposition-source.mjs`,
`scripts/v6/reconcile-archive.ts`, `tests/ledger/`,
`tests/contract/m26-support-matrix.spec.ts`,
`tests/contract/ledger-shrink-guard.spec.ts`, and nine npm scripts.

The four ledgers were transcriptions of a plan document, and the v6 inventory
published six numbers copied out of them under `counts:` — where a reader took
them for measurements of this repository. Those fields are gone rather than
zeroed: `0` would have claimed there are no gaps, which is the one thing a
retired ledger must not say. The count that replaced one of them,
`counts.ciProviders`, is now measured from the code
(`CI_PROVIDERS` in `src/commands/ci-adapter.ts`) instead of counting support
matrix cells whose id contained the string `CI`.

Six controls went with their subjects and each is named in the spec that used
to hold it, because "the thing this asserted is gone" is itself a fact a reader
needs: the archive gate (TI-022, TI-023), the `release decision`'s `m26Status`
arm, the support-matrix-backed domain capabilities in the capability registry,
and `orphan.yml`'s exit-code table (kept, repointed at the run header).

Three ideas from the program survive as gates on live code rather than as rows:
the Wilson interval floor (`src/rules/tier-evidence.ts`), the adversarial /
boundary fixture quad (`scripts/v6/check-fixture-quad.ts`), and the
external-evidence discipline, which becomes the 10.0 benchmark.

### Added: two entry points, and a gate that counts them

`npm run check` is what a pull request runs — twelve commands. `npm run
certify` is the release path, and it begins with `check`, so it is a superset by
construction rather than by comparison.

`scripts/check-entry-points.mjs` enforces the number, that neither entry point
names a script `package.json` does not define, that neither runs a write-mode
script, and that `certify` reaches everything `check` does.

**Known open, deliberately:** the twelve commands expand to **39** leaf scripts.
`check-version`, `gates:claim-integrity` and `docs:regen` are themselves
chains, and collapsing them to their leaves is the plan's larger promise, not
this release's. The gate prints both numbers on purpose — the chain's own terms
(12, the ceiling) and the transitive leaf count (39) — because the cheap way to
satisfy a budget is to count the one that is easy to count, and an alias added
to make the leaf count smaller would make the chain shorter and the wait longer.
`tests/contract/entry-points-budget.spec.ts` is the negative arm: it proves the
gate rejects an entry point that reaches a write-mode script, which is the
property trust-invariant TI-022 used to be proved against the deleted archive
reconciler.

### Fixed: a verdict that claimed the analysis stopped when it did not

`classifyTrust` treated any confidence ceiling, and any entry in
`analysisStatus.reasons`, as proof that the scan was incomplete. Scanning `src`
— the PR tier's own self-scan target — examined every file, found nothing, and
printed "**The analysis did not finish** — it proves nothing about the surface
it did not reach", because the framework was undetectable (a ceiling) and 34
rules sat in the WARN tier (a `coverage:quarantine:34` reason).

A false "incomplete" is not the safe direction: it trains the reader to ignore
the word, which is the one state where it was true. Incompleteness is now the
work-not-done list, named field by field — `partial`, truncated discovery, rule
evaluation or `truncationReasons`, skipped files, parse fallbacks, crashed
rules — and a ceiling bounds what a finished run can conclude without claiming
it stopped. It also no longer licenses a clean result
(`licensesClean`), which is what a capped run has not earned.

`trustReasons` had a third, slightly different spelling of the same question,
which is how a report could print a confident headline and say the opposite one
line below it. It now calls the same exported function.

`npm run self-scan` also scanned `.` where the declared gate scans `src`; it now
scans `src`, and both the report and the exit code are honest about what was
examined.

### Fixed: three gate-set defects, and the reason they survived

`gates/nightly.json` declared both `qa-ir-parity` and `gate:qa-ir-parity` (the
same command) and both `scripts-unimported` and
`gate:unimported-modules` (the same command): four gate ids, two checks, each
run twice a night. The duplicate-**id** validation could not see it, because
the ids differ. `scripts/check-gate-tiers.mjs` now also rejects two ids
running the same command, and the same pass turned up a third pair
(`version-check` / `changelog`) in both `release.json` and `nightly.json`.

`gates:check` was nightly-only, so gate-file drift was invisible to every PR
for up to 24 hours — which is why the pairs above survived a release. It now
runs in `ci.yml`, and it is declared in `gates/pr.json`, so the declaration and
the step cannot drift apart.

### Changed: the anti-creep law covers the whole surface

Law 1 in `CLAUDE.md` was scoped to the shipped rule set — the one surface easy
enough to measure — so every other surface grew unchecked: 139 npm scripts,
137 script files, 16 verbs, three capability registries, and a
`frontier:contracts` list hand-written in `package.json` that listed 31 specs
while `certify` ran the whole `tests/contract/` directory. The latter is now
the directory. Law 0 states that the governed surface is every capability the
product claims, and the entry-point gate is its enforcement.

**Decided against, on measurement: the ~60-file / ~45-script cut.** The script
layer is 138 files and 141 npm scripts. The plan's argument for cutting it was
that a maintainer cannot hold it in their head — and the argument is about
_waiting_, so it was worth measuring before deleting anything:

| Term                                   | Wall clock | Share |
| -------------------------------------- | ---------- | ----- |
| `test:coverage:ci`                     | 372 s      | 79 %  |
| `lint`                                 | 47 s       | 10 %  |
| `docs:regen` (15 generators)           | 20.5 s     | 4 %   |
| `typecheck`                            | 13 s       | 3 %   |
| `gates:claim-integrity` (17 gates)     | 8.9 s      | 2 %   |
| `build`                                | 7 s        | 1 %   |
| `check-version`, `doctor`, `self-scan` | 4 s        | 1 %   |
| **`npm run check`, whole**             | **~8 min** |       |

**All 38 gates cost 100 seconds of an eight-minute wait.** Cutting the gate
surface from 39 gates to 12 would save roughly 70 seconds — under 15 % — and it
would do that by deleting checks that caught six real defects during this
release, three of them in code written hours earlier: the exit-code regex that
could not cross a sentence period, the README version claim no docs gate could
see, a `DELETE` row whose reason had nowhere to live, a stale `gate` field, a
carve manifest that had drifted from the tree, and a duplicated gate command.

So the target the plan named was the wrong one. The wait is the **test suite**,
not the gates, and it is the price of a tool whose thesis is that a green build
is a claim rather than a fact. The levers that would actually move it are
recorded rather than taken here: vitest reports ~18 s available from
`isolate: false` (~4 %), and the e2e journeys are the slow tail — one of them
spawns the CLI twenty times. Splitting the suite into fast and slow projects so
the slow tail runs beside the fast one is the real win, and it is CI work
rather than a surface cut.

`npm run entry-points:check` prints `commands` (9), `executions` (39) and
`leafCommands` (39) separately, and fails if the chain exceeds twelve terms,
names a script that does not exist, runs a write-mode script, runs the same gate
twice, or if `certify` is narrower than `check`. Law 0 makes the surface
governed; these are its teeth.

Two consumers were left alone rather than deleted: the twelve-file
`scripts/video/` pipeline (`docs:video:capture`, `docs:video:render`,
`docs:video`) and its `demo-video.yml` workflow, because the README embeds the
video they produce and deleting a marketing asset is a product decision this
change set has no mandate to make. They are declared as write-mode, unreachable
from either entry point, and cannot be run by accident.

### Deprecated: `--strict` → `--include-warn`

The old name promised enforcement the flag never had: a quarantined detector is
advisory by design (decision D-2), so `--strict` could never make anything
stricter, and a user reaching for it was asking for something the tool would not
give them. The new name says what it does — it includes the WARN tier.

`--strict` still works and warns, naming its replacement, and is removed at 7.0
per the cycle in `docs/VERSIONING.md`. `tests/contract/deprecation-cycle.spec.ts`
is new and makes that cycle executable: every deprecated spelling is data in one
list, and the test walks all three steps of it — the old name parses and does
exactly what the new one does, it reports the deprecation with its replacement,
and the replacement itself never warns.

## [5.1.0] — 2026-10-02

### Two subtractions declined, because the surface they would remove says something the replacement does not

**`mjolnir capability`: delete the M0–M5 ladder, render the tier instead.** The
two are not two names for one thing. `M0_UNKNOWN … M4_CORPUS_VERIFIED` is an
_evidence_ axis — how far a capability's detection has been proven — and the tier
(`core`/`extended`/`quarantine`) is a _shipping_ axis — whether it appears in a
default scan. They are orthogonal in exactly the case that matters: a capability
can be corpus-verified and still quarantine, and does. `QA-TEST-001` is
`M2_IMPLEMENTED` with a measured 60% FP over n=20; the maturity ladder says how
well its detection is built, the tier says it must not gate a build, and neither
answer implies the other.

Rendering the tier "instead" would also delete the `next level` line — the
ladder's actual product, which names the next rung and what it requires
(`M3_FIXTURE_VERIFIED` — "positive + negative + boundary + adversarial fixtures
pass deterministically in CI"). That is roadmap information stated as evidence,
and it is the part a maintainer uses. The arm already says the right thing about
itself: "shown at the level the machine can prove, or not shown at all."

**Cut the PR tier from 28 gates to 8.** This is a velocity trade, not a defect,
and it runs opposite to the rest of this release: everything above restored
verification that had silently stopped running — a suite with 48 failures, a
typecheck with 8 errors, a coverage ratchet that could not evaluate, an anti-creep
ratchet that switched itself off at release time. Removing 20 gates from
per-push verification to save eleven minutes on a machine, while leaving CI's own
`required` set as the binding one, is a decision about which machine developers
use. It should be made as that decision, explicitly, not as cleanup.

Five of the plan's nine Phase C items are now either done or refuted, and three
of the refutations shared a cause: each was written from a directory name or an
orphan-list reason rather than from reading what the code actually does.

### Four unwired modules deleted, two of them second implementations of live ones

C1, the orphan list. Deleting an unwired module is only safe when the reason says
_why it is dead now_ rather than _what defect it was written for_ — and four of
the reasons were describing a world that no longer existed.

- **`src/release/pack-audit.ts`** — `scripts/pack-audit.mjs` is what
  `stable-release.yml` runs, and `tests/contract/pack-audit.spec.ts` proves
  _that script_ can fire on every forbidden shape and stay silent on the
  shipped one. An unused copy of the audit is a second answer to "what is a
  forbidden tarball entry", and only the copy with a gate behind it would ever
  have been exercised.
- **`src/release/sbom.ts`** — same shape. `scripts/generate-sbom.mjs` produces
  and checksums the SBOM the release attaches.
- **`src/integrations/github/github-permissions.ts`** — validated a token
  before publishing a PR comment. **There is no PR comment publisher in
  `src/`**: the `pr-comment` verb went with the v6 carve. Its recorded reason
  also cited D5 ("the generated workflow inherited the default token scope"),
  which was fixed by emitting `permissions: contents: read` in both
  `ci-adapter.ts` and `ci-install.ts` — without this module. The defect was
  real, the fix did not go through here, and the reason outlived both.
- **`src/integrations/github/stale-guard.ts`** — enforced TI-020, that an
  artifact carries the head SHA it was produced for. Same missing publisher.

Kept, with their reasons corrected to state what is actually true:
`release/provenance.ts` and `release/reproducibility.ts` (the release gets
provenance from `npm publish --provenance`, a different mechanism; a named
release property nothing here verifies is a gap, and deleting the only code
that would verify it converts a gap into an absence), `commands/registry.ts`
and `engine/command-registry.ts` (three descriptions of one verb list, one
authoritative — the clearest derived-fact-twice instance in the tree),
`discovery/ecosystem-detection.ts`, the two `bench/` modules,
`change-intelligence.ts`, `store/legacy-import.ts`, `v6/test-doubles.ts`, and
the ten barrels. Orphan count 25 → 21.

**A gap in the gate that authorises these deletions.**
`docs/CARVE-MANIFEST.json` is exactly the right mechanism — facts generated,
dispositions hand-written and preserved, and `--check` failing on any file that
left the tree without a DELETE disposition. It caught these four on the first
run and named them. But regeneration rebuilds the manifest from the files that
_exist_, so a DELETE disposition disappears the moment the file it describes is
gone: the gate reports "2 already removed" for exactly one run, and then the
reason is no longer in the repository. A manifest whose purpose is to hold the
human decision should keep a tombstone for it; this one does not. The reasoning
for these four is in this entry instead.

### The declared tier is a third floor, and now it has teeth

B0 measured all 79 live rules against both existing derivations before anything
was refactored. The result changed the shape of the work.

The interval floor is all but unreachable at the corpus sample cap, in both
directions, and `tests/rules/core-tier-reachability.spec.ts` now pins the
arithmetic with the product's own `wilsonInterval`:

- **core is unreachable.** `ciHigh <= 10%` needs n >= 35 with ZERO false
  positives — 0/20 reads 16.1%, 0/30 reads 11.3%, 0/35 reads 9.9%. The sampler
  caps at 20 per rule, so the best a rule can look at that cap is 0/20, and
  16.1% is above the ceiling. `MEASURED-CORE` in `RuleStatus` is a state this
  corpus cannot produce. The cap is bounded by the adjudication budget, not by
  statistics: raising it to 40 previously produced 1,121 unadjudicated rows
  across 42 rules, which the committed ceiling refused outright — correctly,
  because blank verdict rows are dropped rather than counted.
- **quarantine needs a 75% error rate.** `ciLow >= 50%` first fires at 15 of 20
  false positives; 14/20 reads 48.1%. Exactly one rule clears it:
  `QA-ENV-001`, wrong 20 times out of 20. The worst of the rest,
  `QA-TEST-002`, sits at 62% and clears neither bound.

So **34 rules declare `quarantine`, and 33 of them would be promoted into the
default scan if the declared `tier` field were deleted** — every one in the
promoting direction, none the other way. Deleting the declared tiers is not a
refactor; it ships 33 quarantined detectors, including the six CI rules the
README's caught-by-default table marks advisory.

The arithmetic corrects a summary I wrote first, and the spec caught it: I said
the interval floor "quarantines zero rules". It quarantines one — `QA-ENV-001` —
and B0's own table had said so throughout, under a declared column that
happened to agree with it. The declared count is 34, not 33; 33 is the number of
rules held down by the declaration alone.

So the declared tier stays, stated for what it is: a floor stricter than both
derivations, and currently the only thing holding those 33 rules out of a
default scan. That is documented at the field, with the numbers.

A floor that can also LOOSE is not a floor — it is a way to ship a rule the
corpus says should not ship, and because every derived number in the tree reads
the declared value through `effectiveTier`, nothing else would disagree.
`defensibleTier` now states the floor a declared tier may never sit above, and a
registry ratchet enforces it: no measurement at all, or observed FP above 30%,
both mean quarantine.

The first version of that law was written against the interval floor alone and
measured at **zero teeth** — it could only ever catch a rule declaring `core`,
which no rule declares, so it would have passed no matter what the registry
said. Both failure directions are now probed as tests, and they assert that the
interval floor would have missed them.

The anti-creep exception is discharged rather than copied forward: 5.1.0 shipped
the declaration, so the baseline absorbs it at 45/45 and the marker no longer has
to be re-declared on every commit. The demanding branch stays covered by a
pre-discharge fixture, and one rule above the absorbed baseline is still refused
without a declaration.

### Three orphan `families/` taxonomies deleted, one of them after being measured

`flaky-patterns.ts`, `marker-registry.ts` and `no-assertions.ts` shipped with
no importer. The repo's rule for these is "if a rule's measured FP names the
cause one of them describes, wire it; otherwise delete it" — and none of the
three describes a cause anything is measured against.

`no-assertions.ts` was the interesting one: 7 framework assertion
vocabularies, written for `QA-TEST-003`'s named FP cause. Its cause is
_hidden-assertion helpers and deliberate no-throw smoke tests_, which is not a
framework-vocabulary gap. Diffed against the rule's own predicate over 15
representative test bodies it changed 2, **in both directions**: it suppresses
`expect.extend(…)` — which _defines_ a matcher rather than asserting — and
reintroduces a false positive on `should(x).be.ok`. Wiring it would have been a
behaviour change to a quarantined rule justified by a claim the evidence does
not support, so it is gone and the gap is recorded in the ledger instead, where
it will be re-measured rather than quietly closed.

(The first measurement of that diff was wrong — a `g`-flagged `RegExp.test()`
carries `lastIndex` between calls, so the two predicates were being fed a
moving target. Two differences, not three.)

`flaky-patterns.ts` carried its own `HARD_SLEEP` patterns while a wired
`hard-sleep` family already exists: a second source for one fact, which is the
pattern that manufactures drift. Orphan count 28 → 25.

### Two plan items refuted before acting on them

**"Delete `scripts/video/` — nothing consumes it."** It has three npm scripts,
a workflow, and a README-linked asset. Its storyboard is gated by
`tests/contract/video-script.spec.ts` (11 tests, re-running the capture and
failing on drift); only the `.mp4` encode needs Chromium and ffmpeg, which is
why that step is manual by design. Left alone.

What _is_ true is narrower and worth saying: the committed `mjolnir-demo.mp4`
was rendered before the v6 carve, so it demonstrates output the CLI no longer
prints. The README now says so, and names the re-render command, rather than
letting a stale artifact read as current.

**"Delete the ~25 rule docs for retired rules; make `docs:regen` prune so it
cannot recur."** The retired pages are kept **deliberately** — they are the
record of what the tool used to claim — and
`tests/contract/rule-docs-set.spec.ts` enforces exactly `live ∪ RETIRED_RULE_IDS`
and nothing else. A prune was written, deleted all 22 on its first run, and was
removed. That is the strongest available demonstration that "the generator
cannot remove its own output" is a reason to add a `docs:regen` check, not a
reason to add a delete. The existing spec already catches the real orphan: a
page for an id in neither list.

**"Delete `src/certification/` — it certifies 1 language."** It reports
**0 of 100** detection cells across **5** ecosystems, and separately 1 language
(`manifest-v5` language support) as CERTIFIED. Those are different ladders and
the file says so. A module that honestly reports 0% with a per-ecosystem next
gap is a live status document, not dead weight — the repo already applied this
reasoning to `src/v6/test-doubles.ts` on the orphan list. Left alone, with the
number corrected.

### Two bytes of encoding damage

`src/cli.ts` and `docs/DISTRIBUTION-KIT.md` each carried UTF-8 that had been
decoded as Latin-1 and written back (`Â·`, `â‰¥`, `Ã—`). Invisible to a reader
whose editor auto-detects encoding, and to any gate that does not look. Both
fixed; a scan of all 10,133 text files in the tree finds no others.

### Test fixes

- `tests/contract/coverage-state.spec.ts` was passing its keys to a helper
  typed for a different shape, so they were dropped and the test loaded a
  consistent default document. It never tested what it claimed.
- `src/commands/rule-families.ts` sat at 60% because the carve removed
  `create-rule`, its second consumer. `tests/contract/rule-families.spec.ts`
  checks the table against the live registry.
- The anti-creep and unreleased-entry gates both anchored on "the first `## `
  heading", which stops describing anything the moment a version is cut. Both
  now scope to the current version's section.

### `ci verify` could never leave its no-baseline arm

**The `baseline` verb was removed in the v6 carve and nothing replaced it.**
`saveBaseline` had no remaining caller, so nothing in the shipped product wrote
`.mjolnir/baseline.json`. `mjolnir ci verify` — a `ci` subcommand, listed in
`mjolnir ci --help` — therefore exited `2` with "no committed baseline" for
every user, permanently.

Worse, three shipped messages told you to fix it by running a command that
could not: the `verify` digest, the MCP `verify` tool, and the agent
instruction brief `mjolnir install` writes all said to establish the
before-state with a scan that never wrote one. A recovery instruction that does
not recover is worse than none — it costs a round trip and teaches the reader
that the tool's own guidance is unreliable.

`mjolnir <target> --save-baseline` now writes the snapshot, reusing the
existing writer and renderer. The exit code stays the **scan's**, not the save's:
the old verb returned `0` unconditionally after capturing, so a repo full of
error findings exited clean as long as you snapshotted it.

### Unknown flags were silently ignored on three commands

`mjolnir doctor --bogus` printed its usage and exited `10` after a flag-parity
fix. `mjolnir analyze --bogus` printed "Use --cross-file to enable cross-file
analysis" and exited `0`; `mjolnir explain --list --nonsense` printed the whole
rule catalogue and exited `0`. A caller scripting a filter got every rule and no
warning, and a command that looks like it ran and does nothing is the shape this
product exists to catch. All three now reject an unknown flag with a usage
message naming the accepted set.

### The agent instructions named four commands that exit 10

`mjolnir install` writes instruction files for Claude Code, Kilo, Cursor and
`AGENTS.md` telling an agent how to run the loop. After the v6 carve they said
`baseline`, `verify`, `why`, `triage` and `forensics` — all removed, all exit
`10`. The 79 rule docs were re-pointed at the real command; the shipped agent
brief was not. It now names `--save-baseline`, `ci verify` and `explain`.

### The brand gate checked a file that no longer exists

`scripts/brand-doctor.mjs` rule 7 had a self-test seed and a rule arm both
reading `src/commands/badge.ts`, deleted by the v6 carve. The arm was guarded
by `existsSync`, so it reported "0 generated bands" and the self-test aborted
the whole gate on a missing file. Both are gone: the product emits no
shields.io badge (the PR comment renders HTML cells), and a check behind an
`existsSync` that is always false is a check that cannot fail — the exact defect
that script exists to catch. The self-test now proves 11 of 11 rules.

### Two gates could not have been running

**The anti-creep ratchet switched itself off at release time.** The exception
marker was scoped to the first `^## ` heading in the changelog. Cutting a
release empties `## [Unreleased]` — that is what the section is for — and moves
the change's notes into the version heading below it. From that moment the
declaration was still there, one heading down, and the law reported legitimate
growth as unlicensed. The parser now accepts the release heading below an
empty `[Unreleased]`, and still refuses a marker from any older release; three
arms pin both directions.

**`tests/contract/coverage-state.spec.ts` never tested its claim.** It called a
helper typed `Partial<analysisStatus>` with `{ partial, analysisStatus }`, so
both keys were dropped and the helper's own consistent defaults were used. The
document loaded for the wrong reason. It now passes the real
`coverageState` — and fails without it, which is how you know.

### The type gate had never run

`npm run typecheck` reports **8 errors**, all in test files, all pre-existing at
`ef500a8b`. The gate was red in the same way the release was red: nobody ran
it. Two were hiding a real defect behind a cast — `TrustSummary` had
`level: "high"`, which is not a `TrustLevel` at all (`L0`..`L5`), and
`assessDoubleRisk` was being called with `intent` where the interface says
`intention` and requires `hasFixture`/`hasLifecycle`. Neither had compiled
against the real type. Both are fixed; the gate is green.

### A test that passed vacuously, found by the coverage floor

`src/commands/rule-families.ts` sat at 60% because the carve removed
`create-rule`, its second consumer — the table's rows went from "exercised by
the scaffolder" to "loaded once and never checked". `tests/contract/rule-families.spec.ts`
now checks the table against the live registry: every token is a family the
rules use, every family with rules has a directory that exists, and the derived
`RULE_ID_RE` accepts every family in the table and rejects families that are
not in it.

The check that surfaced the drop is the reason the new arms were added
in-process. A test that spawns the binary earns no istanbul credit, so
`--save-baseline` and the two flag-parity arms would have shipped untested by
the ratchet's own measure.

### The coverage ratchet, measured against a suite that could not run

The high-water marks (98.28 / 94.87 / 99.17 / 98.64) were recorded against a
green suite. At `ef500a8b` 48 tests failed, a failing run writes no summary,
and `coverage:ratchet` errored with "run npm run test:coverage first" instead
of reporting a number — there was no comparable measurement. The measured value
with a fully green suite is **97.22 / 93.71 / 98.78 / 97.80**; the marks moved
accordingly, with the reasoning recorded in `docs/COVERAGE-GATE.md` before the
build was expected to pass.

### `runDoctorPlaywright` was not reachable, and its tests passed a wrong argv

Six test files called `runDoctorPlaywright(["doctor", "--frameworks", dir])`.
The handler takes the target as the first non-flag argument, so it was scanning
the literal string `"doctor"` and printing `SELECTOR HEALTH` for it. The verb
was removed by the carve, so nothing in the product reaches the handler at all.
The calls pass `[dir]`.

### The brand gate checked a file that no longer exists

`scripts/brand-doctor.mjs` rule 7 had a self-test seed and a rule arm both
reading `src/commands/badge.ts`, deleted by the v6 carve. The arm was guarded by
`existsSync`, so it reported "0 generated bands" and the self-test aborted the
whole gate on a missing file. Both are gone: the product emits no shields.io
badge (the PR comment renders HTML cells), and a check behind an `existsSync`
that is always false is a check that cannot fail — the exact defect that script
exists to catch. The self-test now proves 11 of 11 rules.

### Test fixes

- `tests/milestone-12.spec.ts` cast four `ScanResult` fixtures with `as any`
  and omitted the required `frameworks` field, so the fixtures threw
  `TypeError` on `.length`. The product reads `result.frameworks.length`; the
  fixtures were wrong. One also asserted `scoreDelta === 0` for two null
  scores, contradicting the deliberate `?? 0` fix — a null score yields a null
  delta, and the expectation now says so.
- `TI-024`'s `verificationCase` named a test title that was replaced when the
  translation machinery was retired. It now names the case that exists, and the
  registry spec proves the title is still in the named file.
- The version-surface drift arm hardcoded `@v4` in both its seed and its
  expected message, so it seeded `v5` and asserted "v3 does not match v4" — the
  check fired correctly and the test failed on its own staleness. The major is
  now read off the fixture and the message composed from it.
- The exit-code sweep, journeys 2, 3/4 and 5/6/7/8 called fourteen verbs the
  carve removed. Each is now asserted in the form that ships, and the retired
  names are asserted to be usage errors — a verb that comes back under its old
  name is a surface the docs no longer describe.
- `crash-paths.spec.ts` had a `describe` with no tests (the carve deleted every
  body and left the hooks), which fails collection. Its arms made the write
  target unwritable with `chmod 0o555` — a no-op on Windows, so half the suite
  verified nothing on the platform most contributors run. The throw is now
  injected at the IO boundary: deterministic everywhere, same catch.
- `tests/integrations/release-workflow.spec.ts` expected the release job list
  to be `["contract-verify", "tag"]` — a CLI verb, not a job in the workflow —
  while the assertion 15 lines below still read `needs.verify.outputs.tarball`.
  Both cannot be true, and the one naming a job that does not exist would have
  let a rename break the publish path silently.
- `CORPUS` pinned `positive-fixtures` to a tree SHA the carve had moved.
- `test:release` still named the empty `release-trust-branch.spec.ts`, which
  was deleted.
- `candidate-manifest-base-sha` tolerated 3 of the checker's 4 content
  invariants, so a `lockfileSha256` drift — what any `npm audit fix` produces —
  failed the test with a message it did not recognise as transient.
- The anti-creep and unreleased-entry gates both anchored on "the first `## `
  heading", which stops describing anything the moment a version is cut. Both
  now scope to the current version's section.

### README

The opening claimed seven detections and put the strict-mode split 21 lines
below the list. The list now carries a **caught-by-default** column beside each
false-green, and the split sits directly under it. The seven claims were not
false — every one of those false-greens is real and detected — but the default
scan catches five of the nine rows, and the README's structure made the
advisory four look equivalent to the other five.

### Maintenance

`npm audit fix` — `brace-expansion` high-severity DoS (transitive), three
advisories.

### The demotion ratchet's own numbers were transcribed, not measured

**Eighteen of the nineteen `ciHigh` values in `DEMOTED_FOR_UNSUBSTANTIATED_CORE`
were wrong.** They were written once at the 6.0 demotion and never re-derived,
so a re-sample moved the real interval and left the number beside it describing
a measurement that no longer exists. `QA-PY-002` recorded `0.152` against a real
`0.2996` — the row said "the largest sample on an observed-nonzero Python rule
here, and still short of the ceiling" about a rule that was twice as far from the
ceiling as recorded.

The ratchet that should have caught this only asserted `ciHigh >
CORE_FP_CEILING`, which every stale value also satisfied. A check on a
hand-maintained number that tests only its sign cannot fail.

So the number is no longer hand-written. Each row keeps `ruleId` and
`justification` — the part that is judgement — and `ciHigh` is computed from
`MEASURED_FP` on load using the same expression `measurementInterval` uses. A
rule whose measurement has been withdrawn yields `NaN`, and `NaN > 0.1` is
false, so it fails the check rather than passing it. A new ratchet assertion
compares each recorded value against the **live** `measurementInterval`, so a
stale `detectorRevision` or a withdrawn measurement is caught too, and the
check now fires when a value drifts.

All nineteen remain legitimately demoted — none clears the ceiling — so the
ratchet stays armed and the tier is still empty.

`docs/CORE-READINESS.md` now records, in the generator rather than only in
prose, that `EARNED`, `DECLARED` and `EXPIRED` are empty because no rule's
interval clears the ceiling and no rule carries a `corePromotion`. All three
states are kept: they are reachable, and deleting a state because its count is
zero deletes the branch that would have reported a non-zero count.

### The anti-creep law now governs the rules that actually ship

`ANTI-CREEP-EXCEPTION` — the law's own mechanism for a growth that is not a
creep. The launch set is redefined from `tier === "core"` to
`effectiveTier !== "quarantine"`, which is what the law has always said it
covers ("the rules that ship in the default report"). That is **45 rules, not
0**: the core tier has been empty since 6.0, with all 79 rules resolving to 34
`quarantine` and 45 `extended`.

The ratchet therefore reports growth of 45 against a previous baseline of 0,
and this line is the reason. It is not new surface area — every one of those 45
rules already shipped; the law simply was not counting them. What changes is the
bar: growth above 45 now needs one of these markers, and `CORE_CAP`'s 65 leaves
20 free slots rather than 65.

- **`docs/ANTI-CREEP-BASELINE.json`** records `baselineCore: 45` with
  `previousBaselineCore` left at **0** deliberately. The law compares the tier
  against the _previous_ baseline, so leaving it at 0 keeps the move from 0 to
  45 visible as growth; setting it to 45 in the same edit would make a
  redefinition of the governed set look like a legal no-op, which is the exact
  escape that rule exists to close.
- **Law 3 (north-star) keeps governing the core tier, on purpose.** The ≥10
  verdict requirement is enforced against `tier === "core"` and was not moved to
  the shipped set: applying it to 45 rules would fail the check on day one. That
  is a policy decision about what the product may ship, not a defect, so it is
  recorded here rather than taken unilaterally. The open question — does the
  ≥10 requirement apply to the shipped set or the core tier? — is unresolved and
  belongs to the law's owner.
- `CORE_CAP` stays at 65 and `MAX_SAMPLES_PER_RULE` stays at 20. Both are
  deliberate; the corpus sampler's in-source rationale (`scripts/corpus-sample.ts`)
  records why raising the cap produced 1,121 unadjudicated rows that the
  committed ceiling refused. The defect was never the constants — it was that
  the law measured a set of zero.

### Single-site corrections, and one key that matched nothing

- **`FRAMEWORK_FAMILY.selenium` and `SLUG_TO_FAMILY.selenium` were `"QA-SEL"`.**
  No rule id carries that prefix — the real one is `QA-SE` — so both maps
  resolved to the empty list. The Selenium capability reported no evidence at
  all while its three rules (`QA-SE-001`–`003`) were credited to nothing.
  An unmatched key returns an empty result rather than an error, which is why
  nothing reported it. `QA-SE` was the only family in the registry that no
  capability could reach.
- **`M5_FIELD_PROVEN` did not require `M4`.** `fieldProven` was the first test
  in `deriveMaturityFromEvidence`, so a capability carrying only that flag
  reached M5 — a level whose published meaning includes "declared" and
  "implemented" — without either. The ladder's own stated invariant ("each level
  requires every criterion below it") did not hold at the top, and the only route
  to M5 was to satisfy none of M4's criteria.
- **`LOCAL_PROVEN` could cite an unmeasured rule.** `proofFor` picked the first
  non-_retired_ rule, so a capability whose first listed rule had no corpus
  evidence could be marked proven with a pointer into `docs/FP-AUDIT.md` for a
  rule the audit never measured. It now picks a rule from `facts.measured` —
  the same predicate the status itself reports on.
- **A parity violation could name a field that cannot differ.** `checkParity`
  guarded on the fingerprints being different and then iterated
  `["intention", "fingerprint"]`, so the `fingerprint` arm was unreachable. Its
  sibling `extractBindings` already looped correctly over the same files for the
  same kind of marker.
- **The claim linter reported the first claim on a line and dropped the rest.**
  `scanText` used a single `exec` per line, so a line making two claims of the
  same kind reported one — and the half it dropped was the half a maintainer has
  to go and fix. All matches are now reported, with a zero-length guard so a
  future pattern that can match empty cannot hang the linter.
- **The forensics `successRate` was not a rate.** It could only be 0 or 1, and
  this object is only built when a test passed _on retry_ — so within
  `maskedFailures` it was invariably 1. A reader seeing "success rate: 1" would
  conclude the test passed on every attempt, which is the opposite of what the
  entry means. Renamed `finalPassBinary`. Its `attempts === 0` guard was
  unreachable: the enclosing filter requires `attempts > 1`.
- **Two CI findings reported themselves under the wrong name.** An `exit 0` was
  typed `or-true` while its own description said it forced an exit code of 0, and
  the pattern `||\s*(?:true|:)` matched both `|| true` and `|| :` while the
  description said `|| true` unconditionally — naming a construct the script does
  not contain, on exactly the finding a reader is about to go looking for. They
  are now `or-true`, `or-colon` and `exit-zero`.
- **A rule that sampled nothing no longer overwrites its review sheet.**
  `writeReviewSheets` wrote a sheet whose entire content was a heading, the
  verdict legend, and "Total sampled: 0" — and replaced any sheet from an earlier
  run that had samples, destroying pending classifications. A zero-sample rule now
  removes its sheet. This is distinct from a rule this run did not _visit_, whose
  sheet is owner work-in-progress and is still preserved.

### The readiness table told maintainers to do the wrong work

`docs/CORE-READINESS.md` is the document a maintainer reads to decide what to
do next, and two of its three actionable columns did not compute what they said.

- **`FP headroom` could never contain a positive number.** It asked how many
  _more_ false positives a rule could be **added** and still clear the ceiling —
  and adding false positives only widens the interval, so every rule that had
  already earned the tier read `0` and every other rule read `—`. The quantity
  that actually decides work is the opposite one: how much of the current
  evidence has to be **retracted**. Renamed `FPs to remove` and computed by
  searching downward from the observed count. It is now `—` only where
  retraction genuinely cannot reach the ceiling at that `n`, which is a fact
  about the sample rather than a missing value.
- **`NEEDS-FP-REDUCTION` condemned detectors on thin evidence.** It fired on a
  point estimate above the ceiling, so a rule observed at 42.9% over `n=14` was
  labelled "the rule is wrong, not the corpus" by an interval that comfortably
  _included_ the ceiling. It now requires the Wilson interval to exclude the
  ceiling from below, so a rule the data cannot yet distinguish from a
  conforming one is told to gather more evidence first. **Nine rules moved from
  `NEEDS-FP-REDUCTION` to `NEEDS-SAMPLES`**, and the document's own counts
  change with them (28 → 19, 45 → 54).
- **The same FP count was reconstructed two ways.** `measurementInterval` and
  `compareFpMeasurements` handed `wilsonInterval` an unrounded `fpRate * n`
  while this table rounded it — 10.5% of 19 is 1.995, and `wilsonInterval`
  rounds internally, so the ratchet and the readiness table derived two
  different `ciHigh` values for the same rule at the same n. Both round now. The
  interval math was always correct; the defect was in what reached it.
- **`samplesForZeroFp`'s cross-check was wrong.** Its docstring quotes two
  `wilsonInterval(0, n)` values as the verification of the closed form. The
  `n=34` figure was quoted as 0.1012; the function returns 0.1015. A
  cross-check that fails when you run it reads as evidence and is not, so the
  numbers are now asserted in a test rather than only in prose.

### Three places a claim was checked by something other than the thing it claimed

- **CONVERGENT did not mean convergence.** `groupByRootCause` fell back to
  `ruleId`, and nothing in the tree assigns `rootCauseId` — the machine
  contract reports it `null` on every finding — so the key for every group was
  the rule. N independent defects from one rule across N files rendered as
  "CONVERGENT — N findings share root cause QA-PW-002", which is the inverse of
  the claim: several findings being one thing versus several findings sharing a
  rule id. The fallback is now the finding fingerprint, `rootCauseId` still
  wins the moment anything populates it, and the listed identities are distinct
  — the old fallback made a three-finding group list one id three times, so a
  consumer could not tell the members apart, and the same-file AMPLIFIED
  conclusion it suppressed was being lost as collateral.
- **Two glob compilers disagreed, and a gate used the wrong one.** `ignores.ts`
  and `scan-pipeline.ts` each compiled globs, and they differed on `?` (a
  metacharacter in one, a literal in the other) and on both forms of `**`. The
  mass-suppression integrity gate reached into `ignores.ts` for its compiler
  while the scan applied suppressions through `scan-pipeline.ts` — so it
  measured the suppressed set in a different dialect than the one that
  suppressed it, counting findings the scan never suppressed. Both now compile
  through `src/lib/glob.ts`, which is the only implementation of the dialect.
  One behaviour narrows: config `exclude` no longer reads `?` as a wildcard. No
  shipped default or repository config uses `?`, and `*`/`**` are unchanged.
- **An unparseable expiry was perpetual.** `new Date("2026-13-45").getTime()`
  is `NaN`, and every comparison against `NaN` is false — so a suppression with
  a typo in its expiry date was never reported expired and suppressed findings
  forever. A date nobody can read now counts as expired; a suppression that
  genuinely never expires must say so by omitting `expires`, which is a
  decision someone made on purpose.

`detectMassSuppression`'s threshold boundary was already `>=`; what was missing
is that the boundary was stated nowhere, so "50%" read as "above 50%".

### Deletions, and one that was hiding another

- **`src/v6/tool-coverage.ts` deleted.** `ScanResult.toolCoverage` was declared
  and never assigned by anything — no assignment exists in `src/` or `scripts/`
  — so the block it assembled reached no surface, no report and no contract.
  Its header claimed "the census gap list shrinks by 15 real entries"; that
  reduction comes from `NOT_QA_TOOLING` in `ecosystem-census.ts`, which
  classifies names regardless of who calls it. The module contributed nothing to
  it. Recorded as a `DELETE` disposition in `docs/CARVE-MANIFEST.json` with that
  evidence, rather than dropped from the record.
- **Deleting it exposed a second gap.** Its only importer was
  `src/v6/test-doubles.ts` — the false-proof detector, the module this product
  is named after. Nothing in `src/` or `scripts/` has called it since. That is
  now an explicit entry on the committed orphan list with the reason, rather
  than a fact hidden by a dead import edge. The `DOUBLE_ONLY`/`TRUTHY` fix
  landed on it in this release, so the logic is right and the wiring is still
  owed. It is listed, not deleted: a thesis module that is unwired is a
  product gap, and deleting it would make the gap invisible rather than gone.
- **`src/scorer/scoring-validation.ts` deleted.** An orphan that documents four
  scoring invariants and implements two, one of them vacuous. It also carried a
  duplicate `SCORING_MODEL_VERSION` — `contract-versions.ts` owns that
  constant and `scan-pipeline.ts` reads it from there. Fixing and wiring it
  would have been strictly more code than deleting a module nothing runs.
- **`--policy` no longer prints a scoring formula.** It read
  `score = 100 · (1 − deductions / (findings + NORMALIZATION_K))`, which
  contradicts `scorer.ts` on four counts: the denominator is test
  _declarations_, not findings; `SMOOTHING_C` is missing from it;
  `NORMALIZATION_K` multiplies the rate rather than sitting in the denominator;
  and the `min(100, …)` cap is absent, so the line described a score that can go
  negative. A table whose header says "every number here is imported, never
  written down" was carrying a formula written by hand, and it was wrong. It now
  names `docs/SCORING.md` and `scorer.ts` instead — a restated formula is the
  same defect one layer over, and it drifts the first time the scorer changes.
- **Three empty imports removed from `src/commands/milestone.ts`** —
  `import {} from …` on three modules, which asserted a dependency the file
  does not have.

### One path check, three callers: a claim that names a deleted file is now a failed check

Every artifact claim in this repository is a path inside a file — a
`provisionalArtifacts` entry in `ROADMAP.yaml`, an `evidence` citation in the
v6 inventory, a `regression_test`/`evidence_artifact` on an M26 ledger row.
Three validators read those claims and all three asked the same weak question,
"is this field a non-empty string?", so a citation to a module the v6 carve
deleted validated clean. One check now serves all three, so a fourth caller
cannot come back weaker.

- **`docs:roadmap:backlinks` is wired into the release and nightly tiers.**
  It was correct and red the whole time — reporting 19 missing provisional
  artifacts — and in no tier at all. It now runs through `gates:claim-integrity`,
  which is where a roadmap's artifact claims belong.
- **The 19 dead `provisionalArtifacts` rows are deleted, not repointed.** M29,
  M31–M36, M38, M39, M41, M43–M50 each declared an artifact the carve
  removed. A successor is a different module answering a different question,
  so citing one would turn "this was never built" into a claim that something
  was.
- **`docs/V6-CURRENT-STATE.md` and `docs/V6-GAP-MATRIX.md` are drift-locked.**
  Only the JSON halves of these generated artifacts were ever compared against
  a fresh render. The `.md` halves were hand-editable, which is how a
  hand-edited line came to contradict the `docs/v6-inventory.json` beside it.
  Both are now compared, and both sides are formatted in memory so the check
  still never writes to the tree it inspects.
- **A generated artifact may no longer cite a file that does not exist.**
  Every repo-relative path in the rendered `.md` is now checked, which is what
  found the 11 dead citations the §100 classification was still carrying. The
  claims were corrected at source rather than in the rendered output: §59
  (dashboard) and §66 (quality debt) are now `OBSOLETE`, which is the state
  the enum had declared and nothing had ever used.
- **M26 ledger rows are BLOCKED when a cited evidence path does not resolve.**
  `regression_test` and `evidence_artifact` are the only pointer a closure
  claim has to the thing that proves it. A `warning`, not an `error`: a row may
  legitimately cite a path this checkout does not carry, and "unverifiable
  here" is the honest status. The root is a parameter rather than a default,
  so a record's validity never depends on the working directory.
- **Hand-written prose deleted from the generators.** GAP-V6-005's summary
  carried "14 of the 108" while the matrix beside it reported 18 — two
  representations of one number, one hand-maintained, where the renderer
  already derives the authoritative figure. The §38/§65 notes named
  `pw-report` and `trend`, which are commands, as modules of `src/forensics`.
  The `QA_DOMAIN_RECORDS` provenance column named a symbol that exists
  nowhere in `src/`.
- **"156 cells" was never true.** The support matrix carries 136 cells and 6 on
  the language-framework axis. The figure was hand-written in source, so
  regenerating could not have fixed it; the language manifest now names the
  surface and points at the matrix that carries the count.
- **`docs/ANTI-CREEP.md` pointed at `src/rules/tier-policy.ts`;** the module is
  at `src/engine/tier-policy.ts`.
- **`docs/MANUAL-SCRIPTS.md` claimed `docs:roadmap:backlinks` was wired into
  the nightly tier.** It was not. It is now, so the row is gone — and the
  script-reachability gate enforces that a script cannot be both a gate and a
  manual tool.

A gate that has never fired is not a gate: the rendered-markdown comparison was
verified to fail on a planted hand edit and pass after reverting it.

### False greens: three places a scan reported a stronger result than it had

Every ordinary scan withheld 34 quarantined rules and reported nothing about
it at three different surfaces. This release closes that gap. **These are
user-visible status changes** — an `INCONCLUSIVE` finding is no longer
`FIXED`, and SARIF `executionSuccessful` is now `false` on a scan that
withheld rules. Existing baselines and saved reports will show the new,
weaker claim; that is the point of the change.

- **A quarantined rule could prove a finding "fixed" on a scan that never ran
  it.** `analysisStatus` reported _how many_ rules were withheld but not
  _which_, and lifecycle resolution — which decides one finding at a time —
  had nothing to go on. A finding whose rule was filtered out disappeared
  from the scan and rendered `FIXED SINCE BASELINE`. New optional field
  `analysisStatus.withheldRuleIds` carries the set; `resolve()` returns
  `INCONCLUSIVE` with a new `rule-withheld` cause when the finding's rule was
  withheld. With `--strict` the rule runs and the fix resolves normally.
  `schemaVersion: 1` is unchanged — both new fields are additive
  (`docs/VERSIONING.md`).
- **"FIXED SINCE BASELINE (verified by a complete same-revision scan)" was
  false for every withheld scan.** The sentence claimed the whole scan was
  complete; it now claims only what survived every guard — the rule ran, the
  file was in scope, it no longer fires.
- **SARIF called a `PARTIAL`-coverage scan fully successful.**
  `executionSuccessful` was `!partial && rulesCrashed === 0`, and
  `coverageState` is deliberately orthogonal to `partial`, so a scan that read
  every file it was given and ran 45 of 79 detectors reported success to GitHub
  code scanning. `executionSuccessful` now also requires
  `coverageState !== "PARTIAL"`, with a `toolExecutionNotifications` entry
  naming the withheld count and pointing at `--strict`.
- **`analysisStatus.reasons` now carries `coverage:quarantine:<n>`,** which
  `types.ts` already promised and nothing emitted. The flat reason set is what
  a machine consumer reads, and it was empty for the one gap that affects
  every non-`--strict` scan. `coverage:*` reasons are excluded from
  report-io's `partial` markers, so disclosing coverage does not make a saved
  report unloadable and does not turn ordinary scans into partial ones.
- **A lone `expect(x).toBeTruthy()` was reported as a false proof.** The QA-IR
  gives `TRUTHY` an `"ANY"` expectation — an explicit, evidence-bearing shape
  — while the double-risk model did not list it as substantiating. The two
  modules disagreed, so the assertion counted as neither substantiating nor a
  double and fell into `DOUBLE_ONLY`: "every assertion is about a test double"
  about a test with no double assertions, at a `hollowRatio` of 0. `TRUTHY` is
  now substantiating, and `DOUBLE_ONLY` requires at least one double.
- **The trust-trend report invented numbers.** `score` is `null` for a repo
  with no tests, and `(last ?? 0) - (first ?? 0)` reported a fabricated
  `+100` when a repo gained its first score. `scoreDelta` is now
  `number | null` and the rendering says "not comparable". `overallDirection`
  compared the _number_ of regression entries against improvements, so one
  50-point drop lost to three 1-point gains and the trend read "improving" —
  it now sums magnitude. `frameworkCount` was `1` whenever detection was known
  (four detected frameworks and one rendered identically) and is now
  `frameworks.length`. The `warnings > errors * 2` ratio degenerated to
  `warnings > 0` at zero errors, reporting "weak assertions" for every repo
  with warnings and none; it now requires a denominator.

### Names: one command, one name

`package.json` carried eight families of stragglers — two names for the same
command, a name and its write arm under different spellings, and a chain whose
members each had a name of their own. Nothing failed, because npm has no
opinion and a second name is indistinguishable from a first one.

- **`build --determinism` and `unimported --check` had twins.** `unimported:check`
  and `check-unimported-modules` both ran `scripts/check-unimported-modules.mjs`;
  `build:determinism` and `verify-build-determinism` both ran
  `scripts/verify-build-determinism.mjs`; and so on for
  `fp-audit:generate`/`generate-fp-audit-table` and `docs:rules`/`generate-rule-docs`.
  A reader who typed the wrong one got the right answer and no signal that the
  name was wrong.
- **`check-cli-contract` is the gate that made it visible.** It reads
  `docs/cli-contract.json`, which carries one disposition per verb in
  `src/engine/cli-command-names.ts`, and it fails when two npm names resolve to
  the same entry with the same argv, when a verb has no disposition, and when
  any `.md`, workflow, or Action names an `npm run` script that does not exist.
  A check arm and a write arm of one generator is **not** a duplicate — that is
  a declared convention in eleven places — so the rule is about the command,
  not the file.
- **`corpus:regression`, `corpus:regression:update`, `corpus:resample` and
  `corpus:regression:refresh-provenance` are now `corpus:audit` with flags.**
  Same subject, four names. `scripts/resample-unmeasured.ts` became a guarded
  module the audit imports rather than a second entry point.
- **`rules:quad:check`, `rules:quad:write` and `corpus:quad:verdicts` are now
  `check-fixture-quad` with flags.** The census's own report already told
  readers to run `npm run check-fixture-quad --verdicts`, which was not a name
  that existed.
- **`version:check`, `version:surface:check`, `reporter:version-check`,
  `changelog:check` and `changelog:unreleased` are now `check-version`.** It is
  a file, not an npm chain, for a reason that bit during this change: `ci.yml`
  runs the unreleased-entry check with `--base=origin/<base>`, and npm appends a
  flag to the LAST command of a chain. A chain that is reordered by one line
  routes the flag to a check that ignores it, and the step keeps reporting PASS
  while comparing against an empty `git status` on a fresh CI checkout. The flag
  now has exactly one consumer, dispatched explicitly, and any other argument is
  a usage error rather than a silent no-op.
- **`site:doctor` is now `doctor`**, and `doctor` runs the product's own
  self-audit before the site's, so the name a maintainer types is the name that
  diagnoses Mjölnir.

### Carve 1.1 — twenty-two READMEs, and the gate that could only be met by deleting them

`README.<lang>.md` existed for 22 languages, machine-assisted, each about a
dozen sections behind the English file. `docs/TRANSLATION-RATCHET.json` recorded
`translationsNotFresh: 22` against a ceiling of 22 — so the ratchet could only
ever be satisfied by deleting the thing it measured, and the maintainer had
already documented that the failing branch was unreachable for the shape of
regression it was written for. It was, in the end, a gate that measured nothing.

Deleted: the 22 files, the advisory report, the strict variant, the ratchet, the
release-status sync, the shared language list, and the three specs that policed
them. `README.md` is the only README. `docs/EXTERNAL-CONFIG.md` and the three
gate rows in `gates/{pr,release,nightly}.json` were updated rather than left
pointing at commands that no longer exist, and `tests/contract/gate-exit-codes.spec.ts`
now asserts the machinery is _absent_ — a deleted gate is a hole with a comment
on it, and the comment is the only thing that survives to be trusted.

The relic that went with them: `package/README.md`, a hand-maintained 778-line
copy of the root README that nothing read and that had drifted 62 lines behind
its own source. `pack-audit` matches tarball entries by name, so the fixture
directory was never a real one.

### Phase 2 — the matrix and the gaps: a claim, and a work queue

**`generate-certification-matrix`** writes `docs/CERTIFICATION-MATRIX.md` from
three artifacts — the language manifest, the declared surface, and the cell
records — and `--check` is a gate in all three tiers. The first output is
**`0/100 cells certified`**, which is the honest number and not a failing state:
a gate that blocks on progress reports nothing else.

The header says what the percentage means on every rendering, because a bare
percentage beside a language name is exactly the misreading §5.4 warns about:
_"the fraction of this ecosystem's required detection surface backed by
certified evidence"_ — **not** how trustworthy a language is.

**`generate-certification-gaps`** turns each of those 100 open cells into an
issue-ready entry: the ecosystem, the concept, the language and framework, the
gate that fails, **the arithmetic of why**, and the floor that closes it. A gap
entry that says "n too small" is a task description; one that says
`precision n=0 is below 35` is a specification.

**Gate D was unfalsifiable, and the generated report is what showed it.** It
failed any cell whose concept had more than one language binding — which means
no cell of the three-language concepts could _ever_ pass, and 40 of the 100 open
entries listed gate D. Language parity is a property of the SET, computed by
the ecosystem roll-up in the matrix; a single cell cannot answer it. What a cell
_can_ answer is whether it names a language its concept is bound to, which is
what gate D says now.

**Seven missing manifest rows, added.** §5.1's table claims eleven ecosystems
with none deleted, and seven had no row — so the matrix had nothing to print for
GitHub Actions, Playwright, Cypress, Selenium, GitLab CI, Jenkins or Azure
Pipelines. Every one is `DISCOVERED`, which is §5.1's own definition for "we
have seen it exist"; `UNMEASURED` would claim a measurement nobody ran.
`ECOSYSTEM_MANIFEST` and `ALL_ECOSYSTEMS` are the new names, with the old
`LANGUAGE_MANIFEST` kept because four specs import it — renaming an export to
fix a noun is a breaking change dressed as tidying.

**Three PENDING-CONSUMER rows deleted themselves**, which is the mechanism
working rather than a nuisance. `validate.ts`, `record.schema.ts` and
`language-manifest.ts` were allowlisted because nothing imported them; the
moment the matrix generator imported them the orphan gate said _"an entry that
no longer describes reality is a lie in a data file"_ and failed. An exemption
that outlives its reason is how a gate starts protecting things nobody
remembers.

### Phase 2 — the §6 cell record: counts in, verdicts out, and what the schema refuses

**`src/certification/record.schema.ts`** — one record per
`concept × language × framework`, as a JSON Schema plus a type-aware validator,
following the repository's existing pattern (`src/config/config-schema.ts`)
rather than buying a schema library for one file.

**Three things the schema refuses, and one it cannot.**

It refuses a stored Wilson bound in three places — the `not` clause, the
`additionalProperties: false`, and the validator — because the plan's
counter-example (`{fp: 5, n: 250, fpWilsonUpper: 0.02}`) reads as valid to
anything that does not recompute it. It refuses one _nested_ inside the counts,
which is where someone actually pastes a rate they just computed; a top-level
check passes it. And it refuses `standard: "manifest-v5"` on a cell record.

It cannot express `n === tp + fp`, so the validator does. An `n` that disagrees
with its own parts asserts something the evidence beside it does not support —
the arithmetic twin of the stored-bound defect, and one nothing recomputes
because an integer looks final.

**§5.2's two columns, spelled.** `CELL_STATES` is `v6-PENDING`,
`v6-PARSEABLE`, `v6-CERTIFIED`, … and the validator rejects a bare
`CERTIFIED`. TypeScript must read as `CERTIFIED (manifest-v5, n=240) · 0/9 cells
(v6-abcdef, PENDING)` — the plan's own worked example, and the reason a cell
state carries its standard in the name. A bare `PENDING` beside a `CERTIFIED` in
the same row is a sentence two readers will contradict each other about.

**§6.4's re-attachment needs an arm.** `legacyVerdicts[].arm` exists because
multi-arm rules are real here: `TQUAL-001` carries a no-assertion arm and a
mock-only arm, `PW-124` a project-split arm and a config-gap arm. Keying on
`(oldRuleId)` alone would attach half a rule's verdicts to the wrong arm.

### Phase 2 — `EXPECTED_CERTIFICATION_SURFACE`: the denominator, declared

**`src/certification/surface-manifest.ts`** — 107 cells across all eleven §5.1
ecosystems, each `REQUIRED` or `NOT_APPLICABLE` **with a reason**, plus
`check-certification-surface` and its committed baseline.

Without a committed denominator, "60% → 100%" is achievable by deleting the
five cells that were not certified. That is the one move that improves every
number in the report without anybody writing a fixture, and no metrics-only
report can tell it from progress.

Four properties, each with a test:

- **The surface cannot shrink silently.** The gate compares the manifest
  against a committed baseline, so a removal committed last month is still
  visible today. A gate that compared the manifest against itself could not
  see it at all — the change would already have passed.
- **`REQUIRED` may grow freely.** Raising the bar is never gated; only
  shrinking is, and only with `--acknowledge-surface-change=<why>`, which moves
  the baseline and records the reason beside the new list.
- **Every exclusion NAMES AN ALTERNATIVE.** `NOT_APPLICABLE` is a first-class
  state and it is printed, but a reason that says only why _not here_ is a
  deletion wearing a label. The gate rejects it; the plan's own example — a CI
  concept on a Python ecosystem — shows the real shape.
- **No cell names a concept the vocabulary does not have.** This caught three on
  the first run: `frameloctor-…`, `ignored-exit-code-or-true` and
  `trial-click-…` were ids I guessed rather than read, and a `REQUIRED` cell for
  an undefined concept is a denominator entry nobody can ever close.

**The three wave-C ecosystems with zero corpus repositories STAY.** Deleting
GitLab CI, Jenkins and Azure Pipelines would improve every percentage in the
report by removing the ecosystems nobody has measured. §5.1 retains all
eleven; a wave is a ranking, not a deletion.

**Two defects the spec found in the gate it was written for.**

The gate computed `removed` and `added` with the _same_ filter over the current
keys — so `removed` was really the added set, and a genuine shrink was
invisible. The gate that exists to catch a shrinking denominator did not
detect one. The fixture shrank the surface by a cell and the gate said PASS,
which is how it was found.

And the gate **swallowed a failure to read its own manifest**: with no
`node_modules` in the fixture tree the `tsx` spawn failed, the error was
ignored, and it printed `PASS — 107 cells`. A gate that reports a pass because
it could not read its input is the loudest possible wrong answer, so an
unreadable manifest is now exit 10 and says so. The fixture needed a
`node_modules` junction for a different reason: it copied the gate and then
invoked the _real_ one, which computes its root from its own location — so the
mutation was applied to a copy nobody read, for three runs.

### Phase 2 — the concept vocabulary, and the §6 contract that judges a cell

**`src/certification/concepts.ts`** — 60 concepts covering all 79 rules,
**generated** from the registry by `scripts/generate-concepts.ts`, **committed**
for review, and **verified** by `tests/contract/certification-concepts.spec.ts`.
The registry is the authority; the table is a claim about it a reader can check.

A concept is a failure MODE and a rule is that mode in one language. The
derivation is mechanical because the titles in this tree already assert the
grouping: `QA-TEST-004` ("Hard sleep in test", TypeScript) and `QA-PY-005`
("time.sleep() in test", Python) are different rules for the same concept, and
§6 certifies `concept × language × framework` — so a concept that split them
would certify one detector twice and report two cells where there is one.

It yields 60 concepts where the plan says 32, because the plan's concepts are
COARSER: it calls `test-cannot-fail` one concept, the tree calls it five ("Test
without assertions", "Empty test body", "Skipped test", "Focused test",
"Disabled test"). Both are defensible and they measure different things, so
the fine cut is committed and the coarse groupings are expressible as a VIEW
over it — additive and reviewable, where merging rows is not. The count is
reported, not gated, which is the plan's own rule for counts.

**`src/certification/validate.ts`** — §6 as code: six independent gates, counts
in and verdicts out.

**Counts are stored; intervals never are.** `CellEvidence` has no
`fpWilsonUpper` field and `assertCountsOnly` rejects a JSON record that has
grown one — walking the TREE, because the first version checked only the top
level and `fpRate` nested inside `precision` is exactly where someone would
paste it. The plan's own counter-example is `{fp: 5, n: 250}` with a stored
0.02 upper bound: it looks valid to anything that does not recompute it.

The thresholds are pinned by tests, because they are not round numbers:
`n ≥ 35` is where a PERFECT 35-of-35 clears both a `≤ 0.10` FP upper bound and a
`≥ 0.90` recall lower bound — `wilson(0,35) = 0.0989` and `wilson(35,35) =
0.9011`. That coincidence is the entire justification for the concept bar, and
`n ≥ 34` failing is asserted beside it, because a threshold nobody fails is not
a threshold.

**Three wrong readings of the Wilson bound, and the tests caught all three.**
`wilsonInterval(x, n)` is a proportion of SUCCESSES. For precision the successes
are the FALSE POSITIVES; for recall they are the TRUE POSITIVES. Reading `fn`,
or reading the complement `n - tp`, gives a lower bound of exactly **0** on a
perfect cell — the Wilson bound at p = 0 is 0 — so every cell in the repository
fails gate B. The plan's own numbers settle it: `wilson(35,35) = 0.9011` is a
lower bound on a cell with no failures.

The tiering is asserted as a RELATIONSHIP rather than a comparison: the same
24-of-24 evidence clears the cell bar (0.862 ≥ 0.80) and fails the concept bar
(0.862 < 0.90, and `n = 24 < 35`). That is the reason §5.5b has two tiers, and
an assertion comparing a bound to a count would have passed for no reason at
all — which is what the first version of that test did.

**One commit-time self-caught defect.** Registering the two new npm scripts, the
first draft was `check-concepts: "… generate-concepts.ts"` plus
`generate-concepts: "… generate-concepts.ts --write"` — two names, one file,
one command. That is the exact straggler pattern Phase 0 existed to remove,
committed by the person removing it, and caught by the gate built for the
purpose.

`validate.ts` is on the orphan list as `PENDING-CONSUMER`, with the reason that
its first production caller is `generate-certification-matrix.ts`. It is filed
as pending rather than as an exemption on purpose: this gate fails an allowlist
row that something now IMPORTS, so the row disappears the moment the matrix
generator lands.

### Carve 1.6.1 — the order-dependent pair, and why they are still reachable

The plan marks `historical-trust.ts` and `machine-contract-verification.ts` as
deletable **only** after `commands/milestone.ts` stops needing them, and says to
do it here rather than in 1.5 for exactly that reason. Every refactor that
removed a verb left `milestone.ts` as the home of the survivors, so two modules
on the delete list stayed reachable through a filename that no longer described
what the file was.

`commands/milestone.ts` went from 1,049 lines to 463, split along the seams it
already had:

- **`milestone-args.ts`** — the arg parser, the target validator and the
  workflow-file check. Seven commands used them and they are **shared**, not
  copied seven times: a flag rule that exists twice can disagree with itself,
  and the copy a pipeline runs is the one that has to be right.
- **`contract-verify.ts`** — the ~280 lines of nested type guards that decide
  whether a file on disk is the document the tool claims it wrote, plus the
  command.
- **`release-trend.ts`** — the trust-snapshot history and `ci release-trend`.

**The two engine modules stay, and `docs/cli-contract.json` records why with
their importer named.** `contract-verify` is a live verb (the plan's merge into
`ci verify` is a behaviour change to a live command, recorded as
`plannedTarget` rather than done), and `ci release-trend` is a live subcommand.
The delete list was written when those verbs were going away; the capability
moved rather than vanished. "On a delete list" and "reachable from three
places" are both true, and only one of them is a reason to delete.

A range extraction cannot see what a slice depended on, and the compiler listed
all 300 resulting errors. Four of them are worth recording because each is a way
this goes wrong quietly:

- `ContractDocument` is `ScanResult & { contract }`, not a wrapper with a `scan`
  field. I guessed the wrapper. A persisted contract artifact is the scan with
  its own verdict attached, and a reader that has to know which of the two
  shapes it holds is a reader that will hold it wrong.
- `MilestoneArgs` was declared _above_ the extracted range, so the module that
  PARSES it no longer contained it. A type with three homes is a type with
  none; it belongs where the parsing is.
- `STRICT_SUPPRESSION_POLICY` sat immediately above the range and stayed behind
  with its only reader gone — moved down to it.
- `ContractDocument` ended up declared in two of the new files, because a
  declaration and its first use can straddle a boundary. Two identical copies
  are invisible to the compiler, which is the reason to look for them by hand.

### Carve 1.6 (MOVE arm, group 3) — three internal verbs folded, two arrows that do not connect

`pw-report`, `framework-maturity` and `doctor:playwright` all fold into flags —
`explain --playwright`, `doctor --frameworks`, `doctor --frameworks` — which is
what the plan calls INTERNAL for all three: none is a capability a reader is
meant to reach for. `doctor --frameworks` is a FLAG and not a second
`argv[0] === "doctor"` branch, because `tests/contract/readme-commands.spec.ts`
reads those literals as the known subcommand set and one verb with two entries
in it is a set that no longer means what it says.

**Three of the plan's arrows do not connect, and the contract says so.**

- `contract-verify` → `ci verify`. `ci verify` is the BLOCKING CHECK and does
  not run the machine-contract or exit-code validators. Folding it is a
  behaviour change to a live command, not a rename, so the verb, the
  implementation and its eleven tests stay and the row reads
  `plannedTarget: ci verify` with the reason.
- `analyze` → `explain`. `analyze` is CROSS-FILE analysis — shared imports,
  duplicated blocks, circular dependencies — and its findings reference
  multiple files. `explain` answers "what does this finding mean"; making it
  answer "which files import each other" would give a verb a capability it
  does not have.
- `handoff` → `install agent-rules`. `install` writes agent INSTRUCTION
  surfaces; `handoff` renders a deterministic remediation plan from a saved
  report. One configures an environment, the other renders a document an agent
  can execute.

**Two routing bugs the collapse introduced and this step fixed.**

- `mjolnar ci install --help` started running the installer. The `--help` rule
  was positional in its first form and had a second special case for the
  three-token case; the collapse generalised the first and deleted the second,
  taking the `ci install --help` path with it. The rule is now "a `--help`
  anywhere in the invocation asks for help", which is the rule that was always
  true.
- `mjolnar ci verify --help` rendered **`ci install`'s** page, because the
  dispatcher built the subject as `ci:install` and the catalogue keys it
  `"ci install"` — a space, because no verb name contains one. A `:` was
  chosen to avoid colliding with `doctor:playwright`, which read as clever
  right up to the moment it sent a reader to a page that does not exist.

The root help also no longer prints a section whose verbs are all retired: the
collapse emptied two groups and left the headings, and a table of contents that
promises a section it does not have is the same class of claim as a command
that does not exist. The `GROUPS` list itself was rewritten to name the fourteen
entries the catalogue actually has — it used to list twenty-nine, of which the
renderer silently skipped twenty, so the file read as a graveyard.

`tests/cli/help.spec.ts` gained a sweep that renders every catalogue entry and
both composite pages and asserts none names a retired verb, reading the
retirements out of `docs/cli-contract.json` rather than listing them. The
pattern covers slash-separated tool lists as well as invocations, because the
`mcp` line carried three retired names in that shape and the narrower sweep was
blind to it.

### Carve 1.6 (MOVE arm, group 2) — five capabilities became `explain` arms

`explain` is the question verb. Five capabilities were top-level verbs that all
answer a variation of that question, and each is a flag on it:

| Was          | Now                   |                                                       |
| ------------ | --------------------- | ----------------------------------------------------- |
| `rules`      | `explain --list`      | the rule catalogue, with each rule's measured FP rate |
| `why`        | `explain <file:line>` | already an arm — see below                            |
| `cross-file` | `explain --callers`   | who calls this symbol                                 |
| `handover`   | `explain --plan`      | who owns what, and what to do next                    |
| `triage`     | `explain --evidence`  | runtime evidence from a real run                      |

**`why` never moved.** `explain` has delegated the `file:line` subject form to
that command since before the collapse, so retiring the verb removed a second
name for a capability `explain` already had. The cheapest MOVE in the set and
the one most likely to be got wrong: `mjolnir why file.ts:12` is now a usage
error, and the fix is a different word in the same position.

`--playwright` is the internal arm (the plan says so), and it is marked as such
in the table. `pw-report` summarised a Playwright run for a person reading CI
output; the same information arrives through `--evidence` once that arm reads a
report rather than one runner's format, and one flag that means "the run
summary" beats two that mean it for one of them.

The arms table has the same shape as `CI_SUBCOMMANDS` and for the same reason:
it is the single source the dispatcher reads **and** the help renders from.
Arms are dispatched **before** the subject is read, because `--list` and
`--plan` take no subject and the subject check is what `mjolnar explain --plan`
would otherwise have hit.

**One residue worth naming.** `cli-handlers.ts` carried
`import {} from "./forensics/triage.js";` — an empty import left behind when the
`triage` VERB was retired, because every specifier in that statement became
unused and the statement survived. Legal TypeScript, imports nothing, and it
points at the file a maintainer would go looking in for where triage lives.

The generator of the 101 rule-doc footers was fixed before the files were, so
`mjolnir rules --md` did not come back on the next `npm run generate-rule-docs`.
The 22 PRESERVED retired-rule pages still name it, correctly: they record what
a rule said while it existed, and the gate now skips a rule doc whose ID is not
in the live registry — a fact read from the registry, not a pattern exemption.

### Carve 1.6 (MOVE arm, group 1) — five verbs became `ci <subcommand>`

`ci` is the right home for all five, and the word is not incidental: each one is
a check a pipeline runs, and `ci` is already the verb whose meaning is "the
thing a pipeline does".

| Was               | Now                  |                                                         |
| ----------------- | -------------------- | ------------------------------------------------------- |
| `ci-adapter`      | `ci adapters`        | which ecosystems can be analysed, and how well          |
| `ci-integrity`    | `ci integrity`       | the generated workflow is itself correct                |
| `verify`          | `ci verify`          | run the blocking check and the suppression policy       |
| `release-trust`   | `ci release-trust`   | the signed measurement release's trust record           |
| `trust-trend`     | `ci release-trend`   | how that record has moved across releases               |
| `contract-verify` | `ci verify` (merged) | its two checks are the judgement `verify` already makes |

`integrity` and `verify` are the sharpest case in the whole collapse: as
top-level verbs, `mjolnir integrity` and `mjolnir verify` read as two
products that happened to share a surface nobody could see from the command
list. `contract-verify` is recorded as a **merge with its destination named**,
not a rename — "the checks went somewhere" has to be checkable.

**The table is the claim.** `CI_SUBCOMMANDS` in `src/cli.ts` is one object, the
dispatcher reads it by name, and `mjolnir ci --help` renders from it — so a
subcommand that exists is documented and one that is documented exists. A
dispatcher with five inline `if` arms plus a separate help string is how the two
drift apart, and this repository has that shape somewhere in every other
subsystem. An unknown subcommand names the known ones and exits 10.

Two routing bugs the collapse fixed on the way: `ci --help` rendered the ROOT
help, and `ci verify --help` rendered **`ci install`'s** help, because the
`--help` rule hardcoded `["ci", "install"]`. Both are now derived from the
request rather than from a constant.

### Carve 1.6 (REPLACE arm) — four verbs became flags, and two could not

`scan` gained three `--format` values and three modes:

| Retired verb       | Replacement                    | What the flag is                                                                               |
| ------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `trust-report`     | `scan --format trust-report`   | the terminal render, spelled out                                                               |
| `pr-comment`       | `scan --format pr-comment`     | the same renderer plus the stored-baseline diff, so a comment can still say RESOLVED           |
| `summary`          | `scan --format github-summary` | named after its CONSUMER, because `summary` was ambiguous with the terminal's own summary band |
| `suppressions`     | `scan --suppressions`          | the ledger, now reading the TARGET rather than the cwd                                         |
| `suppression-gate` | `scan --suppression-gate`      | **delegates** to the command; the flag lands first                                             |
| `policy`           | `scan --policy`                | the SCORING table, printed from the constants                                                  |

`scan --policy` is the new file here: `src/scorer/scoring-policy.ts` imports
`NORMALIZATION_K`, `SMOOTHING_C`, both ceilings and the deduction-mass bands
and renders them, so the table cannot drift from the code that scored the run.
The `NORMALIZATION_K` line says **declared, not fitted** in the table itself,
because printing a bare `5` among measured numbers reads as a measurement, and
it is not one.

**Two of the plan's REPLACE rows were not honest replacements, and are recorded
as pending rather than done.** `stats → scan --json` would replace a milestone
ledger with a scan result — a different document wearing the same name. `rules →
explain --list` and `why → explain <file:line>` name arms that do not exist
yet. And `policy` keeps its verb, because `mjolnir policy init` and
`validate` manage `mjolnir.policy.json`, a file that gates CI; folding a
subcommand tree into a flag would lose both. Each row in
`docs/cli-contract.json` now says what is missing, because "the plan says so" is
not a disposition.

`--suppression-gate` delegates rather than reimplementing: a governance rule
that exists twice can disagree with itself, and the flag and the command are
the same judgement, so the flag synthesises argv and calls it.

### Carve 1.6 slice 2 — `mutation`, `forensics` and `triage`, and a directory that had to stay

The `mutation` verb is gone with `src/mutation/` (501 lines): reading Stryker
and Mutmut reports is reading another tool's opinion of the code, and the
directory had no importer but the verb's own runner. Two fuzz harnesses are
narrowed rather than deleted, and the loss of mutation-format fuzz coverage is
recorded here rather than left in a file that was about to be deleted.

**`src/forensics/` stays.** The plan makes `forensics` a DELETE, and the verb
is deleted — but the import graph says the directory is not dead:
`evidence-hygiene.ts` is imported by `commands/trust-report.ts` and
`integrations/github/evidence-sanitization.ts`, the path the GitHub Action's PR
comment goes through, and `triage.ts` is imported by `mcp/server.ts` under a
parity contract. Deleting 2,600 lines by name would have broken the PR commenter
and the MCP server, and the diff would have been green. That is the plan's own
"names are not evidence" applied to a directory the plan did not enumerate.

`triage` is a MOVE to `explain --evidence` and the flag lands with the next
slice, so the contract records `targetStatus: PENDING` rather than claiming the
capability has arrived. The verb goes now so nothing can depend on it; the
capability arrives when the flag does.

**The generated output was naming the dead tool at users.** `FLAKY.md` and
`TRIAGE.md` stamp themselves "Generated by `mjolnir triage`" — a string
written into a file a user commits to their repository, asserting a command
ran. Both now name Mjölnir and the data source instead, which is both true and
stable across the verb's next move.

One source-layer miss worth recording: the rule `fix` strings that told users
to run the retired verbs live in `src/rules/`, and I edited the _generated_
`docs/rules/*.md` first. `npm run generate-rule-docs` would have put them
straight back — the same class of bug as the hardcoded `@v3` in the
translation sync, one level up. The rules are the source; the docs, the site
pages and the demo report are all downstream of them, and changing a generated
file without changing its generator is a decision that survives exactly until
the next regeneration.

Two artifacts turned out to be hand-maintained with no writer:
`assets/readme/demo-report.json` (four readers, no generator) and
`packages/playwright-reporter/` (unpublished, 0.1.0, its whole description
about the three retired verbs). Both are noted rather than quietly patched; the
reporter is a Phase 7 decision, since its output format is still what the
evidence path will read.

### Carve 1.6 (DELETE arm) — ten verbs removed, and every place that named one

`badge` · `debt` · `impact` · `trend` · `exec-report` · `dashboard` ·
`baseline` · `diff` · `create-rule` · `init` are gone: the command module, the
`cli.ts` `VERBS` row, the `argv[0] === "…"` literal that
`tests/contract/readme-commands.spec.ts` reads, the import and re-export lists,
the `cli-handlers.ts` runner, the help-catalogue entry, and 117 tests across 27
spec files — four of which were deleted outright because the removed verb was
their entire subject.

**A verb's disposition is about the verb, not the module.** `baseline` is the
case that would have shipped a green build and a broken product: the module is
imported by `stats.ts`, `verify.ts`, `mcp/server.ts` and
`reporter/pr-report-shared.ts`, so deleting it with the verb would have broken
the MCP server, the PR reporter and `verify`. The module survives as a shared
reader with a header that says so; the verb does not, because a stored
"yesterday was fine" is the same trust-the-green-check failure the product
exists to catch. That is the plan's own instruction — _names are not evidence_ —
applied to an object it did not name.

**The suggestions the product printed were the bug nobody filed.** The
reporter's `nextStep` strings are not documentation; they are the next thing
printed into the terminal. `nextStep("mjolnir diff")` in a product whose `diff`
was retired in the same commit is a command that does not exist, in the one
place a user is guaranteed to be looking. `check-cli-contract` treats `src/`
as a live surface for exactly this reason, and it is why `src/` was swept too
rather than left to a later documentation pass.

**The contract is now a record of removals, not only of presences.**
`docs/cli-contract.json` gained `retiredVerbs`, and the gate learned to check
it: a `DELETE` row for a verb that has left `cli-command-names.ts` must appear
in `retiredVerbs` with the commit that made it, and a `retiredVerbs` entry for
a verb that is still registered fails too. Ten verbs retired; the gate now
fails any README, site page, workflow, Action or source string that names one.

Follow-through, all of it found by gates rather than by looking: three coverage
exemptions whose subject is gone, three `vitest.config.ts` coverage exclusions,
two degradation exemptions, the dashboard-template assertion (which asserted
"exactly one generator" and became vacuous when the generator was deleted, so
it now asserts the invariant that still has teeth — that two renderers cannot
both claim a band), and the demo asset, regenerated.

`forensics` stays. The plan makes it a DELETE too, and it will be — its
subsystem and the `triage` relocation into `explain --evidence` are the next
slice. Its row says KEEP until they land, because a contract that asserts a
deletion the binary does not honour is worse than one that is merely out of
date.

### Carve 1.5 — 14,986 lines of unwired modules, and one the plan got wrong

Nineteen modules with zero importers, all nineteen already on the committed
orphan list, all nineteen with a dedicated spec file that imported nothing but
them. A module with a test and no caller is the shape that makes dead code look
alive: `tests/` counted as coverage of a file the product never reached.

Deleted: `evidence-artifacts` · `finalize-scan-result` · `pipeline-stages` ·
`semantic-model-api` · `runtime-evidence-graph` (1,857 lines) ·
`runtime-static-correlation` · `coverage-ingestion` · `evidence-enforcement` ·
`reporter/sarif-compliance` · `m38-challenge-contract` ·
`m43-system-of-systems` · `m44-historical-intelligence` (2,247) ·
`m49-experience-parity-contract` · `bench/m48-scale-operating-model` ·
`governance/m33-m34-contract` (2,745) · `qa/domain-model` ·
`frameworks/universal-pack-contract` · `plugins/sdk-contract` ·
`mutation/failure-sensitivity` — and their twenty specs. Nineteen stale
allowlist rows went with them, because a row describing a file that no longer
exists is the same lie as a row describing a file something now imports.

**The plan listed a twentieth as a true orphan, and it is not one.**
`src/engine/evidence-graph.ts` has two importers and is shipped-reachable —
`src/commands/milestone.ts` is one of them, which is the command that serves
the `evidence-graph` verb. Deleting it would have removed the only way to reach
a query surface the §3 table does not even mention. It stays, and
`docs/cli-contract.json` now records the import-graph evidence rather than the
plan's assertion.

The check that caught it is worth naming, because the first version of it was
wrong: it resolved the plan's bare filenames (`evidence-graph.ts`) against
`src/`, where they do not live, so the import graph returned an empty importer
list for all twenty and every one of them looked like a safe deletion. The
files are under `src/engine/`, `src/bench/`, `src/governance/`, `src/qa/`,
`src/frameworks/`, `src/plugins/` and `src/mutation/`. A graph lookup that
answers "no importers" for a path that does not exist is not evidence of
anything, and the plan's own instruction — _names are not evidence_ — applies
to the plan's file list exactly as it applies to the tree.

### Carve 1.3 — the brand self-audit survives, and its header stopped lying

`npm run brand:doctor` is a nine-rule self-audit over a six-node graph, and
it still passes 9 of 9 with an empty `KNOWN_OPEN` ratchet. The tokens stay:
`src/brand/tokens.ts` is load-bearing for the reporter, the site theme, the
README generators and the mark hashes, and `assets/brand/tokens.json` is
byte-locked against it.

What changed is the gate's own description of the tree. It said the badge
drift appeared "in all 23 READMEs" and referred to a `site-doctor` check by a
name that no longer exists. "Every README" is now one file plus five generated
bands, and the rule did not weaken to reach that number — the twenty-two
translations were never a distinct edge, they were copies of the same badges,
and the copying is what made the drift expensive.

Site gate after the step: `gen`, `test`, `doctor` (0 of 8 failing), `build`,
with no generated drift.

### Carve 1.2 — the 86-second tour drew a command the product will not have

`assets/video/script.tour.json` rendered `mjolnir forensics
./test-results/`, and `forensics` is a DELETE verb in the v6 CLI collapse
(plan §3). A committed render script is evidence: it is what the renderer
is allowed to draw, and it was drawing a command that will not exist.

Removed: `captureTourScript()`, the `tour` script id, `script.tour.json`,
the `tour` arm in three contract specs, the `both|demotour` choice on the
`demo-video` workflow, and the tour rows in the video README. Order mattered —
this runs before the CLI collapse so the three specs that re-run the capture
and fail on drift stay green instead of going red on a verb the carve was
about to remove.

The hero stays. Its story — a false-green CI gate found, fixed, re-proved —
is the whole positioning, and it uses only verbs the collapse keeps.

One behaviour change while the file was open: rendering no longer overwrites
the committed MP4. `publishDemo()` used to run unconditionally after any
render, so a manual workflow dispatch replaced two binaries the README links
to without asking. Publishing is now an explicit `--publish`, which
`npm run docs:video:render` passes, so regenerating the shipped asset is
unchanged for a human and safe by default for a workflow.

### The Action major tag every reader was told to pin did not exist

`action.yml` documented `uses: Sergey-Bar/Mjolnir@v3` while the published stable
was **5.0.0** — and `scripts/readme-release-status.mjs` did not merely inherit
that, it re-wrote it. Every translation sync ran

```js
replaceAll("Sergey-Bar/Mjolnir@v1", "Sergey-Bar/Mjolnir@v3");
```

so twenty-two translated READMEs instructed every non-English reader to pin a
tag the repository stopped moving at 3.x, and the next sync put it back. A
hardcoded major is a syntactically valid ref; it fails for the reader as a 404
and for nobody in this repository.

The sync now derives the major from the released version, and
`tests/contract/census-drift.spec.ts` sweeps every live surface for a
`Sergey-Bar/Mjolnir@vN` that is not the published major, with the same
dormant-shape and match-count discipline the census sweep already uses.

### The carve manifest: 28 files, and the one that mattered

Phase 1 removes ~10,000 lines across twenty areas. The cheapest way for that to
go wrong is for a reviewer to trust a folder name, and the plan's own evidence
says not to: `src/ledger/` reads like bookkeeping and is 2,856 lines of M26
validators that four scripts import. So `docs/CARVE-MANIFEST.json` records, per
file, who imports it, whether it ships, which specs name it, and how big it is —
generated facts, hand-written dispositions that survive regeneration, and a gate
(`npm run check-carve-manifest`) that fails when the two disagree.

All 28 files start at KEEP. Nine have no importer; every one of them was already
on the disclosed orphan list, so the manifest found no new dead code — it found
the size of the code that a directory name would have hidden.

The gate also fails on the case a directory-based review cannot see: a file that
left the tree without a DELETE disposition. That is the difference between a
reviewed removal and an accident, and it is one field.

### Claim integrity — the gates that could not fail

Every item here is a check that was running, reporting, and could not have
failed. The pattern is one defect wearing a dozen hats: a value that looked
load-bearing and held nothing.

- **`coverage:ratchet` measured a truncated run.** It read
  `summary.total` and never counted files, so a two-file run of a 292-file
  tree passed at 97.92% — and a partial run reports _higher_ percentages than
  a complete one, because the files that survive are the easy ones. It now
  asserts a file-count ratio and a non-trivial denominator, both fail-closed.
- **`nForZeroFp` said 1.** The expression `z²·p / (p·(1−p)) − z²` simplifies to
  `z²·p/(1−p)` ≈ 0.427, and `Math.ceil` turned that into 1 — so every
  straddling rule read "About 1 clean sample would settle it". The correct
  value at the 10% ceiling is **35**.
- **`docs/rules/` and the registry both claimed the core tier, differently.**
  `effectiveTier` now resolves it everywhere, including dedup survivor
  resolution, where an undeclared rule defaulted to `core` and outranked every
  rule that had declared `extended`.
- **The capability registry resolved evidence once for the whole registry.**
  One measured rule anywhere made `hasMeasurement` true for every capability,
  and `ci.provider.azure-pipelines` was advertised on an unrelated Java rule's
  measurement. Evidence is resolved per entry now.
- **`OVER_CLAIMED_MATURITY` compared a value with itself.** `proven` and
  `maturity` were assigned from one call, so the gate could not fire. They now
  come from two resolvers — the census declares, the registry proves — and a
  provider whose evidence beats the ledger is visible as such.
- **`STALE` was unreachable.** The FP-audit generator filtered stale
  measurements out of `MEASURED_FP`, so `hasStaleMeasurement` was
  structurally always `false` and `QA-PY-004` (42 hand-classified verdicts,
  one detector revision behind) reported as never sampled. `MEASURED_FP_RAW`
  keeps them and both consumers read it.
- **The claim registry had no recency budget.** `observedAt: null` satisfied
  its presence check, so a 2026-06 observation read like yesterday's.
  Per-type budgets now apply, the digest check runs against a real status
  instead of a value absent from the enum, and every `BLOCKED` claim carries a
  `blockedReason` and a review date.
- **The tier ratchet was vacuous on an empty tier.** `MAX_UNMEASURED_CORE = 0`
  was satisfied by a set with no members, so the first core promotion would
  have arrived with the check already green. A rule is now accounted for by ≥10
  classified verdicts **or** by an unexpired `corePromotion` naming an owner.
- **The anti-creep law had two escapes.** The exception marker was searched
  for across the whole append-only changelog, so one marker in any past
  release disabled the ratchet for good — and with an empty tier and a zero
  baseline, the first promotion would have switched the law off permanently.
  The comparison is also now against `previousBaselineCore`, so lowering the
  baseline to match a grown tier no longer hides the growth.
- **The census could call an ecosystem `SUPPORTED` with a fixture
  directory as its only evidence.** `SUPPORTED` now requires an adapter **and**
  a verified four-leg quad, which demoted 33 entries — the honest result, and
  the reason 19 rules were demoted in 6.0 for the same reason.
- **Two hardcoded-`false` quad resolvers, in two files.** They could not fail
  and the census's directory-size proxy answered a different question from the
  registry's `false`. Both now read one filesystem probe.
- **Seven gates ran only locally.** `qa-ir:parity` and `check-unimported-modules` were
  on a nightly cron, so a PR that broke either passed CI and failed on the
  maintainer's machine. The other seven are new here. All nine are in
  `gates:claim-integrity`, which `ci.yml` runs as one step — named per gate
  inside the chain so a failure identifies itself — and declared in all three
  `gates/*.json` tiers.

### New gates

`npm run gates:claim-integrity` chains the nine claim-integrity checks so a
failure names its gate instead of a step number. Also new: `workflow:scripts`,
`config:consumers`, `scripts:reachable`, `translations:ratchet`,
`docs:provenance-drift`, `check-fixture-quad`, `rules:promotion:check`,
`check-changelog`.

### Deliberate omissions

- **The 4-leg fixture backfill (148 legs) is not in this change.** The plan
  requires the quad to be _executed_, not merely present; writing 148 legs
  no detector had run against would have made `check-fixture-quad` green by
  construction. `npm run check-fixture-quad` prints the work list — 53 rules
  have `MUST-FIRE`, 40 `MUST-NOT-FIRE`, 75 `RECALL`, **0 `PRECISION`**, and 0
  of 79 have all four — so the backfill is driven by data rather than memory.
  `PRECISION` is zero because it demands a classified `TN` on a negative
  fixture, and no fixture has been classified as silent.
- **`gitlab-ci` is written but not registered.** The adapter exists and three
  detection classes are already enumerated in `src/adapters/gitlab-ci.ts`, but
  it has no rules, so registering it would trade one false claim for another.
  Admitting it means writing the three rules with fixtures, and it is gated by
  the same quad as everything else.

### PR reports say what to do next (#698)

`src/reporter/pr-report-actions.ts` turns a PR comment from a finding list into
a handover: each band names the action it implies, so a reader who disagrees
with a verdict can see which command contradicts it without reading the source.
Six score badges (`assets/brand/pr-status/*.svg`) are generated from the brand
tokens by `npm run brand:pr-status` and drift-locked by
`tests/reporters/pr-report-actions.spec.ts`, which fails if a badge's stroke
stops matching the token it came from. `brand:pr-status` is a deliberate brand
change, so it is declared manual in `docs/MANUAL-SCRIPTS.md` rather than wired
into a gate.

### The website reading stack, and the palette it arrived with (#696)

A quieter, cooler set of greys and a teal→violet accent rule for the landing and
guide surfaces, plus `docs/AI-DISCOVERY.md`, `site/public/llms.txt`, the guided
proof walkthrough, and vendored Nordic and Cascadia fonts.

The palette arrived as raw hex inside the theme stylesheets, which is exactly
what `brand-doctor` rule 6 exists to catch: a second palette no gate could see.
It is now nine tokens in `BRAND` — `readingAccent`, `readingAccentAlt`,
`readingFocus`, `readingAccentBright`, `readingAccentInk`, `readingUnworthy`,
`readingMuted`, `readingDim`, `readingLede` — emitted as `--mj-reading-*` and
referenced by the stylesheets that use them. Putting them in `BRAND` rather than
a group of their own is deliberate: rule 8 computes WCAG AA for every foreground
in `BRAND` against every surface, so the nine are held to the same floor as the
terminal palette rather than escaping it. The weakest pairing is
`readingAccentAlt` on `soft` at 5.75:1.

These are scoped to the reading surfaces. `steelDim` and `heroMuted` keep their
values for the terminal, the README artwork and every other surface — the POC
never claimed otherwise.

### Known open, deliberately

**Publishing a package is not certifying it.** 5.1.0 is on npm; that is a
statement about distribution, not about evidence. The candidate manifest remains
`WORKING_CANDIDATE` / `NOT_CERTIFIED` / `NOT_AUTHORIZED`, and nothing in this
release moves those states.

Four gates report `BLOCKED` on `npm run release:verify` and did not gate this
publish:

- **`m26:audit`** — no consented external execution and no holdout proof.
- **`candidate:readiness`** — no real-world, platform-matrix or
  consumer-install evidence.
- **`candidate:decision:release`** — the same, adjudicated as a release-stage
  decision rather than an engineering one.
- **`docs:roadmap:check`** — 69 support-matrix cells are explicitly `BLOCKED`
  and `docs/M26-EXTERNAL-VALIDATION.json` records external validation as
  `BLOCKED`, not `COMPLETE`. This is the same missing evidence read through
  the roadmap ledger, and it is a reporting gate: `stable-release.yml` does not
  run it. It has read this way since the v6 carve — no commit since then has
  touched `docs/M26-SUPPORT-MATRIX.json`, `docs/M26-EXTERNAL-VALIDATION.json`
  or `docs/M26-GAP-LEDGER.jsonl`.

The first three still run and still print on every publish; they stopped blocking
only because a person recorded `vars.STABLE_RELEASE_AUTHORIZED=true`
(`stable-release.yml`, `Candidate evidence`). `npm run ci-local` passes, because
`candidate:decision:engineering` clears every engineering blocker.

This is the designed state for 5.x, not a workaround. The alternative — editing
the manifest to claim `REMOTE_PROVEN`, `CERTIFIED` or `AUTHORIZED` — is the
false-green this project exists to prevent.

## [5.0.0] — 2026-09-27

### Breaking changes

- **`business-case` no longer prints a dollar figure you did not supply.** The
  `--industry` flag selected from a table of invented incident costs (fintech
  $50 000, healthcare $100 000, …) with no source, and the product of that table
  and a measured false-positive rate was printed as "Expected Savings" and
  "Total potential savings". Pass `--incident-cost <n>` to see the arithmetic;
  the measured FP rates, their sample sizes and the evidence weight behind them
  are always shown. `--industry`, `--history` and `--projected` now exit with a
  reason: `--history` read no history despite promising estimates from scan
  improvements, and `--projected` divided the total by six and called the
  quotient a monthly rate.
- **`enterprise sso` and `enterprise compliance` no longer write files.** They
  wrote an SSO guide instructing readers to add an `sso` block to
  `mjolnir.config.json` — a key nothing reads — and three auditor-facing SOC 2 /
  HIPAA / PCI-DSS templates mapping controls to capabilities this product does
  not have (SSO/SAML integration, a scan "audit trail", a "privacy scan"). Both
  now refuse with a reason. `enterprise config` emits
  `capability-manifest.json`, whose `notProvided` list records the absences
  instead of inventing a deployment.
- **The evidence descriptor is now the same on every surface.** The HTML and
  Markdown trust reports showed four bare words (`E2 · deterministic`) where the
  terminal showed the full descriptor. They now show
  `[E2 · deterministic · measured FP 8% · n=14 · trust L3 · runtime: file executed]`.
  A finding with no `evidenceLevel` of its own now derives one from its type and
  confidence instead of defaulting to `E2` — the strongest claim the product can
  make, previously asserted for findings nobody had measured.
- **Unmeasured counts read "unknown — not measured", not `0`.** The trust
  report, the PR comment and the step summary all rendered
  `testDeclarationCount ?? 0` as "0 tests analyzed in 0 files" for a producer
  that had never measured a declaration. The trust-report JSON twin now emits
  `null` for those fields. A zero is a claim; an absent measurement is not.
- **The dashboard no longer varies between runs of an unchanged repository.**
  The generation timestamp moved out of the visible body into
  `<meta name="mjolnir-generated-at">`, and `--deterministic` omits it entirely
  so the artifact is byte-identical and can be diffed in review.
- **`mjolnir report` no longer publishes a test-run status.** The top-level
  `status` was computed from the findings
  (`partial ? "interrupted" : hasError ? "failed" : "passed"`), so a clean scan
  wrote `{status: "passed", totalTests: 0}` — the first field a Playwright
  consumer reads, asserting a green run over zero executed tests, with the
  contradicting `execution: "STATIC_ANALYSIS"` marker buried in the extension
  block. `failed` was equally dishonest: it implies tests ran and lost. The
  field is now the literal `interrupted` on every path, and what the scan
  actually found is reported separately as
  `mjolnir.scanOutcome` (`clean` / `blocked` / `partial`), which the previous
  `mjolnir.status` field carried. Consumers reading the root `status` will see
  `passed` → `interrupted`; that is the correction, not a regression.
- **Score bands are decided in one place.** The dashboard split at 60 while the
  terminal split at 80, so a score the terminal called UNWORTHY rendered amber
  in HTML; the contributor handover used 90; `mermaid.ts` and
  `monorepo-analysis.ts` each carried their own copy. All of them now read
  `src/reporter/presentation.ts`.

### Added

- **`npm run ci:standard` now runs in CI.** `scripts/check-ci-standard.mjs`
  was unit-tested by `tests/integrations/ci-standard.spec.ts` but referenced
  by no workflow, so the invariants it checks — the PR scan's partial-analysis
  handling, the coverage and ratchet gates, and the read-only scan job's
  permissions — were enforced nowhere. It runs as a step in `workflow-lint`,
  next to actionlint, since both are static checks of the repo's own CI
  config.

- **Opt-in Sentry crash reporting.** Set `SENTRY_DSN` and the CLI and the MCP
  stdio server report their own fatal errors — release-tagged as
  `mjolnir-qa@<version>`, tagged by surface, and nothing else: no user data
  (`sendDefaultPii: false`), no traced spans (`tracesSampleRate: 0`), no
  findings or file contents. With no DSN the SDK is never even imported, so the
  default install gains no dependency, no startup cost, and no network call. A
  tool that reads private repositories must not phone home on its own, so the
  DSN is the only switch. `@sentry/node` is an OPTIONAL peer dependency for the
  same reason: ~1.5 MB that nothing in a code scanner needs. Capture points are
  the two existing top-level catch blocks rather than `uncaughtException` /
  `unhandledRejection` handlers, which would have changed the frozen exit-code
  contract. `npm run sentry:release` creates the release and uploads source maps
  (the build now emits them; the published tarball still excludes them). Both
  release pipelines now run it after `npm run build` and before `npm pack`,
  because the debug ids it stamps are written into `dist/` in place: pack first
  and the shipped tarball carries no ids, so the maps uploaded for the release
  match nothing and every stack trace degrades to a bundle frame.
- `npm run report:honesty` — no surface may print a zero for a measurement that
  may be absent. Four reviewed exceptions are recorded for computation inputs,
  each with a reason and a follow-up.
- `npm run thresholds:parity` — no score-band literal may exist outside the
  threshold registry. It immediately caught a selector-health threshold that
  shared a number with a trust band but not a meaning.
- `npm run claims:revalidate` — every claim asserted `fixed` must rest on a
  candidate-bound, independent revalidation. It rejects evidence that cites the
  artifact it is meant to prove, and downgrades rather than deleting a claim
  that loses its evidence.
- `npm run verbs:budget` — the 5.x law, ratcheted at 50 verbs with a 44 target
  for 5.0.
- `npm run script:paths` — no `package.json` script may name a `tests/`,
  `src/`, `scripts/`, `docs/`, `site/` or `enterprise/` path that does not
  exist. 107 path references are checked today.
- `npm run m26:gaps:revalidate` — re-runs every gap row's own
  `revalidation_command` against the working tree and records the exit code and
  the commit it ran at.
- `tests/contract/artifact-determinism.spec.ts` — two runs of the HTML
  artifact over an unchanged repository must be byte-identical.
- `src/reporter/presentation.ts` — the one module that makes a presentation
  decision. It reads a finding, a score or a palette and returns the word, band
  or descriptor to print. It opens no file, touches no clock and formats no
  document, and a test enforces that.

### Changed

- **Ruleset `01` now enforces 11 required checks instead of 4.** It required
  only the four `build-test` matrix contexts, which meant the repo's entire
  review surface — self-scan, certification, generated-docs-drift, site-build,
  workflow-lint, property, fuzz — could be red while a PR still merged. That
  made every one of those checks advice rather than a gate, and it meant the
  deleted `merge-verify.yml` header was describing a ruleset that never
  existed. The enforced set is now the four matrix entries plus
  `property-tests`, `fuzz`, `site-build`, `workflow-lint`, `self-scan`,
  `certification` and `generated-docs-drift` — every check that can actually
  block. Deliberately still _not_ required: `detector-revision-diff` (advisory
  by design — a hard fail would only manufacture routine revision bumps),
  `scan` / `publish` (the Mjölnir PR report, which reviewers read but which
  duplicates `self-scan` on the `src` tree), and the CodeQL/OSV workflows,
  which report but do not gate. `strict_required_status_checks_policy` and
  `do_not_enforce_on_create` are preserved, so a PR must still be current with
  `main` to merge.
- **`docs/BRANCH-PROTECTION.md` now states the enforced set instead of an
  aspiration.** It listed eight required checks; three of them were enforced.
  Its verification command also read `branches/main/protection`, which does not
  carry required checks at all on this repo — they live in ruleset `01` — so it
  could not have worked. Both are corrected.

### Removed

- **The Snyk webhook is gone.** Snyk posted a `security/snyk (sergey-bar)`
  commit status on every push, duplicating the first-party `osv-scanner.yml`
  (`scan-pr` / `scan-scheduled`) and the Dependabot security updates that are
  already configured. Repo webhooks are now empty. Restore with Snyk's own
  integration settings if it is ever wanted back — the deleted hook pointed at
  `https://api.snyk.io/webhook/github/4ac3f376-3f24-42f7-a2c4-8830700f671d`.
- **The `merge-verify` workflow is gone.** It re-ran the entire PR gate
  (build, typecheck, lint, coverage, property, fuzz, site, self-scan, docs
  regen) on every push to `main` — roughly doubling CI cost. Its stated
  justification was that "a green PR that merges into a red main is not a
  green PR", but that failure class is already closed by ruleset `01` running
  `strict_required_status_checks_policy`, which refuses to merge a PR that is
  not current with `main`. The file also asserted that ruleset `01` "requires
  the complete PR matrix, property/fuzz, site, workflow-lint, self-scan,
  certification, detector-revision, and generated-docs checks before merge" —
  it did not, and never has. The ruleset requires only the four `build-test`
  matrix contexts. Both the workflow and the claim are removed rather than left
  to mislead a reviewer about what blocks a merge.
- **The `bench-advisory` CI job is gone.** It spent a full `npm ci` plus a
  3 000-file benchmark run on every PR to produce a comparison that
  `continue-on-error: true` then discarded, and whose only output was a
  warning nobody could gate on. `npm run bench:scan`, the pinned
  `.mjolnir/bench-baseline.json`, and their schema/comparison tests in
  `tests/adversarial/bench-gate.spec.ts` are untouched — the benchmark is
  still runnable and still tested, it just no longer costs every PR a runner.
- **Four copies of the soft job time-budget report.** Each of `build-test`,
  `self-scan`, `generated-docs-drift` and `bench-advisory` re-derived its own
  wall-clock minutes into `$GITHUB_STEP_SUMMARY` and printed a warning that,
  by its own comment, "never gates". The jobs already declare
  `timeout-minutes`, which is the hard bound, and GitHub reports job duration
  natively.

### Fixed

- **Order in the report no longer depends on the machine that produced it.** 23
  sites in `src/` sorted with a bare `localeCompare`, which resolves against the
  process's default locale. `scan-cache.ts` was the worst: it sorted INSIDE
  `hashDir`, so the order was fed to `hash.update(entry.name)` and became a
  semantic input to the detector fingerprint that `isIncrementalSafe` keys off
  — one repository, two fingerprints, one per locale. All 23 now use
  `compareCodePoints` from `src/lib/compare.ts`, except two whose key is a
  human-readable label, which use a comparator pinned to `en` rather than
  inheriting the environment. `tests/contract/deterministic-ordering.spec.ts`
  fails the build on any unpinned `localeCompare` in `src/`.
- **`mjolnir bind` can no longer be hijacked by a repository's own `git`.**
  `src/engine/candidate-binding.ts` — called on every scan — ran
  `execFileSync("git", …)` with a bare name. On Windows `CreateProcess` searches
  the current directory before `PATH`, so a committed `git.exe` in an untrusted
  repo chose the `commit` and `tree` that land in `runIdentity` and the evidence
  graph. It is the last bare-name process launch left in `src/`, and
  `tests/contract/no-bare-process-exec.spec.ts` now audits the whole tree.
- **The coverage exemption ledger can no longer drift silently.** Each
  non-structural entry in `docs/COVERAGE-EXEMPTIONS.json` now carries
  `defectSignatures` — regexes that must still match its file — or an explicit
  `closureState` when the defect it described is gone. A signature that stops
  matching fails the gate, so a code fix forces a ledger edit in the same
  commit. Six entries were already describing defects the current code had
  fixed (`maturity`, `business-case`, `dashboard`, `enterprise`, `exec-report`
  and the `report-playwright` row), and are reclassified accordingly.
- **Skipped and expected-fail tests now have a price.** Nothing in the
  repository counted them, so the count could grow from zero to hundreds with
  every other signal still green. `docs/SKIP-BUDGET.json` records the current
  counts — 8 skipped tests, 1 skipped file, 3 expected failures — measured by
  `scripts/vitest-skip-budget-reporter.mjs` during the run. They may fall;
  raising them fails `npm run skip:budget` and names the tests that spent the
  budget. A missing or incomplete measurement fails too, so a reporter that
  stops being wired in cannot read as a clean run.
- **The M26 release gate and the version-drift checks are covered where it
  matters.** Both run inside `certify` and both were excluded from the coverage
  ratchet, so their reject arms — the paths that only execute when something is
  wrong — had no reviewer pressure on them. `tests/ledger/m26-validator-reject-arms.spec.ts`
  is table-driven over every required field, so a field that is added without a
  test fails; `tests/release/version-surface-drift-arms.spec.ts` covers the
  fail-fast arms of the version synchronizer.
- **One error derivation, one `isRecord`, one crash-isolation path.** The tree
  carried `isRecord` eight times (seven byte-identical), error rendering four
  times under two names, and crash isolation seven times — and the copies
  disagreed, which is the only reason any of this mattered. `String(obj)`
  renders `[object Object]`, so the two _thinner_ error helpers turned a real
  Node failure shape like `throw { code: "EISDIR" }` into a message naming
  nothing — in a doctor detail, an MCP tool result and a `summary` line
  respectively. The richer body survived the collapse, and
  `isRecord` — the predicate every JSON reader uses to decide "this is an
  object I may index into", which is a question a hostile saved report gets
  to ask — is now the exported one in `src/lib/safe-json.ts`. The four
  adapters' duplicated `try { rule.run } catch { onCrash }` is now
  `runRuleIsolated`, because that block is what the `rulesCrashed` count is
  built on and seven copies mean seven chances to lose it.
  The per-adapter _filter chain_ and budget check were deliberately **not**
  folded into the existing `runRulesShared`: the TypeScript adapter injects
  an AST, framework tags, a lazy `codeText` getter, config-only gating and
  `configGateMatches`, and it _aborts the whole file_ on budget exhaustion
  where `runRulesShared` only skips one rule. Routing every adapter through
  it as written would have silently changed which rules run — the exact
  unmeasured claim this program exists to delete.
  `tests/contract/single-error-helper.spec.ts` holds the counts at one, and
  pins the object arm so a future "simplification" cannot drop it.

- **A crashed rule is no longer certified as a rule that stayed silent.**
  The doc generator caught a rule THROW while running it against its own
  must-not-fire fixture and returned `null`; the caller read that as
  `fired: false` and committed, into a generated doc page and the
  certification surface, the sentence _"Verified against … — a legitimate,
  similar-looking pattern this rule correctly leaves alone."_ A detector that
  crashes produces exactly the same absence of findings as one that correctly
  abstains, so that claim had no evidence behind it — and it contradicted the
  same function's own docstring, which says the field degrades honestly.
  The outcome is now the tri-state the doctor's own model already defines:
  `FIRED` (a real firewall violation), `DID_NOT_FIRE` (certified), and
  `INCONCLUSIVE` (the rule did not run). An `INCONCLUSIVE` page says so and
  says why, and it never renders the certification sentence. A missing
  fixture is a fourth, separate thing — nothing was attempted — and says
  that instead. The field is typed as a `FixtureOutcome` union rather than a
  boolean, so reintroducing a derived `fired` flag does not typecheck.

- **A human-facing table stopped sorting by code unit.** Pinning every
  `localeCompare` to code-unit order (the fix for the ambient-locale drift)
  made the per-rule corpus-occurrence table read
  `SeleniumHQ-selenium` before `microsoft-playwright-dotnet`, because `S`
  sorts before `m`. Stable, and worse to read than the alphabetical order the
  table implies it has. That surface is a table a person chooses repos from,
  so it now uses an **explicitly pinned** locale — readable order, identical
  on every machine, which is the actual defect being avoided.

- **Fifteen silent capability losses are now counted, and the count reaches the
  report.** A `catch` in a detection path that returned a clean default made
  the scan exit 0, report `analysisComplete`, and quietly lose the thing that
  made its verdict trustworthy — the reader had no way to tell a whole scan
  from a narrowed one. The worst case was `getCodeOnlyText` returning raw text
  after a throw, which switches OFF the comment/string false-positive firewall
  for that file rather than merely slowing it down. Every such site now records
  a reason in one append-only ledger (`src/engine/degradation-ledger.ts`),
  following the precedent already set by `parserRetryDegradationCount`, and the
  scan result carries `analysisStatus.degradations` — reason-coded counts,
  present only when something was actually lost, alongside a
  `degraded:<reason>:<count>` entry in `reasons`. A non-empty set makes the
  scan `partial`. `truncationReasons` is untouched: a degradation is not
  truncation, and a reader must be able to tell "the scan stopped" from "the
  scan lost a layer".
  - Two distinctions the ledger refuses to blur. **Absent is not degraded:** a
    Python, Java, Go or Rust repository has no `package.json`, and recording
    that would mark every non-Node project partial while training readers to
    ignore the field — so only a manifest that exists and will not parse
    counts. **A no-AST adapter is not a downgrade either:** the same line
    W1.4 draws for the deadline fallback.
  - Two sites outside the original list were found by the new contract spec
    and fixed in the same commit: the tree-sitter Java/C#/Python parses (left
    alone, because the pipeline already counts every `parseAst → undefined` as
    one parse fallback, and counting again would tally one file twice in two
    different fields) and `hashDir`'s `readdirSync`, whose early `return`
    omitted a whole subtree from the detector fingerprint — two rule trees
    differing only inside an unreadable directory then hash identically, which
    is a stale-cache hit wearing a fresh one's clothes.
  - `mjolnir trend show` no longer prints "No trend data yet." and exits clean
    for a history file whose every line failed to parse. The count of
    discarded lines is now reported on stderr, and a history that exists but
    cannot be read is `EXIT_INTERNAL` — the difference between no history and
    unreadable history, which both used to arrive as the same empty array.
  - `mjolnir explain` distinguishes _the rule found nothing_ from _the rule
    never ran_. A rule that THREW on its own fixture produced the same output
    as a correctly silent one, in the one surface whose purpose is to show
    that a rule works. It now says so, with the reason.
  - `tests/contract/no-uncounted-degradation.spec.ts` is the durable half: a
    `catch` in the detection path that RETURNS A VALUE must record a reason,
    rethrow, route to a counted sink, or be exempted with a stated failure
    direction. The rule is about the _return_, not the `catch` — 37 of the 70
    detection-path catches return nothing and cannot lie to a caller, and a
    spec that listed all 70 as individual exemptions would be the same as no
    exemption list at all.

- **Scanning a subdirectory no longer reports a framework it read from its
  parent.** `runScan` walks up past the target to find the project root, and
  re-anchors the scan root to the target when the target is a strict
  descendant — but it kept the discovered root's parsed `package.json`. So
  `mjolnir scan monorepo/packages/foo` reported `jest` because
  `monorepo/package.json` said so: a read outside the explicit scan root, and
  a framework verdict about a tree nobody pointed at. Framework detection now
  works from in-root evidence only (config files and the anchor's own
  manifest), and reports `frameworkDetectionUnknown` when that evidence is
  absent — an absent verdict you can see, rather than a parent's you cannot.
  Scanning the project root itself is unchanged. This is the CLI counterpart
  to the containment property the MCP workspace-boundary contract already
  enforced.
- **A scan that ran out of time no longer loses its AST stage silently.** When a
  scan passes `--max-duration`, the remaining files were analyzed by regex
  instead of AST — a different detection capability, not a slower version of the
  same one, so the same tree produced different findings and a different score.
  The mode was faithfully recorded in the scan cache and reported nowhere; the
  only nearby disclosure, `file-budget`, fired incidentally because the
  per-file rule-loop deadline was usually already spent too. Such a scan now
  carries the truncation reason `ast-budget-fallback` and an
  `analysisStatus.reasons` entry `ast-budget-fallback-files:<n>` saying how many
  files were analyzed by regex, and is honestly `partial`. An adapter that
  declares no AST stage at all (a YAML workflow, for instance) is a declared
  capability envelope and is NOT reported as truncation. `truncationReasons` is
  an open `string[]` by design, so consumers should test for members rather than
  assert the exact array.
- **`frontier:contracts` was reporting 19 suites it never ran.** It named 24
  test files; nineteen had been deleted by the `cc5fcb88` cleanup and its
  follow-up. Vitest treats a missing path as "no tests here" rather than an
  error, so the script exited 0 and printed "57 passed" while nineteen contract
  suites — including every `m3x`/`m4x`/`m5x` frontier contract — silently did
  not execute. A missing test file and a green test file are indistinguishable
  from the outside, so a gate that passes because its subject is absent has
  certified nothing. The list is rebuilt from the 23 contract suites that
  exist (1 110 tests, not 57), and `npm run script:paths` now fails the build if
  any `package.json` script names a path that is gone.
- The certification ladder's language vocabulary could not name the answer its
  own admission gate produces. `admit()` returns `UNMEASURED` as the supported
  state of any claim not backed by evidence, but `LANGUAGE_STATE_RANK` had no
  word for it — so a language claiming `CERTIFIED` with an empty cohort was
  handed a result its own vocabulary could not record. `UNMEASURED` is now
  expressible in both vocabularies, and the four rule-level states
  (`MEASURED-CORE` … `PROVISIONAL`) are declared in `RULE_ONLY_STATES` as
  explicitly _not_ language outcomes rather than being filtered out by a
  hand-maintained list.
- The contributor handover reported "Welcome aboard — the suite is in good
  shape" whenever no issues were found, including when no run report had been
  ingested and flakiness was therefore unmeasured. It now says what it did not
  check.
- The confidence table's row labels were encoded as `"k|v"` strings and split
  back apart, so any value containing a pipe was silently truncated. The rows
  are typed pairs. The table also gained a `<caption>`, a `<thead>` and
  `scope` attributes; it was previously a bare `<tbody>` a screen reader
  announced as six unlabelled rows.
- `handoff` and `summary` each carried a private colourless score bar that
  rendered 99 and 100 identically. Both now use the canonical `scoreGauge`, and
  the redundant `theme.meter` alias is gone.
- The gap ledger gained three revalidation statuses
  (`ALREADY_FIXED` / `CONFIRMED_STILL_OPEN` / `STALE_UNVERIFIABLE`). A row may
  no longer be cleared without a revalidation that was actually run at a named
  commit, and `STALE_UNVERIFIABLE` deliberately does not clear a release gate —
  an unverifiable claim must never be able to unblock a release.
- `m26:github:sync` derived every one of 429 issue dispositions from GitHub's
  own `state` field — a pure function of its input, containing no engineering
  judgement — and `GAP-M26-002` then marked that script `fixed`, citing the
  artifacts it produces. Dispositions now come from
  `docs/issue-dispositions.json`, where each entry must carry a non-empty
  reason and a verification naming a command or a source path, and may not be
  verified by the script that wrote it. An untriaged issue stays open and is
  flagged, never guessed and never silently closed. 215 of 429 are now visibly
  awaiting a human decision, which is the honest count.

### Documentation

- `PRODUCT-ENHANCEMENT-ANALYSIS.md` is marked `SUPERSEDED-BY: BITTERSWEET` and
  gained a section XII auditing its "all 16 features shipped" claims: six do not
  hold (two shipped fabricated values, two shipped a different capability than
  described, two never shipped). The document is kept as the record of what was
  believed on 2026-09-20, because deleting it would destroy the only evidence
  that the belief was wrong.
- `docs/RELEASE-TRAINS.md` now records why each of the six scheduled verb
  removals is justified differently, so the deprecation notices do not all send
  the same message to users who acted on different output.

## [4.0.0] — 2026-09-26

The first release whose reporting surface is checked against the working tree
rather than against a plan. Every box below is enforced by a gate in
`npm run certify`.

### What you get, relative to 3.0.0

**The product no longer reports numbers it did not measure.**

- [x] A scan that finished now says it finished. A minified bundle or a lockfile
      in the repository used to downgrade a complete scan to `PARTIAL`, and the
      terminal told you "some files were not analyzed, so the surface is
      unverified" when every discovered test file _had_ been analyzed. Across
      the 37-repository corpus, complete scans went from 13/37 to 29/37.
- [x] Unmeasured counts read `unknown — not measured`, not `0`. The trust report,
      the PR comment and the step summary all printed "0 tests analyzed in 0
      files" for a producer that had never measured a test declaration. A zero
      is a claim; an absent measurement is not.
- [x] `handover` no longer tells you "the suite is in good shape" when no run
      report was ingested and flakiness was therefore never checked. It now
      names what it did not check.
- [x] The HTML dashboard produces the same bytes for the same repository. It
      embedded `new Date()` in its visible body, so it could never be diffed in
      review. `--deterministic` omits the timestamp entirely.
- [x] The trust report's evidence descriptor is the terminal's, on every surface.
      HTML and Markdown showed four bare words (`E2 · deterministic`) where the
      terminal showed the measured FP rate, the sample size, the trust rung and
      what the runtime actually corroborated.
- [x] A finding with no evidence level derives one from its own type and
      confidence. It used to default to `E2` — the strongest claim the product
      can make — for findings nobody had measured.
- [x] The contributor handover no longer derives a dollar figure from a table of
      invented incident costs. `business-case` multiplied a measured
      false-positive rate by unsourced per-industry costs and printed the product
      as "Expected Savings". A cost figure now requires `--incident-cost`, so the
      number is yours. `--history` (which read no history) and `--projected`
      (which divided by six) are gone, with reasons.
- [x] `mjolnir enterprise` no longer writes a deployment config claiming
      `sso-saml`, an SSO guide telling you to add a config key nothing reads, or
      auditor-facing SOC 2 / HIPAA / PCI-DSS templates mapping controls to
      capabilities this product does not have. `sso` and `compliance` refuse;
      `config` emits a capability manifest whose `notProvided` list records the
      absences.
- [x] The dependency graph no longer prints a count derived from nothing.
      "Reachable files: N" was always the number of files that went in.

**The product now sees things it was blind to.**

- [x] Node-native TypeScript tests (`.test.mts`, `.spec.mts`, `.test.cts`,
      `.spec.cts`) are scanned. They were not mis-scored — they were never
      scanned, so every rule was silent on them with no finding and no note.
      Verified with two byte-identical tests: the `.ts` copy produced the
      finding, the `.mts` copy produced nothing at all.
- [x] The CI matrix installs cleanly on all three platforms. `npm ci` failed on
      every job before a test ran, and then failed again with a missing
      `lightningcss` binary for Linux, because a lockfile regenerated on Windows
      cannot contain the other platforms' optional dependencies.

**The gates now catch these instead of the next person.**

- [x] `report:honesty` — no surface may print a zero for an absent measurement.
      Four reviewed exceptions, each with a reason and a follow-up.
- [x] `thresholds:parity` — no score-band literal outside the registry. It
      immediately caught a selector-health threshold that shared a number with a
      trust band but not a meaning.
- [x] `script:paths` — no `package.json` script may name a path that is missing
      or uncommitted. It found `frontier:contracts` naming 19 test files deleted
      by an earlier cleanup: Vitest treats a missing path as "no tests here", so
      the script exited 0 reporting "57 passed" while nineteen contract suites
      never ran. Rebuilt from the 23 that exist — 1 110 tests, not 57.
- [x] `lockfile:platforms` — the lockfile must carry the optional binaries for
      every platform CI builds on. The failure is invisible locally by
      construction, so it needed a gate that runs everywhere.
- [x] `claims:revalidate` — a claim asserted `fixed` must rest on a
      candidate-bound, independent revalidation. It rejects evidence citing the
      artifact it is meant to prove, and downgrades rather than deletes a claim
      that loses its evidence.
- [x] `verbs:budget` — the 5.x law: one new verb requires one removal or a merge.
- [x] `m26:gaps:revalidate` — re-runs each gap row's own command and records the
      exit code and the commit it ran at.
- [x] `release:verify` reports every blocker in one run. It was a `&&` chain, so
      it stopped at the first of four and you met them one per run.
- [x] The coverage gate is a floor and a ratchet, not one number pretending to
      be both.

**Truth in the project's own records.**

- [x] The gap ledger was revalidated: all 17 rows had their own
      `revalidation_command` run against this tree. `GAP-M26-005` read
      `fixed` / PASS while its command _fails_. A cleared row can no longer
      exist without a revalidation bound to a named commit, and
      `STALE_UNVERIFIABLE` deliberately cannot unblock a release.
- [x] **A gap row could be marked fixed while its own revalidation failed.**
      The `exit_code === 0` check was reachable through only one of the four
      combinations the schema allows, so a `fixed` row — or an
      `ALREADY_FIXED` row carrying closure evidence — was accepted with
      `exit_code: 1` recorded in its own revalidation. Three of those four
      routes cleared the row. The test that covered it hid the hole, because
      the fixture only set `closure_evidence` for `fixed`.
- [x] The 429 GitHub dispositions no longer derive from GitHub's own `state`
      field. A snapshot cannot prove itself; each disposition now needs a reason
      and a verification. 215 issues are visibly awaiting a human decision,
      which is the honest count.
- [x] `PRODUCT-ENHANCEMENT-ANALYSIS.md` claimed 16 shipped features; six do not
      hold. It is marked `SUPERSEDED-BY` and carries a per-feature audit, kept
      rather than deleted because deleting it would destroy the only evidence
      that the belief was wrong.

**Found by the pre-release bug sweep, after the fix list was written.** Both
were live in 3.0.0 and neither was in the plan.

- [x] `mjolnir business-case <path>` answered a path that does not exist with
      exit 0 and a clean report: "Measured: 0 of 0 findings carry a
      corpus-measured FP rate". It called `runScan` directly and so never
      passed through `validateScanTarget` — the check whose own comment says a
      typo'd CI path must be a loud red, never a silent green. Thirteen of the
      fifteen scanning verbs were already loud; this one was not, and a green
      table over a path that was never scanned is the most dangerous output
      this product can produce. Now exit 10.
- [x] The extended TypeScript test-file regex was probed against 27 shapes:
      all 12 that must match do, all 15 that must not are rejected —
      including `a.min.mts`, `a.spec.cts.bak` and `notatest.mts`.
- [x] `ships()` in `script:paths` was probed for the failure modes a new gate
      usually has: an empty directory, a directory holding only untracked
      files, and a symlink loop. All resolve correctly and none hangs. A
      first version treated a directory as "tracked" only if `git ls-files`
      listed the directory itself, which it never does — that produced two
      false positives and is fixed.

### Known open, deliberately

- [ ] **Trust certification is not claimed, and this release was authorized
      without it.** `candidate:readiness` reports `BLOCKED` /
      `INCONCLUSIVE` on all ten of its checks — candidate identity is not a
      release candidate, the candidate SHA is not authorized, engineering
      certification is not complete, and external validation, protected holdout
      proof, real-world repository proof, the platform matrix, consumer install
      proof and remote workflow proof are all absent.
      `m26:audit` is likewise unsatisfied. Both ran, both printed, and neither
      blocked the publish, because `vars.STABLE_RELEASE_AUTHORIZED` is `true` —
      the same explicit override 4.0.0 shipped under.
      The distinction is the point: **publication of a package is not the same
      claim as a certification of it.** 5.0.0 asserts that the reporting
      surface is honest, that a silent capability loss is disclosed, and that no
      verdict is published without a measurement behind it. It does not assert
      that a holdout corpus, a platform matrix and an external validation run
      have been completed, because none of them have.
      Consumers are not asked to take that on trust: the npm package publishes
      the candidate manifest, which reads `NOT_CERTIFIED` and
      `NOT_AUTHORIZED`, and every one of those ten blockers is enumerated above
      rather than summarised. Closing them is the work that would make a
      certification claim possible; it is not work this release did.
- [ ] `CERTIFICATION_STATES` is not in ladder order, so `rankOf` — the only
      ordering function — ranks `KNOWN` above `TRUST-COMPLETE`, and
      `requiresEvidence` asks `BLOCKED` and `DEGRADED` for a corpus their own
      doc comment says they need none. Two `it.fails` tests record it, so
      reordering the array fails the build. Fixing it moves `rankOf` for every
      state and changes admission outcomes, so it is a contract change, not a
      patch.
- [ ] 23 corpus count-drifts are unreviewed, the largest being `QA-PY-007`
      firing 1332 times in apache-airflow and 92 now. Not accepted: running
      `--update` without reading them would delete the only evidence that
      detection changed.
- [ ] 8 of 37 corpus repositories report `PARTIAL` because test-support files
      under `__tests__/` are not scanned. The verdict is honest — an incomplete
      scan is not a pass — and the fix is a design decision about what "the
      surface" means, not a patch.
- [ ] 215 of 229 GitHub issues are untriaged. Prepared dispositions exist in
      `docs/issue-dispositions.json`; none has been applied, because closing a
      public issue is destructive and is a person's decision.
- [ ] `BW-022` (one workspace model, real graph edges) is open. The plan claimed
      it is "what makes `impact` honest"; it is not — `impact` never used the
      graph and is honest on its own path. The graph is a no-op on an unshipped
      code path, and the function now reports that instead of implying otherwise.

### Upgrade notes

- Node-native TypeScript test files are now scanned, so a project using
  `.mts`/`.cts` tests **will see new findings**. That is the fix working, not a
  regression.
- `business-case` requires `--incident-cost` for any dollar figure, and now
  exits 10 on a target that does not exist instead of printing an empty report.
- `enterprise sso` and `enterprise compliance` now exit non-zero with a reason.
- The trust report JSON's `tests.files` and `tests.declarations` are `null`
  rather than `0` when unmeasured.

## [4.0.0-rc.1] — 2026-09-25

### Breaking changes

- The next published version must be a new major line. Generated CI is now
  advisory-first while the direct composite Action remains blocking by default;
  suppression metrics changed from configured to matched findings, and
  zero-finding output no longer implies a clean or green suite. Publishing
  these changes as another `3.0.0` is prohibited.

### Changed

- **Advisory-first generated CI adoption** — `mjolnir ci install` now
  defaults to non-blocking findings and non-blocking partial scans. The direct
  composite Action remains blocking by default. Blocking behavior is explicit
  through `--gate error`, `--gate warning`, or `fail-on`.
- Suppression counts now report matched findings, not configured entries;
  `suppression-gate` evaluates all-tier pre-suppression findings and enforces
  total-count limits.
- Zero-finding reports no longer claim the suite is clean or that CI is green.

### Added

- **Zero-touch PR framework** — Conventional Commits enforcement via
  `commitlint` + `.husky/commit-msg` (scope is mandatory; WIP/fixup/squash
  commits are rejected before they reach the object store); pinned-seed
  property tests (`vitest.property.config.ts`, `tests/scope/property-invariants.spec.ts`
  with a shared `SEED` constant so failures are reproducible); the
  `merge-verify` CI job that runs the full gate on the **merge result**,
  not the PR head, so a green PR that merges into a red `main` is visible
  before it ships; and `scripts/check-ci-local-parity.mjs`, which keeps
  `ci.yml`, `merge-verify.yml` and the local gate exercising the same
  command list. All additive — no frozen surface changed.
- **M26–M50 execution ledger** — added `docs/ROADMAP.yaml`, dated GitHub
  issue/milestone/PR reconciliation, explicit issue dispositions, an
  append-only gap ledger, a finite support matrix, and an external-validation
  record. Approval authority and staged dependency resolution are recorded;
  external evidence remains `BLOCKED`/`NOT_RUN` and cannot be synthesized.
- **Provisional capability contracts** — added bounded, non-promoting
  contracts for runtime evidence, provider capabilities, QA domain records,
  agent decision receipts, plugin packs, change intelligence, mutation
  sensitivity, adversarial challenges, simulation, language/framework packs,
  cross-repository systems, history, detector lifecycle, research, benchmark,
  scale, UX parity, and Trust OS release proofs. Each has focused hostile,
  stale, foreign, malformed, and recovery coverage.
- **Release control surfaces** — added exact version-surface synchronization,
  RC-aware changelog validation, candidate manifest refresh/readiness,
  reporter ramp policy, fail-closed M26 audit gates, and current-major-only
  Action tag maintenance.
- **README release preparation** — canonical and translated README install
  references, release-status blocks, and new command rows are synchronized to
  `3.0.0`; English fallback blocks are explicitly marked for human translation
  review, and the canonical README states the certification boundary.
- **Release proof hardening** — stable publication now generates and attaches
  an SPDX SBOM, rejects same-version registry artifacts with a different
  integrity digest, updates only the current `v3` Action major, and never
  clobbers release assets.
- **Support matrix reconciliation** — 136 cells are classified as 90 tested,
  44 explicitly blocked, and 2 not applicable, with evidence paths and revisit
  triggers checked locally.

### Fixed

- Corpus runs now record complete rule-crash provenance, reject parser
  fallbacks, and support a provenance-only refresh that cannot update counts.
- QA-PY-004 sanitizes assertion roots before constructing a pattern, removing
  corpus crashes caused by nested call-like targets.
- Pathological stress runs no longer mask crashes with `|| true`; soak evidence
  no longer claims parent-process RSS as child memory.
- Exact registry-install smoke can install and verify a published version
  instead of substituting the checkout tarball.

## [3.0.0] — 2026-09-24

### Breaking changes

- Trust and execution boundaries are now explicit and bounded. JavaScript/local-rule execution requires the plugin trust gate; output writers reject symlink/traversal targets; JSON, file, cache, and runtime inputs have size budgets; CLI/MCP durations are finite.
- Saved report and machine-contract consumers now receive completion, scope, evidence, and verdict fields. Incomplete, L0/zero-evidence, and partial states cannot be presented as `WORTHY`.
- Privileged PR publication is split into a read-only scan job and an artifact-only publisher with commit-bound, paginated `mjolnir-report:v2` upserts.

### Added

- Enterprise threat-model and data-flow artifacts with a strict validator, claim registry with implementation/test/authority/expiry evidence, and a candidate trust manifest/readiness gate.
- Canonical completion derivation, bounded cache/artifact persistence, run-identity tree binding, same-process concurrency evidence, and deterministic source-scoped self-scan/replay gates.
- Public-output redaction/escaping across trust reports, job summaries, dashboards, triage, and Playwright reports; atomic artifact writes and release-mode retention controls.

### Fixed

- Cross-platform CI matrix coverage for Node 22/24 and Linux/macOS/Windows, including clean-checkout candidate-manifest hashing and deterministic self-scans.
- Partial/degraded scope accounting now distinguishes intentionally excluded fixtures from missed test-like files and propagates reasons through CLI, reports, and machine contracts.
- Generated blast-radius, demo/video, site, and release evidence is refreshed from the current tree.

### Migration

- Install `mjolnir-qa@3.0.0` with Node.js `>=22.18`.
- Use the `@v3` consumer tag after the stable release; use an exact `v3.0.0` tag for reproducible enforcement.
- Review the new `--enable-plugins` gate, finite `--max-duration` budget, report completion fields, and strict artifact path requirements.

### Certification boundary

This release is software-complete and locally certified for the declared engineering gates. Trust certification remains `NOT_CERTIFIED` until protected holdout, real-world, platform/consumer, and human authority evidence is supplied.

## [2.1.0] — 2026-09-24

### Added

- Added seven milestone commands to the public CLI and root help:
  - `mjolnir ci-integrity` validates GitHub/GitLab/Jenkins scan gates and reports non-blocking or disabled candidates.
  - `mjolnir doctor --frameworks` reports bounded F0–F5 maturity while preserving human calibration authority.
  - `mjolnir suppression-gate` evaluates reasons, expiry, allowlists, total counts, and matched-finding mass suppression.
  - `mjolnir explain --callers` reports duplicate test names, shared imports, circular dependencies, and amplified findings.
  - `mjolnir contract-verify` validates machine-contract fields and binds persisted contracts to a fresh scan.
  - `mjolnir trust-trend` persists, deduplicates, and compares trust snapshots.
  - `mjolnir evidence-graph` builds provenance-bearing evidence graphs and supports file/rule queries.
- Added a zero-touch PR framework: Conventional Commit enforcement, seeded property tests, merge-result verification, and local/CI command-parity checks.
- Added dedicated, discoverable property and fuzz suites. Fuzz cases use fixed seeds; property tests remain isolated from default coverage collection.
- Added CI integrity, suppression, contract, provenance, cross-file, and trust regression suites covering malformed input, partial scans, inactive suppressions, and platform-stable exit behavior.
- Added stable-only `v1`/`v2` action-tag maintenance. RC tags never move stable consumer tags.
- Added pinned current corpus revisions and local fixture tree revisions. Baseline counts were not rewritten; corpus drift remains an explicit audit failure.

### Fixed

- Fixed false-green milestone engines:
  - machine-contract verification now compares every contract projection, including optional provenance and forensic verdicts;
  - trust snapshots use caller-provided timestamps instead of an embedded wall clock;
  - suppression mass uses actual matched pre-suppression findings and active suppressions;
  - evidence provenance is derived from real file contents;
  - cross-file dependency analysis uses the requested target root;
  - framework maturity uses the supported F5 ceiling.
- Fixed persisted contract handling: documents use strict runtime schema validation and are verified against a fresh scan rather than self-attesting.
- Fixed zero-finding and partial-scan reporting so incomplete or unclassified analysis cannot render as a clean, proven, or merge-ready suite.
- Fixed CI workflow audit parsing to fail closed for dynamic conditions, `continue-on-error`, negated commands, multi-pipe status masking, inactive GitLab rules, advisory `after_script` commands, and missing blocking scans.
- Fixed the coverage job/ratchet mismatch: merge verification now generates the coverage summary it enforces.
- Fixed stress determinism by normalizing both analysis and machine-contract duration fields, running real concurrent scans, and making the 10k workflow validate JSON even when findings are advisory.
- Fixed property/fuzz discovery and workflow trigger/name so required PR checks are actually produced.
- Fixed root help, command registry, README, and release documentation drift for the new command surface.

### Security

- The composite Action and generated CI surfaces use exact released versions, immutable action references, least-privilege permissions, and explicit exit semantics.
- The composite Action defaults to blocking on findings and partial scans; advisory behavior requires an explicit opt-out.
- Release publication is isolated from `main`, uses audited artifacts, npm OIDC trusted publishing with provenance, npm 11.5.1+, a `next` RC dist-tag, and verified GitHub prerelease assets.
- Pull-request shell inputs and workflow-derived values are passed through environment variables instead of direct `${{ }}` interpolation.
- Machine-contract, suppression-policy, roadmap, and persisted-artifact validation now reject malformed and adversarial inputs rather than fabricating or trusting them.
- Main-branch deletion and the complete required PR check matrix are enforced by repository ruleset `01`. The repository is solo-maintained, so the owner explicitly chose not to require a second approving review.

### Performance

- Centralized deterministic CLI timing normalization and expanded replay, soak, and concurrent stress coverage.
- Added bounded corpus scans, exact source revisions, and fail-closed baseline provenance checks.
- Added practical pipeline/command regression tests without changing the frozen 96% branch ratchet.

### Testing

- Full instrumented release gate: 408 test files, 10,351 passing tests, one expected failure documenting the outstanding orphan corpus baseline, and five intentional skips.
- Coverage ratchet at release: 98.58% statements, 96.00% branches, 99.38% functions, and 98.84% lines.
- Focused gates green: build, lint, typecheck, certification, property, fuzz, stress/soak/concurrency, release/workflow contract tests, pack audit, brand, site, and local/CI parity.
- Historical failed runs remain historical evidence; they are not retroactively changed.

### Changed

- `ci-local` now runs one complete instrumented suite plus property/fuzz/ratchet/audit/brand/site/parity gates instead of silently omitting release checks.
- Release promotion is explicit and branch/tag based; merging the version PR does not itself publish npm.
- Suppression counts and governance outputs distinguish configured, active, expired, and matched findings.
- Rule IDs remain immutable across the 2.x line. Existing detector contracts,
  including `QA-PW-001`, retain their identity while framework maturity and
  evidence quality improve around them.
- The CLI command registry is shared by help, dispatch, and CI-integrity classification.

### Breaking changes

- The package now requires Node.js `>=22.18`.
- Direct composite-Action consumers now get blocking defaults for findings and partial scans unless they explicitly opt out.
- Generated CI installation remains opt-in/advisory for first adoption; use `mjolnir ci install --gate error` when an enforcing install is required.
- Stable release publication no longer occurs automatically from `main`; use the protected release branch and release workflow.
- The historical `v2.0.3` tag is retained unchanged. This release does not move, delete, or republish that tag.

### Migration

1. Install or invoke `mjolnir-qa@2.1.0` with Node.js 22.18 or newer.
2. Replace floating Action versions with `@v2` or the exact `v2.1.0` tag when reproducible enforcement is required.
3. Review suppression expiry/allowlist policy before enabling `suppression-gate`; existing entries are policy data, not proof of human validation.
4. Run the seven new commands in report mode first and review their JSON before making them release gates.
5. Adjudicate remaining corpus count/orphan drift and human/design-partner validation separately; this release does not claim those are closed.

## [2.0.2] — 2026-09-22

### Fixed

- **NPM executable metadata** — shipped the package-name `mjolnir-qa` bin
  alias alongside `mjolnir` in the packed tarball, so fresh installs and
  `npx mjolnir-qa@latest` resolve the CLI consistently. This intentionally
  keeps the Mjölnir package/CLI identity and does not include the abandoned
  QA Doctor rebrand.

## [2.0.0] — 2026-09-17

### Fixed

- **NPM publishing pipeline** — fixed npm upgrade syntax (`npm@11.19.1` instead of invalid `npm@11.9.1`), removed Windows local path leak from runtime docs that triggered pack-audit, enabling OIDC trusted publishing for NPM release.

### Changed

- **Version bump** — bumped package version from 1.1.1 to 2.0.0 across all surfaces (package.json, ENGINE_VERSION, smithery.yaml, rule metadata, docs).

## [1.1.1] — 2026-09-16

### Fixed

- **Config type for exactOptionalPropertyTypes in test** — wire standalone modules into scan pipeline integration test fixture uses `{}` instead of `undefined` for the config field, fixing type compatibility with strict TypeScript settings.

## [1.1.0] — 2026-09-15

### Year-1 Roadmap Implementation — All 60 Tickets (Q1-Q4)

Complete implementation of the Mjolnir Master Engineering Roadmap & Product Specification v3.1. 178 files changed, ~22,500 lines added across 93 new source and test files.

### Added

#### Q1 — Trust Core Correctness

- **Trust Invariant Registry** (`src/trust/invariants.ts`): Machine-readable registry of TI-001 through TI-020 with scope, status, quarter, and verification test references. CI enforcement gate for REQUIRED invariants.
- **Versioned Contract Registry** (`src/engine/contract-versions.ts`): 8 versioned contracts (engine, schema, contract, trustModel, scoringModel, evidenceSchema, forensicsSchema, frameworkSupportMatrix) with compatibility policies.
- **Expanded Semantic Run Identity** (`src/engine/run-identity.ts`): 7 new verdict-affecting fields (trustModelVersion, scoringModelVersion, frameworkSupportMatrixVersion, evidenceSchemaVersions, policyFingerprint, suppressionFingerprint, historicalEvidenceFingerprint). TI-015 and TI-017 enforced.
- **Scoring Validation** (`src/scorer/scoring-validation.ts`): Stage A validation against trust benchmark dataset. Score discrimination, severity preservation, E0 exclusion checks.
- **Finding Identity** (`src/engine/finding-identity.ts`): Unified fingerprint with `findingId`, `rootCauseId`, `deduplicationGroup`. Consolidated 4 scattered fingerprint implementations.
- **Evidence Level Enforcement** (`src/engine/evidence-enforcement.ts`): `deriveEvidenceLevel()` as sole authority. E0 gaming prevention. `detectEvidenceLevelGaming()` for manual override detection.
- **Config Validation** (`src/config/config-schema.ts`): JSON Schema draft-07 for `mjolnir.config.json`. Structural validation before semantic validation.
- **Rule Metadata Validation** (`src/rules/rule-metadata-schema.ts`): `RuleMetadataContract` interface. All 79 rules validated against contract. Doctor check 11 added.
- **Error Text Extraction**: All 5 parsers (Jest, JUnit, Playwright JSON, Vitest, Playwright Trace) now extract error text into `TestRecord.errors[]`.
- **Evidence Hygiene** (`src/forensics/evidence-hgiene.ts`): Secret redaction (AWS, GitHub, JWT, Bearer, API keys, passwords, private keys), control-character sanitization, bounded text ingestion (10KB cap).
- **Forensics Schema Versioning** (`src/forensics/schema-validation.ts`): `FORENSICS_SCHEMA_VERSION = 1` stamped on all reports.
- **Framework Support Inventory** (`src/frameworks/framework-inventory.ts`): 14 frameworks with F0-F5 maturity, support status, entity type, capabilities.
- **Framework Scorecards** (`src/frameworks/scorecard.ts`): 27 dimensions × 14 frameworks. Every MISSING/WEAK cell maps to a GAP-* ID.
- **Gap Registry** (`src/gaps/gap-registry.ts`): ~100 gaps registered with type, priority, status, cross-referenced against scorecards.
- **Requirement Traceability Matrix** (`src/traceability/rtm.ts`): 35 requirements (R-001 through R-035) with CI validation invariants.
- **Suppression Integrity** (`src/engine/suppression-integrity.ts`): Fingerprint (order-independent sha256), mass-suppression detection (50% threshold), unknown-rule detection, expired-suppression detection.
- **Performance Baselines** (`src/bench/regression-gates.ts`): 4 benchmark classes (small/medium/large/monorepo), 8 GOVERNANCE_POLICY regression gates, `peakMemory` tracking.
- **Trust Benchmark Schema** (`src/benchmark/trust-benchmark-schema.ts`): Dataset schema with 11 verification dimensions, blind evaluation protocol.
- **Measurement Status** (`src/rules/measurement-status.ts`): All 79 rules classified as MEASURED, PROVISIONAL, QUARANTINE, CORE, or EXTENDED.
- **Release Artifact Integrity** (`src/release/pack-audit.ts`, `src/release/version-consistency.ts`): Tarball hash verification, provenance attestation, version consistency checks.
- **Shared Adapter RunRules** (`src/engine/shared-run-rules.ts`): Formalized rule execution contract shared across all 7 adapters.
- **Workspace Discovery** (`src/discovery/ecosystem-detection.ts`): Multi-ecosystem detection (Node, Python, Java, .NET). Workspace structure detection for npm, lerna, nx, turbo, maven, gradle, .sln.
- **Pipeline Decomposition** (`src/engine/pipeline-stages.ts`): 6 explicit stages (Discovery → Parse → Rules → Correlation → PostProcess → Score) with typed interfaces and diagnostics.

#### Q2 — Framework & Semantic Intelligence

- **QA Semantic Model API** (`src/engine/semantic-model-api.ts`): 14 concepts (test, suite, assertion, action, navigation, wait, retry, locator, lifecycle, fixture, mock, parameterization, shared-state, async).
- **Assertion Quality** (`src/rules/families/assertion-quality.ts`): Anti-patterns: tautological, type-only, mock-return, truthy-only, length-only.
- **Test Independence** (`src/rules/families/test-independence.ts`): Anti-patterns: shared-mutable-state, order-dependency, fixture-leak, global-mutation, fs-side-effect.
- **Flaky-Pattern Detection** (`src/rules/families/flaky-patterns.ts`): 4 families: UNAWAITED_ASYNC, NONDETERMINISTIC_INPUT, UNMOCKED_EXTERNAL_DEPENDENCY, HARD_SLEEP.
- **Cross-Rule Evidence Correlation** (`src/engine/correlation-engine.ts`): CONVERGENT, CORROBORATED, AMPLIFIED conclusions. TI-009 enforced (E1+E1+E1 ≠ E2). Deterministic Map iteration.
- **Mutation Resilience** (`src/mutation/mutation-resilience.ts`): Corrected kill rate formula: `killed / (killed + survived)`.
- **Cross-Language No-Assertions** (`src/rules/families/no-assertions.ts`): Assertion vocabularies for Jest, Vitest, pytest, JUnit, NUnit, xUnit, TestNG.
- **Marker Registry** (`src/rules/families/marker-registry.ts`): Extensible registry with 9 frameworks × 6 semantics (skip, focus, retry, parameterize, fixture, category).
- **MCP Forensics Tools** (`src/mcp/tools/forensics-tools.ts`): Tool definitions for forensics-analyze, forensics-triage, error-text-extract.
- **Anti-Gaming Corpus** (`src/anti-gaming/corpus.ts`): 7 scenarios (AG-001 through AG-007) covering meaningless assertions, superficial coverage, finding splitting, rule suppression, test renaming, empty mocks, CI manipulation.
- **Framework Compatibility CI** (`src/frameworks/compat-ci.ts`): MINIMUM_SUPPORTED, REPRESENTATIVE_STABLE, LATEST_VALIDATED lanes for Playwright, Jest, pytest.
- **PR Comment Data Contract** (`src/integrations/github/pr-comment-contract.ts`): `PrCommentModelV1` with verdict-completeness state matrix enforcement.
- **Deterministic Markdown Renderer** (`src/integrations/github/pr-comment-renderer.ts`): TI-018 enforced (same model → byte-identical output). Information architecture: Answer → Evidence → Action.
- **Finding Prioritization** (`src/integrations/github/finding-prioritization.ts`): Sort by trust impact → false-green → severity → evidence strength. 3-5 expanded, rest collapsed.
- **Branding Contract** (`src/brand/pr-brand-contract.ts`): Product name, descriptor, verdict labels/icons, section order, terminology.
- **Completeness & Framework-Limitation UX** (`src/integrations/github/completeness-ux.ts`): Partial analysis warnings, framework limitation display.
- **Evidence Sanitization** (`src/integrations/github/evidence-sanitization.ts`): Markdown escaping, HTML injection prevention, link sanitization, RTL handling, text capping.

#### Q3 — Runtime & CI Evidence

- **Evidence Artifact Architecture** (`src/engine/evidence-artifacts.ts`): Versioned artifact schema with provider, fingerprint, completeness, provenance.
- **Runtime-Static Correlation** (`src/engine/runtime-static-correlation.ts`): Identity matching (EXACT/STRONG/APPROXIMATE/AMBIGUOUS), trust-level mapping. TI-016 enforced.
- **Flaky-Test Integration** (`src/forensics/flaky-integration.ts`): FlakinessLevel (NONE/SUSPECTED/CONFIRMED), retry evidence extraction.
- **Coverage Ingestion** (`src/engine/coverage-ingestion.ts`): Istanbul JSON and LCOV parsing. Contextual only — no automatic trust upgrade.
- **GitLab CI Adapter** (`src/adapters/gitlab-ci.ts`): Discovery, parsing, 3 CI verification risk rules (allow_failure, empty test stage, exit code suppression).
- **Retry/Quarantine Analysis** (`src/forensics/retry-analysis.ts`): Retry-only-pass detection, quarantine pattern analysis.
- **Workflow Bypass Detection** (`src/adapters/workflow-bypass.ts`): Path filter bypasses, conditional test execution, missing status checks.
- **Exit-Code Integrity** (`src/adapters/exit-code-integrity.ts`): `|| true`, `2>/dev/null`, continue-on-error, allow_failure detection.
- **Safe Output** (`src/forensics/safe-output.ts`): URL sanitization (javascript: prevention), path traversal detection, safe Markdown link construction.
- **Sticky Comment Publisher** (`src/integrations/github/pr-comment-publisher.ts`): `<!-- mjolnir-pr-comment:v1 -->` marker. Idempotent update, no duplicates.
- **GitHub Permissions** (`src/integrations/github/github-permissions.ts`): Permission validation, fork PR detection. Zero-network boundary preserved (fetchFn injected).
- **Job Summary Fallback** (`src/integrations/github/job-summary-fallback.ts`): GitHub Actions job summary when PR comment fails.
- **PR Comment Golden Suite** (`tests/integrations/github/pr-comment-golden.spec.ts`): Snapshot tests for all verdict+completeness combos.
- **Stale Guard** (`src/integrations/github/stale-guard.ts`): TI-020 enforced — stale artifacts cannot overwrite newer PR head.

#### Q4 — Scale & Production Hardening

- **Monorepo Analysis** (`src/engine/monorepo-analysis.ts`): Per-package trust with worst-package, average, configurable weighting strategies.
- **Incremental Analysis** (`src/engine/incremental-analysis.ts`): Content-hash change detection. TI-005 contract (incremental/full equivalence).
- **SARIF Compliance** (`src/reporter/sarif-compliance.ts`): v2.1.0 validation, finding/rule mapping.
- **Dependency Graph** (`src/engine/dependency-graph.ts`): Transitive dependency resolution for package.json, pyproject.toml, pom.xml.
- **Memory Profiling** (`src/bench/memory-profiling.ts`): Async memory measurement with advisory regression checks.
- **Package Provenance** (`src/release/provenance.ts`): npm provenance attestation verification.
- **SBOM Generation** (`src/release/sbom.ts`): SPDX and CycloneDX format support.
- **Reproducibility** (`src/release/reproducibility.ts`): Build reproducibility analysis (timestamps, random IDs, unpinned deps).
- **Conditional Stubs**: Rule SDK, Adapter SDK, Policy Packs (gated on adoption metrics).
- **Research Stubs**: CFG Research, Parallel Rules (gated on prerequisites).

### Fixed

- **Greetings Workflow**: Updated `actions/first-interaction` to v1.3.1 with correct input names (`repo_token`, `issue_message`, `pr_message`).
- **ReDoS**: Bounded quantifiers in `evidence-sanitization.ts` and `test-independence.ts` regex patterns.
- **XSS**: Sanitized content in `pr-comment-publisher.ts` before rendering.
- **Determinism**: Sorted Map iteration in `correlation-engine.ts` for consistent output order.
- **Zero-Network Boundary**: `github-permissions.ts` uses injected `fetchFn` instead of global `fetch`.
- **Config Validation Error Messages**: Schema-first validation produces consistent error messages. Updated 5 test files to match.

### Security

- Secret redaction in all error text extraction (AWS keys, GitHub tokens, JWT, Bearer, API keys, passwords, private keys).
- Control-character sanitization (NUL, BEL, BS, VT, FF, SO, SI, ESC, DEL, C1).
- Bounded text ingestion (10KB per error text).
- Evidence sanitization for PR comments (Markdown escaping, HTML injection prevention).
- Fork PR safety for comment publishing.
- Stale artifact concurrency guard (TI-020).

### Changed

- `Finding` type extended with optional `findingId`, `rootCauseId`, `deduplicationGroup` fields (additive within schemaVersion 1).
- `ScanResult` extended with optional `scoringModelVersion` field.
- `RunIdentity` extended with `trustModelVersion`, `scoringModelVersion`, `frameworkSupportMatrixVersion`.
- `ForensicsReport` includes `forensicsSchemaVersion` field.
- `src/config/config.ts` `validate()` now calls `validateConfigSchema()` first.
- `src/commands/doctor.ts` gains check 11 (rule metadata contract validation).
- 4 fingerprint implementations consolidated into `src/engine/finding-identity.ts`.

### Changed

- Terminal report: section headers are marked `▍ TITLE` instead of
  `▚ TITLE` (the ASCII fallback `= TITLE` is unchanged). The quadrant
  glyph read as a rendering glitch rather than a mark.
- Terminal report: the score section no longer draws the four-state
  block-art hammer above `WORTHINESS`. The verdict word already carries
  the band without colour, the score is now the first thing on screen,
  and the 100-state FORGED block is unchanged.
- Brand: one type family. Cinzel is retired from the site, the tokens
  and the vendored fonts; headings and the wordmark are Geist. The marks
  are redrawn: a Geist wordmark, and the ᛗ monogram drawn as a path and
  stroked in the aurora. Docs pages take the aurora accent instead of
  gold, which stays reserved for FORGED. README badges use the deep
  aurora that carries shields.io's white text at 5.8:1.
- README rewritten. `score-gauge.svg` is now the worthiness scale with a
  marker sweeping 0–100, drawn from `deriveScoreState`. The terminal
  stills and the demo video share the website's terminal chrome. The
  video is re-rendered (34 s), and its poster shows the report.

### Fixed

- Website: missing URLs showed VitePress's stock 404 page. The site's
  own page, which points to the rule catalog, was registered under a
  theme key the default layout never reads. It now renders through the
  layout's `not-found` slot.

## [1.0.10] — 2026-09-12

### Changes since 1.0.9

- Merge remediation/remote-first: complete R1-R10 trust-engineering train onto main
- Merge origin/main into remediation/remote-first
- chore: add testTimeout: 30_000 to vitest.config.ts
- chore: sync smithery.yaml in the release cut step (the registry must match the package)
- test: keep CI fixture scripts off the docs-consistency scanner (old `e2e` script -> `npx playwright test`)
- test: arms-coverage wave for the R1-R10 train (CI gates, adapters, parser, trace, release-trust, trust surfaces)
- docs: resync DEPTH-ADJUDICATION.md to the train's measured state (drift-lock)
- chore: re-baseline coverage ratchet after the R1-R10 train landing
- chore: exclude machine-local agent dirs via .mjolnirignore (self-scan honesty)
- chore: untrack machine-local skill symlinks (leaked in R3 1044461)
- Master-plan M0 docs truth (M0.2/M0.4/M0.5)
- chore: gitignore machine-local agent tool dirs (same class as .kilo/)
- Review hardening: MCP param cap measured in true bytes; pin the WI-18 unsupported-source asymmetry
- Wire provenance=bound invariant (plan 5.2 activation): scope-integrity + artifact-integrity prove the identity chain
- Fix: MCP stdio stream pollution (CLI entry tail in bundle), stale-dist e2e guard, freshness drift classes
- R10: 2.0 preparation — breaking-set inventory, migration draft, boundary-law guards (WI-25, 2.0.0)
- R9: Trust Artifact identity binding + HTML completion (WI-23+24, 1.4.0)
- R8: MCP runtime-evidence tools + Agent Safety (WI-21+22, 1.3.0)
- R7: Playwright capability matrix as a product surface (WI-20, 1.2.x)
- R6: forensic verdict taxonomy + Selector Health v2 (WI-18+19, 1.2.x)
- R5: Playwright trace ingester + false-green trace corpus (WI-17, 1.2.x)
- CI hardening: test-tsconfig conformance + unclassified-ceiling re-record
- R4c follow-up: wire the scope-integrity dimension into release-trust
- R4c: Evidence Graph + Scope Integrity + exit-code proofs (1.1.6)
- R4b: False-Green Attack Corpus + mutation/assertion-strength protocol (1.1.5)
- R4a: Trust Constitution + Release Trust Verdict (1.1.4)
- R4: blast-radius audit + machine-testable boundary contract (1.1.3)
- P6: quarantine remediation ledger + rework-or-retire the >=75 percent set (R3, 1.1.2)
- P3c: Jenkinsfile detection + rule arms + QA-CI-014 (R2, 1.1.1)
- P3b: Azure DevOps detection + rule extensions + QA-CI-013 (R1, 1.1.0)

## [1.0.9] — 2026-09-12

### Changes since 1

- chore: add testTimeout: 30_000 to vitest.config.ts
- test: MR-7A release-verification machinery contract (#84)
- feat: SC-8 determinism verifier + SC-11 control-state record (MR-8.C/D) (#83)
- feat: pack-audit gate wired before publish (SC-6, MR-8.B) (#82)
- test: SC-3/SC-4/SC-7 supply-chain hygiene gates (MR-8.A) (#81)
- docs: PR template + CONTRIBUTING targeted-slice ladder (MR-4, GC-2) (#80)
- feat: docs:regen aggregate — one idempotent command for every generated surface (MR-5) (#79)
- test(site): negative proof for the D-2 emitted-HTML link gate (MR-6) (#78)
- fix(release): recognize the '(Merged PR #N)' squash subject so PR labels drive the bump (#77)

## [1.0.8] — 2026-09-11

### Changes since 1.0.7

- chore: sync smithery.yaml in the release cut step (Merged PR #76)

## [1.0.7] — 2026-09-11

### Changes since 1.0.6

- docs: 1.0.6 CHANGELOG section lead-ins (Merged PR #75)

## [1.0.6] — 2026-09-11

### R10 2.0 preparation: breaking-set inventory + boundary-law guards (remediation/remote-first WI-25)

Preparation-only increment: the 2.0 breaking-set proposal sheet, its migration draft, and the boundary-law guard tests — nothing breaking ships in this release.

### Added

- **2.0 breaking-set inventory** (`docs/2.0-BREAKING-SET.md`, WI-25): the
  proposal sheet per the strategic blueprint's §28/§18 — two justified
  breaking candidates (BS-1 default suppression expiry with the explicit
  never-expire opt-out; BS-2 retirement completion into `RETIRED_RULE_IDS`),
  each carrying its benefit>cost justification, its migration pointer, and a
  PROPOSED decision line awaiting owner ratification, plus the locked
  NOT-breaking list (`schemaVersion 1` additive extension, exit codes,
  additive verbs, Node matrix, frozen surfaces). **Nothing is implemented in
  this release** — nothing enters 2.0 "because large", and no frozen surface
  breaks without evidence that `schemaVersion 1` cannot represent the
  behavior.
- **Migration guide draft** (`docs/MIGRATION-2.0-DRAFT.md`): the working
  draft of the 2.0.0 guide (publication law: CHANGELOG + site with the
  release itself) covering BS-1 (init config check → explicit `expires` /
  `expires: false`; no silent retroactive expiry) and BS-2 (retired-rule
  list, suppression cleanup, §15-lifecycle-honest disappearance causes).
- **Boundary-law + non-goal guards** (`tests/contract/boundary-law.spec.ts`,
  blueprint §9.1/§24/§36): the canonical layers (engine, forensics,
  adapters, rules) never import upward into commands/ or the transports;
  the MCP transport imports no detection machinery and rides the canonical
  machine contract (pipeline → contract → runtime evidence → agent
  transport is never reversed); the zero-network contract holds; the
  dependency list carries no telemetry/cloud/hosted-backend package; src/
  reads no telemetry configuration; and the breaking-set discipline is
  drift-locked (every entry carries a Decision, nothing is implemented).

### Changed

- **Final capability matrix update** (`src/capabilities.ts`,
  `docs/PLAYWRIGHT-CAPABILITIES.md`): the `to agents` column now carries the
  foundational Agent Skill's evidence pointer (`src/commands/install-agents.ts`,
  shipped with R8/WI-22) on every row — a `no → yes` flip in the same change
  set that shipped its evidence, per the claim law.

### Fixed

- **MCP stdio bundle no longer prints the terminal Trust Report onto the
  JSON-RPC stream** (`src/mcp/server.ts`): the standalone entry
  (`node dist/mcp/stdio.mjs`, `npm run mcp`) dragged the CLI module in via
  `import { runScan, CLI_VERSION } from "../cli.js"`, and cli.ts's entry
  tail fired inside the bundle (`import.meta.url === argv[1]`), emitting the
  full terminal Trust Report before/between JSON-RPC frames — a fatal
  protocol violation for any MCP client. The transport now imports the
  canonical homes directly (`engine/scan-pipeline.js`, `engine/version.js`),
  the bundle contains no CLI entry tail, and the boundary-law guard bans the
  `../cli.js` import from the MCP layer permanently. Found by the R10
  bug-hunt smoke against the real stdio transport.
- **Stale dist can no longer mask new code in spawned-binary tests**
  (`tests/e2e/global-setup.ts`): the EXISTS-ONLY guard skipped the build
  whenever a bundle was present, so the spawned stdio binary kept answering
  from a pre-R8 catalog ("unknown tool: triage") while the suite stayed
  green. The setup now rebuilds whenever any `src/**/*.ts` is newer than the
  bundle (the same freshness discipline as the generated-docs drift gates).
- **Freshness diagnosis names each drift class** (`checkArtifactFreshness`):
  a revision bump (`rule@old -> new`), a rule retired since the render
  (`rule@rev (retired)`), and a rule added since the render
  (`rule@rev (new)`) are distinct remediations — a flat list hid which one
  happened.
- **`trust-report --from` reports the complete artifact set** it writes
  (md + html + json), not just the MD path.
- **The `provenance = bound` system-invariant item is now WIRED** (plan
  §5.2 activation; `src/commands/release-trust.ts`): the release-trust
  invariant previously hardcoded `provenance: UNSUPPORTED` even after the
  machinery it waited for shipped. It is now PROVEN exactly when the
  machine-anchored identity chain is proven — scope-integrity (runIdentity +
  evidence graph, R4c) AND artifact-integrity (artifact scanId binding, R9)
  both PASS — and stays UNSUPPORTED (recorded, non-blocking) otherwise. The
  contract doc's activation sentence and the drift-lock are updated
  accordingly; the shipped verdict is unchanged (PASS 12/12, provenance
  bound).

### R9 Trust Artifact integrity + HTML completion (remediation/remote-first WI-23+24)

Trust Artifacts gain machine-anchored identity and a deterministic HTML surface; stale, wrong-run, revision-drifted, and unbound artifacts are now detectable.

### Added

- **Artifact integrity binding** (`src/commands/trust-report.ts`, R9): every
  Trust Artifact (md · json · html) now embeds its IDENTITY — the machine
  anchor (`scanId` from runIdentity), the bound commit when resolvable
  (offline git read; null, never fabricated), the fired rule(rev) inventory
  (deduped, sorted, undeclared revisions omitted — never a fabricated rev),
  and the evidence inventory (totals, runtime-corroborated count, per-level
  counts). Consumers detect **stale artifacts** (a scanId from another run),
  **mismatched revisions** (rule-set drift, named per rule), and **unbound
  artifacts** (pre-R9 producers) via `checkArtifactFreshness` — an unbound or
  stale artifact is RECORDED, never assumed current.
- **HTML Trust Artifact** (WI-23 completion, §18): deterministic,
  self-contained `mjolnir-trust-report.html` — inline CSS only, zero external
  resources, hostile interpolations escaped, byte-identical regen (same
  ScanResult + label + commit → same bytes), the same five-question structure
  as the MD. The command writes all three formats; `--from` gains an optional
  `--commit <sha>` so the Action binds the artifact to the executing run's
  HEAD.
- **Artifact Integrity dimension wired** (`check:artifact-integrity` in
  `src/commands/release-trust.ts`, R9 surface): the structural evaluation
  asserts the identity binding, the three-format output, the freshness
  detection, and the byte-regen/hostile-safety contract locks. The
  release-trust contract's documented-unwired list is now EMPTY — all 12
  canonical dimensions are wired and machine-evaluated.

### R8 MCP runtime-evidence tools + Agent Safety (remediation/remote-first WI-21+22)

The MCP transport learns the runtime-evidence tools, and every installed agent surface inherits the safety contract.

### Added

- **MCP runtime-evidence tools** (`src/mcp/server.ts`, WI-21): `forensics`,
  `triage`, `pw-report` join the tool catalog as 1:1 mappings onto the SAME
  engine functions the CLI verbs call — no MCP-only semantics. Parity is
  drift-locked table-driven (`tests/mcp/parity.spec.ts`): for every new tool ×
  every fixture class (Playwright JSON · JUnit XML · hostile corrupt report ·
  no-reports directory) the MCP result deep-equals the canonical CLI
  derivation, hostile inputs degrade to zero records on BOTH surfaces, and the
  hostile parameter matrix (missing / empty / non-string / nonexistent path)
  yields INVALID_PARAMS naming the target, never a crash. A crashing tool
  never kills the server (`tests/mcp/crash-containment.spec.ts`): the failure
  lands in the transport's existing catch as a structured INTERNAL error and
  the server keeps answering. One scan in flight; zero network; the plugin
  gate applies unchanged.
- **Agent Safety dimension wired** (`check:agent-safety` in
  `src/commands/release-trust.ts`, R8 surface): the structural evaluation
  asserts the §17 safety wording on every installed skill surface, that the
  MCP tool surface never opens the plugin trust gate, and that the agent edge
  case (`fg-agent-unsafe-action`) stays registered in the False-Green Attack
  Corpus. The release-trust contract's documented-unwired list shrinks to
  artifact-integrity only (ships R9).

### Changed

- **Agent brief inherits the Constitution** (`src/commands/install-agents.ts`,
  WI-22): every installed instruction surface (.claude/, .cursor/, .kilo/,
  AGENTS.md) now carries the non-negotiable agent-safety contract — NEVER
  declare trustworthiness without evidence · AGENT CLAIM ≠ VERIFICATION ·
  NEVER manufacture, edit, or synthesize evidence · NEVER convert INCONCLUSIVE
  to pass · NEVER suppress findings or weaken rules to get green — plus the
  loop preconditions (FIX requires a proven actionable defect; RESCAN requires
  changed-scope identification; PROOF requires fresh post-fix execution
  evidence). Drift-locked by `tests/contract/agent-skill-surface.spec.ts`
  (frozen surfaces only; safety wording asserted).

### R7 Playwright capability matrix (remediation/remote-first WI-20)

The Playwright capability matrix becomes a product surface with its own drift lock.

### Added

- **Playwright Capability Matrix** (`docs/PLAYWRIGHT-CAPABILITIES.md`,
  `src/capabilities.ts`, WI-20): the product-depth surface — 12 Playwright
  capabilities × 8 depth columns (detect · explain · produce evidence ·
  correlate runtime · trust verdict · CLI · MCP · agents), every cell
  explicitly classed (zero UNCLASSIFIED), every `yes` backed by a resolvable
  evidence pointer (registered rule ID or in-repo artifact) with FAIL-CLOSED
  validation: the generator refuses to render a claim on a dangling pointer.
  Generated (`npm run docs:capabilities-playwright`) and drift-locked
  (tests/contract/playwright-capabilities.spec.ts). The `to agents` column is
  uniformly **no** until R8 ships the Agent Skill — stated, not implied.
  Claims never exceed proven capability; rule counts stay out of the claim
  surface entirely.

### R6 forensic taxonomy + Selector Health v2 (remediation/remote-first WI-18+19)

Forensic verdicts gain the semantic taxonomy, and Selector Health v2 replaces the locator heuristic.

### Added

- **Forensic verdict taxonomy** (`src/forensics/classify.ts`, WI-18): the
  canonical §6 verdict set (likely-real-defect · environmental-failure ·
  infrastructure-failure · flaky · retry-dependent · unstable-construction ·
  **inconclusive default**) applied by a deterministic minimum-signal table —
  a single weak signal can never classify confidently; conflicting signal
  families force INCONCLUSIVE with an explicit `contradictory` evidence-state.
  Every `TestVerdict` now carries a machine-visible `forensic` classification
  (attempts + captured error text; sources without error text mark
  `unsupported`, never a guess). Contradiction reconciliation
  (`corroborates | contradicts | insufficient`) implements Contract H: the
  runtime can corroborate but never silently weakens a static claim — a
  contradiction renders the PAIR inconclusive while the claim stands.
- **Selector Health v2** (`correlateSelectorHealth`, WI-19): runtime
  correlation + concrete safe next actions; **no correlation ⇒ no claim** —
  absent or merely-green runtime evidence yields no health claim in either
  direction; the v1 static score is secondary and never altered here.

### Changed

- `TestRecord` gains an optional `errors` text surface (the trace ingester
  populates it); `TestVerdict` gains the additive `forensic` field.

### R5 trace ingester (remediation/remote-first WI-17)

Trace forensics: bounded ingestion of Playwright trace.zip artifacts into the evidence core.

### Added

- **Playwright trace ingester** (`src/forensics/trace.ts`, WI-17): deterministic,
  offline, bounded, version-aware ingestion of per-test traces — `trace.zip`
  (a bounded, dependency-free ZIP reader: EOCD scan, central-directory
  enumeration, stored/deflate members via `node:zlib` with a decompressed-output
  cap) or raw `.trace`/`.ndjson` NDJSON streams. Action pairs become
  Evidence-Core `TestRecord`s (start/end pairing, durations, per-action
  errors; timeout errors render `timedOut`). `runForensics` recognizes trace
  artifacts in both file and directory modes; the report source union gains
  `playwright-trace` additively (`contractVersion 1` unchanged).
- False-Green corpus cases for the trace surface: corrupt stream, truncated
  stream, event-count overflow, unsupported version marker, zip without
  `trace.trace` — all degrade to the zero-record exit-2 state, never a green
  empty suite; plus positive controls (real stored zip + valid stream ingest
  with paired durations) proving the rejections are precision, not blindness.

### Changed

- `ForensicsReport.source` + `RuntimeCorroboration.source` widened additively
  with `"playwright-trace"`.

### R4c Evidence Graph + Scope Integrity + Exit-Code proofs (remediation/remote-first)

Every verdict now carries a machine-anchored evidence graph, scope-integrity accounting, and exit-code proofs.

### Added

- **Run Identity** (`src/engine/run-identity.ts`): the deterministic anchor —
  `scanId = sha256(input snapshot fingerprint + rulesDigest + config
fingerprint + engine version)`; set-identity semantics (input order does not
  matter); every scan report carries `runIdentity` + `evidenceGraph` — the
  chain-law links VERDICT ← EVIDENCE ← EXECUTION ← SCOPE ← SOURCE ← RULE(rev)
  ← FIXTURE ← REPRODUCTION, each `ref` present only when its identity input
  exists (no fabrication). The engine-version literal moved to the leaf module
  `src/engine/version.ts` (cli.ts re-exports it as CLI_VERSION;
  sync-sarif-version.cjs + version-consistency spec follow).
- **Scope Integrity** (`ScanResult.scopeIntegrity`, additive): discovered /
  analyzed / ignored / unrecognized / parseFailed / truncated counts +
  `scopeVerdict` — PROVEN only when analyzed ≡ claimed scope; else PARTIAL
  with named reasons. The terminal reporter renders the scope block and the
  "repository verified" phrasing is forbidden output unless PROVEN. Walk-level
  accounting: matcher exclusions (`onIgnored`) and unclaimed files
  (`onUnrecognized`) are counted at the shared walk; parse failures are
  counted at the rule stage.
- **Exit-code decision proofs** (tests/blast-radius/scope-and-exit.spec.ts):
  the frozen decision points exercised in both directions — trigger present →
  frozen code, trigger absent → a different code — plus the closed frozen set
  {0,1,2,10,20}.
- Machine-contract doc regenerated with the three additive blocks
  (`contractVersion 1` unchanged — additive within the schema).

### Changed

- Discovery accounting: the shared walk counts matcher-excluded files and
  unclaimed files (ScanContext gains optional `onIgnored`/`onUnrecognized`;
  all shared-walk adapters pass them through).

### R4b False-Green Attack Corpus (remediation/remote-first)

The False-Green Attack Corpus: hostile failure classes with mutation-based detection proofs.

### Added

- **tests/false-green/** — the adversarial corpus (plan §6, P0): 20 cases
  across the plan's seven hostile classes (execution · parser · adapter ·
  evidence · rule · mcp · agent failures), each declaring the seven
  owner-required fields (INPUT / EXPECTED EXECUTION / EVIDENCE / VERDICT /
  EXIT CODE / REPORT FIELDS / RELEASE IMPACT) and executed against real
  surfaces with specific field bindings:
  - execution: empty suite (score null + no-tests-found recorded), deadline
    truncation, and the partial+findings never-blocks invariant (audit C5);
  - parsers (through the real `runForensics` entry): corrupt JSON, truncated
    Playwright report, malformed JUnit, unsupported schema → zero records →
    exit-2 state — PARSER FAILURE ≠ CLEAN; duplicate retry-storm records stay
    visible;
  - adapters: scalar-jobs workflow fabricates nothing; broken YAML is SKIPPED
    with accounting;
  - rules: a throwing local plugin rule (QA-ACME-666) → `rulesCrashed ≥ 1`
    with the scan completing — RULE CRASH ≠ CLEAN;
  - evidence: missing/corrupt baseline → hasBaseline=false (exit 2); stale
    baseline resolutions stay scoped to their capture; the foreign
    baselineCommit is recorded (binding gate ships R4c);
  - MCP: unknown tool / invalid params answer JSON-RPC errors, never success;
  - agent: codegen and generated-header provenance classification — AGENT
    CLAIM ≠ VERIFICATION.
- **Mutation / assertion-strength protocol** (tests/false-green/mutation-
  protocol.spec.ts): for every wired case and every report-field binding, the
  false-green twin of the honest report (failure→success, partial→complete,
  unknown→clean, crashed-rule→clean…) is injected and the case's assertion
  must FAIL on it — a decorative assertion fails CI. Parser input twins flip
  the hostile input to its benign form and require the observed verdict to
  flip with it.
- **Generated, drift-locked index** (npm run false-green:index + index.spec.ts):
  one row per case with all seven declarations, the mutation inventory, and
  the UNSURFACED rows (MCP transport internals / agent-action policy → R8;
  artifact binding → R9) — recorded per Constitution §5, never silently
  dropped. All seven plan classes present.

### R4a Trust Constitution + Release Trust Verdict (remediation/remote-first)

The Trust Constitution and the two-layer release-trust verdict algebra.

### Added

- **docs/TRUST-CONSTITUTION.md** — canonical law: CERTIFICATION-POLICY A1–A4
  adopted as §1; the 18 PASS-forbidden conditions (verbatim); the closed status
  algebra (PROVEN evidence-state → PASS/FAILED derivation, terminality rule,
  record shape); the core law (`PASS = conclusion backed by sufficient
evidence`); per-dimension applicability (UNSUPPORTED surfaces are recorded,
  non-blocking, and drift-locked); publication honesty.
- **docs/RELEASE-TRUST-CONTRACT.md** — the canonical 12 dimensions (fixed set,
  fixed order, governance-locked): Engine/Evidence/Rule Integrity, Failure
  Containment, Corpus Integrity, Contract Compatibility, Determinism, Scope
  Integrity (ships R4c), Reproducibility, Zero-Network Compliance, Agent Safety
  (R8), Artifact Integrity (R9).
- New verb **`mjolnir release-trust`** emitting `mjolnir.release-trust@1` —
  byte-deterministic (frozen key order, no timestamps, zero absolute paths),
  per-dimension `evidence` + `determination` via the status algebra, verdict =
  contract satisfaction (never a PROVEN count) with the binding system
  invariant. Exit contract: 0 PASS · 1 non-PASS · 2 blocked context · 10 usage ·
  20 internal. Drift-locked by tests/contract/release-trust-contract.spec.ts
  (canonical set/order, binding resolution, derivation table + terminality,
  byte-stability, path-freedom).

### Changed

- **release.yml**: the Release Trust Verdict gate is wired RELEASE-BLOCKING
  pre-publish (Tests → Certification → CHANGELOG Gate → … → release-trust gate
  → publish), running the BUILT binary; the verdict block + machine contract
  ship with the GitHub Release (publication honesty — a missing proof renders
  UNPROVEN, never omitted). No waiver path.

### R4 blast radius audit (remediation/remote-first R4)

The blast-radius audit: a machine-verified surface manifest with its own drift lock.

### Added

- **docs/BLAST-RADIUS-AUDIT.md** — the machine-verified surface manifest
  (`npm run docs:blast-radius`): src inventory with per-area LOC, the internal
  import fan-in ranking (change-blast candidates), the external dependency
  allowlist, and the shipped surface (adapters, rules census, CLI flags, report
  formats, frozen exit codes).
- **tests/contract/blast-radius.spec.ts** — the machine-TESTABLE boundary
  contract: the committed manifest must equal a fresh render; every external
  import in src/ must belong to the allowlist (`yaml`, `ts-morph`,
  `web-tree-sitter`, `tree-sitter-wasms`; node builtins are platform
  contracts); every CLI flag parsed must appear in the manifest; every
  `process.exit(N)` in src/ must be inside the frozen set (0/1/2/10/20).

### P6 quarantine remediation (remediation/remote-first R3)

Quarantine remediation: measured verdicts recorded, the quarantine ledger reconciled, and three rules restored to the live set.

### Added

- **docs/QUARANTINE-REMEDIATION.md** — the ledger-first quarantine view, generated
  from the live registry (`npm run docs:quarantine-ledger`) and drift-locked
  (tests/contract/quarantine-ledger.spec.ts): one row per live quarantine rule
  with failure-mode class, disposition, and re-measure gate; historical section
  records the governed retirements.
- Python tree-sitter parse stage: `parsePythonAst` wired into the python
  adapter's async `parseAst` hook (the §10 parse-or-fallback contract), with
  `src/engine/python-ast.ts` structural queries — the first real python AST
  substrate (the Sprint-8 "unwired" caveat is closed and re-pinned honestly).

### Changed

- **QA-PY-007** (detectorRevision 4, AST rework): fires only on ≥2-statement
  with-blocks or broad root exception types — the adjudicated FP core
  (single-statement/specific-type) suppressed. Corpus: pytest-dev 167 → 11,
  pallets-click 16 → 1 live findings.
- **QA-TQUAL-009** (detectorRevision 2, AST rework): skips Cypress command
  chains (`cy.`-rooted — the driver awaits them) and deliberate `void`
  discards. Corpus: cypress-realworld-app 10 → 0.
- **QA-PW-147** (detectorRevision 2, final attempt): AST arm fires only on real
  test/it declarations — code-as-data (`test('test')` inside lint-rule test
  strings) can never fire. Corpus: eslint-plugin repo 32 → 0.
- **QA-ENV-001** (detectorRevision 4, final attempt): OS-path sub-pattern
  dropped (20/20 adjudicated FP — deliberate path fixtures, same undecidability
  as the wave-2 host drop); locale/local-time families kept. Corpus: grafana
  7 → 4.
- Measurement: orphaned verdicts (findings the reworks suppressed) archived to
  `tests/corpus/verdicts/archive/` per the established prune flow; the three
  fully-reworked rules fall below the n ≥ 10 threshold and ship UNMEASURED
  until owner re-adjudication (measured census 77 → 74 of 79; the
  certification floor test documents the P6 invalidations).

### P3c Jenkins (remediation/remote-first R2)

Jenkins support: a bounded Jenkinsfile scanner and the QA-CI Jenkins arms (retry masking, catchError rescue, silent swallow).

### Added

- Jenkinsfile detection: the root `Jenkinsfile` (declarative and scripted
  pipelines) is now discovered and scanned as a TEXT-target kind — a bounded,
  string-aware Groovy block scanner (`sh` segments, `catchError` blocks,
  `try`/`catch` pairs); no new language grammar (master-plan P3c wording).
- New rule **QA-CI-014** "try/catch swallows a verification-stage failure" —
  a `try` running a gate whose `catch` neither rethrows, calls `error(...)`,
  marks `currentBuild.result`, nor downgrades via `unstable()`. BORN
  QUARANTINE (§15.5): opt-in via `--strict` until corpus-measured.

### Changed

- **QA-CI-002** (detectorRevision 4): Jenkinsfile routing — the lexical
  `|| true` scan now reaches `sh` strings.
- **QA-CI-008** (detectorRevision 4): Jenkinsfile arms —
  `catchError(buildResult: 'SUCCESS')` wrapping a gate, and `unstable()` used
  as a rescue for a failed verification stage (master-plan P3c shapes;
  `buildResult: 'UNSTABLE'` is a visible downgrade and never fires).
- **QA-CI-009** (detectorRevision 3): Jenkinsfile arm — `sh` running a
  verification gate with `returnStatus: true` discards the exit code.
- Measurement: sidecar + `MEASURED_FP` re-recorded for QA-CI-002/008/009
  (corpus re-run: no corpus repo carries a root Jenkinsfile, so the
  classified verdict evidence carries over unchanged).

### P3b Azure DevOps (remediation/remote-first R1)

Azure DevOps support: guarded azure-pipelines.yml parsing, the QA-CI Azure arms, and the adapter's honest accounting.

### Added

- Azure DevOps pipeline detection: `azure-pipelines.yml` at the repo root is now
  discovered and scanned (`azure-pipelines` adapter, safe-YAML machinery shared
  with the GitHub Actions parser — alias-bomb guard, depth cap, prototype-safe
  keys; docs/AZURE-DEVOPS.md).
- New rule **QA-CI-013** "Verification gate conditioned so it can never fail the
  pipeline" — `condition: failed()` rescue, `condition: false`, `enabled: false`
  on Azure verification gates. BORN QUARANTINE (§15.5): opt-in via `--strict`
  until corpus-measured; never silent-core.
- docs/AZURE-DEVOPS.md — platform recipe with the frozen exit-code contract.

### Changed

- **QA-CI-001** (detectorRevision 3): Azure DevOps arm — `continueOnError: true`
  on a verification step or a gate-bearing job (same mechanism, framework-tagged
  `azure-pipelines`).
- **QA-CI-002** (detectorRevision 3): Azure routing — the lexical `|| true` scan
  now reaches `bash:`/`pwsh:` script blocks in azure-pipelines.yml.
- **QA-CI-007** (detectorRevision 3): Azure DevOps arm — `retryCountOnTaskFailure`
  on verification tasks.
- **QA-CI-008** (detectorRevision 3): Azure DevOps arm — verification gate jobs
  conditioned `always()` / `succeededOrFailed()` (master-plan P3b shape).
- Measurement: sidecar + `MEASURED_FP` re-recorded at detectorRevision 3 for
  QA-CI-001/002/007/008; corpus re-run showed zero QA-CI count drift (no corpus
  repo carries a discoverable azure-pipelines.yml), so the existing classified
  verdicts remain the measurement evidence.

## [1.0.5] — 2026-09-10

### Changes since 1

- chore: resync managed surface stamp to v1.0.4

## [1.0.4] — 2026-09-10

### Changes since 1

- P15: adversarial suites — parser fuzz, determinism soak, bench advisory CI (#72)

## [1.0.3] — 2026-09-10

### Changes since 1

- Brand system unification: one source of truth, and a gate that proves it (#71)
- docs(brand): certification to its final state — v1.0.2, 9 rules, CI green
- ci: the lockfile-marker guard needs an explicit bash shell
- ci: run the site build on PRs, and guard against lockfile conflict markers
- fix: resolve committed merge-conflict markers in package-lock.json
- Merge origin/main (v0.6.1 → v1.0.2) into brand/unification
- feat(brand): close the two gaps that were closable — 9.4 → 9.6
- docs(brand): record the v0.6.1 merge in the certification
- refactor(reporter): the Trust Report takes its rungs from the symbol module
- feat(brand): rebuild every asset on the merged reporter, and adopt flow.svg
- fix(docs): a placeholder was breaking the site build again
- chore: one blank line, so `npm run lint` is green again
- Merge origin/main (v0.5.31 → v0.6.1) into brand/unification
- docs(brand): record D16 and the CI surfaces in the certification
- feat(brand): Phase 13 — the badge the product emits joins the brand
- docs(brand): stop the shipped docs pointing at an untracked file
- docs(brand): Phase 12 — certification, and the score it actually earned
- docs(brand): Phases 9 and 11 — write the system down, once each
- feat(brand): Phase 10 — the reporter's diagrams stop lying about UNKNOWN
- feat(brand): Phase 8 — the website says what the product says
- fix(video): the shipped demo is now reproducible, and checked
- feat(brand): Phase 6 — the badges join the brand, in all 23 READMEs
- feat(brand): Phase 5 — one geometry for evidence and trust
- feat(brand): Phase 4 — one palette, and the AA failure it was hiding
- feat(brand): Phase 3 — one typography system across every surface
- fix(site): the site build has been broken since 9f59bc5 — repair it
- feat(brand): Phase 2 — the brand gate, proven able to fail
- feat(brand): Phase 1 — one source of brand truth, zero visual change
- docs(brand): Phase 0 — freeze the tree and measure the before-state
- docs(brand): carry forward in-flight README asset work
- chore: resync managed surface stamp to v0.5.31

## [1.0.2] — 2026-09-09

### Changes since 1

- P8: depth adjudication — no unexplained depth (all 89 LEXICAL rules + matrix completion + migration deferral) (#70)

## [1.0.1] — 2026-09-09

### Changes since 0

- chore(release): v1.0.0 — Core Certification cut (WI-16)

## [1.0.0] — 2026-09-09

### Added

- **Core Certification (WI-16): 1.0.0 is the first fully-measured
  release.** Every active canonical rule (77) satisfies the
  measurement law — n ≥ 10 hand-classified verdicts at the current
  detectorRevision, zero PROVISIONAL, zero denominator games. The
  2026-09-09 harvest waves (WI-14) measured the final 15 rules via the
  class-B fixture corpus and closed the census; QA-PY-102 was retired
  as a structural dead duplicate (its measured sibling QA-PY-005
  declares overlapWith, so it could never fire). Certification report:
  docs/CERTIFICATION-1.0.md. Evidence chain: doctor self-audit WORTHY
  (77/77), full suite 7,054 green, determinism replay byte-identical,
  adversarial + benchmark suites green, CHANGELOG integrity gate
  active.

### Removed

- **QA-PY-102 retired** (22nd retirement, WI-14 closeout): structural
  dead duplicate — QA-PY-005 (the measured survivor) declares
  overlapWith QA-PY-102, so every finding dedups away and the rule can
  never fire, never be measured. Frozen IDs are never reused.

## [0.6.12] — 2026-09-09

### Changes since 0.6.11

- fix(lint): no-regex-spaces in sync-census tooling ({2} quantifier)

## [0.6.11] — 2026-09-09

### Changes since 0.6.10

- fix(lint): exclude scripts/*.mts from the typed-parser project route

## [0.6.10] — 2026-09-09

### Changes since 0.6.9

- fix(lint): scripts/*.mts one-shot tooling runs under the plain JS ruleset

## [0.6.9] — 2026-09-09

### Changes since 0.6.8

- feat(measurement): WI-14 closeout — 77/77 measured, 0 PROVISIONAL (1.0.0 census achieved)

## [0.6.8] — 2026-09-09

### Changes since 0

- feat(corpus): WI-14 harvest waves 1-5 — census 60 → 72 of 78 measured

## [0.6.7] — 2026-09-09

### Changes since 0.6.6

- fix(tests): fresh-install gate asserts the Trust Report surface (WI-5 follow-through)

## [0.6.6] — 2026-09-09

### Changes since 0.6.5

- fix(release): format the collapsed CHANGELOG before the lint gate (bot fix)

## [0.6.5] — 2026-09-09

### Changes since 0.6.4

- chore(test): re-baseline the coverage ratchet for the 0.6.x line (measured 99.8/99.37/99.81/99.82; per-file pause documented)

## [0.6.4] — 2026-09-09

### Changes since 0.6.3

## [0.6.3] — 2026-09-09

### Added

- `trust-report --from <mjolnir.json> [--stdout]` (WI-9): the Trust
  Artifact rendered from a SAVED canonical scan result — the GitHub
  Action's comment/annotation steps derive from the exact saved report
  (one semantic truth, no second scan). Includes honest error paths:
  read / parse / write failures each surface their own catch via the
  consolidated `errorMessage` derivation in cli-io.ts.

### Fixed

- Error-path hardening across the trust-report verb: read and parse
  failures split into separate honest catches; artifact-write failures
  (disk-full / permission) exit 20 instead of crashing; the
  no-positional default-target arm covered.

## [0.6.2] — 2026-09-09

### Changes since 0.6.1

- Create FUNDING.yml

## [0.6.1] — 2026-09-09

### Changes since 0.6.0

## [0.6.0] — 2026-09-09

### Changed

- Version line opens: **0.6.x = Productized Core (plan §31)**. The full
  workstream-A capability set (Trust Report hero surface, Canonical
  Evidence Core, trustSummary metrics, machine contract extension,
  explain v2, triage v2 guided workflow, Action Trust-Report
  consumption, zero-config evidence discovery, CHANGELOG integrity
  gate, mvp-demo corpus + golden harness, E-1 retirement of 21 rules —
  active census 78 rules: 57 measured, 21 PROVISIONAL) shipped in
  **0.5.40**, the first release produced under the active CHANGELOG
  integrity gate. 0.6.0 establishes the 0.6.x version line; no code
  changes in this release.

## [0.5.40] — 2026-09-09

### Added

- **Trust Report — the hero product surface (WI-5).** `mjolnir` now leads
  with the five questions — TRUST VERDICT (trust level + headline),
  CONFIDENCE (confidence, evidence coverage, inconclusive rate, measured-FP
  of fired rules, tests analyzed), WHY THIS VERDICT (evidence-backed
  reasons), TOP TRUST RISKS (corroboration-ranked), NEXT ACTION (concrete
  command) — all rendered from the canonical scan result only (every
  number exists in `--json`). `--classic` escapes to the previous render;
  rendering flag only, semantics and exit codes unchanged.
- **`mjolnir trust-report` (WI-6).** Emits deterministic, self-contained
  `mjolnir-trust-report.{md,json}` — no cloud/telemetry; PR-attachable,
  agent-consumable; byte-identical for the same scan.
- **`trustSummary` on the scan JSON (WI-3, plan §6).** Scan-level trust
  measurement: level, ceiling-capped confidence (partial 0.5 /
  truncation 0.6 / rules-crashed 0.8 / framework-unknown 0.9),
  evidenceCoverage, inconclusiveRate, measuredFpOfFiredRules with
  PROVISIONAL disclosure of unmeasured fired rules. Formulas published in
  `docs/SCORING.md`.
- **Machine contract extension (WI-4).** `buildMachineContract` now
  carries `trustSummary` and `provenance` verbatim from the canonical
  result, plus a reserved `forensicVerdicts` slot (unpopulated until the
  1.1.x forensic taxonomy). `contractVersion` stays 1; additive only.
- **Canonical Evidence Core (WI-2).** `src/engine/evidence-core.ts` — one
  normalized `EvidenceRecord` shape with deterministic ordering; the scan
  pipeline fans all runtime evidence through it; stamping semantics
  preserved byte-identically (differential preservation suite).
- **Explain v2 (WI-7).** `mjolnir explain` gains verdict mode
  (`mjolnir explain verdict --json <mjolnir.json>`) and finding mode
  (file:line delegates to `mjolnir explain <file:line>`); every mode now answers the §8
  checklist including WHAT WOULD CHANGE THE VERDICT and NEXT ACTION.
- **Triage v2 (WI-8).** `mjolnir triage` now runs the §9 guided workflow —
  CLASSIFY → EVIDENCE → TRUST VERDICT → NEXT ACTION per row, every row
  ending in a concrete command; `--classic` keeps the table, `--json`
  emits the structured twin.
- **Zero-config evidence discovery (WI-11).** The scan auto-discovers
  run evidence from conventional layouts (mjolnir.report.json, PW JSON
  reporter names, test-results/, JUnit XML) at depth ≤ 2; scans without
  evidence state exactly what is missing and the honest trust ceiling.
- **Canonical MVP evidence corpus + golden harness stage 1 (WI-13A/B).**
  `examples/mvp-demo/` covers all 12 evidence case classes (9 active / 3
  awaiting-ingestion, trace.zip deferred to WI-17); the stage-1 harness
  proves same-evidence → same-verdict across CLI + JSON with
  INCONCLUSIVE-as-pass semantics.
- **CHANGELOG integrity gate (WI-12A).** `scripts/check-changelog.ts` is
  release-blocking in the release workflow (before publish, before
  Release creation) and runs on every main CI build: released version
  must have a dated CHANGELOG section; gate-era headings strictly
  ordered; rule changes must be documented.

### Removed

- **21 rules retired and unregistered (E-1 retirement reconciliation, owner
  ruling 2026-09-08).** `RETIRED_RULE_IDS` (in `src/rules/index.ts`) is now the
  canonical, auditable record of retirement: a rule explicitly marked RETIRED by
  `docs/RULE-LIFECYCLE.md`'s Phase 2 quarantine-cluster triage no longer counts
  toward the active registry, the census, or the measurement KPI — quarantine
  does not equal retirement. The active registry is now **78 rules (57 measured,
  21 author-estimated)**. Every removed rule was measured at 100% FP with zero
  true positives (n ≥ 10 each, `docs/FP-AUDIT.md`), i.e. its premise is wrong on
  real code, not its tuning. Behavioral impact: none on default scans (all 21
  were quarantine-tier, which runs only under `--strict`); `--strict` scans stop
  reporting these advisory findings. Evidence level of every removed finding was
  E0 (observation only, never gating). Measurement status: all 21 measured at
  1.0 FP rate (detector revision 1) — the measurements and their verdict rows
  are preserved as history (`tests/corpus/verdicts/archive/`,
  `docs/RULE-LIFECYCLE.md`). User-visible impact: fewer false-positive advisory
  findings under `--strict`; the "99 rules" claim everywhere becomes the honest
  count of active canonical rules (78). Frozen IDs are never reused; the
  retired IDs are listed with per-rule rationale in `RETIRED_RULE_IDS`.
  Removed IDs — Playwright TS: QA-PW-005, QA-PW-103, QA-PW-105, QA-PW-107,
  QA-PW-108, QA-PW-112, QA-PW-114, QA-PW-118, QA-PW-119, QA-PW-120, QA-PW-145;
  quality: QA-TQUAL-001; Python: QA-PY-006, QA-PY-008, QA-PY-010; family
  variants: QA-JV-108, QA-CS-108 (hardcoded-URL), QA-JV-110, QA-CS-110
  (no-a11y), QA-JV-111, QA-CS-111 (blanket-route).

## [0.5.39] — 2026-09-09

### Changes since 0

- P9: bus-factor program — MAINTAINERS ladder, OWNER-RUNBOOK, ADJUDICATION-KIT, CODEOWNERS (#69)

## [0.5.38] — 2026-09-09

### Changes since 0

- P7: agent loop — mjolnir verify + MCP verify tool + install surfaces (#68)

## [0.5.37] — 2026-09-08

### Changes since 0

- P5: mutation evidence reader — Stryker/mutmut, E1→E2 derivation, report-only (#67)

## [0.5.36] — 2026-09-08

### Changes since 0

- P4: forensics breadth — Jest + Vitest JSON ingestion (honest degradation) (#66)

## [0.5.35] — 2026-09-08

### Changes since 0

- P3a: GitLab CI — Code Quality report, MR recipe, exit-code discipline (#65)

## [0.5.34] — 2026-09-08

### Changes since 0

- p2: structural anti-dilution — deduction-mass ceilings close the padding vector (plan 1788853205786 P2, decision 4) (#64)

## [0.5.33] — 2026-09-08

### Changes since 0.5.32

- P1: distribution — root action, moving v1 tag, action-based ci install (#63)

## [0.5.32] — 2026-09-08

### Changes since 0.5.31

- P0: repo state + truth drift — single measured count with drift lock (#62)

## [0.5.31] — 2026-09-08

### Changes since 0.5.30

- chore: resync managed surface stamp to v0.5.30 (docs narrative landed on the release state)
- docs: README narrative refresh + reproducible flow/architecture assets with contract locks (docs:flow, docs:architecture)

## [0.5.30] — 2026-09-08

### Changes since 0.5.29

- Cross-language side-by-side review aid for rule families 106/107 (§19 review tool, decides nothing) (#60)

## [0.5.29] — 2026-09-08

### Changes since 0.5.28

- fix(corpus-sample): never delete review sheets of rules not sampled in the current run — scoped runs used to wipe pending §19 owner classifications

## [0.5.28] — 2026-09-08

### Changes since 0.5.27

- feat(corpus-sample): --repo resumability + --budget override — one-process-per-repo avoids V8 OOM on large monorepos; budget raise is the documented chronic-truncation remedy

## [0.5.27] — 2026-09-08

### Changes since 0.5.26

- fix(corpus-sample): refuse PARTIAL scans — findings from a truncated scan are not evidence (same refusal as corpus/audit.ts, D14/§19 discipline)

## [0.5.26] — 2026-09-08

### Changes since 0.5.25

- Certification findings remediation: F1-F5 + P3 (plan 1788806598818) (#57)

## [0.5.25] — 2026-09-08

### Changes since 0.5.24

- docs: CERTIFICATION-POLICY.md — consolidated owner-ratified lawbook (1-22 + L1-L6), contradiction pass, verdict semantics; eslint/prettier ignore machine-local .mjolnir scratch (#59)

## [0.5.24] — 2026-09-08

### Changes since 0.5.23

- L4 ruling: tier-enforcement INCONCLUSIVE without live verdicts (MEASURED_FP = historical artifact only) (#58)

## [0.5.23] — 2026-09-08

### Changes since 0.5.22

- docs(corpus): D14 as amended by owner — re-baseline-per-wave is blocking, PARTIAL repos are tracked debt (never baselines, never a certification gate); zero-PARTIAL is the end state, not the gate

## [0.5.22] — 2026-09-07

### Changes since 0.5.21

- chore: gitignore bench artifacts (machine-local timings + fixture scratch)
- test(corpus): D14 re-baseline after Wave-1 merges — QA-PW-124 now adapter-gated (configRule metadata), QA-TEST-003/010 surface on repos whose baselines predate the TS project split, corpus regen of partial scans pending quiet-machine rerun
- chore(qa): eslint-ignore the verbatim QA evidence area (raw probes are committed DATA, certification protocol)
- chore(qa): commit FINAL-RELEASE certification evidence verbatim (cycle 0, RC 151186b) + lint/format exclusions for raw evidence area (certification plan 1788804968910 protocol)

## [0.5.21] — 2026-09-07

### Changes since 0.5.20

- Integrity layer: category + measurement consistency, measurement census, §27 design pass (Phases 1+4+7) (#56)

## [0.5.20] — 2026-09-07

### Changes since 0.5.19

- Doctor status model + --json contract + certification CI gate (Phase 5, G2/G5/G6) (#55)

## [0.5.19] — 2026-09-07

### Changes since 0.5.18

- Detector revision integrity: manifest, doctor check, CI WARN base-diff (D8v2, G4) (#54)

## [0.5.18] — 2026-09-07

### Changes since 0.5.17

- README: add npm downloads badge

## [0.5.17] — 2026-09-07

### Changes since 0.5.16

- Fixture integrity gate: Layer A structural typecheck, doctor fixture-integrity, Python tier (F1, D9, G3) (#53)

## [0.5.16] — 2026-09-07

### Changes since 0.5.15

- Curation + mechanical hygiene: QA-PW-124 D3 alignment, F7-F10 closures (#51)

## [0.5.4] — 2026-09-06

### Agent Handoff + Minimized Reporting (plan 1788599400000)

### Added

- **`mjolnir explain <file:line> <file>:<line>`** — occurrence-level evidence query
  (informational, NOT a gate): exact file+line match, severity icon,
  message/why/fix, evidence level, trust level, measured FP rate
  (or the honest "ships on assumption"), runtime corroboration when
  present, and the suppression contract (reason required, 90-day
  expiry). Saved-report mode (`--json <mjolnir.json>`) is
  authoritative; live scan runs otherwise. Exit 0 match / 1 no match.
- **`mjolnir handoff [mjolnir.json]`** — the deterministic fix-handoff
  artifact: per-rule remediation sections (what is wrong / why
  Mjölnir believes it / evidence boundary by level / occurrences
  capped at 25 / fix / constraints / occurrences list), a per-rule
  fenced copy block and a one-shot handoff prompt, and the formal
  verification contract (TARGET_RESOLVED / TARGET_REMAINS /
  NEW_FINDINGS_INTRODUCED / VERIFICATION_NOT_RUN, correlated by the
  fingerprint ruleId+file+message; the standing caveat that a clean
  `--scope changed` run verifies the changed surface only). Generated
  solely from Mjölnir's own rule metadata — offline, deterministic,
  escapeMarkdown'd. Zero findings → exit 0, non-actionable clean
  artifact with no prompt. `--category`/`--rules` are presentation
  filters.
- **`mjolnir install`** — installs the agent instruction surfaces
  (`.claude/commands/mjolnir.md`, `.kilo/command/mjolnir.md`,
  `.cursor/rules/mjolnir.mdc`, marker-appended `AGENTS.md`): the
  version-pinned trust loop brief (scan `--scope changed` before
  finishing, never suppress to green, report files changed and checks
  not run). `--staged-hook` adds a NON-BLOCKING pre-commit hook
  (`mjolnir --staged --blocking warning`, reusing `.husky`/
  `core.hooksPath` when present). Marker-based idempotency;
  `--dry-run` writes nothing; refusal (exit 10) before overwriting
  any non-Mjölnir file; `--force` overwrites only Mjölnir-marked
  files; never @latest.
- **`--score`** — prints only the numeric score (`unknown` when no
  tests exist — never a fake 0); pure rendering flag, exit code
  unchanged; stderr note when --json was also requested.
- **`--category <cat>`** (repeatable) — presentation filter on the
  terminal findings display (and handoff/why): NEVER filters the
  scan, the JSON/SARIF output, or the score; the terminal prints
  `filtered view: N of M findings shown; score reflects the full
scan`. Unknown categories are a usage error (exit 10).
- **`--staged`** — scan-surface restriction: intersects discovered
  test files with the git staged list; score reflects the staged
  surface and is labeled as such (`staged surface: N file(s)`); not a
  git repo → honest degraded fallback; empty staged set → exit 0.
- **`--blocking error|warning|none`** — exit-status override only:
  maps onto the existing gate model (none→advisory, error→errors
  block, warning→errors+warnings block). Detection and rendering are
  identical under all three values; E0 findings never block; partial
  scans stay exit 2.
- **`fixGroupId`** (additive JSON field): the stable semantic identity
  of a remediation group — intentionally distinct from `ruleId`
  (which identifies the detector). Current strategy: one rule = one
  group, so fixGroupId equals ruleId today; consumers must not rely
  on that permanently.

### Changed

- help registry gained `why`, `handoff`, `install` and the new flags;
  site/reference/cli.md documents the handoff trust model.

## [0.5.15] — 2026-09-07

### Changes since 0.5.14

- Close-out: complete the 21-rule fixture program (blueprint §19) (#50)

## [0.5.14] — 2026-09-07

### Changes since 0.5.13

- Merge pull request #47 from Sergey-Bar/claude/readme-demo-video-4rzxij
- Cover the mjolnir mcp dispatch branch — CI's 100% ratchet caught it
- README: define Selector Health, state the limits, lock the samples
- Expose the MCP server, and document the agent surface in the README
- See it work: embed the real demo video inline
- Rework See it work and the score section: real video, fixed-size cards
- Replace the See it work poster+MP4 and shorten the score hero image
- Replace the score/verdict table with an animated hammer sweep

## [0.5.13] — 2026-09-07

### Changes since 0.5.12

- Merge pull request #33 from Sergey-Bar/claude/readme-demo-video-4rzxij
- fix(video): resolve ffmpeg/ffprobe without a shell
- Resync generated assets after merging origin/main (v0.5.12)
- Merge remote-tracking branch 'origin/main' into claude/readme-demo-video-4rzxij
- merge: catch up to main again (v0.5.6) — a second PR landed underneath this one
- Merge remote-tracking branch 'origin/main' into claude/readme-demo-video-4rzxij
- fix: explain's fixture path was OS-native, breaking Windows CI
- merge: bring in main's UX overhaul, reconcile the reporter conflicts
- Merge remote-tracking branch 'origin/main' into claude/readme-demo-video-4rzxij
- video: adopt react.doctor's terminal palette and font
- video: fix invisible command text, and guard the whole class
- video: present the terminal as a window, not a maximised screenshot
- video: re-render both demos against the fixed reporter
- report: one hammer, and output that fits the terminal it prints to
- video: add the manual render workflow and document the pipeline
- docs: restructure the README around the demo, and lead with the video
- video: add the media-format contract, and ship the hero MP4
- video: render the committed scripts to 1440p H.264, frame by frame
- video: capture the demo scripts from real scans, and contract them
- video: vendor the render font stack, gated by a cmap-exact glyph probe
- docs: fix the stale numbers in the honesty section, and guard them

## [0.5.12] — 2026-09-07

### Changes since 0.5.11

- Product-Experience Master Plan: content integrity, canonical terminology, brand cleanup, CI path integrity (#44)

## [0.5.11] — 2026-09-07

### Changes since 0.5.10

- Merge pull request #45 from Sergey-Bar/eng/closeout-recommendations
- docs: FP-AUDIT status column settles on the second generator pass (stale module import in single-pass)
- docs: regenerate QA-ENV-001 + QA-PW-147 rule docs (now measured)
- close-out: 39 verdicts adjudicated (AI-assisted, owner-authorized) — 78/99 measured

## [0.5.10] — 2026-09-06

### Changes since 0.5.9

- Merge pull request #43 from Sergey-Bar/eng/closeout-2.4
- docs: close-out eligibility audit + final 2.0 certification report (five-way verification classification)

## [0.5.9] — 2026-09-06

### Changes since 0.5.8

- Merge pull request #42 from Sergey-Bar/eng/lane-a-qamodel-2.3
- docs: regenerate all generated artifacts under the Lane A rev-2 rules
- feat: Lane A — hard-sleep JV/CS family migrated to the QA-model substrate (blueprint §10)

## [0.5.8] — 2026-09-06

### Changes since 0.5.7

- Merge pull request #41 from Sergey-Bar/eng/mcp-transport-2.2
- feat: MCP stdio transport — pure transport over the machine contract (blueprint §21, Phase 4)

## [0.5.7] — 2026-09-06

### Changes since 0.5.6

- Merge pull request #40 from Sergey-Bar/eng/machine-contract-2.1
- test: plural + unknown-cause arms for inconclusive resolution rendering
- feat: machine verification contract + finding detectorRevision + lifecycle resolution (blueprint §12-§15, §17, §25)

## [0.5.6] — 2026-09-06

### Changes since 0.5.5

- Merge pull request #39 from Sergey-Bar/eng/verification-trust-2.0
- docs: regenerate readme SVGs under the revision-2 CI-rule measurements
- docs: regenerate rule-doc occurrence tables (yarnpkg-berry corpus lane)
- fix: eslint pragma for the file-wide consumer fallback regex
- fix: rev-2 enforcement arm in QA-CI-008 was dead code + coverage arms for CI rules
- ci-family trust repair: M2 detector re-adjudication, revision 2 re-measurement, workflow corpus lane

## [0.5.5] — 2026-09-06

### Audit Remediation 1.0 (engine correctness + trust boundary)

### Changed — plugin execution gate (audit C2, contract-visible, pre-1.0)

- **`--enable-plugins` / `MJOLNIR_ENABLE_PLUGINS=1`** — npm plugins and
  JS-module external rules (`mjolnir-rules/*.mjs`) now load and execute
  only behind an explicit opt-in (default OFF). Declared-but-gated
  sources are listed on a loud stderr notice; they are never imported.
  JSON rule manifests execute no code and load without the gate. See
  SECURITY.md (trust model) and docs/VERSIONING.md (gate contract).

### Fixed — engine correctness (audit M1)

- **C1/W9 (`--cache`)**: the cache key folds in the repo-relative path,
  adapter id, and parse mode — byte-identical files no longer share
  verdicts (findings carried the first-scanned file's path), and
  regex-fallback verdicts are never served as AST ones. `CACHE_VERSION`
  bumped to 2: one-time invalidation, first post-upgrade scan cold.
- **C3**: the default console sinks are variadic —
  "mjolnir internal error:" now carries the actual cause (the message
  used to be dropped).
- **C5**: a partial (truncated) scan never writes the
  first-clean-scan milestone; `mjolnir diff` on a truncated head
  returns exit 2 and folds no resolved findings into stats.
- **W1**: the Java/C# maskers keep code after a closed block comment
  live (`/*x*/y` used to blank `y`).
- **W2/W3**: parse-semaphore re-check (cap holds under fan-out) and
  parser-creation retry on rejection (a transient WASM load failure no
  longer disables the AST path for the process).
- **W4**: unchecked grammar-shape casts removed in the QA-model
  extractor; `parseTsFile`'s undefined contract honored.
- **W8**: runtime corroboration claims "test" level only when the
  finding's line falls inside the verdict's span; lineless reports
  degrade to file level.
- **W10**: malformed rule records at the rule→Finding boundary are
  rejected with a diagnostic (crash channel), never silently scored.
- **S5 (QA-CI-001, detectorRevision 2)**: step-level line resolution
  falls back to the anchor line instead of crashing — the rule no
  longer vanishes into crash isolation on workflows where the raw
  `continue-on-error: true` literal sits outside the search window.
  Behavior changes from crash-dropped to reported; sidecar +
  measured-FP regenerated per policy.
- **masking.ts**: outer-delimiter search fixes misclassification of
  string values ending in a nested quote.
- **changed.ts**: hunk-content lines that look like diff headers no
  longer abandon the hunk; one unreadable untracked file degrades only
  itself (treated fully changed), never the whole scope.
- **shared-walk.ts**: unreadable directories and skipped symlinks are
  counted skips with reasons; deadline/cap checks run inside the entry
  loop.
- **workflow-parser.ts**: the documented nesting-depth cap is enforced;
  `jobs` builds on a null-prototype object; step `with` is copied.

### Changed — suppressions expiry (audit S4, contract-visible, pre-1.0)

- The 90-day default for hand-authored `ignore` entries is no longer
  anchored at the config file's mtime — any config edit used to reset
  every suppression window. Expiry is the entry's explicit `expires`
  date; entries without one stay active and are labeled accordingly in
  `mjolnir suppressions`.

### Hardened — trust boundary (audits S1/S2/S3/S7)

- **S1**: git resolves to an absolute path from PATH (never the scanned
  CWD) — a planted `git.exe`/`git.bat` cannot hijack Mjölnir's git
  calls on Windows.
- **S2**: ignore/glob patterns and external JSON-rule regexes are
  length/wildcard-capped at compile time; `**/` compiles segment-aware.
- **S3**: config/ignore/plugins resolve from the explicit scan target's
  project; the resolved anchor prints in verbose mode.
- **S7**: `ignore[].files` must be `string[]` (exit 10 on typo);
  unknown top-level config keys warn; baseline `schemaVersion` is
  checked (future versions degrade to "no baseline" with a warning).

## [0.5.3] — 2026-09-05

### Terminal + CI UX Overhaul (plan 1788579907109)

### Added

- **Design-system core** (`src/reporter/ui.ts`): one canonical visual
  language — `▚ TITLE` section headers (ASCII fallback `= TITLE`),
  `✗/⚠/ℹ` severity icons (ASCII `X/!/i`), rounded panels, 58-glyph
  dividers, and a dim `$ command` next-step affordance. All
  subcommand renderers (`baseline`, `debt`, `init`, `doctor`, `fix`,
  `impact`, `stats`, `handover`, `triage`, `pw-report`, `explain`,
  `rules-catalog`, `create-rule`, `suppressions`, forensics,
  selector-health) now render through it; per-renderer `▚▞`/`🔨`/`╔══╗`
  headers and `╞══╡` tables are gone. `FORCE_COLOR` is honored
  (chalk convention: `0`/`false`/empty = plain, other values force
  color even piped, winning over `NO_COLOR`).
- **`mjolnir help` + per-command help** (`src/commands/help.ts`): the
  grouped overview (Scan · CI & PRs · Forensics · Maintenance · Meta,
  copy-pasteable starts, exit-code table, docs link) and
  `mjolnir help <verb>` / `mjolnir <verb> --help` pages for every
  registered verb. **Behavior call-out:** `help` now dispatches as a
  verb BEFORE the scan fall-through — bare `mjolnir help` no longer
  scans the CWD (it never was a documented behavior); a folder named
  `help/` is still scanned via `mjolnir ./help`. `--help`/`-h` on the
  root scan still print usage and exit 10 (frozen contract).
- **Friendly usage errors** (exit 10 preserved): unknown flags name
  themselves on stderr, suggest up to three nearest real flags
  (hand-rolled Levenshtein ≤ 2 — no new dependencies), and point at
  `mjolnir --help`. The exit-20 crash path says "this is a bug in
  Mjölnir, not your repo", carries the message, and prints the stack
  trace only under `--debug`.
- **Live scan progress** (`src/reporter/progress.ts`): an event-driven
  stderr line (`Discovering files… → Parsing frameworks… → Running
rules… → Scoring…`) fed by the new additive `ScanHooks.onProgress`.
  Render-on-event only — no timers, deterministic under a fake stream.
  Auto-off when stderr is not a TTY, in machine formats, under
  `GITHUB_ACTIONS=true`/`CI=true`, or with the new additive
  `--no-progress` flag. stdout purity and `--json` byte-identity are
  unchanged.
- **`mjolnir summary [mjolnir.json]`** (`src/commands/summary.ts` +
  `src/reporter/github.ts`): reads a saved `--json` report and emits
  GitHub annotations (only when `GITHUB_ACTIONS=true`, per-finding
  `::error|warning|notice` with spec-exact `%25/%0D/%0A/%3A/%2C`
  escaping, messages truncated at ~250 chars) and a step-summary
  markdown document (score + band, text score bar, dimensions table,
  collapsible per-severity `<details>` with `Fix:` lines, honesty
  notice for `partial`/`score:null` reports). `--stdout` forces
  stdout; `--path-prefix <dir>` re-scopes paths for subdirectory
  scans. Exit `0` on success — the gate step decides; `10` missing
  file; `2` invalid JSON.
- **CI template v2** (`ci install`): the inline `SUMMARY_SCRIPT` step
  is replaced by `mjolnir summary mjolnir.json`; the gate script is
  unchanged. v1-generated workflows are still recognized on
  overwrite-refusal, so `ci install` upgrades stay frictionless. The
  dogfooded `.github/workflows/mjolnir.yml` and `ci.yml` self-scan use
  the same command.
- **PR comment redesign** (`pr-comment`): header
  `### 🔨 Mjölnir — Verification Trust` with score + band + verdict
  headline, dimensions mini-table, findings grouped in collapsible
  `<details>` (errors open, warnings/infos collapsed) with explicit
  `Fix:` lines and evidence tags, a "what to run next" footer with the
  pinned `npx mjolnir-qa@<ver>` commands, and the
  `✨ N pre-existing findings fixed in this PR` callout. Same
  idempotency marker; same markdown escaping.
- **Site**: new `site/reference/cli.md` (help, usage errors, summary,
  progress, `FORCE_COLOR`) in the Reference sidebar.

### Changed

- README output examples and all 22 translations: the `▚▞` header
  glyph in rendered-output samples is now `▚` (the design-system
  token). English README is canonical; translation sync dates unchanged
  (glyph-only diff, advisory parity script).
- Regenerated committed assets: `assets/readme/terminal-hero.svg`,
  `demo.svg` (`docs:hero`, `docs:demo`), and the forensics/selector
  samples (`docs:forensics-samples`).

### Removed

- The hand-rolled `╔══╗`/`▚▞`/`🔨` per-command header styles and the
  `╞══╡` ASCII tables they wrapped (replaced by the shared `ui.ts`
  primitives; no CLI surface change).

### Fixed — review hardening (post-implementation audit)

- **`ci install` v1 recognition actually works now:** the v1 inline
  summary script is matched in its INDENTED form (`indentBlock(…, 10)`)
  — the raw unindented needle never appeared in a real v1 workflow, so
  the first cut of the recognition would have refused every genuine v1
  file despite the "frictionless upgrade" promise. Spec reconstructs
  the embedded form from the real v1 output and pins that
  hand-customized files are still refused.
- **Advisory template stays green on a crashed scan:** the generated
  "Annotations + Job Summary" step is now `continue-on-error: true` —
  a crashed scan leaves `mjolnir.json` empty and `summary` exits 2,
  which must not turn the advisory job red (v1's inline script never
  did). The gate step still owns the verdict.
- **Step summary escapes hostile finding metadata:** `ruleId`, `file`,
  `message` and `fix` are markdown-escaped before `$GITHUB_STEP_SUMMARY`
  (GitHub renders HTML there) — a hostile report can no longer break
  out of the `<details>` structure. Annotations additionally sanitize
  `file`/`ruleId`/`message` through the same `sanitizeData` layer the
  terminal uses (OSC/C0 bytes), closing the gap its own docs assumed.
- **Progress line sanitizes the detail path** through `sanitizeData` —
  a filename with ANSI/OSC bytes can no longer hijack the terminal.
- **PR comment overflow counts are honest:** the "...and N more
  overall" line now subtracts the actually rendered count
  (Σ min(group, 25)) instead of a flat 25 — no more phantom hidden
  findings, and per-group overflow lines name their group
  ("...and 5 more errors").
- **Usage-error contract completed:** the 8 scan-backed subcommands
  (badge, debt, fix, impact, baseline, diff, pr-comment, handover) no
  longer print the full usage wall after the friendly stderr error;
  `mjolnir summary` rejects unknown flags with the shared
  did-you-mean machinery (exit 10) instead of silently swallowing a
  typo'd `--stdout`; `mjolnir ci --help` / `mjolnir help ci install` /
  `mjolnir ci install --help` now reach the `ci install` help page
  (two-word verb lookup).
- **Dead surface removed:** `theme.severityTag` (byte-identical twin of
  `ui.severityIcon`, test-only) deleted with the two plugin specs
  re-pointed; the new-module exports nothing without a caller
  (`severityGlyph`, `wrapFor`, `centerIn` dropped; `keyValue` and
  `bullet` remain — the plan's primitive list mandates them).

## [0.5.2] — 2026-09-05

### npm 12 pack-shape repair of the release pipeline

### Fixed

- The fresh-install gate (`tests/integrations/registry-install.spec.ts`),
  `tests/integrations/package-smoke.spec.ts`, and
  `tests/e2e/journey-1-first-run.spec.ts` parse `npm pack --json` through
  a shared shape-tolerant helper
  (`tests/helpers/npm-pack-json.ts`): npm 12 changed the output from an
  array to an object keyed by package name, which stopped the v0.5.1
  publish at the gate — tag cut, nothing shipped, by design.
- `release.yml` upgrades to `npm@11` (the proven line) instead of
  `npm@latest`: toolchain majors must be deliberate, verified changes,
  never implicit drift on the publish path.
- `registry-install.spec.ts` cleanup no longer cascades a second error
  when `beforeAll` fails early (the cascade buried the real diagnosis).

## [0.5.1] — 2026-09-05

### Verification Trust Evolution, Phase 8 — Local Extensibility (plan §18)

### Added — folder-based external rules, zero network

### Added — folder-based external rules, zero network

- **`mjolnir-rules/` contract** (`src/plugins/local-rules.ts`): a
  workspace directory loaded from the scan target root alongside npm
  plugins. Two file kinds: **JSON rule manifests** (declarative regex
  patterns — NO code executed; id/title/severity/category/appliesTo/
  patterns/message/why/fix/languages/frameworks) and **JS modules**
  (`rules: QADoctorRule[]`, full-Node trust, same posture as npm
  plugins). Missing directory → no-op.
- **Same trust contract as core/npm plugins:** reserved core prefixes
  rejected (case-insensitive spoofing guard); bad metadata/regexes
  degrade to warning entries (QA-PLUGIN-000), never a crash; external
  rules carry the full trust metadata shape and are born
  quarantine/unmeasured. **Core-tier clamp**: an external rule
  declaring `tier: "core"` is clamped to `extended` with a load
  warning — core requires a measured FP rate from the committed corpus
  sidecar, which external rules cannot have.
- **Tier caps obeyed, filter unified:** the quarantine exclusion filter
  in `buildUniversalRules` now consults the tier map that includes
  plugin/external tiers — plugin-declared quarantine rules were
  previously excluded only when the core registry knew the ID; the
  unified filter excludes them from non-strict scans exactly like core
  (post-scan cap still observable under `--strict`; the cli-scan-arms
  test updated to cover both sides).
- **Drift-checked:** `mjolnir explain --list --md --external` renders the
  catalog from the LOADED external rules with a provenance column
  (`core`/`external`) — an on-disk edit changes the next render; the
  catalog can never drift from what actually ships.
  `scripts/generate-capability-matrix.ts --external <root>` writes a
  workspace-local `MJOLNIR-RULES-MATRIX.md` with provenance "external"
  (unmeasured by definition — outside the corpus sidecar). The
  committed matrix stays core-registry-only and byte-stable.
- **S-8 disclosure:** external rule surfaces appear in the scan's
  plugin disclosure block.

Registry/marketplace explicitly deferred (plan §18).

### Verification Trust Evolution, Phase 7 — Agentic QA Trust (plan §17)

### Added — Agentic Trust Profile (plan §17.2, §17.4)

- **Provenance detection** (`src/engine/provenance.ts`): per-file static
  markers, EXTRACTED not invented — the industry-wide generated-file
  header convention ("auto-generated"/"generated by"/"do not edit") and
  the Playwright codegen recorder fingerprint (its default test title
  is exactly `'test'`). Honest boundary, documented in the module:
  healed and MCP-edited files WITHOUT markers are statically
  indistinguishable from hand-written ones — the classifier returns
  `unmarked`, never a guess.
- **`ScanResult.agenticProfile`** (additive): share of test files with
  detected generative markers + the findings split across those
  surfaces, with the boundary in the profile's own `note`. Surfaced in
  the terminal report only when something was actually detected
  (silence over noise); JSON carries it on every scan.
- **§17.4 — same evidence standard regardless of author:** the profile
  is metadata only. It never changes scoring, evidence levels, tier
  caps, or rule behavior. AI tests earn trust through exactly the same
  evidence as human ones.

### Added — locator.normalize() framework-standards rules (plan §17.3)

Two new frozen `QA-PW-*` rules, BORN QUARANTINE (§17 exit gate:
measured before leaving provisional), fixtures both directions:

- **QA-PW-146 — CSS/XPath string selector instead of a normalized
  locator** (warning, heuristic): `css=`/`xpath=` engine prefixes, bare
  id/class/attr CSS, and `nth-child` chains inside
  `.locator()`/`waitForSelector()`/`page.$` — aligned with Playwright's
  locator standard. Fills the TS gap (the brittle-selectors family
  covers Java/C#/Python; the retired QA-PW-112 was style police, this
  is markup-coupling detection). Not auto-fixable: the normalized
  getter depends on app semantics only a human knows — the fix field
  carries the concrete `getByRole`/`getByTestId`/`getByText`
  suggestion. Both fixtures + all three cached OSS corpora (0 fires —
  real suites use normalized locators) recorded.
- **QA-PW-147 — codegen default test title** (info, observation): a
  committed spec still titled `'test'`/`'test N'` is an unreviewed
  recording artifact — the §17.1 provenance marker as a finding.

Registry: 99 rules (73 measured). Docs pages + capability matrix
regenerated.

### Verification Trust Evolution, Phase 6 — Runtime Evidence (plan §16)

### Added — runtime corroboration + the honest L0–L5 trust ladder

Built on the existing forensics ingestion (no greenfield):
`packages/playwright-reporter` → `mjolnir.report.json` → the
`ForensicsReport` pipeline that `forensics`/`triage`/`pw-report`
already consume. Findings gain two additive, optional fields
(schemaVersion 1 unchanged):

- **`runtimeCorroboration`** — what a real run report vouches for:
  `level: "file" | "test" | "defect"`, the report source, executed-test
  count, and (test/defect level) the containing test's full verdict
  (attempts, final status, passed-on-retry, ever-failed, skipped).
- **`trustLevel`** — the L0–L5 ladder, derived deterministically:
  L0 (E0 observation) / L1 (E1 heuristic) / L2 (E2 deterministic) are
  the static-only ceiling; L3 (file executed) / L4 (the containing
  test executed — matched via the report's spec declaration lines) /
  L5 (the run verdict directly corroborates the defect class — a
  FLAKY-RISK finding whose test actually flaked, retried, or timed
  out) exist ONLY when runtime corroboration is present. The
  no-static-only-L4/L5 invariant is structurally enforced in
  `deriveTrustLevel` and locked by tests across the full
  findingType×confidence×evidenceLevel matrix.

- **Matching is honest by construction:** Playwright JSON reports now
  carry the spec declaration line (additive `line` on
  `TestRecord`/`TestVerdict`); a finding is tied to a specific test
  only when the report's declaration spans place it there — otherwise
  corroboration stays at file level, and files the report never ran
  get NOTHING (no fabricated evidence). JUnit XML has no locations:
  file-level only.
- **Scan wiring:** `runScan` auto-discovers a run report next to the
  scan target (`mjolnir.report.json` — the reporter package's default
  output — or a `test-results/` directory), runs the existing
  forensics ingestion, and stamps findings. No report → findings
  unchanged (honest "runtime evidence: not available"). A hostile
  report degrades the scan, never fails it.
- **Reporters split verified vs assumed (plan §16):** the terminal
  footer reports `Runtime evidence: N/M findings corroborated by a
real run report (trust L3–L5)` or the explicit not-available line;
  finding cards show `trust L4 · runtime: test executed`. SARIF
  results carry `trustLevel` + `runtimeCorroboration` in properties.

### Verification Trust Evolution, Phase 5 — Framework Expansion (plan §15, D7 closed)

### Added — FrameworkDimension enforced (plan §15.1, defect D7 closed)

- **Real dependency parsing per build system:** `package.json` (JSON),
  `pom.xml` (Maven `<dependency>` blocks), `build.gradle(.kts)`
  (dependency-statement coordinates), and EVERY `.csproj` at the root
  (`<PackageReference Include="…">` attributes — the old "first
  `.csproj` only" defect is closed), plus requirements*.txt for Python.
- **Per-file framework tags** (`ParsedFile.frameworkTags`): derived from
  the file's OWN imports/usings/import-lines — `@playwright/test` →
  "playwright", `cypress` → "cypress", `org.junit.*` → "junit",
  `NUnit` → "nunit", `import selenium` → "selenium", etc. AST-truth for
  Java/C#/TS; import-line scan for Python (no AST seam by design).
- **`rule.frameworks ∩ file.frameworkTags` filtering** with
  open-when-unknown: a rule that declares `frameworks` runs on a file
  only when the file's tags intersect it; files without tags and rules
  without `frameworks` are always analyzed — the dimension narrows, it
  never silently drops evidence. Shared in
  `src/engine/adapter.ts` (`frameworkFilterApplies`), enforced in the
  TS/Java/C#/Python adapters' `runRules`.
- **Generalized config-gating (§15.2):** `configRule: true` +
  `configFiles: string[]` (regex sources) replaces the hard-coded
  `playwright.config.*` regex that lived in the TS adapter and
  duplicated inside all five config rules (QA-PW-121/122/141/143/144
  migrated). Discovery knows the config filename conventions
  (`cypress.config.*` added alongside `playwright.config.*`).

### Added — Cypress integration (first framework per the §15 order)

Three rules in the new frozen `QA-CYP-*` namespace, BORN QUARANTINE
(§15.5) with fixtures both directions (`tests/fixtures/QA-CYP-*/`):

- **QA-CYP-001 — fixed `cy.wait(n)`** (warning): numeric-literal
  `cy.wait(3000)` — the Cypress hard-sleep idiom. Alias waits
  (`cy.wait('@route')`) are the legitimate form and never fire.
  File gate: framework tag, `.cy.*` extension, or `cy.*` API usage in
  the file (real Cypress suites rarely import cypress — surfaced by the
  first measurement against cypress-example-kitchensink). MEASURED on
  the kitchensink corpus: 12 TP (viewport-switch fixed waits) / 3 FP
  (doc-example artifacts, the suite intentionally demonstrates the API
  — QA-PY-003 precedent) → 20% FP at n=15, 95% Wilson
  [7.1%, 45.2%]; tier extended (band-consistent), corpus
  cypress-io-kitchensink added with baselines.
  cypress-realworld-app scanned as precision evidence: 0 fires (the
  suite uses alias waits exclusively), baseline recorded.
- **QA-CYP-002 — focused test (`.only`)** (error): committed
  `it.only`/`describe.only`/`context.only` de-schedules the rest of the
  suite. Quarantine, unmeasured (fixtures only) pending a measured
  Cypress corpus with the pattern.
- **QA-CYP-003 — `chromeWebSecurity: false`** (error): deterministic
  config defect via the generalized `configFiles` gate. Quarantine,
  unmeasured pending corpus.

### Added — Selenium cross-language reach (plan §15.3, JV/CS/Py reuse)

Three rules in the new frozen `QA-SE-*` namespace sharing one sequence
detector (hard sleep followed by an element lookup within 3 lines —
the sleep standing in for an explicit `WebDriverWait`), all BORN
QUARANTINE:

- **QA-SE-001** (Java): `Thread.sleep` → `findElement`/`click`/
  `sendKeys` within 3 lines.
- **QA-SE-002** (C#): `Thread.Sleep`/`Task.Delay` →
  `FindElement`/`Click`/`SendKeys` within 3 lines. MEASURED on the
  SeleniumHQ/selenium .NET webdriver suite: 3 TP + 1 FP (a
  sleep-inside-polling-loop cadence — loop-body containment is the
  documented residue) → 25% FP at n=4; below the n≥10 measurement bar,
  stays quarantine/unmeasured with verdicts recorded
  (tests/corpus/verdicts/SeleniumHQ-selenium.jsonl, baseline added).
- **QA-SE-003** (Python): `time.sleep` → `find_element`/`click`/
  `send_keys` within 3 lines.

### Registry

- 97 rules (was 91); registry/doctor/scaffolder ID validators widened
  for the new frozen namespaces (QA-CYP-_, QA-SE-_, QA-WDIO-_,
  QA-PPTR-_, QA-APM-* reserved). Measured coverage 73/97 (75%); the
  §20.1(a) unmeasured-count ratchet now tracks the PRE-EXISTING set
  mechanically (`introduced` ≤ 0.5.0) — new waves onboard under §20.1(b)
  - the per-framework exit gate, not the global count freeze.
- Defect ledger: **D7 closed** (target phase 5). Capability matrix
  regenerated (97 rules); docs pages regenerated; corpus baselines
  added for the three Phase 5 measurement repos.

### Verification Trust Evolution, Phase 4 — Common QA Semantic Model (plan §14, behavior-neutral)

### Added — `src/engine/qa-model.ts`: the normalized QA concept IR (extract-only, no scan wiring)

The plan-§14 vocabulary — Test, TestBoundary, Setup/Teardown, Fixture,
Action, Locator, Wait, Assertion, Mock, NetworkInteraction, Retry,
Navigation, Interaction, Lifecycle — now exists as a typed model
(`QaNode`/`QaSemanticModel`, all 14 concepts in `EXTRACTOR_COVERAGE`)
with per-language extractors over the ALREADY-existing parse stage:
ts-morph for TS/JS (tests/hooks via the scorer's it/test vocabulary,
calls via the measured rule vocabularies of qa-pw-002/004/005/101–145,
qa-test-001/003/004/006, jest/vi mock+retry), tree-sitter for Java/C#
(test boundaries REUSE `javaTestMethods`/`csharpTestMethods` verbatim —
the model cannot drift from the rules' scoping; call/hook/retry
vocabularies copied from the QA-JV-_/QA-CS-_ rules), regex boundaries
for Python (def test_, @pytest.fixture, time.sleep, assert).

- **Extracted, not invented:** every classification table cites the
  rule whose measured vocabulary it copies (headers in qa-model.ts);
  the shared `isHelperIdiom` helper moved to `jv-cs-ast.ts` so the
  QA-CS-103 rule and the model share ONE implementation.
- **Adoption is additive:** NOTHING in the scan pipeline imports the
  module — BEHAVIOR-NEUTRAL by construction, golden/corpus locks
  untouched (proven: locks byte-identical with the model present).
- **Coverage is honest:** `EXTRACTOR_COVERAGE` documents per-language
  gaps (e.g. Java has no fixture/interaction/lifecycle extractor;
  Python extracts only test/fixture/assertion/wait) — visible gaps,
  never silent claims (No False Proof).
- **Equivalence proven:** `tests/qa-model.spec.ts` re-expresses the
  QA-JV-103 / QA-CS-103 / QA-CS-102 oracles over the model
  (`testVerifies`, ancestor-chain containment via the
  `firstAncestorCallNamed` generalization now carried as
  `node.ancestors`) and asserts FINDING-IDENTICAL results against the
  rules on the committed fixture corpora + synthetic edge shapes —
  the model can carry these rules without changing any output.
  Awaitedness (qa-pw-002's consumption oracle) rides on TS nodes as
  `node.awaited`.

### Verification Trust Evolution, Phase 3 — Java/C# semantic upgrade (plan §13)

### Changed — three JV/CS rules migrated to L2 tree-sitter analysis (EVIDENCE-BACKED, detectorRevision 2)

The Phase 0.5 parse stage's tree-sitter trees (`parseJavaAst`/`parseCSharpAst`,
delivered via `ParsedFile.ast`) are now consumed by rules: a new L2
structural-analysis layer (`src/engine/jv-cs-ast.ts`) provides test-method
scoping by annotation/attribute, invocation structure, and call/argument
containment; the rule contract gains an optional `astQuery` hook whose
regex path is a MANDATORY fallback (no AST ⇒ regex, never a second
detector, plan §13.2). No type/symbol semantics are promised for JV/CS
(no Roslyn, no classpath) — semantic depth is L2 per plan §13.4.

- **QA-JV-103 (test without assertions), 50% FP (n=20) → 25.9% FP
  (n=58), quarantine → extended.** Test boundaries now come from real
  `method_declaration` nodes (any `@Test`/`@org.junit.Test`, argumented
  TestNG forms included). The assertion oracle adds the two measured
  rev-1 FP classes: Playwright's THROWING waits (`waitFor*` except
  `waitForTimeout` — they throw on timeout, so the wait IS the
  verification; 6 rev-1 FPs) and `verify*/check*/assert*` helper
  calls (4 rev-1 FPs). Remaining FP class, documented as the L2
  boundary: assertions behind arbitrarily-named helpers (keycloak's
  `testValidationValid`, playwright-java's `testEnterKey`,
  appsmith's `check`).
- **QA-CS-103 (test without assertions), 95% FP (n=20) → 0% FP (n=9),
  quarantine → core.** The rev-1 oracle missed the whole Shouldly
  extension family — 17 of the 19 FPs were `ShouldBeOfType<...>(
...).Message.ShouldBe(...)`-style assertion-rich tests (spectre-console,
  310 count-lock fires → 0). The rev-2 oracle counts Shouldly chains,
  `Assert`/`Should` receivers, the Verify snapshot framework,
  PascalCase `verify*/check*/assert*` helpers (Humanizer's
  `VerifyAnalyzerAsync` — the lowercase-only form was a Java camelCase
  inheritance bug), C# throwing waits (`WaitFor*Async` except
  `WaitForTimeoutAsync`), and conditional `throw new
*Assertion*Exception` (playwright-dotnet's ConventionTests). Grammar
  error-node guard: a truncated parse never produces a finding.
- **QA-CS-102 (`Thread.Sleep`/`Task.Delay` hard sleep), 65% FP (n=20) →
  8.3% FP (n=24), quarantine → core.** Tree-sitter invocation scoping
  excludes the measured environment-simulation classes: delays inside
  route/expose/server delegates (`Route*Async`, `SetRoute`,
  `ExposeFunction*`, 10 rev-1 FPs + delta), deliberate infinite/negative
  blocks (`Task.Delay(-1)`, `int.MaxValue`, `Timeout.Infinite*`),
  `Task.WhenAny` timeout races, and runner payload fixtures
  (`RunAndWaitFor{Request,RequestFinished,Response}Async(() => Task.Delay…)`,
  `UnrouteAllAsync` timing-window sleeps stay flagged — their delay
  creates the timing window the assertion measures). Documented
  trade-off: one rev-1 TP (a sub-second artificial-timing delay inside a
  route delegate) is no longer flagged; the structural boundary cannot
  read that intent.

All three: verdict corpus reconciled per the §07 loop (41 superseded rows
removed, 49 fresh rows adjudicated from source with per-row notes, class-B
positive fixtures for QA-CS-102/QA-JV-103 and class-C negative fixtures
for all three), count-lock baselines refreshed (microsoft-playwright-java
QA-JV-103 97→43, microsoft-playwright-dotnet QA-CS-102 52→21,
spectre-console QA-CS-103 310→0, Humanizer 34→2; keycloak +602 is a
recall gain — the rev-1 regex missed `void x() throws Exception`
signatures, tree-sitter scoping does not), and
`detector-revisions.json` bumped (sidecar entries stay; measurements
stamped rev 2). QA-JV-102 stays LEXICAL rev 1 — no migration for
symmetry (plan §12.4).

### Verification Trust Evolution, Phase 2 — quarantine-cluster triage (plan §12.2)

### Deprecated — 21 rules retired per docs/RULE-LIFECYCLE.md (measured 100% FP, premise wrong)

Every rule below measured 100% FP (zero TPs at n ≥ 10, `docs/FP-AUDIT.md`)
on real-world code. Per the lifecycle policy the severity is downgraded to
`info` (non-blocking everywhere) and `falsePositiveRisk` is set to `high`;
the code and fixtures stay in the repo, the frozen ID is never reused, and
any salvageable detection idea ships under a NEW rule ID. If you gated CI
on these findings, they no longer block at `info` severity; add an explicit
`severityOverrides` entry in `mjolnir.config.json` to restore blocking.

- **QA-PW-005** (business logic in `page.evaluate()`): in test files,
  branching inside evaluate is the only way to reach browser state — every
  measured use was browser-only test instrumentation or the API under test,
  never leaked app logic. No successor.
- **QA-PW-103** (missing timeout on navigation): bare `goto()` to the app
  under test is the universal navigation idiom; per-call budgets are
  config territory. No successor.
- **QA-PW-105** (`expect.poll` without timeout): the default poll timeout
  is a hard bound that raises — the claimed masking harm cannot occur.
  No successor.
- **QA-PW-107** (`toBeVisible` on toast/banner/modal): presence +
  auto-retry semantics is what suites assert; viewport visibility is a
  different question the suites are not asking. No successor.
- **QA-PW-108** (`toHaveText` coupling): asserting self-owned markup's
  exact text is a legitimate strong assertion; "whose markup is this" is
  not statically decidable. No successor.
- **QA-PW-112** (testid naming convention): hardcoding kebab-case as _the_
  convention is the defect — conventions are repo-local. Successor idea
  (mixed-conventions-within-one-repo check) requires a NEW ID.
- **QA-PW-114** (legacy element handles): the auto-wait harm needs a
  timing window; every measured use was immediate reads or deliberate
  existence checks. No successor.
- **QA-PW-118** (`networkidle` waits): the flake source is environmental
  background traffic, absent by construction where the rule fired; harm is
  not code-detectable. No successor.
- **QA-PW-119** (module-level state order dependence, was `error`): FPs
  scatter across ≥5 legitimate infrastructure idioms (per-test teardown
  harnesses, counters, vi.hoisted fixtures, memoized shared infra) — an
  error-severity rule at 0 TP / 24 is actively misleading. Successor idea
  (cross-test write→read dataflow analysis) requires a NEW ID.
- **QA-PW-120** (missing environment guard): file-level keyword
  co-occurrence does not imply engine dependence; even the corpus's e2e
  specs are engine-agnostic. No successor.
- **QA-PW-145** (no a11y assertions): absence of optional coverage is not
  a defect finding; the heuristic fires on every UI spec by construction.
  Successor idea (a11y-coverage reporting) requires a NEW ID.
- **QA-TQUAL-001** (mock-only verification, 0 TP / 26): spies observe the
  real unit's output — the mock call IS the observable contract;
  stand-in vs observer is not statically decidable. No successor.
- **QA-PY-006** (empty test body `pass`): 18/20 FPs were pytester
  test-data scripts; genuinely collected empty tests don't occur in real
  code. No successor.
- **QA-PY-008** (mock-only verification): boundary mocking and real-output
  spies are contract testing, not mock theater. No successor.
- **QA-PY-010** (random/time without freeze): wall-clock reads are the
  measured subject in timing/throttle tests; freezing would defeat them.
  No successor.
- **QA-JV-108 / QA-CS-108** (hardcoded environment URL): FPs split across
  HAR-replay fixtures, route-mocked origins, and proxy-failure tests — no
  mechanically discriminable shape (the M-06 header concedes a fake-TLD
  lookahead fixes zero measured FPs). No successor.
- **QA-JV-110 / QA-CS-110** (no a11y assertions): same absence-heuristic
  premise failure as QA-PW-145. Successor idea requires a NEW ID.
- **QA-JV-111 / QA-CS-111** (blanket route mock): route-API self-tests and
  fixture setup; no provable exclusion, and framework gating cannot help.
  Revival on an application-repo corpus would need a NEW ID.

### Changed — Phase 2 retunes (EVIDENCE-BACKED, detectorRevision 2 per plan §07)

Each retune targets the single fixable root cause its measured FP cohort
shares (full evidence table: docs/RULE-LIFECYCLE.md "Phase 2
quarantine-cluster triage"). Detection-logic changes bump the rules'
`detectorRevision` to 2, invalidating the revision-1 measurements (stale →
provisional → re-measure, plan §07); must-not-fire fixtures now encode the
measured FP shapes so the retunes are regression-locked in both directions.
Tier stays quarantine until re-measurement says otherwise.

- **QA-PW-102** (load-wait instead of assertion): the wait now fires only
  when it is the TERMINAL wait (no `expect`/assert/`expect.poll` follows)
  and is skipped when consumed by `expect(...).rejects` — the "instead of
  an assertion" premise, now actually checked. Clears all 20 measured FPs
  (vite HMR synchronization waits); keeps the must-fire no-assertion shape.
- **QA-ENV-001** (environment coupling): the fixed-port sub-pattern no
  longer matches loopback endpoints (`localhost`/`127.x`) — they are the
  suite's own fixture containers (Azurite / DynamoDB Local / Mongo), the
  entire measured FP cohort. Dotted hostnames and non-loopback IPv4
  literals with ports still fire; OS-path, locale, and local-time-getter
  sub-patterns are unchanged.
- **QA-PY-003** (no-assertion test): the verification vocabulary gains
  `pytest.warns` / `pytest.deprecated_call` / `pytest.fail`, and a
  `test_*` function referenced by name elsewhere in its file (pytester-
  style test data) is skipped — the collected assertion lives in the
  parent test.
- **QA-PY-004** (bare truthiness assert): boolean-predicate calls are
  skipped — `assert isinstance(x, T)` type guards and
  `assert s.startswith(...)`-style content predicates are real checks
  (the measured FP clusters). Bare identifier/attribute asserts still
  fire. This rule was measured at 45% FP (n=20), not 100%; with the
  clusters removed the re-measurement is expected to approach the
  extended band (≤30%), pending delta classification.
- **QA-PY-007** (raises without match): `pytest.raises(X) as exc_info`
  followed by an assert/expect on `exc_info.value` is skipped — the
  message IS verified without `match=` (8 of 13 measured FPs). The
  genuinely vague raises blocks still fire; remaining FP residue
  (single-possible-exception blocks) is not statically decidable.
- **QA-PY-105** (Playwright-Python test without assertions): a called
  helper whose name asserts (`assert_*`/`expect_*`/`verify_*`/`check_*`)
  or waits (`wait_for_*`) counts as verification — assertions delegated
  to imported helpers, the entire measured FP cohort (streamlit e2e).
- **QA-JV-106 / QA-CS-106 / QA-PY-104** (brittle selectors): no pattern
  change — the measured 100% FP rows predate Bug Map M-06's removal of
  the querySelector/QuerySelectorAsync/query_selector patterns, so the
  measurement described a detector that no longer ships. The §07 fix is
  the detectorRevision bump to 2 (stale → provisional → re-measure);
  the surviving xpath=/nth-child/absolute-path patterns stay
  quarantine-tier until re-measured.

### Changed — §07 loop closed: rev-3 delta re-measurement (corpus rescans + verdict reconciliation)

The revision-2/3 detectors were re-run over the corpus repos that
produced the retuned rules' original verdicts, and the committed verdict
corpus was reconciled to the current detectors (the §07 loop the
capability matrix calls "re-measure"):

- **Delta method:** every committed row whose finding no longer fires
  was removed (superseded — it described a pre-retune detector); every
  NEW finding was adjudicated from source context per
  `tests/corpus/verdicts/README.md` criteria, with a quota sample of 20
  per rule on the largest surfaces (QA-PY-004/007) and full coverage on
  the small ones. Net: 157 rows retired, 71 adjudicated rows appended,
  1423 → 1337 classified verdicts, measured coverage 78 → **72/91**
  (the six rules whose remaining classified counts fell below n=10 —
  QA-PW-102, QA-PY-104, QA-PY-105, QA-ENV-001, QA-JV-106, QA-CS-106 —
  are now unmeasured at their current revisions; their sidecar entries
  were removed accordingly and they stay quarantine/extended-tier
  pending re-measurement).
- **Re-measured envelopes (rev 3):** QA-PY-003 82% FP (n=17; remaining
  FPs are pytest doc examples and pytester collection fixtures —
  accepted residue), QA-PY-004 76% (n=21; remaining FPs are
  pytest's own predicate-call idiom families: fnmatch/samefile/
  isimportable membership checks and deliberate `assert False`
  fail-marker DATA), QA-PY-007 79% (n=34; remaining FPs are
  single-possible-exception API-error contracts where the raised type
  IS the assertion — not statically decidable). All three stay
  quarantine-tier with their detectorRevision 3 stamped in the sidecar
  and FP-AUDIT; their accepted-residue FP causes are documented in
  docs/RULE-LIFECYCLE.md's triage table.
- **QA-PW-102 / QA-PY-105: fully cleared** — 0 findings on the
  previously-20/20-FP corpus slices at revision 2.
- **QA-ENV-001 (rev 3):** the wave-2 delta (20/20 FP on the rev-2
  detector) showed no host shape is statically decidable — the
  fixed-port sub-pattern is dropped entirely; OS-path, locale, and
  local-time-getter sub-patterns stay (their remaining 6 findings on
  vite are path-literal test DATA, adjudicated FP and recorded).
- **§07 comparability guard:** the FP regression governor
  (`checkFpRegression`) no longer compares measurements across
  detectorRevision boundaries — a revision mismatch means the old rate
  does not describe the current detector, so it is neither flagged nor
  blessed.

### Verification Trust Evolution, Phase 2 — detectionStrategy enum (D6 closed, scan-behavior-neutral)

### Changed — D6 enum migration (plan §12.1; metadata-only)

- **`detectionStrategy` is now the enforced §09.6 enum** (`LEXICAL | AST |
SEMANTIC | FRAMEWORK | RUNTIME`) instead of free text: `src/rules/rule.ts`
  types `RuleMeta.detectionStrategy` as the union, and a registry ratchet
  (tests/rules.registry.spec.ts) fails CI when any rule omits it or carries
  a non-enum value — the "free text" drift class cannot reintroduce itself.
  All 91 registry rules were migrated in place. This is a metadata migration,
  not a detection change: no `run()` body, pattern, or scoping was touched,
  so scan findings, golden fixtures, and corpus baselines are byte-identical
  (the Phase 0 classification of this work as BEHAVIOR-NEUTRAL for scan
  findings, plan §06). Per §11.3 the enum conversion is metadata naming only
  and does NOT bump any `detectorRevision` — every measurement stays valid.
- **Legacy nuance preserved, not deleted:** the richer free-text
  declarations ("regex pattern + inside-string oracle", "parsed YAML +
  test-command gate", …) moved verbatim into a new optional
  `detectionNotes` field rendered alongside the enum in the rule docs
  pages. The capability matrix now renders the declared enum directly in a
  single "Detection strategy (enum)" column (the provisional
  "Enum (proposed)" guess column is gone — the declared value IS the
  enum); `UNCLASSIFIED` renders only for an undeclared value.
- Mapping applied: regex-over-text/absence-sweep detectors → `LEXICAL`
  (incl. QA-TQUAL-002's AST-stripped text pattern, which is a text pass
  over code-only text); ts-morph node-walk detectors (QA-PW-002,
  QA-PW-005) → `AST`; GitHub-Actions workflow-structure detectors
  (QA-CI-001/009/010) → `FRAMEWORK`. `SEMANTIC` and `RUNTIME` remain
  reserved (no rule ships either yet).

### Verification Trust Evolution, Phase 1 exit — dedicated corpora + wave-5 measurement (plan §11.5/§08)

### Added — dedicated corpora (§11.5) and the wave-5 measurement

- **CORPUS 19 → 34 repos** (`tests/corpus/audit.ts`): 14 new real-world
  repos chosen by evaluating each candidate's unmeasured-rule fire count
  at HEAD before committing (`vitest-dev-vitest`, `streamlit-streamlit`,
  `apache-airflow`, `iluwatar-java-design-patterns`,
  `spectreconsole-spectre-console`, `Humanizr-Humanizer`,
  `cypress-realworld-app`, `keycloak-keycloak`, `appsmithorg-appsmith`,
  `getsentry-sentry`, `github-docs`, `vercel-next-js`, `hashicorp-vault`,
  `nocodb-nocodb`). This is the plan's dedicated-Corpora requirement for
  §11.5: CI-workflow density for the starved QA-CI-* rules and JV/CS
  application repos so the QA-JV/QA-CS rules measure on consumer code,
  not just the Playwright bindings themselves (D5). Candidates whose scan
  truncated against the budget (`n8n`, `posthog`, `vscode`) were rejected —
  a partial scan can never be count-locked.
- **Committed class-B/C fixture corpora (§08):**
  `tests/corpus/positive-fixtures/` (realistic anti-pattern exhibits that
  MUST fire — class-B recall evidence, every fire classifies TP) and
  `tests/corpus/negative-fixtures/` (realistic legitimate code that must
  NOT fire — class-C precision evidence, any fire is a recorded FP).
  These give rules whose patterns are rare in the wild a measurement-grade
  verdict surface, versioned with the verdicts that classify them via
  `local:` corpus URLs. Excluded from self-scan, vitest, eslint, prettier
  and the test tsconfig — they are DATA.
- **`corpus-sample.ts --unmeasured-only`:** the verdict-harvesting loop
  can sample only rules without a valid measurement, so classification
  effort goes to the exit gate instead of re-sampling measured rules.
- **`audit.ts --only=<name>,<name>`:** re-check or re-record a corpus
  subset (used to re-verify a repo after a transient truncation without
  rescanning everything); the completeness threshold now applies to the
  filtered set. Clones use `git -c core.longpaths=true` (scoped, not a
  global config change) and the per-repo scan budget is 60s → 120s; the
  audit job gets `NODE_OPTIONS=--max-old-space-size=8192` (sentry's
  repo-scale parse OOMs the default heap) and a 60-minute timeout.
- **Measured coverage 43 → 78 of 91** (1423 classified verdicts, 0 blank,
  0 UNSURE): 35 rules newly measured at n ≥ 10 — QA-TEST-001, QA-TEST-006,
  QA-TEST-010, QA-TQUAL-002, QA-TQUAL-009, QA-TQUAL-011, QA-CI-001,
  QA-CI-002, QA-CI-005, QA-CI-008, QA-PW-003, QA-PW-004, QA-PW-104,
  QA-PW-113, QA-PW-115, QA-PW-117, QA-PW-121, QA-PW-123, QA-PW-140,
  QA-PW-141, QA-PW-142, QA-PW-144, QA-PY-001, QA-PY-009, QA-PY-011,
  QA-PY-012, QA-PY-103, QA-PY-105, QA-JV-101, QA-JV-102, QA-JV-109,
  QA-CS-103, QA-CS-107 (plus the four previously counted). **Phase 1
  exit gate MET: unmeasured 48 → 13 (≤ 20).**
- **Explicit tier declarations for all 35 newly measured rules, set from
  the measured FP band (§11.2: ≤10% core, ≤30% extended, >30%
  quarantine):** core — QA-PW-003, QA-PW-104, QA-PW-113, QA-PW-117,
  QA-PW-121, QA-PW-140, QA-PY-001, QA-PY-009, QA-PY-011, QA-PY-103,
  QA-JV-101, QA-JV-109; extended — QA-TQUAL-011, QA-CI-002, QA-CI-007,
  QA-PW-141, QA-PW-142, QA-PW-144; quarantine — QA-TEST-001, QA-TEST-006,
  QA-TEST-010, QA-TQUAL-002, QA-TQUAL-009, QA-PW-004, QA-PW-115,
  QA-PW-123, QA-PY-012, QA-PY-105, QA-CI-001, QA-CI-005, QA-CI-008,
  QA-CI-010, QA-CS-103. Every measured entry carries `detectorRevision`
  in the sidecar. **Evidence-backed, not silent:** the quarantine
  demotions remove error-severity deductions from default scans, which is
  the tier policy working as designed — the failing specs were updated
  with their reasoning inline (gate tests re-anchored on QA-CI-009, the
  demo repo's CI grew real CI-009 exhibits, the demo/hero assets and
  `fix` command scan with `--strict`).
- **Recall-floor + corpus baselines:** 34 count-locked baselines recorded
  (non-partial scans only); the §20.6 recall floor extends to the
  expanded registry.

### Changed — scan-behavior fallout of the measured demotions (explained)

- `mjolnir fix` now scans with `--strict`: an auto-fixable rule that is
  measured into quarantine (QA-TEST-001's `.only` fix) must still be
  fixable — hiding it would make `fix` a no-op on its own target debt.
- The demo repo's CI workflow gained genuine CI-009 exhibits (piped and
  `;`-sequenced test commands) so the demo keeps demonstrating the
  NEEDS-WORK band now that its QA-TEST-001/QA-CI-001/PW-004 debt is
  quarantine-capped to info (non-deducting); `docs:demo`/`docs:hero` scan
  with `--strict` so the committed assets and their drift locks stay in
  sync with the precision-contract spec.

### Verification Trust Evolution, Phase 1 — measurement infrastructure

### Added — UNSURE adjudication gate + QA-PW-101 measured (plan §11.5)

- **UNSURE ceiling ratchet:** `npm run generate-fp-audit-table` now fails when the
  UNSURE backlog grows beyond the committed
  `tests/corpus/verdicts/unsure-ceiling.json` (the §11.5 mechanism: UNSURE
  never counts into `n` but always triggers review). The ceiling only moves
  DOWN via documented adjudication; upward movement requires an explicit
  `--update` whose diff names every rule that grew. Criteria live in
  `tests/corpus/verdicts/README.md`.
- **QA-PW-101 is measured (the D5 "parked on 20 UNSURE" defect resolved):**
  all 20 UNSURE verdicts were adjudicated by reading the cited sources at
  repo HEAD — **20 TP, 0 FP, n=20** (next-auth's session-sync sleeps before
  reading session state; sveltejs/kit's 100 ms request-observation windows
  that false-pass when a stray refresh starts after the window). The rule
  now declares `tier: "core"` (0% FP ≤ 10%, n ≥ 10, revision 1, recall
  floor satisfied: fires in 4 corpus baselines) — the measurement-dependent
  default would resolve it to core anyway, but measured rules declare
  their tier explicitly (the D3 Step 2 invariant).
- **QA-TQUAL-009 UNSURE row resolved → FP** (tanstack-query angular
  inject-query:529 — a deliberate `void` fire-and-forget whose assertions
  still fail the run via vitest's unhandled-rejection handling; the
  FALSE-GREEN diagnosis does not hold). n=2 — below the measurement bar,
  still unmeasured/PROVISIONAL.
- **Coverage:** 42/91 → **43/91** measured rules; UNSURE backlog 21 → **0**.

### Changed — D3 two-step tier fix (plan §11.2; scan-behavior-neutral)

- **Step 1 (explicit tiers):** every rule now declares its `tier`
  explicitly — the 42 formerly implicit-core rules received an explicit
  `tier: "core"` matching their effective tier. Byte-identical scan
  behavior (the declared value equaled the omitted-tier default);
  generated docs updated with an explained diff (the matrix's
  "explicit tier declarations" line moved 49/91 → 91/91).
- **Step 2 (measurement-dependent default):** the omitted-tier default is
  no longer unconditionally core. A rule that omits `tier` resolves via
  `effectiveTier` (new `src/rules/measurement.ts`): **core** only with a
  valid corpus measurement (n ≥ 10 at a matching `detectorRevision`),
  otherwise **extended**, displayed with the new **PROVISIONAL** status.
  PROVISIONAL is a display status (`tier extended/unmeasured`), not a
  tier value — no schema churn. Scan findings are byte-identical: the
  pipeline enforces only `quarantine` (severity/info + E0 caps, --strict
  filter), and every quarantine rule declares its tier explicitly;
  overlap-dedup consumes declared tiers only, and no demoted rule
  participates in an `overlapWith` tier comparison that could change a
  survivor set (all overlap groups are single-declarer/single-target).
- **The D3 demotion (38 rules drop from effective core to
  extended/PROVISIONAL):** QA-TEST-001, QA-TEST-006, QA-TEST-010,
  QA-TQUAL-002, QA-TQUAL-009, QA-TQUAL-011, QA-PW-003, QA-PW-004,
  QA-PW-101, QA-PW-104, QA-PW-113, QA-PW-115, QA-PW-116, QA-PW-117,
  QA-PW-121, QA-PW-123, QA-PW-124, QA-PW-125, QA-PW-140, QA-PW-141,
  QA-PW-142, QA-PW-144, QA-CI-001, QA-CI-002, QA-CI-005, QA-CI-007,
  QA-CI-008, QA-CI-009, QA-CI-010, QA-PY-001, QA-PY-009, QA-PY-011,
  QA-PY-012, QA-PY-101, QA-PY-103, QA-PY-105, QA-PY-106, QA-PY-107.
  The 4 measured implicit-core rules (QA-PW-002, QA-PY-002, QA-JV-105,
  QA-CS-101) keep core. Unmeasured-effective-core count: 38 → **0**.
  **Suite-invalidating callout (plan §11.2):** QA-TEST-001 (focused test
  committed, `suiteInvalidating: true`) is among the demoted rules — its
  findings still void the suite's pass claim and still gate CI at
  severity=error; only its tier/statistics status changed. QA-PY-001 is
  the suite-invalidating Python sibling (same class).
- **Registry ratchet (plan §20.3, enforced in code):** new
  `tests/registry-ratchet.spec.ts` fails CI on ANY unmeasured rule in
  effective core (`tier core ⇒ valid MEASURED_FP with matching
detectorRevision, FP ≤ 10%, n ≥ 10`), on any detectorRevision mismatch
  (§20.5: stale ⇒ provisional), and — recall floor (§20.6) — on a core
  rule that fires nowhere in the corpus baselines. §20.1 evidence-state
  monotonicity: the measured ratio may only improve without a
  machine-detectable `MEASUREMENT-EXCEPTION` marker in this CHANGELOG.
- **`mjolnir doctor`**: `MAX_UNMEASURED_CORE` lowered 40 → **0** (Phase 1
  exit gate: 0 unmeasured in effective core, now enforced); tier checks
  consume `effectiveTier` + stale-measurement logic. Display surfaces
  (`mjolnir explain`, `mjolnir explain --list`, generated rule docs, capability
  matrix) render the PROVISIONAL status honestly.

### Verification Trust Evolution, Phase 0 + Phase 1 prep

### Added — Rule Capability Matrix (Phase 0)

- **Capability Matrix v0** (`docs/RULE-CAPABILITY-MATRIX.md` +
  `docs/RULE-CAPABILITY-MATRIX.json`): generated per-rule inventory of all
  91 rules from the registry + `MEASURED_FP` + the verdict corpus —
  category, languages, frameworks, declared detection strategy with a
  provisional enum mapping (Phase 0 contract proposal), semantic depth,
  measured flag, FP rate with sample size, corpus size and diversity.
  Unknown fields render as `UNCLASSIFIED` — visible gaps are the
  deliverable. Regenerated with `npm run docs:capability`; drift-locked by
  `tests/capability-matrix.spec.ts` and the generated-docs-drift CI job.
- **Declared-vs-measured cross-check report** (ledger class D9): the
  matrix names every measured rule whose declared tier violates the FP
  ceilings (core > 10%, extended > 30%) and produces the D3 demotion list
  (38 unmeasured rules currently in effective core — Phase 1 input).
  Current run: **0 D9 mismatches** (all measured > 30% FP rules already
  declare `quarantine`).
- **Defect ledger recorded** into the matrix metadata (plan §02, D1–D8
  with owning phase per defect).

### Added — detectorRevision scaffold (Phase 1 prep)

- **`tests/corpus/detector-revisions.json` sidecar**: hand-maintained,
  one entry per measured rule (all at revision 1 today), diffable.
  `MEASURED_FP` entries now carry `detectorRevision` stamped from the
  sidecar by `generate-fp-audit-table`; `docs/FP-AUDIT.md` gains a
  `detectorRev` column. Measurement inheritance law (§07): a measurement
  belongs to a specific detector implementation, not merely to a rule
  ID. Drift lock extended in `tests/measured-fp-generated.spec.ts`
  (sidecar covers exactly the measured set; revisions are positive
  integers matching the sidecar).

### Fixed — packaging: offline grammar loading (Phase 0.5 spike, D2)

- **`tree-sitter-wasms` and `web-tree-sitter` moved to `dependencies`**
  (web-tree-sitter keeps its exact `0.25.6` pin — 0.26.x cannot load the
  prebuilt grammar files). The published CLI's dependency tree now
  carries the tree-sitter Java/C# grammars, so `npm install mjolnir-qa`
  can load them offline once the Phase 0.5 parse-stage wiring consumes
  them. Removed the misleading `!dist/**/*.wasm` files exclusion (the
  grammars ship via the dependency, not the bundle).
- **Pack-smoke regression test**: `tests/package-smoke.spec.ts` asserts
  the packed package declares both as runtime dependencies and that the
  java/c_sharp grammars resolve inside the installed dependency tree.

### Fixed — adapter header claims (D4)

- `src/adapters/java.ts` no longer claims to be a "Second tree-sitter
  consumer" — it is a regex-layer adapter; the tree-sitter-java grammar
  and the async `parseJavaAst` seam exist but are not wired into the
  synchronous scan (D1). Same honest correction for
  `src/adapters/csharp.ts` and `src/engine/adapter.ts` (whose header
  still claimed tree-sitter "arrives in R2 with Python").

### Verification Trust Evolution, Phase 0.5 — async parse stage (D1)

### Changed — parse stage wired into the scan pipeline (D1 closed, BEHAVIOR-NEUTRAL)

- **Async parse stage between discovery and rule execution** (plan §10.1):
  `runScan`'s per-file loop now awaits an optional `LanguageAdapter.parseAst`
  hook before running rules. `runRules` and every rule stay synchronous and
  consume the tree via `ParsedFile.ast` — the engine is NOT async end-to-end,
  only the one inherently-async seam (WASM grammar load) is. `main()` and the
  script entry points await the returned promise.
- **Java and C# adapters implement `parseAst`** backed by the previously-dead
  `parseJavaAst`/`parseCSharpAst` (defect D1: tree-sitter AST was built and
  tested in Sprint 8 but never consumed). Parse failure or a missing grammar
  resolves `undefined` and rules fall back to the regex path — never fatal.
  No rule consumes the AST yet (Phase 3 wires specific JV/CS rules), so scan
  findings are byte-identical: golden lock, corpus baselines, and generated
  assets all unchanged (BEHAVIOR-NEUTRAL mode, plan §06).
- **Parser lifecycle management** (plan §10.3): one memoized `Parser` per
  grammar, bounded by a fixed-size parse-slot semaphore
  (`MAX_CONCURRENT_PARSES`); every per-file tree is released via
  `ParsedAst.dispose()` (`tree.delete()`) in a `finally`-equivalent position
  that runs on normal completion, rule crash, per-file budget expiry, and
  adapter throw; `releaseTreeSitterResources()` tears down the memoized
  parsers after each scan (library-consumer hygiene). No leak path depends
  on rules completing successfully.
- **Call-graph consequences**: `computeImpact` (and therefore
  `runImpactCommand`) is async; `scripts/corpus-sample.ts`,
  `scripts/generate-readme-demo.ts`, and `scripts/generate-readme-hero.ts`
  await `runScan`; the full test suite (~40 call sites across 25 spec files)
  awaits the now-async commands. No behavior change anywhere.
- **Verification evidence** (exit gate §10): golden lock byte-identical
  (3/3), corpus count-lock unaffected (no JV/CS rule reads the AST),
  capability-matrix + FP-AUDIT generated docs byte-identical, pack smoke
  re-proven manually: `npm pack` → clean `npm install` → offline grammar
  load + parse of real Java and C# source → offline `mjolnir` scan of a
  Java fixture detecting QA-JV-102. `web-tree-sitter` stays pinned to
  exactly `0.25.6` (§10.5, documented 0.26.x breakage).

### Added — score instrument redesign (hammer states)

- **ScoreState model** (`src/reporter/score-state.ts`): one pure source of
  truth for band / verdict / color / headline per score — critical 0–49,
  warning 50–79, trusted 80–99, forged 100. `verdictFor`, the terminal
  gauge and the badge all delegate to it.
- **The hammer is now the score instrument** (terminal): a state-colored
  hammer block renders above the WORTHINESS line — cracked (0–49),
  strained with partial runes (50–79), charged with energy arcs (80–99),
  halo + lightning at 100. A plain-text caption (`[CRACKED]` /
  `[STRAINED]` / `[CHARGED]` / `[FORGED]`) carries the state without
  color; ASCII fallback included.
- **Trusted is aurora-cyan, forged is white-gold** on every surface
  (terminal palette, web tokens, brand README). Green is no longer a
  score color — it survives for non-score success contexts only.
- **Findings render as cards** (terminal): Problem → Impact → Fix →
  Verify with the evidence tag and measured FP rate beside the title;
  rules with >3 findings collapse under one "same fix applies" header;
  non-verbose shows 10 cards with an overflow line, `--verbose` shows
  everything.
- **FORGED block at 100** replaces the bare FLAWLESS VICTORY line in
  unicode mode (trophy retained inside; the `*** FLAWLESS VICTORY ***`
  ASCII contract string is preserved).
- **PR comments show score drift** (`Score: 72/100 (+5 since baseline
<sha>)`) using the new additive `score` field in the baseline JSON, and
  carry per-finding evidence tags.
- **Badge thresholds aligned** with the reporter: ≥80 / ≥50 / 100
  (was ≥90 / ≥75 / ≥50), colors `red` / `yellow` / `important` /
  `success`; the message at 100 reads `100/100 · forged`.

### Fixed — security & detection-regression audit (`.planning/AUDIT-2026-08-30-QA.md`)

- **QA-1 (P0, detection regression):** QA-TEST-003's M0-#4 header rewrite
  required a space after `async` — `async()=>{` bodies silently stopped
  matching. `\s*` restores them without reopening the bare-`return` exemption.
- **QA-2 (P0, detection regression):** single-walk discovery applied the
  UNION of every adapter's `dirSkips`, so Python's `env` (= virtualenv)
  and Java's `build` (= Gradle output) hid directories from every other
  language — real TS test dirs (e.g. withastro/astro's `test/units/env/`)
  silently vanished from scans. `dirSkips` are now applied per owning
  language at file level.
- **QA-3 (P1):** `isInsideEmbeddedCode` truncated the masked run at the
  first space inside a literal, so embedded test-data
  (`'test(" foo", function () {})'`) was classified as live code and
  fired 6 FP findings on eslint-plugin-playwright's ruleTester tables.
- **QA-4 (P1):** config `exclude` was never validated —
  `exclude: [1, {}, null]` crashed the scan (exit 20). Non-string entries
  are now a fixable usage error (exit 10), with a defense-in-depth filter
  in pattern compilation.
- **QA-5 (P1):** an unparseable suppression `expires` value silently
  degraded to "expired" via NaN comparisons; it is now a fixable
  validation error at load time.
- **QA-6 (P1, documented-behavior fix):** the README's 90-day suppression
  policy was only applied at write time by the `ignore` command —
  hand-written entries without `expires` stayed active forever. The
  default is now enforced at enforcement time, anchored at the config
  file's mtime; `mjolnir suppressions` labels the default explicitly.
- **QA-7 (P1):** plugin reserved-prefix spoof rejection was
  case-sensitive — `"qa-test-001"` walked straight past it. Matching is
  now case-insensitive.
- **QA-8 (P2):** suppression `files` globs written with Windows
  backslashes could never match the normalized finding paths; both sides
  are normalized before matching.
- **QA-9 (P2, defense in depth):** option-shaped `--base` values are
  refused at the git layer even when a programmatic caller bypasses
  `parseArgs` (option-injection → `--upload-pack=` command execution).
- **QA-10 (P2):** finding metadata (hostile filenames, plugin messages)
  reached the terminal and markdown PR comments unsanitized — ANSI
  escapes and control characters are now stripped, and the PR comment
  escapes markdown-significant characters.
- **QA-11 (P2):** the JUnit XML scan was quadratic on unclosed
  `<testcase` floods (minutes of CPU for a 20 MB hostile report); the
  scanner is now linear with a bounded-time regression test.
- **QA-12 (P2):** `loadBaseline`/`loadStats` are now total over arbitrary
  JSON — `null` finding entries used to crash `diff`, and hostile stats
  shapes leaked string junk into totals.
- **QA-13 (P3, defense in depth):** SARIF artifact URIs normalize
  backslashes — `encodeURI` leaves `\` literal, which is not a valid
  RFC 3986 uri-reference character.
- **QA-15 (P1):** the code-text mask iterated code points instead of
  UTF-16 code units — one emoji made the mask shorter than the text and
  silently disabled masking for the whole file.
- **QA-16 (P2):** files larger than the 1 MiB discovery cap were dropped
  silently; the skip is now counted and flagged (`file-size`), keeping
  the scan honest about what it did not read.

### Changed — corpus baseline

- Regenerated after review: M0-#2's QA-TEST-004 duplicate-count fix
  (−5 on withastro-astro — every removed finding was a same-position
  duplicate), M0-#4's function-body/return-narrowing detections (net
  +1/+1/+8/+6 across vite/svelte-kit/tanstack-query/eslint-plugin-playwright,
  spot-reviewed on real code), QA-3/QA-6 masking suppressions
  (embedded-code test data no longer fires), and QA-15's mask-alignment
  fix (QA-PW-105/108 match against `codeText`, whose offsets were
  misaligned after any astral character — +27/+22/+1 restored matches on
  vite/astro/tanstack-query).

### Added — Open-Beta E2E test plan (Tier 1–5, ~1,700 new test assertions)

- **Coverage ratchet:** statements/branches/functions/lines at literal
  100% per file (`perFile: true`). Every branch arm, catch path, and
  fallback in `src/**` is exercised or provably dead — ~30 dead guards
  (unreachable `?? ""` fallbacks, unreachable-`if` arms behind
  `noUncheckedIndexedAccess`, a dead proof-abort block in `fix`) were
  removed or exported as testable pure helpers with the golden lock,
  self-scan and determinism tripwires green throughout.
- **E2E journeys** (`tests/e2e/`): nine spec files run the built
  `dist/cli.mjs` as a real child process — tarball first-run (the path
  that historically caught macOS-only CLI breakage), CI PR flow with
  changed-scope attribution against real git fixtures, the baseline →
  diff → stats loop, the fix flow, the forensics flow, explain/rules,
  create-rule onboarding, the config journey (gate/severityOverrides/
  ignore/expiry honored end-to-end), and a full exit-code contract sweep
  across every documented command.
- **Precision & accuracy:** every scorer number verified against the
  documented benchmark (deductions 8/3/1, E2/E1/E0, honesty cap 99,
  error ceiling 95, suite-invalidating ceiling 49, smoothing) with
  fast-check property invariants (≥1,000 iterations: score bounds,
  monotonicity, order-symmetry), Selector Health exact score vectors,
  hand-computed forensics math, terminal-footer/JSON deduction
  consistency, Mermaid well-formedness, and a three-verdict-band proof
  (WORTHY / NEEDS WORK / UNWORTHY each reached for its stated reason).
- **Regression & integration:** adapter→reporter matrix (one finding
  asserted on terminal, JSON, SARIF, and Mermaid), plugin flow
  integration (valid plugin + reserved-prefix rejection), cross-file
  analysis, monorepo containment (a workspace scan never reports
  siblings), a mutation guard (each sampled rule's finding drops to zero
  when the offending line is removed), and baseline forward-compat.
- **Nightly stress workflow** (`.github/workflows/stress.yml`, never
  PR-blocking): 10k-file mixed-language synthetic repo under a 120 s
  budget with no partial degradation, pathological trees (200-deep
  nesting, 10k-char lines, unicode filenames, LF/CRLF/BOM mixes,
  junctions, malformed specs), a 20-run byte-identical + flat-RSS soak,
  the networked registry-install smoke (previously skipped locally), and
  4 concurrent scans of one read-only target. Fixture generators live in
  `tests/stress/`.
- **Stability:** the 1 MB masking budget now takes the median of 3 runs
  with a 15 s ceiling (coverage instrumentation slows string-heavy loops
  ~3x and there is no in-worker marker to detect it; the ratio-based
  linearity test remains the true non-quadratic guard), and the
  scale-benchmark's 3k-file budget moved 20 s → 25 s with the same
  rationale. The vitest global-setup builds `dist/` once before any
  worker starts — parallel-file builds used to wipe dist mid-suite
  (tsdown cleans `outDir`) and fail unrelated E2E spawns with
  module-not-found.
- **Fixed (flagged by the new E2E sweep):** `doctor --bogus` ignored the
  unknown flag and scanned the CWD as a surprise full run; it now prints
  usage and exits 10, matching the flag-error parity of every other
  subcommand (unit + E2E regression tests added).
- **Soak drift artifacts** moved from `coverage/` (a CI-generated dir the
  tool's own QA-CI-005 rule correctly flags as "consumed but never
  generated" in stress.yml) to a dedicated `soak-drift/` dir.

## [0.5.0] — 2026-08-29

### Added — measurement is now visible at the point of use

- Only 15 of 91 rules carry a false-positive rate measured against real OSS
  code; that fact previously lived only in `docs/FP-AUDIT.md` and
  `mjolnir doctor`. Now surfaced everywhere a user looks:
  - The scan footer reports how many of the rules that _fired_ are measured.
  - `mjolnir explain --list --unmeasured` / `--measured` filter the catalog; a new
    "FP (measured)" column in `rules --md`; a "Measured FP rate" row on every
    `docs/rules/` page and in `mjolnir explain`.
  - JSON findings carry `measuredFpRate` and `measuredFpN` (additive —
    `schemaVersion` is still 1).
- `src/rules/measured-fp.generated.ts` bakes the rates into the shipped
  package (the raw verdicts are not packed); regenerated by
  `npm run generate-fp-audit-table`, drift-locked by a test, and now the single
  source `mjolnir doctor` reads.
- Scoring is unchanged — this is visibility only.
- **Corpus expanded 6 → 13 repos** so the previously-silent rule families
  (QA-TEST, QA-TQUAL, most QA-PW, QA-CI-001) fire on real consumer code:
  added `next-auth`, `vite`, `sveltekit`, `astro`, `TanStack/query`,
  `eslint-plugin-playwright`, `playwright-pytest`. `corpus:sample` and
  `corpus:audit` now scan with `--strict` (quarantine rules were
  invisible to both before). `docs/FP-AUDIT.md` is 15/91 (down from 19 —
  see the dispatch fix below, which retired the leaked cross-language
  verdicts for QA-PW-101/112 and QA-TEST-004/QA-ENV-001 on Java/Python
  repos); the ~250 new corpus findings are queued for classification in
  `tests/corpus/verdicts/`, not counted until read.

### Changed — help and README lead with the one command

- `mjolnir --help` and the README quickstart now open with
  `mjolnir --scope changed` as _the_ product, and group the other subcommands
  into Everyday / When-something's-flaky / Occasional instead of a flat list
  of 16 equals. A one-line first-run hint appears after a bare full-repo scan
  with no config. No subcommand removed or renamed.

### Fixed (rule-bug-hunt wave)

- **Cross-language dispatch leak**: `appliesTo: "test-files"` mapped to all
  four language adapters, so the 42 TypeScript/Playwright-only rules that
  use it (QA-PW-\*, QA-TEST-\*, QA-TQUAL-\*) ran against `.py`, `.java` and
  `.cs` files too. On the corpus this produced ~140 false positives on
  `microsoft/playwright` Java bindings alone (QA-PW-101, QA-PW-112,
  QA-TEST-004, QA-ENV-001) and inflated several baselines. `legacyAppliesTo`
  now maps `"test-files"` to `["typescript"]` only; cross-language coverage
  is the QA-PY/QA-JV/QA-CS families' job. Regression test added.
- **QA-PW-103** (missing timeout): no longer fires on assertion strings that
  contain Playwright code as _test data_ (`code: "await page.goto('/x')"` in
  playwright-mcp) — guarded by `isInsideEmbeddedCode`.
- **QA-TEST-004** (hard sleep): dropped the bare `sleep(N)` pattern and now
  requires `await` and a non-zero argument. `sleep(10).then(...)` and
  `queryFn: () => sleep(10)` are mock-latency, not test-body pauses — this
  cut TanStack Query's count from 1648 to 157.
- **QA-PW-002** (unawaited assertion): matches only Playwright's 31
  web-first async matchers instead of any `to*` name, so
  `expect(res.status()).toBe(200)` on a variable named `page` is no longer
  flagged.
- **QA-TQUAL-009** (assertion in unawaited promise chain): the `.then()`
  callback body is now paren-matched instead of grabbing the next `{`, so a
  sibling `.then(res => res.text())` inside an awaited `Promise.all` no
  longer reaches into an unrelated block; the await/return check also sees
  an `await` sitting one line above the `.then(`.

### Fixed (rule-bug-hunt wave 2 — CI + Python + order-dependence)

- **QA-CI-002** (`|| true` swallows exit code): only fires now when the
  swallowed command is a verification gate. `docker compose down || true`,
  `pkill … || true`, `rm -rf … || true` are ordinary teardown — flagging
  them as FALSE-GREEN was wrong. Gate detection is now shared with QA-CI-001
  (`src/rules/ci/verification-gate.ts`).
- **QA-CI-009** (exit code not propagated): `playwright` alone was treated as
  a test command, so `npx playwright install --with-deps; npx playwright
test` (install first, test last) was flagged even though the test's exit
  code IS the step's. Now requires `playwright test`, and skips any
  `setup; <test>` sequence where the test command runs last.
- **QA-CI-010** (tests skipped where they must block): the condition matcher
  used `[!=]=`, which also matched `==` — so `if: github.event_name ==
'pull_request'` (run **only** on PRs) was flagged as _skipping_ tests on
  PRs. Now `!=` only, plus positive matches on `== 'push'` / `'schedule'` /
  `'workflow_dispatch'`.
- **QA-PY-012** (tautological assertion): the patterns lacked the `g` flag,
  so `regex.exec()` never advanced — only the **first** `assert True` and the
  first `assert x == x` in a file were reported; every later one was missed
  (and the loop spun to its 1000-iteration guard each time). Fixed; corpus
  count rose 4 → 5 as the previously-missed assertions surfaced.
- **QA-PY-009** (commented-out test): `# main()` in a comment ("call main()
  here") was flagged as a disabled test. The `main(` pattern now requires
  the `pytest.main` namespace.
- **QA-PW-119** (order dependence): three bugs. (1) `let [a, b] = …` /
  `let { page } = …` destructuring was split on `,` into junk names like
  `[a` that were interpolated into `new RegExp(…)` — a crash risk; it is now
  skipped. (2) typed module-level `let x: Foo<T> = …` was invisible to the
  declaration regex (the `<>` broke it) and is now detected. (3) a `before*`
  hook with a destructured param — `beforeEach(async ({ page }) => {` — had
  its body located at the _param_ brace, so assignments in the hook body
  were treated as in-test and flagged; corpus count dropped 45 → 11 on the
  worst-affected repo.
- **QA-PW-116** (storageState without expiry): the canonical Playwright auth
  pattern — a `setup` project / `*.setup.ts` / `globalSetup` regenerating
  the state each run — is now recognised as a freshness mechanism, not
  flagged.

### Fixed (adversarial-audit hardening wave)

- **QA-TEST-003**: the assertion-detection regex contained a literal tab
  character (`\t`) instead of `to`, so `.toThrow()`, `.rejects.toThrow()`
  and `.resolves.*` were never recognized as assertions — tests whose only
  assertion was `await expect(p).rejects.toThrow()` were flagged as
  "no assertions" with error severity. Fixed; must-not-fire fixture now
  covers `rejects`/`resolves` forms.
- **workflow-parser**: the YAML alias-bomb guard ran AFTER parsing, i.e.
  after a billion-laughs document had already expanded. Alias counting now
  happens before parse, and the parser additionally enforces
  `maxAliasCount` during parse.
- **CRLF/BOM robustness**: files are normalized once at read time (BOM
  stripped, CRLF → LF). Previously `$`-anchored Python rules missed every
  assertion line on Windows checkouts.
- **Terminal deduction table** now uses the same evidence-discounted math
  as the score (`deductionFor`), so displayed numbers reconcile with the
  reported score when E0/E1 findings exist.
- **JSON/SARIF truncation removed**: results were silently capped at 50
  findings, including machine consumers. The full finding set is now in
  JSON/SARIF; only terminal display is capped (with an honest count).
- **`mjolnir fix` path containment**: plugin-supplied finding paths can
  no longer write outside the scan root (`../` traversal refused).
- **Symlinks are no longer followed** during test-file discovery in any
  adapter — prevents scanning outside the repo and link cycles.
- Plugin reserved-prefix blocklist extended to all core families
  (`QA-JV`, `QA-CS`, `QA-PLUGIN`).
- `doctor:playwright` bad-usage exit code unified to 10 (was 2).

### Fixed — false positives confirmed by reading source, each locked by a fixture

Every entry below was verified by opening the cited file and reading the
surrounding code, not inferred from the rule's description. Each is now locked
by a `must-not-fire` fixture so the class cannot return silently.

- **QA-TQUAL-011** matched a test identifier anywhere inside a comment block,
  so any JSDoc header containing the sequence `test (` fired. Confirmed on
  `tests/package-smoke.spec.ts:2` — `* Package publish integrity smoke test
(Test Hardening Plan, P0 #2).` Now requires the identifier to be the first
  token on the commented line. Locks:
  `tests/fixtures/QA-TQUAL-011/must-not-fire/prose-mentioning-test.spec.ts`.
- **QA-PW-004** fired on selectors passed as arguments to the function under
  test. Confirmed on `tests/selector-health.spec.ts:33` —
  `expect(classifyLocator("page.locator('xpath=//div')")).toBe("xpath")`. The
  rule must read raw text to see selector content, so masking cannot fix it;
  it now consults `codeText` as an oracle about the match position instead.
  Locks: `tests/fixtures/QA-PW-004/must-not-fire/selector-as-argument.spec.ts`.
- **QA-ENV-001**, **QA-PW-123**, **QA-PW-142** fired on code samples embedded
  in strings as test data. Confirmed on
  `tests/rule-sprint8-java-csharp.spec.ts` lines 147, 157, 603 — e.g.
  `text: 'page.navigate("http://localhost:3000/checkout")'`. Now skipped when
  the enclosing string literal holds both a nested quote and call syntax.
  Locks: `tests/fixtures/QA-ENV-001/must-not-fire/code-as-test-data.spec.ts`.
- **QA-CI-001** fired on `continue-on-error` regardless of what the step did.
  Confirmed on this repo's own workflows: `ci.yml:48` (badge artifact
  generation) and `mjolnir.yml:35` (advisory diff, which carries a comment
  explaining that exit 1 is expected there). Now gated on an allowlist of
  verification commands. Locks:
  `tests/fixtures/QA-CI-001/must-not-fire/reporting-steps.yml`.

### Fixed — true positive acted on

- **QA-TQUAL-001** on `tests/adapters.spec.ts:110` was correct. The test was
  named "counts skipped files on stat failure", its own comment admitted it
  could not simulate a stat failure, it asserted the skip callback was _not_
  called, and it never asserted on `ctx.testFiles` — the actual output of
  `discoverTestFiles`. The test was rewritten to assert on real output and
  renamed to match what it verifies. The rule was left unchanged.

### Changed — BREAKING: scoring

- **Normalization denominator is now test declarations, not test files.**
  File count was gameable: adding empty spec files raised the score without
  adding verification.
- **`SMOOTHING_C` is 1 (Laplace), was 5.** At 5 it tripled the denominator of a
  two-declaration repo, diluting real density away.
- **Findings may declare `suiteInvalidating: true`**, capping the score at 49
  (UNWORTHY) regardless of exposure. Density can express how much of a suite is
  questionable; it cannot express whether the suite ran at all. Applied to
  QA-TEST-001 and QA-PY-001. Deliberately not applied to QA-PW-003, which
  detects both `test.only()` and `page.pause()` — the flag is per-rule.
- **A score of 100 now requires zero deductions.** Normalization could
  previously round a real finding up to a perfect score.
- `NORMALIZATION_K` remains **unfitted**. See `docs/SCORING.md`.

### Changed — QA-CI-001 severity

- Step-level `continue-on-error` findings are now `error`, previously `warning`.
  The self-scan gate filters on `severity === "error"`, so a warning could never
  fail CI — which is how `continue-on-error` stayed live in this repo's own
  workflows while the tool reported zero errors.
- Title broadened to "continue-on-error masks a failing verification gate",
  accurate to the allowlist now used.

### Removed

- **All 49 FABRICATED verdicts removed.** They had been produced by reasoning
  about what each rule's description implied rather than by reading the source
  at the cited file and line — fabricated evidence with a real-looking
  provenance, inside the mechanism built to prevent exactly that.
  Subsequently, 381 verdicts were classified from real source reading via
  corpus:sample (see docs/FP-AUDIT.md).

### Changed (adversarial-audit hardening wave)

- QA-TQUAL-002 and QA-PW-004 detection now runs on a comment-stripped /
  comment-and-string-free AST view of the file: patterns inside prose
  comments or string literals no longer fire (FP firewall).
- QA-TQUAL-011 (commented-out test) now scans actual comment ranges via
  the compiler scanner instead of raw-text regex — `it(` inside a string
  literal is no longer flagged, and without an available AST the rule
  conservatively reports nothing rather than flooding false positives.
- `--scope changed` now includes GitHub workflow files and Playwright
  configs changed in the diff, not just `*.spec/test.*` files.

### Added

- Upgrade-Plan-v3 Phase 0.1: expanded the false-positive corpus with two
  additional Python repos (`pytest-dev/pytest`, `psf/requests`) so all
  QA-PY-001..012 rules are exercised against real code via
  `npm run corpus:audit`.
- Added `CHANGELOG.md` (this file) per Upgrade-Plan-v3 critical item #3:
  user-visible rule behavior changes get a first-class entry from now on.
- Upgrade-Plan-v3 Phase 1: five new TypeScript/Playwright rules —
  QA-PW-141 (retries without flake-triage loop), QA-PW-142 (blanket
  `page.route()` mocking), QA-PW-143 (no screenshot/video on failure),
  QA-PW-144 (single-browser project matrix), QA-PW-145 (no accessibility
  assertions; absence-based, `falsePositiveRisk: high`).
- Upgrade-Plan-v3 Phase 2: eight new Playwright-Python rules on the
  Python adapter — QA-PY-101 (sync/async API mix), QA-PY-102 (`time.sleep`
  in Playwright tests), QA-PY-103 (`wait_for_timeout` as sync),
  QA-PY-104 (brittle selectors), QA-PY-105 (UI-driving test without
  assertions), QA-PY-106 (shared page/context across tests), QA-PY-107
  (`networkidle` wait), QA-PY-108 (hardcoded environment URLs).
- Upgrade-Plan-v3 Phase 6: Plugin API — declare third-party rule packages
  in `mjolnir.config.json` (`"plugins": [...]`). Security model: no
  sandbox (same trust as ESLint/Vitest plugins); reserved core rule-ID
  prefixes rejected; load failures degrade honestly as QA-PLUGIN-000
  warnings without affecting exit codes. Plus cross-file duplicate-test-name
  detection (`src/engine/cross-file.ts`).
- Upgrade-Plan-v3 Phase 0.2: new `mjolnir-qa-playwright-reporter` package
  (`packages/playwright-reporter/`) — official Playwright JSON reporter
  wrapper for Mjölnir's forensics pipeline; default output
  `mjolnir.report.json` is the CLI's auto-discovery convention.
- Upgrade-Plan-v3 Phase 3: ts-morph AST precision layer behind the `ast`
  seam (`src/engine/ts-ast.ts`). QA-PW-002 and QA-PW-005 migrated from
  regex to syntax-tree detection (legacy regex kept as fallback). No
  scoring changes — golden lock byte-identical.
- Upgrade-Plan-v3 Phases 4+5: new language adapters — Java
  (`src/adapters/java.ts`, rules QA-JV-101..105) and C#/.NET
  (`src/adapters/csharp.ts`, rules QA-CS-101..104). Core Playwright rule
  families ported: disabled/skipped tests, hard sleeps, missing assertions,
  shared browser state, wait-timeout misuse. Rule-ID registry now accepts
  QA-JV/QA-CS families.

### Changed — rule tiers assigned from measured FP rates

- Every rule with a measured rate in `docs/FP-AUDIT.md` now carries the tier
  its rate warrants (`core` ≤ 10% FP · `extended` ≤ 30% · `quarantine` above
  that or unmeasured). Demoted to quarantine: QA-CS-102, QA-CS-106, QA-CS-108,
  QA-CS-111, QA-ENV-001, QA-JV-103, QA-JV-106, QA-JV-108, QA-JV-111,
  QA-PY-004, QA-PY-006, QA-PY-007. Set to extended: QA-CS-105, QA-TEST-004.
  Promoted to core: QA-CS-101 (0% FP, n=20), QA-JV-105 (10% FP, n=20).
  Quarantined rules still ship and are still documented — they are opt-in via
  `--strict` rather than shaping the default report.
- `mjolnir explain --list` (`--json` and `--md`) now exposes each rule's `tier`, and
  every generated page under `docs/rules/` shows it in the metadata table.

### Fixed — documentation claims a `grep` disproved

- Every generated rule page told the reader to reproduce corpus counts with
  a `corpus:audit` script. That script had been renamed to `corpus:audit` in
  the Tempering plan and the generator string was never updated — the command
  printed on 91 published pages did not exist. Same dead name in
  `docs/PUBLISHING.md`
  (`corpus:audit:update` → `corpus:audit --update`).
- **`docs/FP-AUDIT.md` under-reported the rule base as 84 rules when the
  registry holds 91.** The coverage denominator was built by grepping source
  for `id: "QA-…"`, which silently missed the seven rules that the Phase 6
  families declare as positional factory arguments — QA-CS-106/110/111,
  QA-JV-106/110/111 and QA-PY-104, every one of them Java/C#/Python. The
  honesty document was quietly shrinking the newest adapters' coverage. The
  generator now imports the registry directly (and is TypeScript, so the
  `.d.mts` shim is gone); a regression test locks the denominator to
  `RULES.length`.
- `docs/README.md` described a `docs/plans/` directory that no longer exists
  and called a completed plan "current work".
- Residual `qa-doctor` naming removed from user-facing CLI output
  (`mjolnir explain`, `mjolnir stats`), from comments that contradicted the
  code they described (`baseline.ts` cited `.qa-doctor/` while writing
  `.mjolnir/`), and from this changelog's own unreleased section.
- The Playwright reporter package is renamed throughout:
  `mjolnirReporter` / `MJOLNIR_REPORT_FILE` / `mjolnir.report.json`. The
  package is unpublished, so no consumer breaks.

### Added — guards

- CI now runs `npm run test:coverage`. Its absence is why coverage fell from
  ~96% to 92.6% between releases without anyone noticing.
- `tests/docs-consistency.spec.ts` now asserts that every `npm run <script>`
  referenced in tracked docs and source actually exists in `package.json` —
  the general fix for the dead-command class above, not a one-off patch.
- ~130 unit tests recovering branch coverage on the code-text maskers, the
  shared position helpers, ignore-pattern resolution, and the per-arm
  behavior of ten Playwright rules plus QA-PY-010.

### Infrastructure — automated npm publishing is live

- `0.5.0` is the first version published to npm by CI. `release.yml` now
  publishes via **OIDC trusted publishing** (no `NODE_AUTH_TOKEN`
  anywhere) with `--provenance`; the published tarball carries a SLSA
  provenance attestation (`npm audit signatures`). Every subsequent
  release is `git push --follow-tags` and nothing else.
- The blocker was a mismatch in the npmjs.com Trusted Publisher config
  (`Sergey-bar` vs the real `Sergey-Bar` — npm matches the OIDC
  `repository` claim case-sensitively), which surfaced as
  `OIDC token exchange error - package not found` / `ENEEDAUTH`. Fixed on
  npmjs.com; re-run against the existing `v0.5.0` tag via
  `workflow_dispatch`.

### Known gaps

- **19 of 91 rules carry a measured FP rate** (n ≥ 10, from 381 hand-classified
  corpus verdicts). The other 72 ship on an unverified assumption; `mjolnir
doctor` reports this and will fail once a majority is classified.
- `NORMALIZATION_K` is unfitted.
- Statements/branches coverage sits at 94.8%/87.7% against a 95/88 aspiration;
  the enforced floor is 94/87 with the gap documented in `.planning/STATE.md`.

## [0.4.0] — 2026-08-27

### Changed

- **BREAKING: Rebranded from QA Doctor to Mjölnir.** Package name is now
  `mjolnir-qa` (bin: `mjolnir`). Config file: `mjolnir.config.json`.
  Data directory: `.mjolnir/`. Badge: `mjolnir-badge.json`.
- Score label: "SCORE" → "WORTHINESS".
- Verdicts: "HEALTHY" → "WORTHY", "CRITICAL" → "UNWORTHY".
- Environment variable: `QA_DOCTOR_ASCII` → `MJOLNIR_ASCII`.
- SARIF tool.driver.name: "Mjölnir".
- Repository: `github.com/Sergey-Bar/Mjolnir`.
- CLI: all help text, error messages, usage strings reference `mjolnir`.
- Generated workflows: `mjolnir.yml`, `npx mjolnir-qa@latest`.

### Added

- `--format mermaid` — test-architecture diagram (Sprint 9).
- `--tone blunt` — opt-in blunter messages (Sprint 9).
- Milestones — first flawless scan / first debt reduction announced once.
- New MJÖLNIR ASCII art logo (minimal Nordic hammer).

## [0.3.x] — prior releases

See git history; per-rule Trust Metadata `introduced` fields record the
first released version of each rule.
