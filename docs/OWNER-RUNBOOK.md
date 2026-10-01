# Owner-runbook — the identity-bound inventory

Product-gap-remediation master plan P9 (plan 1788853205786, decision
10): every operation that requires the founder, enumerated. Each entry
is either **runbooked** (exact steps, delegable once identity is
granted) or **identity-bound** (irreducible by design — platform 2FA /
account ownership). Refreshed every release (see
[BUS-FACTOR-AUDIT](BUS-FACTOR-AUDIT.md)).

The operating principle: _identity-bound is honest_ — pretending an
operation is delegable when the platform binds it to one account is the
same lie as a fabricated verdict. The goal is to shrink the list, not
hide it.

## Publishing & registries

| Operation                            | Status         | Notes                                                                                                   |
| ------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------- |
| npm publish (`mjolnir-qa`)           | identity-bound | 2FA + provenance OIDC bind to the owner's npm account; release role runs everything up to `npm publish` |
| npm dist-tags (`next`, `latest`)     | runbooked      | docs/PUBLISHING.md §dist-tags; delegable with npm collaborator grant                                    |
| GitHub Release publish               | runbooked      | release.yml automates; the human step is reviewing generated notes                                      |
| Marketplace listing publish          | identity-bound | GitHub binds publishing to account admin; draft + screenshots are prepared in DISTRIBUTION-KIT.md       |
| Smithery / PulseMCP / mcp.so entries | identity-bound | Account-verified submissions; payload prepared in DISTRIBUTION-KIT.md                                   |
| awesome-* PR submission              | runbooked      | Bodies drafted in DISTRIBUTION-KIT.md; submit from any maintainer GitHub account                        |

## Repository & site

| Operation                         | Status         | Notes                                                                |
| --------------------------------- | -------------- | -------------------------------------------------------------------- |
| Branch protection / repo settings | identity-bound | GitHub admin                                                         |
| CODEOWNERS changes                | runbooked      | PR + owner review (the file exists precisely so changes are visible) |
| Pages deploy (site)               | runbooked      | pages workflow, automatic on main; owner attention only on failures  |
| Custom domain / DNS               | identity-bound | Registrar account (currently none — sergio-bar.github.io)            |

## Corpus & adjudication

| Operation                               | Status                                  | Notes                                                                                    |
| --------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| Corpus repo additions (clone cache)     | runbooked                               | scripts/corpus-sample.ts selects; the clone step is mechanical                           |
| Verdict classification                  | **delegable — the core P9 deliverable** | ADJUDICATION-KIT.md; a trained classifier adjudicates to the same standard               |
| Baseline `--update` after adjudication  | runbooked                               | corpus:audit --update; reviewed by rule-owner                                            |
| Lawbook amendments (A1–A4, Laws, L1–L6) | identity-bound                          | Owner-ratified by construction (CERTIFICATION-POLICY); propose via issue, owner ratifies |

## Security & trust

| Operation                           | Status         | Notes                                                                                             |
| ----------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| SECURITY.md private-key responses   | identity-bound | Security reporter trust; see SUPPORT.md routing — triage may acknowledge, only owner may assess   |
| Suppression overrides (owner tiers) | identity-bound | explicit ISO `expires` dates are the bounded-expiry guardrail; owner override is a deliberate act |
| Signing keys / provenance           | identity-bound | npm OIDC + GitHub release signing bind to the owner account                                       |

## Gates a second maintainer runs identically

`npm run certify` is the whole chain; `npm run certify:ci` is the CI form and
differs only in the coverage invocation. Both exit non-zero on any failure.

**The claim-integrity group** (`npm run gates:claim-integrity`) is the one to
run first when a gate disagrees with the tree — each of its eleven steps names
its own gate in the failure, so you never have to bisect a long chain.
`npm run script:paths` runs immediately before it and is listed here because
it is the gate that most often explains the next failure:

