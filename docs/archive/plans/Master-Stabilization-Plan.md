# QA DOCTOR — MASTER STABILIZATION PLAN

> Written 2026-08-26. Supersedes `Implementation-Master-Plan.txt` (stale).
> Complements `Upgrade-Plan-v3.txt` (feature roadmap) — this document is the
> **stabilization and trust** plan that gates the open beta.
>
> **Goal:** a product that is reliable, works well, and whose every claim is
> independently verifiable by a stranger.

---

## 0. FRAMING — what "trusted" means here

The request that produced this plan was "trusted 100%". That target is
deliberately restated, because this project's own philosophy already rejects
it: `Plan.md` §11.7 states **"Do NOT require 100/100"**, and §1.2 makes
`UNKNOWN` a first-class verdict.

So the goal of this plan is **verifiable trust**, defined as:

1. Every claim the project makes is reproducible by a stranger with one command.
2. Every quality gate covers what it says it covers.
3. Anything not proven is explicitly labelled UNKNOWN — never rounded up to green.

A tool that accuses other test suites of false-green cannot itself ship
unverified claims. That is the whole bar.

---

## 1. VERIFIED FINDINGS (evidence for this plan)

Established by direct source and registry inspection on 2026-08-26 — **not**
from planning docs, which proved stale repeatedly.

| #   | Finding                                                                                                                                                                                  | Impact                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | npm name `qa-doctor` is owned by an unrelated project (ArtisansCompany, v0.2.0, maintainer `nirantioluwa`, repo `artisanscompany/qa-doctor`)                                             | README's primary install command runs **someone else's software**; `npm publish` would fail 403; npm version/downloads badges display a stranger's stats. **PARKED by decision — see §5**  |
| 2   | `package.json` `repository`/`bugs`/`homepage` point to `github.com/qa-doctor/qa-doctor` → HTTP 404. Real remote is `github.com/Sergey-Bar/QA-Dodctor` (typo in repo name)                | Dead links baked into every published artifact; two conflicting sources of truth                                                                                                           |
| 3   | `qa-doctor/.gitignore` ends with `CHANGELOG.md`, `.gitignore`, `.gitignore`                                                                                                              | The changelog required by Upgrade-Plan-v3 critical item #3 is git-ignored (exists on disk, almost certainly untracked); `.gitignore` ignores itself twice. Looks like an accidental append |
| 4   | Root `.gitignore` ignores `docs/plans/Product.txt`, `Product-MVP.txt`, `Sprint-Plan.txt` — all three listed in `.planning/STATE.md` as source-of-truth plans                             | A fresh clone receives none of them                                                                                                                                                        |
| 5   | No `workspaces` field in root `package.json`; `packages/playwright-reporter` is never installed, built, typechecked, or published                                                        | Its README instructs `npm install -D @qa-doctor/playwright-reporter`, which 404s on npm. STATE.md calls it "shipped"                                                                       |
| 6   | `tsconfig.json` has `include: ["src/**/*.ts"]` and `exclude: [... "tests" ...]`                                                                                                          | ~1200 test files and all of `packages/` are **never typechecked**, though "typecheck clean" is an advertised release gate                                                                  |
| 7   | `@playwright/test` is absent from root `devDependencies`                                                                                                                                 | The reporter's `ReporterDescription` type contract is verified nowhere                                                                                                                     |
| 8   | `package.json` is at `0.3.7`; docs claim v0.3.8 shipped; docs cite test counts of 1066 / 1215 / 1228 / 1232 / 1243                                                                       | Version and status drift; no single source of truth                                                                                                                                        |
| 9   | `eslint.config.js` `ignores` includes `scripts/`                                                                                                                                         | `scripts/sync-sarif-version.cjs` runs during release, unlinted                                                                                                                             |
| 10  | Windows `tar --force-local` bug is already fixed in `tests/package-smoke.spec.ts`; `ci.yml` already runs ubuntu + windows + macos                                                        | Two "known gaps" in STATE.md and Upgrade-Plan-v3 are stale                                                                                                                                 |
| 11  | No `impact` command exists in `src/commands/`                                                                                                                                            | Tier 1 ranks this #1: "the #1 reason people install linters once and never again: they don't SEE the value"                                                                                |
| 12  | No `explain` command exists anywhere in `src/`                                                                                                                                           | Findings already carry `why` and `fix` fields — the data exists, the teaching surface does not                                                                                             |
| 13  | Java adapter: 5 rules, C# adapter: 4 rules, both regex-only, no tree-sitter grammar wired (admitted in `src/adapters/csharp.ts` header comment). Python has 12 + 8 rules with a real AST | Playwright language parity gap                                                                                                                                                             |

