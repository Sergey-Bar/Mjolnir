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

| Surface                             | Commitment                                                                                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON report                         | `schemaVersion: 1` is frozen; changes within v1 are **additive-only** (new optional fields). Removing or renaming a field requires a `schemaVersion: 2` major release. |
| Exit codes                          | `0` clean · `1` findings at/above gate · `2` partial scan (never blocks) · `10` usage error · `20` internal error — semantics frozen.                                  |
| CLI verbs & flags                   | No removal or rename without the deprecation cycle below. New verbs/flags are additive.                                                                                |
| Config keys (`mjolnir.config.json`) | Removal or rename = breaking (major). Additions = minor.                                                                                                               |
| Plugin & local-rule manifests       | The shape of `QADoctorRule` and JSON rule manifests is frozen; additive fields only.                                                                                   |
| Rule IDs (`QA-<FAMILY>-NNN`)        | **Immutable and never reused**, once shipped.                                                                                                                          |
| Tiering                             | A detector behavior change requires a `detectorRevision` bump and re-measurement before a tier change — never silent (see [RULE-LIFECYCLE.md](RULE-LIFECYCLE.md)).     |
| Support matrix                      | Node 22 + 24 on ubuntu-latest, windows-latest, macos-latest. The CI matrix is the proof; if CI drops a combination, this document changes in the same PR.              |
| Privacy                             | Scanning is zero-network. Telemetry decisions are governed separately and always opt-in.                                                                               |

## What counts as breaking (major bump)

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

| Component       | Supported                                                              |
| --------------- | ---------------------------------------------------------------------- |
| Node.js         | 22.x, 24.x                                                             |
| OS              | ubuntu-latest, windows-latest, macos-latest                            |
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
