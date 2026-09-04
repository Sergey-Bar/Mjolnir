# Roadmap

Honest scope from the project's planning records — **no invented
dates**, ever. This page is generated from the same phase structure the
maintainer works from; when planning changes, this page changes with
it. Nothing on this page is a promise with a deadline; each item is a
direction with an entry condition.

## Where Mjölnir is now

- **v0.5.x — open beta.** 99 rules, 74 with a false-positive rate
  measured against real OSS code
  ([FP-AUDIT](/reference/fp-audit)).
- JSON report (`schemaVersion: 1`), exit codes and CLI surface are
  [frozen contracts](/reference/exit-codes).
- A parallel engineering track (stability policy, test-suite domain
  reorg, CI hardening, rc channels, the local `--cache` mode,
  community files) is preparing the **1.0 cutover** — see
  [VERSIONING](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/VERSIONING.md)
  for what "stable" will mean as a contract, not a label.

## Next — measurement & gate excellence

- **Close the measurement gap.** Every registered rule gets a measured
  false-positive rate (n ≥ 10 real-world verdicts); unmeasured rules
  already carry the PROVISIONAL marker (`mjolnir rules --unmeasured`).
  This is the entry condition for 1.0 — it will not be traded away for
  a release date.
- **CI gate excellence:** tighter false-positive rates on the rules
  that gate CI, better default baselines, and the workflow patterns the
  tool itself audits (`ci install` keeps improving with the repo).
- **Consent telemetry, isolated:** opt-in-only, asks at install time,
  ships separately from everything above and never by default.

## Later — the agent loop

- **Agent-loop integration** (the single distribution bet): Mjölnir's
  findings and fix programs surfaced inside coding-agent workflows.
  Gated on the measurement work being complete — an agent that ships
  verdicts faster than they can be trusted is a regression, not a
  feature.
- **Evidence & distribution** work follows only if the agent loop
  shows real pull.

## Shipped recently

- Local incremental `--cache` scan mode (content-addressed, local-only).
- Stability policy: [VERSIONING](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/VERSIONING.md),
  [SUPPORT](https://github.com/Sergey-Bar/Mjolnir/blob/main/SUPPORT.md),
  governance, [flake ledger](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/FLAKE-LEDGER.md).
- rc release channels (`next` dist-tag) with a publishing runbook.
- Repo-contract guards: docs consistency, root cleanliness, link
  integrity, issue templates.
- 22-language README translations with honest staleness markers.

## What this roadmap will never contain

- Dates attached to unbuilt features.
- A light theme (dark-only is a design decision, not an omission).
- Telemetry that isn't opt-in.
- Rules without fixtures, or a tier system that moves on anything but
  measured evidence.
