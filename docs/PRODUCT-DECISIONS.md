# Product decisions

**Where the plan said "a human decides", this is what I decided and why.**

Every entry is a position the repository cannot derive for itself, resolved
against two criteria: what the product _is_ (`CLAUDE.md`'s thesis — a
false-green detector whose own claims are the thing under test) and what the
market does for the same question. Where those two disagreed, I say so.

These are decisions, not findings. Each one names what it forecloses, so a
maintainer can disagree with a specific consequence rather than a conclusion.

---

## D-1 — 6.0 is a claim, not a version. Do not cut it.

**The decision.** `package.json` stays at `5.0.0`. There is no 6.0.0 release
until the core tier is non-empty.

**Why.** The product's entire proposition is that a rule may only claim what
it has measured. Cutting a major version is a claim about the tool, and the
tool's own gates currently say:

| Claim                                     | State         | Verdict                           |
| ----------------------------------------- | ------------- | --------------------------------- |
| core tier                                 | 0 of 79 rules | empty — nothing has been earned   |
| quarantined                               | 34 of 79      | advisory forever under `--strict` |
| unmeasured                                | 6 of 79       | no FP rate at all                 |
| minimum `ciHigh` across 73 measured rules | 0.138         | 13.8% against a 10% ceiling       |
| `SUPPORTED` census entries                | 0 of 33       | every one demoted                 |
| open external-evidence boxes              | 39            | unreachable in-repo               |

A `6.0.0` on that table is a number that says "matured" over a tree whose own
report says "not yet". The 6.0 that already exists in `CHANGELOG.md` and
`docs/adr/` is a _plan version_, and the plan itself predicted the demotions
that followed it. That is a different thing from a release, and conflating the
two is the exact error class this repository exists to detect.

**What it forecloses.** Nothing ships under a major number until the quad
backfill earns a core rule. The cost is real: a 5.0.0 that keeps accumulating
6.0-shaped work without a version line to mark it. The `## [Unreleased]`
section and `check-version` now carry that instead, which is the
mechanism the plan was reaching for when it proposed 7.3a.

**What would change it.** One rule with a complete four-leg fixture quad and
a Wilson interval under 0.1. That is Wave 3.4, and `npm run check-fixture-quad`
prints exactly what is missing.

---

## D-2 — A trust tier is a claim, not a switch.

**The decision.** `--strict` reports more; it does not gate more. The
quarantine tier's severity/info caps stay permanent, and the help text says
so in those words.

**Why, and where the market agrees.** Compare the tools this one competes
with. ESLint's `--max-warnings` gates on _severity_, and a rule's severity is a
user-authored configuration choice, not a property of the rule. TSLint, Ruff
and golangci-lint work the same way: what fails a build is what the
configuration says fails a build.

A **trust tier** is not a configuration choice. It is this repository's
epistemic state about its own evidence — "we have not proven this detector
does not false-positive" — and that is a fact about the _tool_, not about the
_code under analysis_. Letting a user switch it off would let any user make
Mjölnir assert `M1_DECLARED`-with-no-evidence, which is precisely the defect
this change set removed from the census.

So the market standard applies to severity (user-controlled, gates) and
explicitly does not apply to tier (tool-controlled, never gates). The
corollary is that a user who wants a quarantined detector to be an error has
no switch, and should not: the path is a `corePromotion` or a `detectorRev`
re-measure, both of which are reviewable changes to this repository.

**What it forecloses.** `--strict` is not a way to get more enforcement. Users
who expected that will be disappointed, so the help text and the docs say what
it actually does.

---

## D-3 — Corroboration wins the right to claim support.

**The decision.** A rule is in core only with human-classified verdicts from
at least one real repository. A rule with a fixture and no verdicts is
`NEEDS-SAMPLES`, not core, and the quad gate says so.

**Why.** This is not a local preference; it is the only design under which the
corpus can ever contradict the tool. Every other arrangement — inference from
fixtures, inference from test counts, a classifier scoring its own outputs —
has the property that a detector which is simply wrong produces evidence
consistent with being right. Human classification is the only source in this
design whose failure mode is _disagreement with a person_, which is the one
failure mode the product can detect and correct.

**What it forecloses.** The core tier stays empty and the 6.0 cut stays
blocked (D-1) until someone funds the corpus work. That is the honest cost and
it is the whole reason this is a decision rather than an observation.

**Corollary — the 148-leg backfill is not deferred work, it is the work.**
Writing fixture files no detector has run against would make the quad gate
green by construction. The gate prints its own work list; the priority order
is the `missingByLeg` counts, and `PRECISION` (0 of 79) is the deepest hole.

---

## D-4 — `gitlab-ci` stays unregistered until it has rules.

**The decision.** `src/adapters/gitlab-ci.ts` is not added to
`SCAN_ADAPTERS`, and `framework-inventory.ts` keeps `executorAdapterIds: []`
for it.

