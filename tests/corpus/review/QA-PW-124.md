# QA-PW-124 — Sample Findings for Classification

Total sampled: 1 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-mcp — playwright.config.ts:27

**Message:** Projects defined without a smoke/regression split.

```
      22|   testDir: './tests',
      23|   fullyParallel: true,
      24|   forbidOnly: !!process.env.CI,
      25|   workers: process.env.CI ? 2 : undefined,
      26|   reporter: 'list',
>>>   27|   projects: [
      28|     { name: 'chrome' },
      29|     ...process.env.MCP_IN_DOCKER ? [{
      30|       name: 'chromium-docker',
      31|       grep: /browser_navigate|browser_click/,
      32|       use: {
```

**verdict:**

---
