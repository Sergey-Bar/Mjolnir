# Roadmap

Honest scope from the project's planning records — **no invented
dates**, ever. This page tracks the same phase structure the maintainer
works from; when planning changes, this page changes with it. Nothing on
this page is a promise with a deadline; each item is a direction with an
entry condition.

> **Release status:** package 5.1.0 is the current stable line. 3.0.0, 4.0.0
> and 5.0.0 remain published and immutable; a tag alone is not a new release,
> and republishing an existing version is not a path forward.

## Where Mjölnir is now

- **v6.0.0-rc.1 — current release candidate.** Two words and one number: a
  first run reads `GATE` or `WARN` per finding and nothing else, and it names
  the command that turns the scan into a blocking check. The `core` /
  `extended` / `quarantine` tiers, the `E0–E2` evidence rungs and the `L0–L5`
  trust rungs stay in `--json` and `mjolnir explain` — they are the
  differentiator, not first-run comprehension. `--strict` is now
  `--include-warn`, because the old name promised enforcement the flag never
  had: a quarantined detector is advisory by design.
  <!-- census:total-rules -->79 rules<!-- /census:total-rules -->,
  <!-- census:measured -->73<!-- /census:measured --> of them carrying a
  false-positive rate measured against real OSS code
  ([FP-AUDIT](/reference/fp-audit)); the unmeasured remainder is
  quarantined, never silently shipped.
  `mjolnir share` writes one self-contained HTML trust report — no server, no
  network, byte-stable under the deterministic clock.
- **v5.1.0 — current stable.** The reporting surface is checked against the
  working tree rather than against a plan, and each check is a gate in
  `npm run certify`. A silent capability loss is disclosed through a
  degradation ledger rather than absorbed, and a verdict is never published
  without a measurement behind it. Package publication does not imply Trust
  certification: the release-readiness record is separate and still names
  what is open.
- JSON report (`schemaVersion: 1`), exit codes and CLI surface are
  [frozen contracts](/reference/exit-codes).
- The scan core is deterministic and zero-network: the same input
  produces the same verdict, and nothing leaves the machine.

## The trust-engineering train — shipped into the 3.x line

An eleven-increment engineering train hardened the product's release
trust end-to-end. It is part of the 3.x line; the table below remains as
the historical release train that led into the 3.0 cutover.

| Release | Content                                                                                                                                                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.0   | Azure DevOps Pipelines as a first-class scan target — adapter, detection and CI-workflow rules                                                                                                                                                                  |
| 1.1.1   | Jenkins (root `Jenkinsfile`) as a first-class scan target                                                                                                                                                                                                       |
| 1.1.2   | Quarantine remediation: a generated, drift-locked ledger plus rework-or-retire of the worst measured rules ([QUARANTINE-REMEDIATION](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/QUARANTINE-REMEDIATION.md))                                           |
| 1.1.3   | Machine-verified blast-radius audit and containment fixes ([BLAST-RADIUS-AUDIT](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/BLAST-RADIUS-AUDIT.md))                                                                                                    |
| 1.1.4   | The [Trust Constitution](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/TRUST-CONSTITUTION.md) and the `mjolnir ci release-trust` verdict gate ([RELEASE-TRUST-CONTRACT](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/RELEASE-TRUST-CONTRACT.md)) |
| 1.1.5   | A false-green attack corpus: adversarial suites that prove the scanner cannot be fooled into a clean verdict                                                                                                                                                    |
| 1.1.6   | Evidence-graph provenance binding, scope integrity, and exit-code mutation proofs                                                                                                                                                                               |
| 1.2.x   | Playwright `trace.zip` forensics · the forensic verdict taxonomy and Selector Health v2 · the Playwright capability matrix as a product surface                                                                                                                 |
| 1.3.0   | MCP runtime-evidence tools (`forensics`, `triage`, `pw-report`) and the agent safety contract                                                                                                                                                                   |
| 1.4.0   | Trust Artifact identity binding and the full HTML artifact                                                                                                                                                                                                      |
| 2.0.0   | 2.0 preparation: breaking-set inventory, migration draft, boundary-law guards                                                                                                                                                                                   |

## Next

One promise per version, in order. Each is a net subtraction of surface or
vocabulary before it is an addition of feature, and each carries a kill
criterion: if it cannot meet its exit gate, it is abandoned at that criterion
rather than half-shipped on top of the version before it.

| Version | Theme                        | The promise                                                                                                                               | The number it moves                                                   |
| ------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 7.0     | The gate proves itself       | The PR output is the **change** in trust, not the state — what this branch introduced and removed, against the merge-base.                | Every gated PR proves it blocks; the demo repo blocks in one CI run   |
| 8.0     | One notch wider              | Python/pytest and GitLab, measured or not shipped. A rule enters the default scan only if it can carry a measured FP rate.                | Zero new default-scan rules without n ≥ 10 measured FP verdicts       |
| 9.0     | It ran                       | Findings reach L3–L5 from a real run report, read from disk, parsed and discarded. No database, no history store, no dashboard.           | Share of `GATE` findings reaching L3+, measured on fixtures           |
| 10.0    | Prove it on adversarial code | A public, versioned, licensed false-green benchmark: repositories where a green CI is provably wrong, each with its expected finding set. | Every default-scan rule has a benchmark row with its measured FP rate |

- **Publish only registry-backed claims**: a git tag is not public
  install guidance until the matching npm version and GitHub Release are
  live. [VERSIONING](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/VERSIONING.md)
  remains the contract for what "stable" means.

## What this roadmap will never contain

- Dates attached to unbuilt features.
- A light theme (dark-only is a design decision, not an omission).
- Telemetry that isn't opt-in.
- Rules without fixtures, or a tier system that moves on anything but
  measured evidence.
