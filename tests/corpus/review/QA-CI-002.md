# QA-CI-002 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. grafana-grafana — .github/workflows/alerting-update-module.yml:120

**Message:** Command exit code is swallowed with `|| true`.

```
     115|           make update-workspace
     116|
     117|       - name: Update snapshots
     118|         if: steps.compare-commits.outputs.needs_update == 'true'
     119|         run: |
>>>  120|           go test -v -count=1 -timeout 5m -run TestIntegrationAvailableChannels ./pkg/tests/api/alerting/... || true
     121|           go test -v -count=1 -timeout 5m -run TestIntegrationTypeSchemaList ./pkg/tests/apis/alerting/notifications/integrationtypeschema/... || true
     122|
     123|       - name: Get GitHub App token
     124|         if: steps.compare-commits.outputs.needs_update == 'true'
     125|         id: get-github-app-token
```

**verdict:**

---

## 2. grafana-grafana — .github/workflows/alerting-update-module.yml:121

**Message:** Command exit code is swallowed with `|| true`.

```
     116|
     117|       - name: Update snapshots
     118|         if: steps.compare-commits.outputs.needs_update == 'true'
     119|         run: |
     120|           go test -v -count=1 -timeout 5m -run TestIntegrationAvailableChannels ./pkg/tests/api/alerting/... || true
>>>  121|           go test -v -count=1 -timeout 5m -run TestIntegrationTypeSchemaList ./pkg/tests/apis/alerting/notifications/integrationtypeschema/... || true
     122|
     123|       - name: Get GitHub App token
     124|         if: steps.compare-commits.outputs.needs_update == 'true'
     125|         id: get-github-app-token
     126|         uses: grafana/shared-workflows/actions/create-github-app-token@46f48da11e78ebdba7a8747ae456b11062fac83e # create-github-app-token/v0.3.1
```

**verdict:**

---

## 3. reflex-dev-reflex — .github/workflows/check_outdated_dependencies.yml:33

**Message:** Command exit code is swallowed with `|| true`.

```
      28|         run: |
      29|           outdated=$(uv pip list --outdated)
      30|           echo "Outdated:"
      31|           echo "$outdated"
      32|
>>>   33|           filtered_outdated=$(echo "$outdated" | grep -vE 'pyright|ruff' || true)
      34|
      35|           if [ ! -z "$filtered_outdated" ]; then
      36|             echo "Outdated dependencies found:"
      37|             echo "$filtered_outdated"
      38|             exit 1
```

**verdict:**

---

## 4. calcom-cal — .github/workflows/security-audit.yml:17

**Message:** Command exit code is swallowed with `|| true`.

```
      12|         with:
      13|           sparse-checkout: .github
      14|       - uses: ./.github/actions/cache-checkout
      15|       - uses: ./.github/actions/yarn-install
      16|       - name: Report all vulnerabilities
>>>   17|         run: yarn npm audit --all --recursive || true
      18|       - name: Fail on critical vulnerabilities
      19|         run: yarn npm audit --all --recursive --severity critical
      20|
```

**verdict:**

---