### Explicitly NOT verified

The session that produced this plan had **no shell access**. Therefore:

- No claim that the suite passes is verified. "Suite green (1243 passed)" is
  the docs' assertion, not a measured result.
- `npm run build`, `npm pack`, and coverage thresholds are unverified.
- **Sprint 0 Task 1 exists solely to replace these assumptions with measurements.**

---

## 2. LAWS IN FORCE (unchanged, and how this plan respects them)

- **Anti-creep law** — every addition to the _launch rule set_ requires an
  equal-size removal. This plan adds commands, output surfaces and
  language-adapter rules, none of which grow the launch set. Same exemption
  reasoning Upgrade-Plan-v3 applied to language expansion. Stated explicitly
  so it is a conscious call, not a silent bypass.
- **Fixture firewall** — no rule ships without must-fire AND must-not-fire fixtures.
- **Frozen contracts** — JSON `schemaVersion: 1`, exit codes 0/1/2/10/20, rule
  IDs immutable. No sprint below may alter these.
- **Determinism** — same input produces the same verdict, evidence, score and
  exit code. Any interactive or cosmetic feature must not violate this.
- **Local-first** — zero network calls during scanning, zero telemetry,
  enforced by `tests/privacy-network-isolation.spec.ts`.

### Deviation recorded against Upgrade-Plan-v3

Upgrade-Plan-v3 explicitly deferred tier-4 "delight" items as
over-engineering. This plan **partially overrides that**, on the following
reasoning: the deferral conflated two different things. Output that helps a
user understand and act on a finding is not candy — if an engineer cannot
tell which finding to fix first, detection quality is wasted. Therefore:

- **Comprehension UX** (Sprint 5) is promoted to beta-critical.
- **Proof-of-value UX** (Sprint 6) is promoted to highest-leverage post-beta work.
- **Pure delight** (Sprint 9) remains last, opt-in, and score-neutral.

---

## 3. SPRINT MAP

| Sprint | Theme                                    | Tasks | Gates beta? |
| ------ | ---------------------------------------- | ----- | ----------- |
| 0      | Ground truth & identity                  | 1–4   | Yes         |
| 1      | Make quality gates cover what they claim | 5–8   | Yes         |
| 2      | Trust claims externally checkable        | 9–12  | Yes         |
| 3      | Governance & documentation truth         | 13–15 | Yes         |
| 4      | Beta readiness                           | 16–18 | Yes         |
| 5      | Comprehension UX                         | 19–22 | Yes         |
| —      | **OPEN BETA GATE**                       | —     | —           |
| 6      | Proof of value (root-cause fix)          | 23–26 | No          |
| 7      | Living docs & workflow integration       | 27–30 | No          |
| 8      | Java/.NET Playwright parity              | 31–37 | No          |
| 9      | Delight & virality (opt-in)              | 38–41 | No          |

### Standing gate — runs at the end of EVERY sprint

No sprint is complete until all of the following pass. A sprint that cannot
clear these does not advance; the failure is fixed or recorded as a
known-unknown with a written reason.

```bash
npm run typecheck        # from Sprint 1 on: covers src + tests + packages
npm run lint             # from Sprint 1 on: includes scripts/
npm test
npm run test:coverage    # floors: lines 95, functions 96, branches 88, statements 95
npm run build
npm run self-scan        # tool scans its own repo; no new error-severity findings
```

Additional gate rules:

- **Golden lock** — `tests/golden/` output must stay byte-identical. Any change
  requires an explicit, reviewed `npm run golden:update` diff. An unreviewed
  score shift is a regression, not an improvement.
- **Contract check** — every sprint verifies `schemaVersion`, exit codes and
  rule-ID immutability did not drift.
- **Corpus audit** — `npm run corpus:audit` (networked) must be clean for any
  sprint that adds or modifies rules.

---

# SPRINT 0 — Ground truth and identity

**Goal:** stop building on assumptions. Establish what is actually true, and
fix the repository-hygiene bugs that silently destroy work.

