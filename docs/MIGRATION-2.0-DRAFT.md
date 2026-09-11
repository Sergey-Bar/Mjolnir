# Mjölnir 2.0 — Migration Guide (DRAFT)

**Status: DRAFT — the working draft of the 2.0.0 migration guide.** The
published guide lands in the CHANGELOG + site with the 2.0.0 release itself
(blueprint §28 publication law). Nothing in this draft is implemented in
this release; the breaking set it describes is inventoried in
`docs/2.0-BREAKING-SET.md` (PROPOSED, owner-ratification pending).

## BS-1 — Suppression expiry default (blueprint §18)

**What changes.** Suppression entries in `mjolnir.config.json` created or
edited after 2.0.0 receive a **90-day default expiry** measured from entry
creation. To keep a suppression forever, opt out explicitly with
`expires: false`.

**What does NOT change.** Hand-written entries that predate 2.0.0 and carry
neither `expires` nor `expires: false` keep their current (non-expiring)
behavior until you edit them — no silent retroactive expiry. `mjolnir init`'s
config check will surface each such entry with a migration suggestion.

**Migration steps.**

1. Run `mjolnir init` (post-2.0.0) — the config check lists every
   suppression entry missing both `expires` and `expires: false`.
2. For each listed entry, choose deliberately:
   - `expires: "<ISO date>"` — keep the suppression for a bounded period
     (recommended: this is the 90-day default behavior, made explicit).
   - `expires: false` — the explicit never-expire opt-out.
3. Re-run `mjolnir scan` / `mjolnir verify`. Expired entries suppress
   nothing and are listed (with `expired` status) by
   `mjolnir suppressions` and verbose scan output; `suppressionCount`
   counts active entries only.
4. Renewal = editing the entry (authorship + reason are already required
   by the config schema). CI and local behave identically.

**Why.** Debt cannot silently hide regressions: an unbounded suppression is
a false-green waiting to happen.

## BS-2 — Retirement completion (blueprint §28.2)

**What changes.** Detectors whose one-minor deprecation window elapsed are
removed from the live registry into `RETIRED_RULE_IDS` in the 2.0.0
release. Retired rule IDs never fire again and are never reused.

**Migration steps.**

1. Read the retired-rule list in the 2.0.0 CHANGELOG entry (published with
   the release, per the measurement ledger).
2. Remove `mjolnir.config.json` suppressions and CI gate references that
   name retired rules — suppressing a rule that can no longer fire is dead
   config, and the config check flags it.
3. Re-run `mjolnir scan` and compare against your baseline:
   `mjolnir verify` resolves disappeared findings with an explicit cause —
   a finding disappearing because its rule was retired is visible as such,
   never as a verified fix (§15 lifecycle honesty).
4. If a finding the retired rule covered still matters, track it through
   the rule-evolution process: a replacement rule ships with its own
   measured FP rate — it is never a silent rename.

**Why.** A smaller high-trust rule set beats a large noisy one; the
verified 100%-FP set produces noise, not trust. Retirement is first-class.

## What does not change

- `schemaVersion 1` JSON — additive fields only (run identity, artifact
  integrity, lifecycle/resolution states, corroboration).
- The exit-code contract.
- Every existing verb and flag (new ones are additive).
- The Node engine floor.
- The Trust Artifact, capability matrix, and MCP tool surfaces (additive
  evolution under their drift locks).

The full rationale and ratification status live in
`docs/2.0-BREAKING-SET.md`.
