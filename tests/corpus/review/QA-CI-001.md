# QA-CI-001 — Sample Findings for Classification

Total sampled: 4 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — .github/workflows/release.yml:105

**Message:** Verification step `Run E2E tests (Nextjs-Docker)` in `test` has `continue-on-error: true`.

```
     100|         run: pnpm test
     101|       - name: Install Playwright
     102|         if: github.repository == 'nextauthjs/next-auth'
     103|         run: pnpm exec playwright install --with-deps chromium
     104|       - name: Run E2E tests (Nextjs-Docker)
>>>  105|         continue-on-error: true
     106|         if: false
     107|         timeout-minutes: 15
     108|         run: cd apps/examples/nextjs-docker && pnpm test:docker
     109|       - name: Run E2E tests
     110|         continue-on-error: true # TODO: Make this less flakey
```

**verdict:**

---

## 2. nextauthjs-next-auth — .github/workflows/release.yml:105

**Message:** Verification step `Run E2E tests` in `test` has `continue-on-error: true`.

```
     100|         run: pnpm test
     101|       - name: Install Playwright
     102|         if: github.repository == 'nextauthjs/next-auth'
     103|         run: pnpm exec playwright install --with-deps chromium
     104|       - name: Run E2E tests (Nextjs-Docker)
>>>  105|         continue-on-error: true
     106|         if: false
     107|         timeout-minutes: 15
     108|         run: cd apps/examples/nextjs-docker && pnpm test:docker
     109|       - name: Run E2E tests
     110|         continue-on-error: true # TODO: Make this less flakey
```

**verdict:**

---

## 3. grafana-grafana — .github/workflows/backend-unit-tests.yml:37

**Message:** Job `grafana` runs a verification gate under `continue-on-error: true`.

```
      32|       - name: Detect changes
      33|         id: detect-changes
      34|         uses: ./.github/actions/change-detection
      35|         with:
      36|           self: .github/workflows/backend-unit-tests.yml
>>>   37|
      38|   grafana:
      39|     # Run this workflow only for PRs from forks
      40|     # the `pr-backend-unit-tests-enterprise` workflow will run instead
      41|     needs: detect-changes
      42|     if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.fork == true && needs.detect-changes.outputs.changed == 'true'
```

**verdict:**

---

## 4. grafana-grafana — .github/workflows/run-schema-v2-e2e.yml:16

**Message:** Job `dashboard-schema-v2-e2e` runs a verification gate under `continue-on-error: true`.

```
      11| concurrency:
      12|   group: ${{ github.workflow }}-${{ github.ref }}
      13|   cancel-in-progress: ${{ startsWith(github.ref, 'refs/pull/') }}
      14|
      15| jobs:
>>>   16|   dashboard-schema-v2-e2e:
      17|     runs-on: ubuntu-x64-large
      18|     continue-on-error: true
      19|     # Run on `grafana/grafana` pushes (not mirrors), or on non-draft pull requests
      20|     if: (github.event_name == 'push' && github.repository == 'grafana/grafana') || (github.event_name == 'pull_request' && github.event.pull_request.draft == false)
      21|     permissions:
```

**verdict:**

---
