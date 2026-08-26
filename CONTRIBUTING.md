# Contributing to QA Doctor

Thanks for considering a contribution. This document covers dev setup,
every quality gate command, the two laws that govern rule changes, how
to propose a rule or plugin, and what a PR needs before review.

## Dev setup

```bash
git clone https://github.com/Sergey-Bar/QA-Doctor
cd QA-Doctor/qa-doctor
npm ci
```

Requires Node `>=22.18` (see `engines` in `package.json` — `tsdown`,
the build tool, requires it; there is no Node 20 path).

## The standing gate

Every one of these must pass before a PR is ready for review. Run them
in this order — later ones assume earlier ones already passed:

```bash
npm run typecheck        # tsc, twice: src/ (strict, ships in dist/),
                          # then tests/+packages/ (tsconfig.test.json)
npm run lint              # eslint . && prettier --check .
npm test                  # vitest run — full suite, ~1650+ tests
npm run test:coverage     # vitest run --coverage — floors enforced
npm run build              # tsdown src/cli.ts, then any workspace package
npm run self-scan          # the tool scans its own repo — must add
                            # zero NEW error-severity findings
```

Additional gates that only apply when your change touches rules or
scoring:

- **Golden lock** — `tests/golden/` output must stay byte-identical.
  If your change legitimately shifts a score or a finding count, run
  `npm run golden:update` and include the diff in your PR description
  with an explanation. An **unreviewed** score shift is a regression,
  not an improvement — never run `golden:update` and commit it without
  reading what changed.
- **Corpus audit** — `npm run corpus:audit` (networked; clones a small
  set of real OSS repos) must stay green for any PR that adds or
  modifies a rule's detection logic. It fails if a rule fires _more_ on
  real code than the last reviewed baseline — that's a false-positive
  regression signal, not a crash. If the new findings are legitimate,
  manually read each one, then `npm run corpus:audit:update` and include
  what you reviewed in the PR description.
- **FP-audit docs** — after a reviewed `corpus:audit:update`, regenerate
  `docs/FP-AUDIT.md` with `npm run fp-audit:generate` so the committed
  docs page doesn't drift from the baseline that produced it.

## The two laws

Full context lives in
[`docs/plans/Master-Stabilization-Plan.md`](docs/plans/Master-Stabilization-Plan.md#2-laws-in-force-unchanged-and-how-this-plan-respects-them) —
this section is a summary, not the source of truth; read that doc if
your change is close to either line.

- **Anti-creep law** — every addition to the **launch rule set**
  requires an equal-size removal. This exists so the tool doesn't
  become a 300-rule linter nobody can hold in their head. It does
  **not** apply to new language adapters, new output surfaces, or new
  non-scoring commands (`explain`, `impact`, etc.) — those are opt-in
  surface, not launch-set growth. If you're unsure whether your change
  counts, say so explicitly in the PR rather than assuming an exemption.
- **Fixture firewall** — no rule ships without **both** a must-fire
  fixture (proves the rule catches the pattern) and a must-not-fire
  fixture (proves it doesn't catch adjacent, innocent code). No
  exceptions, including for "obviously correct" rules — the
  must-not-fire fixture is what has caught every real false-positive
  bug in this codebase's history.

## Proposing a new rule

1. Run `qa-doctor create-rule <ID> --title "..."` (e.g.
   `QA-PW-150`). This scaffolds the rule file and both fixture
   directories.
2. **The generated rule is deliberately broken.** It returns zero
   findings on purpose, so `npm test` fails on the must-fire fixture
   until you implement real detection logic — you cannot ship a stub.
   This is intentional (anti-creep law §18.1 enforcement at the tooling
   level), not a bug in the scaffold. If you ran `create-rule` and
   immediately saw a failing test, that's the scaffold working
   correctly.
3. Implement `run()` in the generated rule file, replacing both fixture
   skeletons with real must-fire/must-not-fire cases (not the
   placeholder comment the scaffold writes).
4. Declare Trust Metadata on the rule (`falsePositiveRisk`,
   `detectionStrategy`, `introduced` — see `src/rules/rule.ts`'s
   `RuleMeta` for the full field list and `src/rules/playwright/qa-pw-145-no-a11y.ts`
   for a rule that's honest about being absence-based and high-FP-risk).
5. Register the rule in `src/rules/index.ts` (the scaffold prints the
   exact import + array line to add).
6. Run the standing gate. If your rule detects a pattern likely to
   appear in real code, run `npm run corpus:audit` and review any new
   findings before merging.

## Proposing a plugin

Third-party rule packages are declared in a consuming project's
`qa-doctor.config.json` (`"plugins": [...]`) and loaded via
`src/plugins/load.ts`. Security model: **no sandbox** — a plugin runs
with the same trust level as an ESLint or Vitest plugin in your own
project. Core rule-ID prefixes (`QA-TEST`, `QA-TQUAL`, `QA-PW`, `QA-CI`,
`QA-PY`, `QA-JV`, `QA-CS`, `QA-ENV`, `QA-PLUGIN`) are reserved and
rejected if a plugin tries to claim them. A plugin that fails to load
degrades honestly — it emits a `QA-PLUGIN-000` warning and does not
otherwise affect the scan or exit code.

## Rule lifecycle / deprecation

Retiring or downgrading a shipped rule found conceptually wrong follows
a distinct policy from the anti-creep law above (that law governs
_adding_ to the launch set; this governs _removing or weakening_ what's
already shipped). See
[`docs/RULE-LIFECYCLE.md`](docs/RULE-LIFECYCLE.md) for the process and
a worked example.

## Releasing

Maintainers: see [`docs/PUBLISHING.md`](docs/PUBLISHING.md) for the
release checklist and the npm-provenance publishing runbook.

## PR expectations

- Keep PRs scoped to one concern. A rule addition and an unrelated
  refactor belong in separate PRs.
- Include the standing-gate output (or note which gate you couldn't run
  and why) in the PR description.
- If your change touches `qa-doctor.config.json`'s suppressions, explain
  what would otherwise have false-positived and why the suppression is
  scoped correctly (see the existing entries for the expected level of
  justification).
- Frozen contracts (`schemaVersion: 1`, exit codes `0`/`1`/`2`/`10`/`20`,
  rule IDs) are immutable. A PR that would change any of them needs a
  version bump and a `CHANGELOG.md` entry, not a silent edit.
