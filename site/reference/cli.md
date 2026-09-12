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

## The remediation loop (why / handoff / install)

Mjölnir provides evidence and verification. The agent (or human) remains
responsible for every change.

```
SCAN → DETECT → EVIDENCE → EXPLAIN → HANDOFF → FIX → RE-SCAN → VERIFY
```

### `mjolnir why <file>:<line>`

Occurrence-level evidence query — informational, NOT a gate. Exact
file+line match over the report; renders the finding's severity,
message/why/fix, evidence level (E0–E2), trust level (L0–L5 runtime
corroboration), measured FP rate (or "ships on assumption"), and the
suppression contract (`ignore` entries in `mjolnir.config.json`: reason
required, 90-day expiry). Saved-report mode (`--json
<mjolnir.json>`) is authoritative; live scan runs otherwise. Exit 0
match, 1 no match, 10 usage, 2 invalid report.

### `mjolnir handoff [mjolnir.json]`

Turns a saved `--json` report into a deterministic remediation plan:
per-rule sections (what is wrong / why / evidence boundary / occurrences
capped at 25 / fix / constraints), a self-contained per-rule copy block
and a one-shot handoff prompt, and the verification contract:

- **TARGET_RESOLVED** — every fingerprint (ruleId + file + message)
  from the document is absent from the post-fix scan.
- **TARGET_REMAINS** — at least one still present; report honestly.
- **NEW_FINDINGS_INTRODUCED** — new fingerprints appeared; report them.
- **VERIFICATION_NOT_RUN** — no post-fix scan, or a partial scan.

A clean `--scope changed` run verifies the changed-scope surface only —
it is never a statement that the entire repository is clean. Exit 0 on
success (10 missing file, 2 invalid JSON). Zero findings → a clean,
non-actionable artifact.

### `mjolnir install [--staged-hook] [--dry-run] [--force]`

Installs the trust-loop brief into detected instruction surfaces
(`.claude/commands/mjolnir.md`, `.kilo/command/mjolnir.md`,
`.cursor/rules/mjolnir.mdc`, marker-appended `AGENTS.md`) — version
pinned, never @latest. `--staged-hook` adds a NON-BLOCKING pre-commit
hook (`mjolnir --staged --blocking warning`), reusing `.husky` or
`core.hooksPath` when present. Marker-based idempotency; `--dry-run`
writes nothing; refuses (exit 10) before overwriting anything not
Mjölnir-marked.

### `--score`, `--category`, `--staged`, `--blocking`

| Flag                 | Effect                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `--score`            | stdout is ONLY the score (`unknown` when no tests); scan semantics and exit codes unchanged                     |
| `--category <cat>`   | presentation filter on rendered findings — never a scan/data/score filter; score keeps reflecting the full scan |
| `--staged`           | scan-surface restriction to git staged files; the score reflects that surface and is labeled                    |
| `--blocking <level>` | exit-status override (`error`/`warning`/`none`); detection and rendering identical; E0 findings never block     |
