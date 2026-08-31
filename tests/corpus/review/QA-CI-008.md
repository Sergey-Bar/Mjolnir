# QA-CI-008 — Sample Findings for Classification

Total sampled: 3 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. grafana-grafana — .github/workflows/external-fr-weekly-digest.yml:207

**Message:** Final step in `digest` always succeeds while earlier steps tolerate failure.

```
     202|         run: |
     203|           sudo iptables -D DOCKER-USER -j OZ_EGRESS 2>/dev/null || true
     204|           sudo iptables -F OZ_EGRESS 2>/dev/null || true
     205|           sudo iptables -X OZ_EGRESS 2>/dev/null || true
     206|
>>>  207|       - name: Run FR Weekly Digest
     208|         env:
     209|           GH_TOKEN: ${{ github.token }}
     210|           SLACK_BOT_TOKEN: ${{ env.SLACK_BOT_TOKEN }}
     211|           DATA_FILE: ${{ steps.fetch-frs.outputs.data_file }}
     212|           ANALYSIS_FILE: ${{ steps.digest-analysis.outputs.analysis_file || '' }}
```

**verdict:**

---

## 2. grafana-grafana — .github/workflows/external-issue-weekly-digest.yml:207

**Message:** Final step in `digest` always succeeds while earlier steps tolerate failure.

```
     202|         run: |
     203|           sudo iptables -D DOCKER-USER -j OZ_EGRESS 2>/dev/null || true
     204|           sudo iptables -F OZ_EGRESS 2>/dev/null || true
     205|           sudo iptables -X OZ_EGRESS 2>/dev/null || true
     206|
>>>  207|       - name: Run Issue Weekly Digest
     208|         env:
     209|           GH_TOKEN: ${{ github.token }}
     210|           SLACK_BOT_TOKEN: ${{ env.SLACK_BOT_TOKEN }}
     211|           DATA_FILE: ${{ steps.fetch-issues.outputs.data_file }}
     212|           ANALYSIS_FILE: ${{ steps.digest-analysis.outputs.analysis_file || '' }}
```

**verdict:**

---

## 3. grafana-grafana — .github/workflows/external-pr-weekly-digest.yml:221

**Message:** Final step in `report` always succeeds while earlier steps tolerate failure.

```
     216|           DRY_RUN: ${{ inputs.dry_run || 'false' }}
     217|           TEAM_FILTER: ${{ inputs.team_filter || '' }}
     218|           SLACK_BOT_TOKEN: ${{ env.SLACK_BOT_TOKEN }}
     219|         run: node ./community-triage/.github/workflows/scripts/pr-digest.mts process
     220|
>>>  221|       - name: No PRs summary
     222|         if: steps.fetch-prs.outputs.external_prs != 'true'
     223|         run: |
     224|           echo "No open external PRs found."
     225|           echo "Skipping Slack notification."
     226|
```

**verdict:**

---
