# Mjölnir 3.0.0 Release Readiness

**Decision owner:** Sergey-Bar
**Target:** `3.0.0` major line (published) and `4.0.0-rc.1` next candidate
**Audit date:** 2026-09-25
**Current decision:** **DO NOT PUBLISH YET**

This document is the cross-functional release contract. It records what is
ready, what is intentionally blocked, and the evidence required before a
major release may be published.

## 1. Executive decision

The repository-owned implementation and local release gates are healthy. The
release is not production-authorized because the candidate is still a working
candidate and the external trust gates have not been observed.

Current candidate state:

- `WORKING_CANDIDATE`
- `NOT_CERTIFIED`
- `NOT_AUTHORIZED`
- `candidateSha: null`
- GitHub issue/PR ledger: `RECONCILED`
- Gap ledger: `RECONCILED`
- Dependency resolution: `APPROVED_STAGED`
- Support matrix: `NOT_RECONCILED`
- External validation: `NOT_RUN`
- Corpus regression: held for human review

The published line is `3.0.0`; the current working candidate is
`4.0.0-rc.1`. This report covers both: the historical 3.0 identity and the
release decision for the next major line. The existing `v3.0.0` release is
immutable and must not be republished or retagged. The next candidate is not
authorized until every gate below passes.

## 2. Product Management plan

### 2.1 Release strategy

Use a staged, evidence-bound rollout:

1. **Foundation** — reconcile the candidate, ledgers, claims, matrix, and
   release controls. No user-facing promotion.
2. **Practitioner foundation** — activate M27–M35 only after their entry
   dependencies and external evidence are available.
3. **Frontier** — M36–M50 remain provisional contracts until their candidate
   matrices, independent evidence, and human promotion gates pass.
4. **RC** — run the release workflow with `dry_run=true`, publish only an
   RC candidate under `next`, and exercise fresh installs.
5. **Stable** — run the stable workflow only from an immutable candidate SHA,
   with protected checks, provenance, rollback artifacts, and a signed
   release decision.

### 2.2 Key milestones and outcomes

| Train   | Outcome                                                          | Promotion rule                            |
| ------- | ---------------------------------------------------------------- | ----------------------------------------- |
| M26     | Truthful baseline, ledgers, support matrix, and release controls | All M26 gates and external evidence       |
| M27     | Practitioner test intelligence                                   | M26 exit plus measured corpus             |
| M28     | Honest language certification                                    | M27 plus per-language evidence            |
| M29     | Runtime evidence and trust graph                                 | M27 plus provider artifacts               |
| M30     | CI, release, and supply-chain control                            | M26 plus live provider evidence           |
| M31     | QA domain intelligence                                           | Approved staged dependency gates          |
| M32     | Agentic SDET safety                                              | Independent re-scan and approval evidence |
| M33–M35 | Team, enterprise, and ecosystem foundations                      | Explicit pilot/authority gates            |
| M36–M50 | Maximum-capability frontier                                      | Each train's own evidence bundle          |

### 2.3 Breaking changes and migration

The 3.0.0 contract is intentionally stricter:

- Node.js `>=22.18` is required.
- Trust and evidence boundaries are explicit; incomplete or zero-evidence
  results cannot be presented as `WORTHY`.
- Public output reports carry completion, scope, evidence, and verdict fields.
- Privileged PR publication is split into read-only scan and publisher jobs.
- Composite Action consumers use the `@v3` policy and exact candidate version
  where reproducibility matters.
- Plugin execution, artifact paths, symlinks, traversal, budgets, and finite
  durations are guarded.
- `latest` is not an enforcing install reference; use the exact candidate or
  the documented current-major Action ref.

Migration template:

```md
## Migrating to 3.0.0

1. Upgrade Node.js to >=22.18.
2. Replace floating `mjolnir-qa@latest` execution references with the exact
   approved version.
3. Review consumers of report JSON/SARIF/YAML for the new completion, scope,
   evidence, and verdict fields.
4. Review the plugin trust gate before enabling local rules.
5. Run `mjolnir --scope changed`, then `mjolnir explain <finding>`.
6. Re-run the full release checks with `npm run ci-local`.
7. Roll back by restoring the prior package/Action ref; do not move an
   existing release tag.
```

### 2.4 Rollout and rollback

- Announce the RC with an explicit evidence boundary; never call an unproven
  candidate "certified".
