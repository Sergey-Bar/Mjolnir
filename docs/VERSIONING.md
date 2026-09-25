# Versioning & stability policy

Mjölnir follows [semver](https://semver.org/). This document defines what
each part of the tool promises across version bumps, what counts as a
breaking change, and how deprecations are announced. It is the contract
behind the "frozen surfaces" language used in the README and the
[exit codes & contracts](https://sergey-bar.github.io/Mjolnir/reference/exit-codes)
reference. Support and issue routing live in
[SUPPORT.md](../SUPPORT.md); the maintainer decision model lives in the
governance section of [CONTRIBUTING.md](../CONTRIBUTING.md).

## The 1.0 contract table

At **1.0.0 and every later release**, these surfaces are frozen:

| Surface                             | Commitment                                                                                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON report                         | `schemaVersion: 1` is frozen; changes within v1 are **additive-only** (new optional fields). Removing or renaming a field requires a `schemaVersion: 2` major release.                                |
| Exit codes                          | `0` clean · `1` findings at/above gate · `2` **inconclusive** (partial or unsupported analysis — treat as failure) · `10` usage error · `20` internal error — numbers frozen, semantics stated below. |
| CLI verbs & flags                   | No removal or rename without the deprecation cycle below. New verbs/flags are additive.                                                                                                               |
| Config keys (`mjolnir.config.json`) | Removal or rename = breaking (major). Additions = minor.                                                                                                                                              |
| Plugin & local-rule manifests       | The shape of `QADoctorRule` and JSON rule manifests is frozen; additive fields only.                                                                                                                  |
| Rule IDs (`QA-<FAMILY>-NNN`)        | **Immutable and never reused**, once shipped.                                                                                                                                                         |
| Tiering                             | A detector behavior change requires a `detectorRevision` bump and re-measurement before a tier change — never silent (see [RULE-LIFECYCLE.md](RULE-LIFECYCLE.md)).                                    |
| Support matrix                      | Node 22 on ubuntu-latest, windows-latest, macos-latest; Node 24 on ubuntu-latest. The CI matrix is the proof; if CI drops a combination, this document changes in the same PR.                        |
| Privacy                             | Scanning is zero-network. Telemetry decisions are governed separately and always opt-in.                                                                                                              |

The exit-code row applies to scan and CI surfaces. `release-report` and
`release-trust` have command-specific verdicts and exits documented in
`RELEASE-TRUST-CONTRACT.md`.

### Exit code 2 is not a pass

Earlier versions of this document described exit `2` as "partial scan (never
blocks)". That wording is withdrawn. It was the licence for every downstream
pipeline to treat an incomplete analysis as a green one, which is the exact
inversion of the Trust Constitution: an analysis that did not finish has not
proven anything about the surface it did not reach.

**The numbers are frozen and unchanged.** What is now explicit is the meaning:

| Exit | Meaning        | A CI step should |
| ---- | -------------- | ---------------- |
| `0`  | clean          | pass             |
| `1`  | findings       | fail             |
| `2`  | inconclusive   | **fail**         |
| `10` | usage error    | fail             |
| `20` | internal error | fail             |

`2` covers two cases, and neither is a pass:

- **Partial analysis** — the budget expired, files were skipped, rules
  crashed, discovery was truncated, or the run was degraded. The unanalyzed
  surface is precisely where an unknown blocking finding would live.
- **Unsupported / unmeasured** — the command has no measurement of what it was
  asked about and says so instead of rendering a plausible number.

`--blocking none` suppresses **findings**, not the fact that the analysis did
not finish. There is no flag that turns an incomplete run into exit `0`. If you
want advisory behavior, run without the gate and read the report; do not
invert the exit code.

The one table that decides this is `EXIT_MATRIX` in `src/claim-evidence.ts`,
and `scanExitCode` is the only function that consults it. The contract test
`tests/contract/exit-matrix.spec.ts` walks every cell, including the
partial-at-every-gate rows that used to be green.

Runtime install examples in the Action, Smithery, Site, README, distribution kit, and release controls are pinned to the exact candidate version. `@latest` in advisory prose is not an execution or trust contract. The version-surface checker rejects mutable references in enforcing surfaces. The 3.0.0 migration and rollout checklist is in [`RELEASE-3.0.0-READINESS.md`](RELEASE-3.0.0-READINESS.md).

- Removing or renaming any field of the JSON/SARIF report, or changing a
  field's type or the meaning of its values.
- Changing the meaning of an exit code, or removing one.
- Removing or renaming a CLI verb, subcommand verb (e.g. `forensics`,
  `triage`, `doctor:playwright`), or flag.
- Removing or renaming a `mjolnir.config.json` key, or changing what an
  existing key does incompatibly.
- Changing the plugin/local-rule manifest shape incompatibly.
- Dropping a Node major version or a support-matrix OS.
- Retiring a rule ID without a full deprecation cycle (rule retirement
  follows [RULE-LIFECYCLE.md](RULE-LIFECYCLE.md) and is additionally
  recorded in the [CHANGELOG](../CHANGELOG.md)).

Not breaking: fixing a false positive, tightening or widening detection
of a rule (behavior changes are recorded per the lifecycle doc and gated
by `detectorRevision`), adding rules, adding flags, adding JSON fields,
changing the score of any given repo (the score is a measurement, not a
contract).

## Plugin execution gate (pre-1.0 clarification)

As of the audit-remediation 1.0 close-out, npm plugins and JS-module
external rules (`mjolnir-rules/*.mjs`) load and execute only behind the
plugin trust gate: `--enable-plugins` on any verb that loads rules, or
`MJOLNIR_ENABLE_PLUGINS=1` in the environment. The default is OFF.
Declaring a plugin in config without the gate prints a loud stderr
notice listing the skipped sources — it never changes the exit code or
the JSON contract (the `plugins` field appears only when sources actually
loaded). JSON rule manifests (`mjolnir-rules/*.json`) never execute code
and load without the gate. This is a behavior change to the pre-1.0
"always load" posture, shipped before the freeze per the versioning
contract; the gate's existence and both spellings of the opt-in are
frozen at 1.0.

## Deprecation cycle

For every frozen surface except rule IDs (which have their own lifecycle
doc):

1. **Minor release N**: the old name remains fully functional and emits a
   deprecation warning (CLI stderr and/or a report field, as appropriate).
   The CHANGELOG entry is marked **Deprecated** and names the replacement.
2. **At least one subsequent minor release** ships with the warning
   present — a user upgrading one minor at a time always sees it before
   removal.
3. **Major release N+1**: the old name is removed. The CHANGELOG entry is
   marked **Removed**.

Rule IDs never go through a generic deprecation: retirement follows the
[rule lifecycle](RULE-LIFECYCLE.md) — IDs are never reused, and behavior
changes are recorded in the CHANGELOG.

## Support matrix

| Component       | Tested combinations                                                    |
| --------------- | ---------------------------------------------------------------------- |
| Node.js 22.x    | ubuntu-latest, windows-latest, macos-latest                            |
| Node.js 24.x    | ubuntu-latest                                                          |
| Python scanning | 3.x via `tree-sitter` grammars (best-effort, unmeasured rules flagged) |

The GitHub Actions CI matrix (`.github/workflows/ci.yml`) encodes this
table. Node versions are removed when they exit upstream maintenance, in
a minor release with a CHANGELOG note — not silently.

## Internal APIs are not stable

Only the surfaces in the contract table are stable. The JS/TS module
surface under `src/` (everything you would `import` from the installed
package beyond the CLI) is **internal and may change in any release**,
including patches. Plugins must use the documented manifest interface,
not internal imports.

## Where changes are recorded

The hand-curated [CHANGELOG](../CHANGELOG.md) is the authoritative
release record, with first-class entries for rule-behavior changes.
Breaking and deprecation entries always name the affected frozen surface
from the table above.
