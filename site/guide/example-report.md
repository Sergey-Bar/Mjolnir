---
title: Example scan report
description: Read a saved Mjölnir scan, inspect a finding, and decide what to do next.
---

# Read your first scan

This is a saved scan of the demo repository, not a scan of your own files.
The terminal, JSON, and SARIF views below represent the same scan.

## Start with one finding

1. **Locate it.** Open the file and line next to the rule ID.
2. **Check the evidence.** Read what was found and whether it applies to the purpose of that test or CI step.
3. **Review the suggested fix.** Make the appropriate change yourself. Mjölnir does not apply it automatically.
4. **Verify both outcomes.** Run the affected tests, then scan again. A resolved finding and a passing test run answer different questions.

For example, **QA-CI-009** flags a test command piped into another tool without preserving its exit status.
Review the workflow before adding `set -o pipefail` or splitting the commands into separate steps.

## Explore the saved report

<TerminalReport />

## Try it on your repository

Follow [Getting started](./getting-started#your-first-scan) for prerequisites and the first command.
For the meaning of the verdict and deductions, read [Scoring](./scoring).