| Command                            | What it refuses                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run script:paths`             | A doc or comment pointing at a script file that does not exist, or one nothing has committed                                            |
| `npm run workflow:scripts`         | A workflow step running an `npm run <script>` the manifest at that step's cwd does not define                                           |
| `npm run config:consumers`         | Root-level configuration no command and no declared external consumer reads                                                             |
| `npm run scripts:reachable`        | An npm script no workflow reaches and `docs/MANUAL-SCRIPTS.md` does not declare manual                                                  |
| `npm run check-unimported-modules` | A module in `src/` that nothing imports and is not on the disclosed orphan list                                                         |
| `npm run check-cli-contract`       | A verb with no disposition, a doc naming a removed verb, two npm names for one command, or an `npm run <name>` that resolves to nothing |
| `npm run check-detector-hashes`    | A committed `tests/corpus/detector-hashes.json` that no longer matches the rule sources                                                 |
| `npm run qa-ir:parity`             | Two adapters normalising the same test to different IR terms                                                                            |
| `npm run check-fixture-quad`       | A capability advertising `M3_FIXTURE_VERIFIED` with no complete fixture quad behind it                                                  |
| `npm run rules:promotion:check`    | The launch set growing, or the unmeasured backlog growing, past `docs/RULE-PROMOTION-LEDGER.json`                                       |
| `npm run docs:provenance-drift`    | A provenance-stamped artifact whose CONTENT no longer matches its generator                                                             |

**Naming is a contract, not a habit.** `docs/cli-contract.json` carries one
disposition per CLI verb, and `npm run check-cli-contract` enforces it. The
npm side has the same rule with one deliberate exception: a check arm and a
write arm of the same generator (`ledger:check` / `ledger:write`) is a declared
convention in eleven places, each accounted for in `docs/MANUAL-SCRIPTS.md`, so
the gate fails on **two names for the same command** and not on two names for
the same file.

**The ratchets that must be lowered by hand**, and what a failure means:

| Ratchet                           | How to move it                                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/ANTI-CREEP-BASELINE.json`   | Down on a demotion. Up needs an `ANTI-CREEP-EXCEPTION` line in the UNRELEASED `CHANGELOG.md` entry **and** the lower value in the same commit. |
| `docs/RULE-PROMOTION-LEDGER.json` | Down on progress. The baseline also holds `unmeasuredIds`, so a regression names the rules that joined the backlog rather than the whole list. |

**One release gate that answers a different question**, so it is not in the
claim-integrity chain: `npm run check-version`. It used to be five npm names —
`version:check` over `version:surface:check`, `reporter:version-check`,
`changelog:check` and `changelog:unreleased` — and the collapse is worth knowing
about because the two changelog arms answer different questions and take
different flags. `scripts/check-version.mjs` dispatches them explicitly, in
this order, stopping at the first failure:

| Arm              | What it refuses                                                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| version surface  | An executable surface naming the working candidate instead of the published stable — `v5.0.0-rc.1` is not on the registry, and an Action that fetches it 404s                                                                    |
| reporter version | The published Playwright reporter package disagreeing with the root version                                                                                                                                                      |
| changelog        | The CHANGELOG's own consistency: released-version heading, descending semver order, dates, empty sections. Takes `--expect-version` and `--rules-touched`                                                                        |
| unreleased entry | A user-visible change with no `## [Unreleased]` entry. Takes `--base=<ref>`, and CI **must** pass it: the default reads `git status`, and a CI checkout is CLEAN, so without the base it passes on every run and catches nothing |

`--base` is the only flag the gate accepts, and it reaches the only arm that
reads it. Any other argument is a usage error (exit 10) rather than a flag
appended to the last command of a chain, which is the routing this replaced.

**When a gate is right and the tree is wrong**, fix the tree. When a gate is
wrong, fix the gate AND the sentence that described it — the three defects this
repository found most often were all a comment asserting something the adjacent
code did not do.

## Handover section (for the eventual co-maintainer)

1. GitHub: add collaborator with **maintain** permission; CODEOWNERS
   already names the file owners — extend it, never bypass it.
2. npm: `npm owner add <handle> mjolnir-qa` — publishing becomes
   delegable the day this runs; until then it stays identity-bound.
3. Walk the new maintainer through MAINTAINERS.md's ladder entry gates —
   the grant is the LAST step, not the first.
4. Re-run the succession audit; flip every entry the grant unlocked; the
   remaining identity-bound list must be visibly shorter.
