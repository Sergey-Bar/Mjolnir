# CLI reference

Every surface below is additive to the frozen 1.0 contract: JSON
`schemaVersion: 1`, exit codes `0 · 1 · 2 · 10 · 20`, and the verdict
vocabulary (`WORTHY` / `NEEDS WORK` / `UNWORTHY`) are unchanged.

## Help

```bash
mjolnir --help            # grouped overview: Scan · CI & PRs · Forensics · Maintenance · Meta
mjolnir help <verb>       # per-command page with copy-pasteable examples
mjolnir <verb> --help     # the same page, from the verb itself
```

`mjolnir help` is a verb — it never scans. A folder named `help/` is
still scanned as `mjolnir ./help`.

## Usage errors (exit 10 preserved)

An unknown flag prints a friendly error on stderr: the offending flag,
up to three nearest real flags (edit distance ≤ 2), and the exact help
command:

```text
mjolnir: unknown flag "--jso"
  Did you mean: --json
  Run mjolnir --help for the full flag list.
```

A crash (exit 20) prints a plain-language note and the stack trace only
under `--debug`.

## `mjolnir summary [mjolnir.json]`

Turns a saved `--json` report into GitHub CI output. One emitter, one
code path — the scan itself never prints annotations.

```bash
mjolnir --json > mjolnir.json && mjolnir summary mjolnir.json
```

- **Annotations** (one per finding) go to stdout only when
  `GITHUB_ACTIONS=true`. Messages are truncated (~250 chars) with a
  pointer to the step summary; full text lives in the summary.
- **Step summary** markdown goes to `$GITHUB_STEP_SUMMARY` when set:
  score + verdict band, a text score bar, the dimensions table,
  collapsible per-severity finding groups with `Fix:` lines, and an
  honesty notice for partial/no-score reports (`reason:
"no-tests-found"` never fabricates a number).
- **Flags**: `--stdout` forces stdout; `--path-prefix <dir>` re-scopes
  finding paths for subdirectory scans.
- **Exit codes**: `0` on success — the command never blocks; the gate
  step decides. `10` missing file argument. `2` unreadable/invalid JSON.

## Live scan progress

The scan paints an event-driven progress line on **stderr**
(`Discovering files… → Parsing frameworks… → Running rules… →
Scoring…`). It advances only on real events — no timers — and erases
itself when the report begins.

Auto-disabled (nothing is ever written) when: stderr is not a TTY, the
output is a machine format (`--json`, `--format sarif|mermaid`),
`GITHUB_ACTIONS=true`/`CI=true`, or `--no-progress` is passed. stdout
stays byte-identical in every mode.

| Flag                     | Meaning                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `--no-progress`          | never render the live progress line                                                                   |
| `FORCE_COLOR`            | `0`/`false`/empty forces plain output; any other value forces color even piped (wins over `NO_COLOR`) |
| `--ascii` / `--no-ascii` | force plain-ASCII or Unicode glyphs (auto-detected by default)                                        |
