---
name: change-gate
description: Map a diff to the minimum set of Mjölnir checks that can catch a regression in it, instead of running the whole 8-minute suite. Use before finishing any change to rules, fixtures, CLI verbs, npm scripts, gates, CI workflows, generated docs, the claim registry, release machinery or the JSON report contract.
---

# Map a diff to the checks that cover it

`npm run check` is the pull-request path and it takes about eight minutes —
the test suite is roughly 79 % of that and all 38 gates together are 100
seconds. The number is capped at twelve leaves by
`scripts/check-entry-points.mjs`, and `npm run certify` must stay a superset of
it.

So: run the whole path when the diff touches something structural, and the
narrow set when it does not. What is not acceptable is running the cheap set
and reporting it as if it were the full path.

## Find the changed paths first

```
git diff --name-only HEAD
git diff --name-only origin/main...HEAD
```

Then read the row that matches what changed. Start from the top of the table
and stop at the first match unless a second row also applies.

## The map

| Changed path | Run |
| --- | --- |
| `src/rules/**`, `src/rules/index.ts` | `npm run frontier:contracts`, `npm run check-fixture-quad`, `npm run rules:quality:check`, `npm run test`, `npm run detector-hashes:update`, `npm run docs:regen`, `npm run self-scan` |
| `tests/fixtures/**` | `npm run check-fixture-quad`, `npm run test` |
| `src/cli.ts`, `src/commands/**`, `action.yml`, `action-pr.yml` | `npm run check-cli-contract`, `npm run verbs:budget`, `npm run ci-local:parity` — the CLI contract is frozen |
| `package.json` scripts, anything in `scripts/**` | `npm run scripts:reachable`, `npm run script:paths`, `npm run entry-points:check`, `npm run gates:check`, `npm run config:consumers` |
| A new or renamed gate in `gates/*.json` | `npm run gates:check`, `npm run gates:claim-integrity` |
| `.github/workflows/**`, `action.yml` | `npm run workflow:scripts`, `npm run ci:standard`, `npm run ci-local:parity` |
| README, `docs/**` prose, `site/**` | `npm run docs:regen`, `npm run claims:prose`, `npm run check-concepts` |
| `CLAUDE.md` or the laws | `npm run frontier:contracts` — `docs-consistency` reads the law text verbatim and asserts the quoting sites moved with it |
| `docs/claim-registry.json`, any documented capability | `npm run claims:check`, `npm run claims:revalidate`, `npm run claim:budget` |
| `src/v6/**`, capability registry, QA-IR | `npm run registry:check`, `npm run qa-ir:parity`, `npm run docs:provenance-drift` |
| Release machinery, `candidate-trust-manifest.json` | `npm run candidate:manifest:check`, `npm run release:verify`, `npm run check-version` |
| Anything touching scoring, thresholds or severity | `npm run thresholds:parity`, `npm run report:honesty`, `npm run golden:update` (read the diff) |
| `src/mcp/**` | `npm run test:mcp:parity` |
| **Anything you are not sure about** | `npm run check` |

## Before finishing, always

```
npm run lint
npm run typecheck
```

These are two of the twelve leaves precisely because a contributor needs a
failing lint that says which file. Do not fold them into the row above.

## Escalating to the full path

Run `npm run check` — not the subset — when the diff changes any of these,
because each one invalidates a count or a contract that many gates read:

- the number of shipped rules, or any rule's `tier` or `severity`;
- the set of npm scripts or CLI verbs;
- the JSON report contract (`schemaVersion: 1`) or the exit-code map;
- any gate's tier or id in `gates/*.json`;
- a generated artifact that a gate compares byte-for-byte.

A severity downgrade legitimately changes every score where that rule fired, so
a tier or severity change is an escalate-everything change even when the diff
looks local. Run `npm run golden:update` deliberately, then read the diff and
be able to explain each changed line.

## For a release

```
npm run certify        # the superset: check + claims + integrity + coverage + contract
```

`npm run certify:fast` is the honest middle — build, lint, typecheck, and the
integrity gates, without the coverage run. Use it when iterating toward a
release; use `certify` for the thing you are actually cutting.

## Report what you ran

State the commands and their exit codes, and name the ones you skipped. "I ran
the rule gates" is a report. "Checks pass" when only the rule gates ran is a
claim the evidence does not carry — see the `evidence` skill.

## Token efficiency rules

- Do not read a file to decide which row applies. `git diff --name-only` is
  the whole input.
- Run gates in one shell invocation chained with `&&` rather than
  round-tripping per script; a failing gate short-circuits the rest, which is
  the information you wanted anyway.
- Report pass/fail per gate, not the output of each gate.