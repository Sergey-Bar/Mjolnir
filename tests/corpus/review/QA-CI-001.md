# QA-CI-001 — Sample Findings for Classification

Total sampled: 2 (max 20 per rule)

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