**Why first:** three of the thirteen verified findings are cases where the
docs asserted something the source contradicts. Every later sprint depends on
this one being real.

### Task 1 — Establish a verified baseline

Run the full standing gate on a real shell, on all three OSes if available.
Record actual pass/fail, actual test count, actual coverage numbers. Fix what
is red. Anything unfixable is logged as an explicit known-unknown, never
rounded to green.

### Task 2 — Repair `.gitignore` and recover the CHANGELOG

Remove the accidental `CHANGELOG.md`, `.gitignore`, `.gitignore` entries from
`qa-doctor/.gitignore`. Confirm tracking with `git check-ignore -v CHANGELOG.md`
and `git ls-files`. Add the changelog if untracked. Add `CHANGELOG.md` to
`package.json` `files` so upgraders receive it.

### Task 3 — Recover the git-ignored source plans

Root `.gitignore` hides `Product.txt`, `Product-MVP.txt` and `Sprint-Plan.txt`,
all three cited by STATE.md as source-of-truth. Decide per file: track it, or
remove it from STATE.md's source list. A source of truth that a fresh clone
cannot see is not a source of truth.

### Task 4 — Correct project identity, URLs and version

Rename the GitHub repo `QA-Dodctor` → `QA-Doctor` (GitHub redirects the old
path; far cheaper before publishing). Fix `package.json`
`repository`/`bugs`/`homepage`, the reporter package's repository field, README
clone instructions and badge links. Make `package.json` the single version
source of truth; verify `scripts/sync-sarif-version.cjs` covers every
hardcoded version surface. Add `docs/PUBLISHING.md` with a release checklist
(version bump → changelog entry → SARIF sync → doc-status update).
**The npm package name stays untouched — parked per §5.**

## QA TESTS — Sprint 0

Author these tests as part of the sprint; they must fail before the fix and
pass after.

| Test                                         | Asserts                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `tests/repo-hygiene.spec.ts` (new)           | `CHANGELOG.md` is tracked and not git-ignored; `.gitignore` does not list itself       |
| `tests/repo-hygiene.spec.ts` (new)           | Every file referenced as a source plan by `.planning/STATE.md` exists and is tracked   |
| `tests/link-integrity.spec.ts` (new)         | No source, config or docs file references `qa-doctor/qa-doctor` or `QA-Dodctor`        |
| `tests/version-consistency.spec.ts` (extend) | Every discovered hardcoded version surface matches `package.json`, not just `sarif.ts` |
| `tests/package-smoke.spec.ts` (extend)       | Packed tarball contains `CHANGELOG.md`                                                 |

**Then run the standing gate.**

### Exit criteria

- Standing gate green with **recorded, dated real numbers** that replace every
  conflicting count in the docs.
- Changelog and source plans tracked; hygiene test guards against recurrence.
- Every URL in `package.json` and the README resolves.
- Deliberately desyncing a version locally makes the gate fail with a clear message.

---

# SPRINT 1 — Make the quality gates cover what they claim

**Goal:** close the gap between advertised and actual gate coverage. An
unchecked gate is worse than a missing one, because it manufactures false
confidence.

### Task 5 — Extend typechecking to tests and packages

Add `tsconfig.test.json` (extends the base config, includes `tests/**` and
`packages/**`, drops the `rootDir` constraint) and wire `typecheck` to run
both configs. Expect real errors: ~1200 files never checked under `strict`,
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` will not be clean.
Fix them. **Do not weaken compiler options to make them pass** — that would
repeat the original mistake in a new form.

### Task 6 — Bring `scripts/` under lint

Remove `scripts/` from the eslint `ignores` list and fix the resulting errors.
Release-critical code must not be the only unlinted code in the repo.

### Task 7 — De-orphan `@qa-doctor/playwright-reporter`

Add `workspaces: ["packages/*"]` to root `package.json`. Add `@playwright/test`
to root `devDependencies` so the reporter's types are actually verified. Wire
its build into the root build. Upgrade
`tests/playwright-reporter-package.spec.ts` to assert the real Playwright
`ReporterDescription` contract rather than a bare tuple shape. Until the npm
name is resolved, replace its README install instruction with an honest
"not yet published — install from source" note.

### Task 8 — Prove publish integrity

Extend `package-smoke.spec.ts` to assert the packed tarball contains
everything a first-run user needs and nothing extra — no `scratch/`, no
`coverage/`, no stray dev artifacts. Verify `npm pack` on all three OSes.

## QA TESTS — Sprint 1

| Test                                                  | Asserts                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run typecheck` (config change)                   | Exits 0 with `tests/**` and `packages/**` included                                         |
| Negative control (manual, documented)                 | A deliberate type error inside a `.spec.ts` is now caught — proof the new coverage is real |
| `npm run lint` (config change)                        | Clean with `scripts/` included                                                             |
| `tests/playwright-reporter-package.spec.ts` (rewrite) | `qaDoctorReporter()` satisfies Playwright's real `ReporterDescription` type                |
| Root build test                                       | `npm ci && npm run build` builds both root and workspace packages                          |
| `tests/package-smoke.spec.ts` (extend)                | Tarball contains required files and excludes `scratch/`, `coverage/`, dev artifacts        |

