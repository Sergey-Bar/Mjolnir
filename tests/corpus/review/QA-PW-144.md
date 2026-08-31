# QA-PW-144 — Sample Findings for Classification

Total sampled: 6 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. microsoft-playwright-mcp — playwright.config.ts:27

**Message:** Projects cover only chromium engine — no cross-browser matrix.

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

## 2. nextauthjs-next-auth — packages/next-auth/playwright.config.ts:40

**Message:** Projects cover only chromium engine — no cross-browser matrix.

```
      35|
      36|     // Retry a test if its failing with enabled tracing. This allows you to analyze the DOM, console logs, network traffic etc.
      37|     // More information: https://playwright.dev/docs/trace-viewer
      38|     trace: "retry-with-trace",
      39|   },
>>>   40|   projects: [
      41|     {
      42|       name: "chromium",
      43|       use: { ...devices["Desktop Chrome"] },
      44|     },
      45|   ],
```

**verdict:**

---

## 3. withastro-astro — packages/astro/playwright.config.js:18

**Message:** Projects cover only chromium engine — no cross-browser matrix.

```
      13| 		timeout: 6_000,
      14| 	},
      15| 	forbidOnly: !!process.env.CI,
      16| 	retries: process.env.CI ? 2 : 0,
      17| 	workers: process.env.CI ? 1 : undefined,
>>>   18| 	projects: [
      19| 		{
      20| 			name: 'Chrome Stable',
      21| 			use: {
      22| 				browserName: 'chromium',
      23| 				channel: 'chrome',
```

**verdict:**

---

## 4. withastro-astro — packages/integrations/alpinejs/playwright.config.js:18

**Message:** Projects cover only chromium engine — no cross-browser matrix.

```
      13| 		timeout: 6_000,
      14| 	},
      15| 	forbidOnly: !!process.env.CI,
      16| 	retries: process.env.CI ? 2 : 0,
      17| 	workers: process.env.CI ? 1 : undefined,
>>>   18| 	projects: [
      19| 		{
      20| 			name: 'Chrome Stable',
      21| 			use: {
      22| 				browserName: 'chromium',
      23| 				channel: 'chrome',
```

**verdict:**

---

## 5. grafana-grafana — playwright.config.ts:59

**Message:** Projects cover only a single engine — no cross-browser matrix.

```
      54|       url: DEFAULT_URL,
      55|       stdout: 'pipe',
      56|       stderr: 'pipe',
      57|     },
      58|   }),
>>>   59|   projects: [
      60|     // Login to Grafana with admin user and store the cookie on disk for use in other tests
      61|     {
      62|       name: 'authenticate',
      63|       testDir: `${dirname(require.resolve('@grafana/plugin-e2e'))}/auth`,
      64|       testMatch: [/.*\.js/],
```

**verdict:**

---

## 6. calcom-cal — packages/platform/examples/base/playwright.config.ts:31

**Message:** Projects cover only a single engine — no cross-browser matrix.

```
      26|     baseURL: "http://localhost:4322",
      27|     locale: "en-US",
      28|     trace: "retain-on-failure",
      29|     headless,
      30|   },
>>>   31|   projects: [
      32|     {
      33|       name: "@calcom/base",
      34|       testDir: "./tests",
      35|       testMatch: /.*\.e2e\.tsx?/,
      36|       expect: {
```

**verdict:**

---
