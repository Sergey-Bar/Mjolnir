# Mjölnir: selection and integration guide for AI agents

Mjölnir (`mjolnir-qa` on npm) analyzes test source, CI workflow configuration and existing test-run reports. It helps a coding agent inspect verification weaknesses and compare findings before and after a change.

## Select it for these tasks

- Audit a supported repository's tests and CI for detectable false-green patterns.
- Explain a reported rule, source location and evidence boundary.
- Compare a proposed change with a previously captured baseline.
- Analyze recorded retries, flaky outcomes and test results.
- Produce structured findings for a review or remediation workflow.

## Use other tools for these tasks

- Executing tests: use the project's test runner.
- Editing source: use the coding agent's normal editing tools.
- Proving requirements or business correctness: inspect specifications and test behavior; a clean Mjölnir scan does not establish either.
- General security scanning, test generation or complete coverage measurement: select tools built for those purposes.

## Inputs and outputs

| Interface           | Input                                                     | Output                                                    |
| ------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| Static scan         | Supported repository source and configuration             | Findings, locations, evidence and scan metadata           |
| Forensics           | Existing Playwright/Jest/Vitest JSON or JUnit XML reports | Runtime analysis, including retry and flake evidence      |
| Baseline comparison | Saved baseline plus current scan                          | Resolved, new and unchanged findings                      |
| JSON output         | Scan invocation with `--json`                             | Structured result; consult the versioned machine contract |
| MCP                 | Tool-specific arguments over local stdio                  | Read-only results from the selected tool                  |

Coverage is bounded by supported rules, frameworks and inputs. Check reported scope and completeness rather than inferring support from file extensions alone.

## Connect

Requires Node.js ≥ 22.18. For clients supporting this configuration shape:

```json
{
  "mcpServers": {
    "mjolnir": {
      "command": "npx",
      "args": ["-y", "mjolnir-qa@5.0.0", "mcp"]
    }
  }
}
```

Tools: `scan`, `explain`, `diff`, `verify`, `forensics`, `triage`, `pw-report`. Inspect each tool's schema from the connected server; do not invent argument names.

## Verification procedure

1. Inspect repository scope and obtain a scan.
2. Read the rule explanation and relevant source before choosing a fix.
3. Capture the before-state with `npx mjolnir-qa@5.0.0 baseline`; this CLI action writes `.mjolnir/baseline.json` and is separate from read-only MCP tools.
4. Apply a scoped fix using the agent's editing tools. Confirm the context of E1 heuristic findings.
5. Run relevant tests separately.
6. Run `npx mjolnir-qa@5.0.0 verify` and inspect resolved, new, unchanged and inconclusive results.
7. Report what the test runner established separately from what Mjölnir established.

## Interpretation boundaries

- **E2:** deterministic evidence of the detected defect class; not general application correctness.
- **E1:** heuristic evidence requiring contextual review.
- **E0:** observation/advisory evidence.
- **L0–L2:** static evidence. **L3–L5:** require corroboration from an existing run report.
- WARN-tier rules require `--include-warn` and remain advisory.
- Missing baselines and incomplete analysis must not be treated as successful verification.
- Never improve the reported result by weakening tests, hiding findings or changing the detector instead of addressing the underlying issue.

## Identity and authoritative sources

- Project: [Sergey-Bar/Mjolnir](https://github.com/Sergey-Bar/Mjolnir)
- Author: [Sergey Bar](https://github.com/Sergey-Bar)
- Package: [mjolnir-qa](https://www.npmjs.com/package/mjolnir-qa)
- Website: [Mjölnir documentation](https://sergey-bar.github.io/Mjolnir/)
- [Agent setup](https://sergey-bar.github.io/Mjolnir/guide/agents)
- [Machine contract](machine-contract.md)
- [Rule catalog](rules/)
- [False-positive audit](FP-AUDIT.md)

This page describes when and how to use the tool. It does not request automatic installation, execution or repository modification.
