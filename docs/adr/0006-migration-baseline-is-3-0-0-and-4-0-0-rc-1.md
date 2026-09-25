# ADR 0006 — The migration baseline is 3.0.0 and 4.0.0-rc.1

**Status:** accepted · **Amends:** A6 · **Affects:** `docs/VERSIONING.md`,
`docs/RELEASE-TRAINS.md`, `docs/COMMAND-MIGRATION.md`, migration tooling

## Context

The v6 spec's migration section (§92) assumes a **5.x** baseline. No
5.x has ever shipped.

`package.json` is unambiguous:

- `version: "4.0.0-rc.1"`
- `publishedStable: "3.0.0"`

3.0.0 is what consumers actually have. 4.0.0-rc.1 is what is being
certified. A migration guide that starts at 5.x migrates a version that
does not exist and skips the version most people are on — the worst of
both: the guide is wrong _and_ it is unnecessary.

There is a second, quieter conflict. `docs/RELEASE-TRAINS.md:62` carries
a 4.0 → 5.8 mapping. If v6 is added without superseding it, the repo
carries **two version futures** (5.x and 6.x), and a reader cannot tell
which one the program is running.

## Decision

**§92 becomes two migration paths:**

| From                             | To    | Nature                                                                                                    |
| -------------------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| `3.0.0` (published stable)       | `6.0` | Breaking: commands, exit codes, schemas, rule ids, config, baselines, suppressions, policies, MCP, Action |
| `4.0.0-rc.1` (current candidate) | `6.0` | Breaking: exit codes, schemas, command consolidation (D2)                                                 |

**`RELEASE-TRAINS.md`'s 4.0→5.8 mapping is superseded** by an explicit
v6 entry in the same change, so the program has exactly one version
future. The superseded mapping is retained as a historical record, marked
`supersededBy`, never deleted — deleting it would destroy the history
that explains why 4.x trains exist.

Migration is performed from the `docs/COMMAND-MIGRATION.md` matrix plus
automated migration where safe:

- **Automated** (no human decision): config key renames, baseline/schema
  version bumps, policy schema migration, MCP schema version bump.
- **Requires a human decision** (never automated silently): anything
  that changes a verdict, a command name a script depends on, or an exit
  code a CI gate branches on. These emit an explicit migration warning
  with the exact old/new pair, per the alias lifecycle
  `SUPPORTED_ALIAS → DEPRECATED_ALIAS → WARNING → MIGRATION_GUIDANCE →
REMOVED` (D2).

## Consequences

**Forbids**

- A migration path starting at any version that was never published.
- Retaining both 5.x and 6.x as live futures in the same document.
- Deleting a superseded mapping without an explicit `supersededBy` link.

**Costs**

- The migration surface is larger than the spec assumed: 3.0.0 is a
  _stable_ release with real consumers, so its break list is a public
  commitment, not an internal note.
- A clean-checkout rehearsal becomes a DoD line (Wave 13).

## Rejected alternatives

| Alternative                                   | Why rejected                                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline on 5.x                               | 5.x never shipped. The guide would migrate nothing.                                                                                             |
| Baseline on 4.0.0-rc.1 only                   | Ignores 3.0.0, which is what `publishedStable` points at and what most consumers pin.                                                           |
| Keep 4.0→5.8 in `RELEASE-TRAINS.md` untouched | Two version futures; readers cannot tell which program is running.                                                                              |
| Auto-migrate everything                       | Silently changing a verdict or an exit code is Law 1 in reverse: a tool that quietly changes what it says is worse than one that breaks loudly. |

## Enforcement

| Mechanism         | Location                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Migration matrix  | `docs/COMMAND-MIGRATION.md` — every renamed/removed/aliased command, with the alias lifecycle state                          |
| Version authority | `package.json` `version` / `publishedStable`; `docs/VERSIONING.md` publishes them; `npm run version:check` gates the surface |
| Single future     | `docs/RELEASE-TRAINS.md` — the v6 entry carries `supersedes:`; a doc test fails on two live futures                          |
| Rehearsal         | Wave 13 DoD: migration on a clean checkout, no hand edits                                                                    |
| Machine contract  | `mjolnir.release-trust@1` → `@2` (see ADR 0002)                                                                              |
