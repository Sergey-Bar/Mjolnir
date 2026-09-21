# Agent integration

Mjölnir is built to sit inside an agent's fix loop — the same loop a
human maintainer runs, made mechanical. One rule governs the surface:
**the agent gets derived facts, never trust claims.**

## The loop

```text
1. mjolnir baseline        # once — the before-state, committed
2. (the agent fixes findings)
3. mjolnir verify          # before/after digest — see below
4. repeat 2–3 until clean, then commit
```

`mjolnir verify` prints the digest and exits with the frozen contract:
`0` clean · `1` new error findings · `2` partial scan or no baseline.
A partial scan never masquerades as a clean verification — the agent
re-runs or reports honestly, exactly like CI does.

## The digest

- **RESOLVED** — baseline findings no longer present, each with its
  §15 lifecycle resolution. Only `VERIFIED-RESOLVED` is a fix claim;
  `INCONCLUSIVE(cause)` states what the scan could not prove.
- **NEW** — findings the change introduced, with severity. Any new
  error fails the verb (exit 1).
- **UNCHANGED** — pre-existing debt, grouped by `ruleId + location`.
  The agent's working key is the location: a finding whose message
  reworded but whose position persists is unchanged debt, not progress.
- **SCORE DELTA** — before → after, with the direction named. The score
  is a measurement, not a reward signal: it moves because findings
  moved, and the digest shows which ones.

## MCP

The same loop runs over the MCP transport: the `verify` tool is 1:1
with the verb (scan + baseline diff → the digest as data), under the
same guardrails as every tool — one scan in flight, parameter size
caps, filesystem boundary = scan target + `.mjolnir/`, zero network,
plugin gate unchanged. `mjolnir install` writes the agent instruction
surfaces (Claude Code command, agent briefs) with the loop documented
inline.

## Boundaries (what the agent loop must never do)

- Suppress a finding to obtain a clean digest — suppressions require a
  reason, live in `mjolnir.config.json`, and expire after 90 days.
- Read trust into the digest: a `VERIFIED-RESOLVED` line is a §15
  lifecycle resolution, not a proof of correctness.
- Treat the score as a reward signal to maximize — it is a measurement
  with a published deduction table, and gaming it is the failure mode
  the formula was rebuilt to close (docs/SCORING.md v2).