**Why.** A registered adapter with no rules is a scan that reads `.gitlab-ci.yml`
and reports nothing — which reads in every surface as "we analyse GitLab CI"
and is false. The census made this concrete: it emitted
`SUPPORTED` / `M2_IMPLEMENTED` / `adapter: src/adapters/gitlab-ci.ts` while
the inventory said `[]` and the scanner did not register it.

The market position is that a CI analyser with no GitLab rules is a worse
product than one that says it does not support GitLab: teams route their
pipeline to whichever tool covers their CI, and an adapter that parses without
detecting is a promise the tool cannot keep.

**What it forecloses.** GitLab users get a capability row that says `TARGET`
with a `nextLevelGap` naming the missing quad, rather than a row that lies.

**What would change it.** Three rules (`allow_failure` on a test job, an empty
test stage, exit-code suppression in a script) with the same four-leg quad as
everything else. The three detection classes are already enumerated in
`detectGitLabCiRisks`, so this is writing rules, not designing support.

---

## D-5 — Version drift is caught at the gate, not by the release.

**The decision.** `docs/VERSION-CAPABILITY-LEDGER.json` is generated and
checked on every PR. It is not emitted in the release workflow only.

**Why.** The plan proposed the release workflow. That is the one place a
checker _cannot_ help, because the drift it is looking for is what makes a
release wrong. Seven "which now…" statements shipped in 6.0 with zero
assertions, and every one of them can be silently reverted with CI green —
that is the failure class. A gate at the point of change catches it; a
generator at the point of release records it after the fact.

---

## D-6 — The corpus skew is a selection defect, not a coverage one.

**The decision.** Wave 5's language prioritisation is **TypeScript first, Go
second**, and the corpus sample is drawn with stratification rather than
proportional-to-what-is-checked-out.

**Why, and where the market agrees.** The corpus is Python/Java/C#-weighted
because those are what the tool already had adapters for when the sampler was
written — a selection effect, not a statement about where the work is. By
GitHub Actions usage in 2026, the top three languages in OSS repositories are
JavaScript/TypeScript, Python and Go, and TypeScript is the only one of those
with a mature type-level detector ecosystem to borrow from.

The market-standard argument is sharper than the usage ranking: a static
analyser's corpus should be drawn from the ecosystem where its _rules_ are
most contested, because that is where a false positive costs a user their
trust. Those are the typed-test-framework ecosystems, not the ones with the
most files.

Stratification is the mechanism. `scripts/corpus-sample.ts` draws
proportionally to the cache, so a corpus that happens to contain more Python
gets more Python verdicts, and every frequency ranking computed over it
reproduces the skew. That is the mechanism, and it is the defect.

**What it forecloses.** Java and C# verdicts accumulate more slowly while
this runs. Acceptable: both have live rules with measured evidence today, and
neither has a user base this tool is losing.

---

## D-7 — Telemetry stays off, and that is now written down.

**The decision.** The product ships no telemetry, collects nothing, and makes
no network call in `local-only` mode. That is a decision, not an absence.

**Why.** A false-green detector that reports what it saw is a tool that
leaks a customer's codebase by construction. The market split on this is
real — Sentry ships OSS error reporting, Vercel ships analytics — and every
one of those is opt-in at the _product_ level, with a documented schema. A
linter that runs in a pre-commit hook is different again: it sees private code
by default, on a developer's machine, in a company the user has not
disclosed. Opt-out is the wrong default for that class.

**What it forecloses.** No usage-driven prioritisation from first-party
telemetry. Priority comes from the corpus and from issue reports instead,
which is slower and does not leak.

---

## D-8 — Third-party scanner configuration is declared, not executed.

**The decision.** `sonar-project.properties` and `.coderabbit.yaml` stay, and
both are recorded in `docs/EXTERNAL-CONFIG.md` as read by an external service
on import rather than by any workflow in this repository.

**Why.** A file at the repository root that no command reads is a claim the
repository does not make. Both tools _are_ real consumers — the file is read
when the repository is imported into SonarCloud or into CodeRabbit — but that
cannot be proved by running anything here, so it has to be _declared_. The
alternative, deleting them, throws away curated configuration that a real
reviewer consumes.

The gate is `npm run config:consumers`, and it deliberately excludes `scripts/**`
from its mention search: a gate may not vouch for the thing it gates, and the
first version "found" a consumer for both files in its own comment explaining
why the gate exists.

---

## D-9 — An unobtainable criterion is not a criterion.

**The decision.** Every external-evidence item is `EXTERNAL_PENDING`, not
`CLOSED` and not deleted. Each names the proof it needs and the actor who can
produce it, and that record lives in
[`docs/RELEASE-PATH-RUNBOOK.md`](RELEASE-PATH-RUNBOOK.md): 18 numbered steps, 10
of them `EXTERNAL_PENDING`, each with the gap ledger row it stands in for.
Seven gap-ledger rows move to a new `EXTERNAL_PENDING` status; one
(`GAP-M26-014`, telemetry) closes, because its closure is a decision and the
decision is D-7.