**Then run the standing gate** (now meaningfully wider than in Sprint 0).

### Exit criteria

- Gates cover `src`, `tests`, `packages` and `scripts` — no unchecked code remains.
- Reporter is a real, buildable, type-verified workspace member.
- End-to-end demo: a real `playwright.config.ts` uses the built reporter to emit
  `qa-doctor.report.json`, which `qa-doctor forensics` then ingests.

---

# SPRINT 2 — Make trust claims externally checkable

**Goal:** move every accuracy claim from "asserted in prose" to "reproducible
by a stranger".

### Task 9 — Run and commit the Python FP-audit baseline

Execute `npm run corpus:audit:update` (requires network). **Manually review
every new finding for legitimacy before committing** — an unreviewed baseline
launders false positives into "expected". Then confirm non-update mode passes.

### Task 10 — Publish FP-audit results, generated not hand-written

Add a script that reads `tests/corpus/baseline/*.json` and emits a markdown
accuracy table (rule ID, per-repo finding counts, last updated) into the README
or a generated docs page, plus the "don't trust our numbers, run this yourself"
instructions. Generated from the baselines so it cannot drift.

### Task 11 — Publish the self-scan result as an artifact

The `self-scan` CI gate already exists. Surface its score and findings publicly
via the existing `badge` command and/or a committed report. A project that
audits its own suite and shows the result openly is stronger proof than any
prose claim, and the mechanism already exists.

### Task 12 — Verify evidence metadata reaches every reporter

Upgrade-Plan-v3's trust item #2 requires `confidence`/`evidenceLevel` to appear
in user-visible output, not just internal types. Audit the human, JSON, SARIF
and markdown reporters.

## QA TESTS — Sprint 2

| Test                                             | Asserts                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `npm run corpus:audit`                           | Green against the newly committed, manually reviewed baseline                                 |
| FP-table generator unit test                     | Produces valid markdown from a fixture baseline file                                          |
| CI step assertion                                | Self-scan artifact is produced and parseable                                                  |
| `tests/reporter-evidence-contract.spec.ts` (new) | **Every** finding in **every** reporter format surfaces its evidence level, not just severity |

**Then run the standing gate.**

### Exit criteria

- Every accuracy claim reproducible with one public command.
- Real per-rule numbers visible to a prospective adopter before they install.
- The same finding rendered in all four formats, each showing its evidence level.

---

# SPRINT 3 — Governance and documentation truth

**Goal:** make the docs match the source, and give a second contributor a path in.

### Task 13 — Add `CONTRIBUTING.md`

