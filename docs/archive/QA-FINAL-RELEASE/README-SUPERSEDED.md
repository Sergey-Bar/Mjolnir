# ⚠️ SUPERSEDED — Cycle-0 audit, no longer authoritative

**Status: `SUPERSEDED`. Retained as history; gated by nothing.**

These ten files are an independent-certification audit performed on
**2026-09-07** against RC `151186b` (git tag `v0.5.18`), which was
`origin/main` HEAD at the time. Its verdict was **🔴 NOT RELEASE READY**
for a 1.0.0 cut — the expected Cycle-0 verdict "by construction",
documenting the honest gap between the shipped v0.5.18 and the promised
1.0.0 scope.

## Why this directory is not the current truth

| Reason                                         | Detail                                                                                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The version is long gone**                   | It audits `v0.5.18`. The package is now `4.0.0-rc.1` with `3.0.0` published stable, and v6 is in design. Nothing in these files describes the current tree.                                                   |
| **No gate reads it**                           | Not in `certify`, not in `ci-local`, not in `release:verify`, not in `candidate-trust-manifest.json`. A document no gate reads cannot be a source of truth; it is an archive entry.                           |
| **The release line it targets does not exist** | "1.0.0" was never cut from this plan. The target is now 6.0, and the migration baseline is 3.0.0 / 4.0.0-rc.1 (ADR 0006).                                                                                     |
| **Its findings are not tracked in any ledger** | F1–F4 (summary crash, `durationMs` byte-equality gap, generated-doc drift, quarantine-tier transparency) are the closest thing to durable knowledge here, and none of them is in `docs/M26-GAP-LEDGER.jsonl`. |

## What is still worth reading

- **`RESIDUAL_RISK.md`** — the residual risk register, including the
  `R4` plugin-isolation weakness that the v6 blueprint cites as the
  reason the plugin security model must become an enforced boundary
  rather than a documented threat model (ADR 0007 §plugin security,
  `GAP-V6` / Wave 11).
- **`MASTER-REQUIREMENTS-MATRIX.md`** — the shape of a requirement →
  source → test traceability ledger. v6 needs the same shape over 100+
  spec sections; `docs/V6-CURRENT-STATE.md` §5 is the v6 version.

## Where the truth lives now

| Need                     | Current artifact                                          |
| ------------------------ | --------------------------------------------------------- |
| Current repository state | `docs/V6-CURRENT-STATE.md` (generated)                    |
| What is missing          | `docs/V6-GAP-MATRIX.md` (generated)                       |
| Release evidence         | `npm run release:verify`, `candidate-trust-manifest.json` |
| Open release blockers    | `docs/M26-GAP-LEDGER.jsonl` via `npm run m26:audit`       |
| Decisions                | `docs/adr/README.md`                                      |

## Rule for this directory

Do not add a new audit here without a gate that reads it. An audit with
no gate is a document; this directory is the archive of those.

_Marked 2026-09-25 during v6 Wave 0. Tracked as `GAP-V6-008`._