- Require opt-in CI installation first, then enable blocking gates after review.
- Keep `3.0.0` consumers on an exact version or the approved `@v3` ref.
- Never move or delete a historical tag.
- If a release gate fails, stop before publication, retain the candidate
  manifest, and publish no package, GitHub release, or dist-tag change.
- Rollback uses the prior published version/ref and a new corrective release;
  it does not rewrite history.

## 3. Technical documentation deliverables

### 3.1 Canonical documentation

- `README.md` is canonical. It documents installation, the trust model,
  commands, limitations, and the current certification boundary.
- All translated README install references, release-status blocks, and new
  command rows are machine-synchronized from the canonical English text.
  New fallback blocks are explicitly marked as English canonical and still
  require human translation review before being called fully localized.
- `CHANGELOG.md` has dated Keep-a-Changelog sections, rule-ID changes,
  migration notes, and an Unreleased section for unreleased work.
- `docs/INSTALLATION-3.0.0.md`, `docs/MIGRATION-3.0.0.md`, and
  `docs/ROLLBACK-3.0.0.md` are the canonical consumer procedures.
- `docs/PUBLISHING.md` is the operational release runbook.
- `docs/VERSIONING.md` is the version-surface policy.
- `docs/ARCHITECTURE.md`, `docs/TRUST-CONSTITUTION.md`, and
  `docs/RELEASE-TRUST-CONTRACT.md` define the non-negotiable trust boundaries.
- `npm run release:decision` is the final machine-readable decision gate; it
  never mutates tags, packages, releases, or dist-tags.
- `docs/EXTERNAL-EVIDENCE-REQUEST.md` is the concrete consent, holdout,
  platform, consumer, remote-workflow, and final-authority request.
- `docs/ROADMAP.yaml`, `docs/M26-GITHUB-SNAPSHOT.json`,
  `docs/M26-ISSUE-DISPOSITIONS.jsonl`, `docs/M26-GAP-LEDGER.jsonl`, and
  `docs/M26-SUPPORT-MATRIX.json` are machine-readable release evidence.

### 3.2 Documentation templates

**Release announcement**

```md
# Mjölnir 3.0.0

Mjölnir 3.0.0 makes trust evidence explicit across static scans, runtime
forensics, CI gates, and agent handoffs.

## What changed

- Explicit completion, scope, evidence, and verdict fields.
- Stricter trust boundaries for plugins, artifacts, symlinks, and budgets.
- Candidate-bound release and evidence controls.
- Updated Action, MCP, Site, Smithery, and documentation surfaces.

## What is not claimed

Trust certification remains separate from software completeness. Do not describe
an unproven candidate as certified.

## Upgrade

Install `mjolnir-qa@3.0.0` with Node.js >=22.18 and follow the migration guide.
```

**Evidence boundary note**

```md
Certification status: NOT_CERTIFIED / NOT_AUTHORIZED.
Repository-owned gates: PASS.
External holdout, real-world, platform, consumer, and remote-workflow gates:
see `docs/M26-EXTERNAL-VALIDATION.json`.
```

## 4. QA architecture and regression plan

### 4.1 Regression layers

1. **Contract** — CLI/JSON/SARIF/MCP/help/version/roadmap/ledger contracts.
2. **Unit and property** — deterministic fixtures, hostile inputs, seeds, and
   invariants.
3. **Integration** — GitHub Actions, Azure Pipelines, Jenkins, GitLab,
   installation, pack, and consumer smoke.
4. **Contract/security** — workflow privilege, permissions, untrusted input,
   redaction, path traversal, symlinks, secrets, and supply chain.
5. **Forensics** — Playwright, JUnit, Jest, Vitest, HAR, trace, coverage,
   mutation, flaky, and evidence-graph paths.
6. **Stress/recovery** — scale, cancellation, timeout, restart, cache, and
   deterministic replay.
7. **External** — protected holdout, design partner, platform, consumer
   install, and independent reproduction. These cannot be synthesized locally.

### 4.2 Required edge cases