Dev setup, every gate command, the anti-creep and fixture-firewall laws (link,
don't duplicate), how to propose a rule or plugin, PR expectations. Must
document the `create-rule` scaffold's intentional behavior: it emits a
findings-free stub so fixtures fail until real logic lands (anti-creep §18.1) —
surprising and alarming without explanation.

### Task 14 — Add a rule deprecation / lifecycle policy

Distinct from anti-creep, which governs launch-set growth. Define the path for
retiring or downgrading a shipped rule found conceptually wrong: severity
downgrade to `info` or disabled-by-default, immutable-ID contract preserved,
mandatory changelog entry. Include a worked example another engineer could
follow unaided.

### Task 15 — Documentation truth pass

Rewrite `.planning/STATE.md` from Sprint 0's verified baseline. Archive
`Implementation-Master-Plan.txt` as superseded. Remove the stale Windows-tar
and reporter "gaps". Correct the README's "TypeScript and Python today" line,
which understates the shipped Java and C# adapters.

## QA TESTS — Sprint 3

| Test                                          | Asserts                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `tests/docs-consistency.spec.ts` (new/extend) | Rule counts and language lists in README and STATE.md match the actual rule registry    |
| `tests/docs-consistency.spec.ts`              | No doc claims a gap that source contradicts (guards the class of bug in findings 3, 10) |
| Onboarding dry run (documented)               | A newcomer goes clone → green local gate using only `CONTRIBUTING.md`                   |

**Then run the standing gate.**

### Exit criteria

- Every status claim in the docs traceable to a source file or gate output.
- Docs can no longer drift from the registry without a test failing.

---

# SPRINT 4 — Beta readiness

**Goal:** make the stranger's first ten minutes work on a real machine.

### Task 16 — Clean-machine first-run validation

On a fresh environment per OS: install the packed tarball and walk the **entire
README command table**, verifying each documented command works as described.
Fix or remove any that do not. There are ~14 documented commands; each is a
promise.

### Task 17 — Open the beta feedback channel

GitHub issue templates: bug, **false positive**, rule request, language
request. Consistent with the zero-telemetry guarantee — signal comes from
issues and outreach, never from a network call added to the scan path. The
false-positive template matters most: FP reports are the highest-value beta signal.

### Task 18 — Prepare provenance publishing (blocked on the parked name)

Write the `release.yml` `npm publish --provenance` step with `id-token: write`
permission, plus a runbook for the one-time npmjs.com trusted-publisher (OIDC)
setup, which is an account-level action that cannot be automated from this
repo. Keep it gated until the name is resolved. Note: `release.yml` currently
never publishes to npm at all — it only packs a tarball onto a GitHub Release.

## QA TESTS — Sprint 4

| Test                                             | Asserts                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Per-OS first-run checklist (documented artifact) | Every documented command verified on Linux, macOS and Windows from a packed tarball                                          |
| `tests/readme-commands.spec.ts` (new)            | Every command in the README table is a real, dispatchable CLI subcommand — docs cannot promise a command that does not exist |
| Issue-template render check                      | Templates render correctly on the real repo                                                                                  |
| `release.yml` review                             | Workflow is valid and the publish step is intentionally gated, not accidentally live                                         |

**Then run the standing gate.**

### Exit criteria

- Every documented command verified on a clean machine, all three OSes.
- Feedback channel live before users arrive.
- Publish path written, reviewed and safely inert pending the name decision.

---

# SPRINT 5 — Comprehension UX (beta-critical)

**Goal:** a first scan produces not just correct findings but an obvious next
action. This sprint is the override of Upgrade-Plan-v3's tier-4 deferral,
justified in §2.

**Context:** the terminal output is already strong — `theme.ts` provides
palettes, gauges, box drawing, ANSI-aware width measurement, `NO_COLOR`
support and color-blind-safe symbols; `terminal.ts` renders a score gauge,
per-category diagnostics and a deduction table that reconciles with the score.
This sprint is not about color. It is about comprehension and action.

### Task 19 — Ship `qa-doctor explain <RULE-ID>`

Implements `Plan.md` Sprint 1.3. For any rule or finding, render: what is
wrong, why it matters in production, the evidence behind the verdict, evidence
level and confidence, the prescription, and how to verify the fix. All source
data already exists (`why`/`fix` on findings, `RuleMeta` trust fields) — this
is a presentation layer, not new detection.

### Task 20 — "Fix this first" prioritization

Rank findings by score-gain-per-effort rather than raw severity, and surface
the top three with their point value. Today the output says what is wrong but
not where to start — the most common reason linter output goes unread.
Display-only: must not alter scores.

### Task 21 — Empty states and first-run guidance

Make every dead end actionable: no tests found, framework unknown, no
`test-results/` for forensics, zero findings. Each explains what happened and
what to do next, never a bare exit code. Include an explanatory note when
`create-rule` generates its deliberately-failing stub.

### Task 22 — Terminal robustness across real environments

Verify and fix: narrow-terminal reflow (box helpers currently assume width), a
`--width` override, `cmd.exe`/legacy-console fallback for box-drawing and emoji
glyphs on Windows, and clean CI log rendering without ANSI. This is
reliability, not polish — a garbled first run reads as a broken tool.

## QA TESTS — Sprint 5

| Test                                         | Asserts                                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `tests/explain.spec.ts` (new)                | `explain` returns real content for **100% of registered rule IDs** — no rule can ship unexplainable |
| `tests/explain.spec.ts`                      | Snapshot stability per rule (determinism law)                                                       |
| `tests/prioritization.spec.ts` (new)         | "Fix this first" ordering is deterministic for identical input                                      |
| Golden lock                                  | Byte-identical — prioritization and explain are display-only, scores unchanged                      |
| `tests/empty-states.spec.ts` (new)           | Each dead-end path emits guidance text **and** the documented exit code (frozen contract intact)    |
| `tests/terminal-render.spec.ts` (new/extend) | Legible output at 40 / 80 / 120 columns, under `NO_COLOR`, non-TTY, and ASCII-only fallback         |

**Then run the standing gate.**

### Exit criteria

- Every rule explainable via one command, offline.
- Every scan ends with a prioritized, actionable next step.
- Output legible in `cmd.exe`, at 40 columns, under `NO_COLOR`, and in CI logs.

---

# ▓▓▓ OPEN BETA GATE ▓▓▓

Do not ship publicly until **all** of the following hold:

- [ ] Sprints 0–5 complete, each having passed its own QA tests and the standing gate.
- [ ] Standing gate green on Linux, macOS and Windows, with recorded real numbers.
- [ ] Every documented command verified on a clean machine from a packed tarball.
- [ ] Every published accuracy claim reproducible via one public command.
- [ ] No documentation claim contradicted by a source read.
- [ ] Remaining unknowns listed **as unknowns**, per §1.
- [ ] npm distribution name resolved (§5) — the one blocker this plan cannot close.

---

# SPRINT 6 — Proof of value (the root-cause fix)

**Goal:** solve the deepest structural QA pain — engineers cannot prove their
work mattered to the people who control headcount and timelines.

**Why this is the highest-leverage sprint in the plan:** Tier 1 names it
directly as the #1 reason quality tools get installed once and abandoned. This
is the difference between a tool people try and a tool people keep.

### Task 23 — Ship `qa-doctor impact`

Parse local git history plus locally available CI artifacts to answer "what
would have burned you": tests that failed in CI but are skipped in code,
`continue-on-error` jobs that actually failed, hard sleeps removed since being
flagged, flaky tests that blocked merges.

**Hard constraint (honesty core):** every number is evidence-backed or reported
UNKNOWN. No estimated or extrapolated savings. An invented "2,340 CI minutes
saved" would destroy exactly the credibility this product sells. Local-only,
zero network.

### Task 24 — Trust regression over time (`baseline` / `diff`)

Implements `Plan.md` Phase 10 and §24's key insight: existing debt should not
block every PR — **new or worsened** debt should. Store a baseline, compare,
report deltas.

### Task 25 — PR feedback loop

Audit the existing `qa-doctor.yml` workflow, then deliver a PR comment showing
only what changed, built on Task 24 and the existing `--scope changed`.
Findings must arrive where the work happens, not in a terminal nobody re-runs.

### Task 26 — `qa-doctor stats`

Local-only cumulative counters ("47 hard sleeps removed all-time"). No
telemetry. Honest about what it cannot know.

## QA TESTS — Sprint 6

| Test                                               | Asserts                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `tests/impact.spec.ts` (new)                       | Correct output against fixture git repos with known history                                                        |
| `tests/impact.spec.ts`                             | **Reports UNKNOWN when data is absent** — never zero, never a guess. The single most important test in this sprint |
| `tests/privacy-network-isolation.spec.ts` (extend) | `impact` and `stats` make zero network calls                                                                       |
| `tests/baseline-diff.spec.ts` (new)                | Baseline round-trip; regression detection; deterministic output                                                    |
| `tests/pr-comment.spec.ts` (new)                   | Comment rendering against fixture scan results                                                                     |
| Contract check                                     | New commands respect frozen exit codes and JSON schema                                                             |

**Then run the standing gate.**

### Exit criteria

- A real impact report on this repo's own history, with honest UNKNOWNs.
- Two commits compared, showing exactly what a PR made worse.
- A real PR receiving a scoped, actionable comment.

---

# SPRINT 7 — Living docs and workflow integration

**Goal:** make the rule base teach, and put findings where engineers already work.

### Task 27 — Auto-generate rule documentation

Closes a standing Definition-of-Done gap. Generate one page per rule from
`RuleMeta` plus its **actual fixtures**, including why it matters, the fix,
false-positive risk, and corpus-measured accuracy from Task 10. Docs generated
from fixtures can never drift from behavior.

### Task 28 — Editor integration via SARIF

Document consuming `--format sarif` in VS Code and JetBrains so findings appear
inline; optionally a thin VS Code extension later. Deliberately aligned with
the tier-4 anti-scope rules: **no dashboard server, no GUI app.**

### Task 29 — README hero asset

Closes the last DoD gap: an asciinema recording or GIF of a real scan,
reproducible from `examples/demo-repo`.

### Task 30 — Anti-pattern catalog content

"Why this fails in production" war-story sections for the top 20 rules, built
on Task 27's generated pages. This is the organic-adoption engine Tier 1 #4
describes.

## QA TESTS — Sprint 7

| Test                             | Asserts                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `tests/rule-docs.spec.ts` (new)  | Generator covers **100%** of registered rules; CI fails if any rule lacks a page |
| `tests/rule-docs.spec.ts`        | Generated examples come from real fixtures, not hand-written prose               |
| SARIF integration check          | Emitted SARIF validates and loads in an editor consumer                          |
| Hero-asset reproducibility check | The documented command reproduces the asset's output                             |

**Then run the standing gate.**

### Exit criteria

- Every rule has a generated page whose every claim traces to executable code.
- Findings appear inline in an editor at the exact line.

---

# SPRINT 8 — Java/.NET Playwright parity

**Goal:** support all four officially supported Playwright languages at equal
depth. Deliberately post-beta: this adds false-positive surface and should land
on a stabilized, well-instrumented base.

**Current state:** Java 5 rules, C# 4 rules, both regex-only. Python has 12 + 8
with a real tree-sitter AST. Target: 13 rules per language plus AST parity.

**Research constraints already established:**

- **.NET Playwright is async-only** (`GotoAsync`, `ClickAsync`) — there is no
  sync API, so the sync/async-mix rule has **no C# equivalent** and must be
  dropped, not forced.
- **JUnit, TestNG, NUnit and xUnit each need distinct retry detection** —
  TestNG has a first-class `retryAnalyzer`, NUnit has `[Retry(n)]`, JUnit needs
  a rerun-extension convention, xUnit requires a third-party package. One regex
  cannot cover these honestly.
- **`page.route()` blanket-mock detection ports cleanly** across all four languages.
- **Grammars must be WASM** (`tree-sitter-wasms`), never native bindings —
  native compilation would break the cross-platform and zero-network guarantees.

### Task 31 — Idiom-mapping spike

Document exact Java and C# syntax for each missing rule meaning **before**
writing code, including every rule that does not port 1:1. Output is a reviewed
table the following tasks implement mechanically.

### Task 32 — Java core-family rules (QA-JV-106/107/108)

Brittle selectors, networkidle wait, hardcoded URL. Fixture pairs each.

### Task 33 — C# core-family rules (QA-CS-105/106/107/108)

The same three plus `WaitForTimeoutAsync`. Fixture pairs each.

### Task 34 — Retry/flake masking, both languages (QA-JV-109, QA-CS-109)

Per-framework detection from Task 31. Highest research cost in this sprint.

### Task 35 — Remaining layers, both languages

Blanket route mocking, failure-artifact config, single-browser matrix, and
absence-based a11y coverage (`falsePositiveRisk: high`, severity `info`,
matching QA-PW-145's honesty treatment).

### Task 36 — Tree-sitter WASM AST for Java, then C#

Add `tree-sitter-java` and `tree-sitter-c-sharp` behind the existing
`ast?: unknown` seam, mirroring `ts-ast.ts`'s parse-or-fallback design. Migrate
the highest-FP-risk rules per language. Closes the gap `src/adapters/csharp.ts`
admits in its own header.

### Task 37 — Corpus audit and integration

Add real repos to `tests/corpus/audit.ts` — starting proposal
`microsoft/playwright-java` and `microsoft/playwright-dotnet`, with the caveat
that these are library suites rather than consumer apps, so swap if better
candidates emerge. Review findings, commit baselines, update STATE.md.

## QA TESTS — Sprint 8

| Test                                    | Asserts                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Fixture firewall (per rule)             | must-fire AND must-not-fire fixture for every new rule — no exceptions                                   |
| `tests/rules.registry.spec.ts` (extend) | ID regex and validation cover all new QA-JV / QA-CS IDs                                                  |
| Adapter test matrix                     | File discovery per ecosystem convention; framework detection (JUnit vs TestNG, NUnit vs xUnit vs MSTest) |
| End-to-end adapter scan                 | A small real sample project per language scans correctly                                                 |
| Golden lock                             | Byte-identical before/after the AST migration — a score shift is a regression                            |
| AST fallback test                       | Malformed source degrades to regex, never crashes (crash isolation §25)                                  |
| `npm run corpus:audit`                  | Green with reviewed baselines for every new rule                                                         |
| Security review                         | New grammar dependencies pinned and audited; untrusted-repo parsing safe                                 |

**Then run the standing gate.**

### Exit criteria

- One scan of a mixed TS + Python + Java + C# repo produces correctly attributed
  findings across all four languages with consistent severity, confidence and
  evidence metadata.

---

# SPRINT 9 — Delight and virality (opt-in, brand-safe)

**Goal:** earn sharing without spending credibility. Every item here is
opt-in and **must not** alter scores, exit codes or the JSON schema.

### Task 38 — `--format mermaid`

Test-architecture diagram (layers, types, gaps). Ranked first among delight
items because it is genuinely useful to QA leads presenting to stakeholders,
not merely decorative.

### Task 39 — Milestones

Extend the existing `TROPHY` flawless-victory path modestly: first clean scan,
first debt reduction. Cheap, screenshot-able, already half-built.

### Task 40 — `--roast` mode — opt-in, never default

**Recommended with a caveat to weigh:** personality drives sharing, but this
product's brand is honest professional evidence and its buyers include
enterprise QA leads. A roast that mocks a named engineer's file can end an
evaluation. Constrain it to mocking **the pattern, never the person or the
repo's authors**. Consider shipping as `--tone=blunt` rather than comedy.

### Task 41 — Interactive finding navigation (j/k) — recommend deferring

**Honest engineering caveat:** an interactive TTY surface is hard to test
deterministically and sits in direct tension with the determinism law and
golden-lock discipline. It carries ongoing maintenance cost for modest gain
versus Task 28's editor integration, which serves the same need inside tools
people already use. Build only on demonstrated demand.

## QA TESTS — Sprint 9

| Test                                 | Asserts                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `tests/mermaid-format.spec.ts` (new) | Valid, deterministic Mermaid output                                      |
| Score-neutrality test                | Every delight flag leaves score, exit code and JSON schema **identical** |
| `tests/roast.spec.ts` (new)          | Off by default; opt-in only; no output targets a person or author name   |
| Golden lock                          | Unaffected by all delight features                                       |

**Then run the standing gate.**

---

## 4. DEFINITION OF DONE — stabilized and trustworthy

- Every gate (typecheck, lint, test, coverage, build, self-scan, corpus audit,
  package smoke) green on Linux, macOS and Windows, with recorded real numbers.
- Gates cover `src`, `tests`, `packages` and `scripts` — no unchecked code.
- Every documented command verified on a clean machine.
- Every accuracy claim reproducible via one public command.
- No documentation claim contradicted by a source read.
- Every rule is explainable and has a generated doc page.
- Every scan ends with a prioritized, actionable next step.
- Output legible at 40 columns, in `cmd.exe`, under `NO_COLOR`, and in CI logs.
- `impact` reports only evidence-backed numbers, marking gaps UNKNOWN.
- All delight features opt-in and score-neutral.
- Remaining unknowns listed explicitly as unknowns.

---

## 5. PARKED DECISION — npm distribution name

**Status:** deferred by explicit decision. Tracked, not forgotten.

The npm name `qa-doctor` belongs to an unrelated project. Consequences:
`npm publish` fails 403; the README's headline command runs another vendor's
software; npm badges show a stranger's stats.

Options:

1. **Scoped package under an account you own** (recommended) — e.g.
   `@<scope>/qa-doctor`, keeping `bin: { "qa-doctor": ... }` so users still get
   a `qa-doctor` command. Scoped names are always available to their owner, so
   this unblocks distribution immediately; only the install string is longer.
2. **Rename the product.**
3. **Acquire the existing name** — slow, and may simply fail.

Sprints 0–9 de-risk everything else. Public distribution stays blocked until
this is resolved, because `npx qa-doctor@latest` currently installs and runs
software this project does not control.
