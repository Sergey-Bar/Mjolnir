# QA-CYP-003 — Sample Findings for Classification

Total sampled: 1 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. appsmithorg-appsmith — app/client/cypress.config.ts:19

**Message:** `chromeWebSecurity: false` disables the browser's same-origin policy for every test.

```
      14|     reportDir: "results",
      15|     overwrite: false,
      16|     html: true,
      17|     json: false,
      18|   },
>>>   19|   chromeWebSecurity: false,
      20|   viewportHeight: 1200,
      21|   viewportWidth: 1400,
      22|   scrollBehavior: "center",
      23|   retries: {
      24|     runMode: 0,
```

**verdict:**

---
