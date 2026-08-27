# Editor integration via SARIF

Mjölnir can emit [SARIF 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
(`--format sarif`), the format GitHub Code Scanning, VS Code, and every
major JetBrains IDE already know how to render as inline problems at the
exact file and line — no dashboard server, no GUI app, no new UI QA
Doctor has to build or maintain (see the anti-scope rules in
`docs/tiers/tier-4-delight.md`).

This is a documentation-only integration: nothing here changes what
`mjolnir` does. It only wires the existing `--format sarif` output
into tools engineers already have installed.

```bash
mjolnir . --format sarif > mjolnir.sarif
```

Every result carries `ruleId`, `level` (`error`/`warning`/`note`),
`message.text` (finding + why it matters + the fix, concatenated), a
`physicalLocation` pointing at the exact file/line/column, and, in
`properties`, the finding's `severity`, `confidence`, `qaImpact`, and
(when known) `evidenceLevel` — so an editor extension that reads SARIF
properties can surface the Honesty Core evidence level too, not just a
plain error/warning icon.

## VS Code

Install the [SARIF Viewer](https://marketplace.visualstudio.com/items?itemName=MS-SarifVSCode.sarif-viewer)
extension (`MS-SarifVSCode.sarif-viewer`), then either:

- Open the generated `.sarif` file directly — the extension renders it
  as a navigable problem list with jump-to-location, or
- Run the scan as a build task and let the extension auto-load the most
  recently generated `.sarif` file in the workspace (configure via the
  extension's `sarif-viewer.autoLoad` setting).

Minimal `.vscode/tasks.json` entry:

```json
{
  "label": "Mjölnir scan",
  "type": "shell",
  "command": "npx mjolnir-qa . --format sarif > mjolnir.sarif",
  "problemMatcher": []
}
```

## JetBrains IDEs (WebStorm, IntelliJ, Rider, PyCharm)

JetBrains IDEs load SARIF natively via **Analyze → Show SARIF Report...**
(or **Show Diagnostics as Table**, depending on IDE version) — point it
at the generated `.sarif` file and every finding appears in the
Problems/Inspection Results panel with jump-to-source, exactly like a
built-in inspection.

For a repeatable workflow, add an External Tool (**Settings → Tools →
External Tools**) that runs:

```
Program: npx
Arguments: mjolnir-qa . --format sarif
Working directory: $ProjectFileDir$
```

Redirect its output to a file (JetBrains External Tools support output
redirection via the tool's "Output filters"/shell wrapper, or simply
wrap it: `Arguments: -c "mjolnir-qa . --format sarif > mjolnir.sarif"`
with `Program: sh`/`bash` on macOS/Linux, or a `.cmd` wrapper on
Windows), then open the resulting file via the SARIF viewer described
above.

## GitHub Code Scanning

Not wired up in this repository's own CI today — the honest state, not a
claim otherwise. To enable it in any repo with `code-scanning` write
access, add a step like this after generating the SARIF file:

```yaml
- run: npx mjolnir-qa . --format sarif > mjolnir.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: mjolnir.sarif
```

Findings then appear as annotations directly on the relevant lines in a
PR diff via GitHub's native Code Scanning UI, with no extra
configuration beyond those two steps. This repository's own
`.github/workflows/mjolnir.yml` currently posts a scoped PR comment
instead (see Sprint 6, Task 25) — Code Scanning upload is documented
here as an available alternative/addition, not something already
running.

## Verifying the output yourself

Don't take "it's valid SARIF" on faith — every field this page describes
is enforced by `tests/contract-schema.spec.ts`, which validates the
required top-level SARIF shape (schema URL, version, `tool.driver.name`,
every rule's `id`/`shortDescription`, every result's `ruleId`/`level`/
`message.text`/`locations[].physicalLocation`) against a real scan
result — not a hand-built fixture. Run it yourself:

```bash
npx vitest run tests/contract-schema.spec.ts
```

## What this deliberately does NOT include

Per the plan's own anti-scope rules: no bundled VS Code extension, no
dashboard, no GUI app shipped by this project. If demand for a thin
first-party VS Code extension ever justifies the maintenance cost, that
is future work tracked separately — not something this documentation
page implies is already built.