- Empty, oversized, malformed, truncated, and foreign artifacts.
- Stale, mixed-candidate, and contradictory evidence.
- Unicode, RTL, emoji, CRLF, BOM, NUL, and path-separator variations.
- Symlinks, traversal targets, hardlink races, and output-redirect escapes.
- Fork pull requests and untrusted workflow expressions.
- Partial scans, zero tests, parser fallbacks, and missing test bodies.
- Concurrent workers, cancellation, timeout, crash, and restart recovery.
- Cache invalidation and selected-versus-full scan divergence.
- Package/Action/Site/MCP version drift and mutable `@latest` references.
- Secret-shaped strings, redaction failures, and artifact provenance gaps.

### 4.3 Performance and stability budgets

Every benchmark must record machine, runtime, dataset, cold/warm cache, and
sample count. Regression remains advisory until the owner approves budgets.

| Budget                      | Required evidence                        |
| --------------------------- | ---------------------------------------- |
| Startup/p50/p95/p99         | Repeated clean runs                      |
| RSS and disk ceiling        | Sampling plus peak measurement           |
| Cold/warm/incremental cache | Three identical replays                  |
| Graph/report generation     | Bounded input classes                    |
| Cancellation/timeout        | Deterministic termination                |
| Fault recovery              | Restart from persisted state             |
| Concurrency                 | Bounded workers with no duplicate writes |

### 4.4 Current local evidence

The following is repository evidence, not external certification:

| Gate                                     | Current result                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run ci-local`                       | PASS; 10,814 tests, 6 skipped, 1 expected fail                                                           |
| Coverage                                 | 98.53% statements, 96.02% branches, 99.35% functions, 98.85% lines                                       |
| `npm run test:property`                  | PASS; 13 property assertions                                                                             |
| `npm run test:fuzz`                      | PASS; 9 fuzz tests                                                                                       |
| `npm run test:integration`               | PASS                                                                                                     |
| `npm run test:release`                   | PASS                                                                                                     |
| `npm run test:mcp:parity`                | PASS                                                                                                     |
| `npm run test:stress`                    | PASS when run with the stress config and no competing workers; pathological runs no longer mask failures |
| Corpus crash telemetry                   | QA-PY-004 crash root fixed; remaining corpus failures are provenance/scope/measurement blockers          |
| `npm run brand:doctor` / `site:doctor`   | PASS                                                                                                     |
| `npm run candidate:manifest:check`       | PASS for the current working tree                                                                        |
| `npm run claims:check` / `version:check` | PASS                                                                                                     |
| `npm run m26:audit`                      | BLOCKED only for unresolved support-matrix and external evidence                                         |
| `npm run corpus:regression`              | HELD for human review; baseline/provenance and crash diagnostics remain                                  |

The coverage numbers are a ratchet, not a performance guarantee. Performance
release budgets still require clean-room runs on the supported platform matrix.

## 5. 10/10 production checklist

Status is evidence-based. A checked item means the repository-owned gate has
passed; external items require a named human observation.

- [x] Package and all executable version surfaces agree on `3.0.0`.
- [x] Action tag maintenance moves only `v3`; RC and older-major refs never move.
- [x] Node engine, lockfile, pack, and fresh-install smoke pass.
- [x] Full deterministic suite, coverage, and ratchet pass.
- [x] Lint, typecheck, property, fuzz, integration, release, and security
      suites pass.
- [x] CI/local parity, workflow privilege, brand, site, and release trust
      contracts pass.
- [x] Candidate manifest, GitHub snapshot, dispositions, gap ledger, and
      staged dependency resolution are recorded.
- [x] Canonical README and CHANGELOG contain the 3.0.0 boundary and migration
      guidance; translated install/version/release/command blocks are synchronized.
- [ ] Human translation review ports the remaining canonical sections.
- [x] Support matrix classifies 136 cells (90 tested, 44 blocked, 2 not applicable) with explicit evidence and revisit triggers.
- [ ] Immutable candidate SHA exists and is bound to the release proof.
- [ ] Protected holdout, real-world, platform, consumer, and remote-workflow
      evidence is complete.
- [ ] Independent human release approval and provenance verification exist.
- [ ] Corpus regression is re-run and its held baselines are adjudicated.
- [ ] RC dry-run, fresh registry install, rollback, and recovery drills pass.
- [ ] No release-blocking finding remains in the approved gap ledger.

## 6. Release decision

**Current decision: NO-GO for publication.** Continue development and
evidence collection. When every unchecked item is satisfied, record the
candidate SHA, rerun the complete checklist, and only then dispatch the
stable release workflow.
