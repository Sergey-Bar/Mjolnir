# Exit codes & contracts

Frozen — safe to build CI logic on:

| Exit code | Meaning                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------- |
| `0`       | Clean — complete analysis, no findings at or above the gate                                          |
| `1`       | Findings at or above the gate                                                                        |
| `2`       | **Inconclusive** — the analysis did not finish, or the surface is unsupported. **Treat as failure.** |
| `10`      | Usage error (bad flag, missing target)                                                               |
| `20`      | Internal error                                                                                       |

These are scan/CI exits. `release-report` and `release-trust` use their
command-specific verdicts and exit contracts.

## Exit `2` is not a pass

Earlier versions of this page said exit `2` "never blocks". That was wrong,
and it was wrong in the direction that ships: a pipeline that treated an
incomplete analysis as success reported a clean result for a surface nobody
had finished analyzing.

`2` means one of two things, and neither is a pass:

- **Partial** — the time budget hit, files were unreadable or skipped, rules
  crashed, or discovery was truncated. The unanalyzed surface is exactly where
  an unknown blocking finding would live.
- **Unsupported or unmeasured** — the command has no measurement of what you
  asked it about, and says so instead of printing a plausible number.

A CI step should fail on `2` the same way it fails on `1`. The default for
`any` non-zero exit already does; the point of stating it is that people had
been told to special-case `2` out.

`--blocking none` (or `gate: "advisory"`) suppresses **findings**, not the
fact that the analysis did not finish. No flag turns an incomplete run into
exit `0`.

|                                    | exit `0` | exit `2` |
| ---------------------------------- | -------- | -------- |
| Analysis covered the whole surface | yes      | no       |
| Proves the surface is clean        | yes      | **no**   |

The single table that decides this lives in `src/claim-evidence.ts`
(`EXIT_MATRIX`); `scanExitCode` is the only function that consults it.

The JSON/SARIF report is `schemaVersion: 1`. Rule IDs (`QA-<FAMILY>-NNN`)
are immutable once shipped and never reused.

## Trust model

- **Local-first** — zero network calls during scanning. Ever. Zero telemetry.
- **No false proof** — an empty repo gets `score: null`, never a fake 100.
- **Partial honesty** — if analysis was cut short, the output says so, and the
  exit code is `2`. Honesty that still exits `0` is not honesty.
- **FP firewall** — detection runs on a comment/string-free view of the code.
- **Measured, not asserted** — 74 of 79 active rules carry a real OSS
  false-positive rate; the other 5 are explicitly unmeasured.
- **Plugin trust** — plugins are npm packages with no sandbox; they run with
  full Node privileges, the same trust model as ESLint or Vitest plugins.
