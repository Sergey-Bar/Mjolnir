# Roadmap

Honest scope from the project's planning records — **no invented
dates**, ever. This page tracks the same phase structure the maintainer
works from; when planning changes, this page changes with it. Nothing on
this page is a promise with a deadline; each item is a direction with an
entry condition.

## Where Mjölnir is now

- **v1.0.x — stable.** Published on npm and GitHub Releases, with
  <!-- census:total-rules -->79 rules<!-- /census:total-rules -->,
  <!-- census:measured -->74<!-- /census:measured --> of them carrying a
  false-positive rate measured against real OSS code
  ([FP-AUDIT](/reference/fp-audit)); the unmeasured remainder is
  quarantined, never silently shipped.
- JSON report (`schemaVersion: 1`), exit codes and CLI surface are
  [frozen contracts](/reference/exit-codes).
- The scan core is deterministic and zero-network: the same input
  produces the same verdict, and nothing leaves the machine.

## The trust-engineering train — built, entering release

An eleven-increment engineering train hardened the product's release
trust end-to-end. It is **complete and verified on the engineering
branch**; it lands through the 1.1.x–1.4.0 releases, each gated by the
new release-trust verdict, ahead of the 2.0 cutover.

| Release | Content                                                                                                                                                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1.0   | Azure DevOps Pipelines as a first-class scan target — adapter, detection and CI-workflow rules                                                                                                                                                               |
| 1.1.1   | Jenkins (root `Jenkinsfile`) as a first-class scan target                                                                                                                                                                                                    |
| 1.1.2   | Quarantine remediation: a generated, drift-locked ledger plus rework-or-retire of the worst measured rules ([QUARANTINE-REMEDIATION](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/QUARANTINE-REMEDIATION.md))                                        |
| 1.1.3   | Machine-verified blast-radius audit and containment fixes ([BLAST-RADIUS-AUDIT](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/BLAST-RADIUS-AUDIT.md))                                                                                                 |
| 1.1.4   | The [Trust Constitution](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/TRUST-CONSTITUTION.md) and the `mjolnir release-trust` verdict gate ([RELEASE-TRUST-CONTRACT](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/RELEASE-TRUST-CONTRACT.md)) |
| 1.1.5   | A false-green attack corpus: adversarial suites that prove the scanner cannot be fooled into a clean verdict                                                                                                                                                 |
| 1.1.6   | Evidence-graph provenance binding, scope integrity, and exit-code mutation proofs                                                                                                                                                                            |
| 1.2.x   | Playwright `trace.zip` forensics · the forensic verdict taxonomy and Selector Health v2 · the Playwright capability matrix as a product surface                                                                                                              |
| 1.3.0   | MCP runtime-evidence tools (`forensics`, `triage`, `pw-report`) and the agent safety contract                                                                                                                                                                |
| 1.4.0   | Trust Artifact identity binding and the full HTML artifact                                                                                                                                                                                                   |
| 2.0.0   | 2.0 preparation: breaking-set inventory, migration draft, boundary-law guards                                                                                                                                                                                |

## Next

- **Merge and release the train** through the standing gates — the
  release-trust verdict (not a date) decides when each increment ships.
- **The 2.0 cutover**, on the breaking-set inventory and migration draft
  prepared above; [VERSIONING](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/VERSIONING.md)
  remains the contract for what "stable" means.

## What this roadmap will never contain

- Dates attached to unbuilt features.
- A light theme (dark-only is a design decision, not an omission).
- Telemetry that isn't opt-in.
- Rules without fixtures, or a tier system that moves on anything but
  measured evidence.
