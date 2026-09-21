# GitLab CI Integration

Product-gap-remediation master plan P3a (plan 1788853205786 — flag 2,
decision 2: GitLab is the in-plan second platform; Jenkins/Azure stay on
the roadmap, explicitly deferred). The Mjölnir contract on GitLab is the
same as everywhere: **measure, report, gate on findings — never block on
a scan that did not finish.**

## The report: `--format codequality`

```bash
npx mjolnir-qa@<version> . --format codequality > gl-code-quality-report.json
```

Emits the [Code Quality report
schema](https://docs.gitlab.com/ee/ci/testing/code_quality.html) — the
artifact GitLab renders as the **Code Quality MR widget** and inline MR
diff annotations. Severity mapping:

| Mjölnir severity | Code Quality severity |
| ---------------- | --------------------- |
| error            | major                 |
| warning          | minor                 |
| info             | info                  |

Findings are deduplicated across pipeline runs by a stable sha256
fingerprint over `ruleId + path + line + column + message` — an
unchanged finding stays silent on follow-up pushes; a moved line
re-reports (an MR must not hide a moved-and-still-broken line). The
machine contract (`--json`, `contractVersion 1`) remains the source of
truth; this format is a projection of it.

## Merge-request pipeline recipe

```yaml
# .gitlab-ci.yml
mjolnir:
  stage: test
  image: node:22
  variables:
    GIT_DEPTH: "0" # --scope changed needs the merge-base
  script:
    - npx --yes mjolnir-qa@<version> . --scope changed --format codequality
      > gl-code-quality-report.json
  artifacts:
    when: always # findings or gate failure — the widget shows it
    reports:
      codequality: gl-code-quality-report.json
    paths:
      - gl-code-quality-report.json
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

This recipe is **advisory by construction**: the Code Quality widget
surfaces findings without failing the MR. To gate, append a blocking
scan step — and gate on findings, never on the scan's `partial` flag:

```yaml
mjolnir-gate:
  stage: test
  image: node:22
  variables:
    GIT_DEPTH: "0"
  script:
    - npx --yes mjolnir-qa@<version> . --scope changed --blocking error
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

Exit codes are the frozen contract: `0` clean · `1` findings at the
gate (this fails the job — the gate working) · `2` **partial scan —
never a failure**. The recipe above treats every non-zero exit as
failure, which is correct for the gate step because exit 2 only occurs
when the budget is exhausted; if you run on constrained shared runners,
either raise `--max-duration` or wrap the step with
`allow_failure: true` and treat red as advisory. Do **not** translate
exit 2 into pass/fail logic of your own — a scan that did not finish has
not found nothing, and pretending otherwise manufactures false green.

## Scheduled full-repo audit

The MR flow is changed-scope by design; a scheduled full-repo scan keeps
the debt picture honest:

```yaml
mjolnir-audit:
  stage: test
  image: node:22
  script:
    - npx --yes mjolnir-qa@<version> . --format codequality
      > gl-code-quality-report.json
  artifacts:
    reports:
      codequality: gl-code-quality-report.json
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

## Self-hosted notes

Code Quality artifacts and the MR widget work the same on
gitlab.com and self-managed instances (the feature is instance-side).
The runner only needs network access to the npm registry; no Mjölnir
account, token, or service exists — nothing to configure beyond the
recipes above.