**Why.** A release gate that depends on a design partner's codebase, another
person's classification, or an account bound to one maintainer has two
outcomes, and both are bad. Either it blocks every release until somebody with
the right credentials has an afternoon — and then it gets disabled, and a
disabled release gate reports nothing — or somebody ticks a box, and that is a
gate that cannot fail.

The third outcome is a named status with a named owner. `GAP-M26-002`'s lesson
applies directly: a status that reads as progress while being a computation is
how a 429-row ledger with zero judgement got certified against its own output.

**What it forecloses.** Nothing about 1.0. These items are the definition of
_done for 1.0_, not for 5.x — which is where the market puts this. ESLint ran on
the same footing for a decade. What ESLint did not do is put "no external
validation exists" in its pre-release gate, which is where a naive reading of
this ledger ends up.

**Why it is falsifiable — and the one part of this that is broken.**
`docs/RELEASE-PATH-RUNBOOK.md` is the checkable surface: `check-cli-contract`
now fails if any live document stops linking to a file that exists, which is the
form this decision takes now that its request document is gone.

The gate that used to back the count no longer runs at all, and has now been
removed. `scripts/check-external-evidence.ts` read `docs/EXTERNAL-EVIDENCE-REQUEST.md`,
which the 6.0 M26-M50 retirement deleted, so `npm run docs:external-evidence`
exited 2 with a setup error and `npm run certify:integrity` could not complete.
Its `EXTERNAL_BOX_CEILING = 39` was a number about a file that no longer exists.

Re-homing those boxes is **open work, not something this edit decided**: the
runbook's `EXTERNAL_PENDING` rows are the record, and moving the count onto them
by lowering a recorded ceiling is exactly the change D-7 and the corpus ceiling
both exist to prevent. So the ceiling was left alone and the dead checker was
deleted instead. That is this decision applied one level further: an
unobtainable criterion is not a criterion, and a gate whose input was deleted on
purpose is an unobtainable criterion wearing a ratchet's clothes. What would have
been worse is leaving it — a gate that can never pass turns every release red
for a reason nobody can fix in a diff, and that is how gates get switched off.

The disposition D-9 protects is intact; what it no longer has is a mechanical
counter.

---

## D-10 — Hosted mode is a declared state, never a default.

**The decision.** [ADR 0012](adr/0012-hosted-enterprise-boundary.md).
`local-only` stays the default and its zero-network contract is unchanged.
Hosted mode exists, is opt-in, and is not reachable without an explicit
declaration — and a run records which mode produced it, so the two modes'
artefacts are never silently comparable.

**Why, and where the market splits.** Sentry ships OSS error reporting and
Vercel ships analytics; both are opt-in at the product level with a documented
schema. Neither runs in a pre-commit hook. A static analyser does, on a
developer's machine, over code nobody consented to transmit — so the person who
would be affected is not the person who configured the tool, and opt-out is the
wrong default for that class.

Refusing hosted mode outright is also unsupported by the evidence:
`GAP-M26-015` is a real enterprise requirement, and a tool that cannot install
air-gapped loses those evaluations before it can demonstrate anything.

**What it forecloses.** Hosted mode counts toward no external-validation box.
Validating a tool that behaves differently under test validates the wrong
artefact — the same `ADAPTER` / `adapter` split generalised from capabilities to
modes.

---

## D-11 — One command, one name, and the decision is a committed file.

**The decision.** A CLI verb's disposition lives in `docs/cli-contract.json` —
one row per verb in `src/engine/cli-command-names.ts`, with the target for a
REPLACE or a MOVE — and `npm run check-cli-contract` fails when a verb has no
row, when a row names a verb that does not exist, when a live surface names a
removed verb, and when two npm scripts resolve to the same command. The same
gate fails any `npm run <name>` in a `.md`, a workflow, the Action or the
reviewer config that `package.json` does not define.

**Why not "just be tidy".** Two names for one command is not a style problem.
`unimported:check` and `check-unimported-modules` both ran the same file;
`build:determinism` and `verify-build-determinism` did too. A reader who typed
the wrong one got the right answer and **no signal that the name was wrong** —
which is worse than having no name, because the wrong one looks right until the
day the two diverge. The same shape hid a live defect: `ci.yml` runs
`check-version -- --base=origin/<base>`, and npm appends a flag to the LAST
command of a chain. The chain was correct by ordering accident. Reordering one
line would have routed `--base` to an arm that ignores it, and the step would
have kept reporting PASS while comparing against an empty `git status` on a
fresh CI checkout.

**What it forecloses.** The rule is about the **command**, not the entry file.
A check arm and a write arm of one generator — `ledger:check` / `ledger:write`,
`claims:prose` / `claims:prose:strict`, and nine more — is a declared convention,
each accounted for in `docs/MANUAL-SCRIPTS.md` (which learned a third column for
a mode, because a two-cell row naming `script --flag` is a row about a script
name that does not exist and is therefore silently unread). Collapsing those
eleven pairs is not required and would not have caught any of the defects above.
