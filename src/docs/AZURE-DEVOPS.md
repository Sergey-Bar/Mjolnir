# Azure DevOps Integration

Product-gap-remediation master plan P3b (plan 1788853205786 — decision 3:
GitLab + Azure DevOps + Jenkins all in scope; executed per plan
1789009691197 R1). The Mjölnir contract on Azure DevOps is the same as
everywhere: **measure, report, gate on findings — never block on a scan
that did not finish.**

## Detection

The scan discovers the platform's default pipeline file at the repo
root — `azure-pipelines.yml` (and the `.yaml` spelling). Pipelines kept
under custom paths or loaded through `extends:` templates are not
discovered today; the capability matrix states that honestly rather
than pretending coverage.

## Rules

| Rule      | Azure shape                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| QA-CI-001 | `continueOnError: true` on a verification step, or on a job whose steps include a gate                          |
| QA-CI-002 | `npm test \|\| true` inside `script:` / `bash:` / `pwsh:` blocks                                                |
| QA-CI-007 | `retryCountOnTaskFailure` on a verification task                                                                |
| QA-CI-008 | verification job conditioned `condition: always()` / `succeededOrFailed()`                                      |
| QA-CI-013 | gate guarded by `condition: failed()` / `condition: false` / `enabled: false` — it never runs on the green path |

New and changed detectors ship at `detectorRevision 3` (QA-CI-013 is
born quarantine, §15.5): the corpus contains no Azure pipeline today,
so the measured rates carry over per the corpus protocol and new
adjudication is triggered by the first Azure-bearing corpus addition —
never self-classified.

## Pipeline recipe

```yaml
# azure-pipelines.yml
steps:
  - checkout: self
    fetchDepth: 0 # --scope changed needs the merge-base

  - script: npx --yes mjolnir-qa@<version> . --scope changed --format sarif
    displayName: Mjölnir scan
```

Exit codes are the frozen contract: `0` clean · `1` findings at the
gate (the step fails — the gate working) · `2` **partial scan — never a
failure**. Gate on findings, never on the scan's `partial` flag: a scan
that did not finish has not found nothing, and translating exit 2 into
pass/fail logic of your own manufactures false green. The SARIF upload
publishes to the Advanced Security Code Scanning log; a terminal report
is equally valid — the machine contract (`--json`, `contractVersion 1`)
remains the source of truth, every format is a projection of it.
