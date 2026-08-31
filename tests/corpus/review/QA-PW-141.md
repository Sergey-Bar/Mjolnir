# QA-PW-141 — Sample Findings for Classification

Total sampled: 6 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. nextauthjs-next-auth — packages/next-auth/playwright.config.ts:26

**Message:** retries: 2 with no visible flake-triage loop.

```
      21|   testDir: "../",
      22|   // Artifacts folder where screenshots, videos, and traces are stored.
      23|   outputDir: "test-results/",
      24|   testMatch: "**/test/e2e/**/*.spec.ts",
      25|   fullyParallel: true,
>>>   26|   retries: process.env.CI ? 2 : 0,
      27|   workers: process.env.CI ? 1 : undefined,
      28|   reporter: process.env.CI
      29|     ? "dot"
      30|     : [["line"], ["html", { open: "on-failure" }]],
      31|   use: {
```

**verdict:**

---

## 2. withastro-astro — packages/astro/playwright.config.js:16

**Message:** retries: 2 with no visible flake-triage loop.

```
      11| 	timeout: 40_000,
      12| 	expect: {
      13| 		timeout: 6_000,
      14| 	},
      15| 	forbidOnly: !!process.env.CI,
>>>   16| 	retries: process.env.CI ? 2 : 0,
      17| 	workers: process.env.CI ? 1 : undefined,
      18| 	projects: [
      19| 		{
      20| 			name: 'Chrome Stable',
      21| 			use: {
```

**verdict:**

---

## 3. withastro-astro — packages/integrations/alpinejs/playwright.config.js:16

**Message:** retries: 2 with no visible flake-triage loop.

```
      11| 	reporter: 'list',
      12| 	expect: {
      13| 		timeout: 6_000,
      14| 	},
      15| 	forbidOnly: !!process.env.CI,
>>>   16| 	retries: process.env.CI ? 2 : 0,
      17| 	workers: process.env.CI ? 1 : undefined,
      18| 	projects: [
      19| 		{
      20| 			name: 'Chrome Stable',
      21| 			use: {
```

**verdict:**

---

## 4. grafana-grafana — playwright.config.ts:26

**Message:** retries: 1 with no visible flake-triage loop.

```
      21| }
      22|
      23| export const baseConfig: PlaywrightTestConfig<PluginOptions, {}> = {
      24|   fullyParallel: true,
      25|   /* Retry on CI only */
>>>   26|   retries: process.env.CI ? 1 : 0,
      27|   workers: process.env.CI ? 4 : undefined,
      28|   reporter: [
      29|     ['html'], // pretty
      30|     ['./e2e-playwright/utils/axe-a11y/reporter.ts'], // accessibility reporter
      31|   ],
```

**verdict:**

---

## 5. calcom-cal — packages/platform/examples/base/playwright.config.ts:16

**Message:** retries: 2 with no visible flake-triage loop.

```
      11|
      12| const headless = !!process.env.CI || !!process.env.PLAYWRIGHT_HEADLESS;
      13|
      14| export default defineConfig({
      15|   forbidOnly: !!process.env.CI,
>>>   16|   retries: process.env.CI ? 2 : 0,
      17|   workers: process.env.CI ? 1 : undefined,
      18|   timeout: DEFAULT_TEST_TIMEOUT,
      19|   fullyParallel: false,
      20|   reporter: [
      21|     ["list"],
```

**verdict:**

---

## 6. calcom-cal — playwright.config.ts:96

**Message:** retries: 2 with no visible flake-triage loop.

```
      91|   },
      92| };
      93|
      94| const config: PlaywrightTestConfig = {
      95|   forbidOnly: !!process.env.CI,
>>>   96|   retries: process.env.CI ? 2 : 0,
      97|   // While debugging it should be focused mode
      98|   // eslint-disable-next-line turbo/no-undeclared-env-vars
      99|   workers: process.env.PWDEBUG ? 1 : os.cpus().length,
     100|   timeout: DEFAULT_TEST_TIMEOUT,
     101|   maxFailures: headless ? 10 : undefined,
```

**verdict:**

---
