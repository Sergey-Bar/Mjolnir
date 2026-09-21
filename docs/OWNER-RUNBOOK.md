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
| Baseline `--update` after adjudication  | runbooked                               | corpus:regression:update; reviewed by rule-owner                                         |
| Lawbook amendments (A1–A4, Laws, L1–L6) | identity-bound                          | Owner-ratified by construction (CERTIFICATION-POLICY); propose via issue, owner ratifies |

## Security & trust

| Operation                           | Status         | Notes                                                                                           |
| ----------------------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| SECURITY.md private-key responses   | identity-bound | Security reporter trust; see SUPPORT.md routing — triage may acknowledge, only owner may assess |
| Suppression overrides (owner tiers) | identity-bound | mjolnir.config.json's 90-day expiry is the guardrail; owner override is a deliberate act        |
| Signing keys / provenance           | identity-bound | npm OIDC + GitHub release signing bind to the owner account                                     |

## Handover section (for the eventual co-maintainer)

1. GitHub: add collaborator with **maintain** permission; CODEOWNERS
   already names the file owners — extend it, never bypass it.
2. npm: `npm owner add <handle> mjolnir-qa` — publishing becomes
   delegable the day this runs; until then it stays identity-bound.
3. Walk the new maintainer through MAINTAINERS.md's ladder entry gates —
   the grant is the LAST step, not the first.
4. Re-run the succession audit; flip every entry the grant unlocked; the
   remaining identity-bound list must be visibly shorter.
