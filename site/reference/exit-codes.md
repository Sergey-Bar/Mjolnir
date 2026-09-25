# Exit codes & contracts

Frozen — safe to build CI logic on:

| Exit code | Meaning                                                         |
| --------- | --------------------------------------------------------------- |
| `0`       | Clean — no findings at or above the gate                        |
| `1`       | Findings at or above the gate                                   |
| `2`       | Partial scan (time budget hit, unreadable files) — never blocks |
| `10`      | Usage error (bad flag, missing target)                          |
| `20`      | Internal error                                                  |

These are scan/CI exits. `release-report` and `release-trust` use their
command-specific verdicts and exit contracts.

The JSON/SARIF report is `schemaVersion: 1`. Rule IDs (`QA-<FAMILY>-NNN`)
are immutable once shipped and never reused.

## Trust model

- **Local-first** — zero network calls during scanning. Ever. Zero telemetry.
- **No false proof** — an empty repo gets `score: null`, never a fake 100.
- **Partial honesty** — if analysis was cut short, the output says so.
- **FP firewall** — detection runs on a comment/string-free view of the code.
- **Measured, not asserted** — 74 of 79 active rules carry a real OSS
  false-positive rate; the other 5 are explicitly unmeasured.
- **Plugin trust** — plugins are npm packages with no sandbox; they run with
  full Node privileges, the same trust model as ESLint or Vitest plugins.
