# Bus-factor audit — every operation needed for a release + adjudication cycle

Product-gap-remediation master plan P9 (plan 1788853205786, decision
10). Refreshed **every release**. Each row: the operation, who can
execute it today, and the pointer. The P9 exit bar: an adjudication
cycle operable end-to-end by a second human; publishing remains
identity-bound until a co-maintainer exists (docs/MAINTAINERS.md).

Measured at: v3.0.0 working-candidate audit (2026-09-25). The published
v3.0.0 tag remains immutable; the next release is a separately assigned SemVer.

## Adjudication cycle (the P9 deliverable — second-human ready)

| Operation                        | Executable by      | Pointer                                                |
| -------------------------------- | ------------------ | ------------------------------------------------------ |
| Corpus sample (new verdict rows) | any maintainer     | `npm run corpus:sample` (docs/ADJUDICATION-KIT.md)     |
| Verdict classification           | trained classifier | docs/ADJUDICATION-KIT.md — kit + worked example        |
| FP-audit regeneration            | any maintainer     | `npm run fp-audit:generate` (CI drift-gated)           |
| Regression + ceiling ratchet     | any maintainer     | `npm run corpus:regression` (ratchet = 0 unclassified) |
| Baseline `--update` after review | rule-owner         | `npm run corpus:regression:update` (reviewed diff)     |
| Derived docs regeneration        | any maintainer     | docs:rules / docs:capability / docs:counts             |
| Tier-boundary crossing decision  | rule-owner + owner | §11 loop (RULE-LIFECYCLE entry required)               |

## Release cycle

| Operation                       | Executable by      | Pointer                                                      |
| ------------------------------- | ------------------ | ------------------------------------------------------------ |
| Standing gates (typecheck→test) | any maintainer     | CONTRIBUTING.md "the standing gate"                          |
| Version-candidate PR            | any maintainer     | docs/ROADMAP.yaml + docs/RELEASE-3.0.0-READINESS.md          |
| Release workflow dispatch       | release authority  | manual release.yml / stable-release.yml dispatch             |
| npm publish                     | **identity-bound** | 2FA + provenance OIDC (docs/OWNER-RUNBOOK.md)                |
| dist-tags (`latest`/`next`)     | runbooked          | docs/PUBLISHING.md                                           |
| GitHub Release publish          | runbooked          | release.yml automation + note review                         |
| v3 action moving tag            | automatic          | action-tags.yml job (rc tags and older majors never move it) |
| Marketplace publish             | **identity-bound** | account-bound (docs/DISTRIBUTION-KIT.md checklist)           |

## Site & repo settings

| Operation                 | Executable by      | Pointer                                          |
| ------------------------- | ------------------ | ------------------------------------------------ |
| Pages deploy              | automatic on main  | pages workflow (owner attention on failure only) |
| Branch protection / admin | **identity-bound** | GitHub admin (docs/OWNER-RUNBOOK.md)             |
| CODEOWNERS changes        | PR + owner review  | .github/CODEOWNERS                               |

## The honest residue

Identity-bound after P9: npm publish (until a co-maintainer is granted),
marketplace publish, registry account submissions, repo admin, security
response, lawbook amendments. Everything else in a release + adjudication
cycle is documented and executable — the succession audit's job is to
keep this list shrinking, visibly, in this file.
