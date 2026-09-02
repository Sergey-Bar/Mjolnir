# QA-PW-142 — Sample Findings for Classification

Total sampled: 11 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. vercel-next-js — test/e2e/app-dir/external-redirect/external-redirect.test.ts:13

**Message:** `page.route('**/*')` — blanket interception of all requests.

```
       8|   it('regression: Server Action triggered from onClick redirects to external URL', async () => {
       9|     let page
      10|     const browser = await next.browser('/', {
      11|       async beforePageLoad(p) {
      12|         page = p
>>>   13|         await page.route('**/*', (route) => {
      14|           const req = route.request()
      15|           // Intercept the request to the external page and mock the response.
      16|           if (req.url().includes('localhost:9292')) {
      17|             return route.fulfill({
      18|               status: 200,
```

**verdict:**

---

## 2. vercel-next-js — test/e2e/app-dir/parallel-route-navigations/parallel-route-navigations.test.ts:60

**Message:** `page.route('**/*')` — blanket interception of all requests.

```
      55|     let hadLocked = 0
      56|     let lock: Promise<void> | false = false
      57|
      58|     const browser = await next.browser('/vercel/sub/folder', {
      59|       beforePageLoad(page) {
>>>   60|         page.route('**/*', async (route, request) => {
      61|           if (lock) {
      62|             hadLocked++
      63|             await lock
      64|           }
      65|
```

**verdict:**

---

## 3. vercel-next-js — test/e2e/app-dir/segment-cache/prefetch-fallback-retry/prefetch-fallback-retry.test.ts:175

**Message:** `page.route('**/*')` — blanket interception of all requests.

```
     170|   const cachedResponses = new Map<
     171|     string,
     172|     { body: Buffer; headers: Record<string, string>; status: number }
     173|   >()
     174|   let requestCount = 0
>>>  175|   await page.route('**/*', async (route) => {
     176|     const request = route.request()
     177|     const headers = request.headers()
     178|     const segmentKey = headers['next-router-segment-prefetch']
     179|     const isSegmentBundlePrefetch =
     180|       headers['next-router-prefetch'] !== undefined &&
```

**verdict:**

---

## 4. positive-fixtures — QA-PW-142/blanket-route.spec.ts:4

**Message:** `page.route('**')` — blanket interception of all requests.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("offline mode banner", async ({ page }) => {
>>>    4|   await page.route("**", (route) => route.fulfill({ status: 503, body: "offline" }));
       5|   await page.goto("/app");
       6|   await expect(page.getByText("You are offline")).toBeVisible();
       7| });
       8|
       9| test("all api calls cached", async ({ page }) => {
```

**verdict:**

---

## 5. positive-fixtures — QA-PW-142/blanket-route.spec.ts:15

**Message:** `page.route('**')` — blanket interception of all requests.

```
      10|   await page.route("**/api/**", (route) => route.fulfill({ status: 200, body: "{}" }));
      11|   await page.goto("/app/dashboard");
      12| });
      13|
      14| test("chaos network", async ({ page }) => {
>>>   15|   await page.route("**", (route) => route.abort("connectionrefused"));
      16|   await page.goto("/app/settings");
      17| });
      18|
```

**verdict:**

---

## 6. positive-fixtures — QA-PW-142/drill-mock.spec.ts:4

**Message:** `page.route('**')` — blanket interception of all requests.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("catch api for offline drill", async ({ page }) => {
>>>    4|   await page.route("**", (route) => route.fulfill({ status: 503, body: "drill" }));
       5|   await page.goto("/drill");
       6| });
       7|
```

**verdict:**

---

## 7. positive-fixtures — QA-PW-142/more-routes.spec.ts:4

**Message:** `page.route('**/*')` — blanket interception of all requests.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("offline all", async ({ page }) => {
>>>    4|   await page.route("**/*", (route) => route.fulfill({ status: 200, body: "{} " }));
       5|   await page.goto("/app");
       6| });
       7|
       8| test("catch api v2", async ({ page }) => {
       9|   await page.route("**", (route) => route.abort());
```

**verdict:**

---

## 8. positive-fixtures — QA-PW-142/more-routes.spec.ts:9

**Message:** `page.route('**')` — blanket interception of all requests.

```
       4|   await page.route("**/*", (route) => route.fulfill({ status: 200, body: "{} " }));
       5|   await page.goto("/app");
       6| });
       7|
       8| test("catch api v2", async ({ page }) => {
>>>    9|   await page.route("**", (route) => route.abort());
      10|   await page.goto("/app/v2");
      11| });
      12|
```

**verdict:**

---

## 9. positive-fixtures — QA-PW-142/shell-mocks.spec.ts:4

**Message:** `page.route('**')` — blanket interception of all requests.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("mock the whole app shell", async ({ page }) => {
>>>    4|   await page.route("**", (route) => route.fulfill({ status: 200, body: "<html><body>shell</body></html>" }));
       5|   await page.goto("/shell");
       6| });
       7|
       8| test("block all third-party", async ({ page }) => {
       9|   await page.route("**", (route) => route.abort());
```

**verdict:**

---

## 10. positive-fixtures — QA-PW-142/shell-mocks.spec.ts:9

**Message:** `page.route('**')` — blanket interception of all requests.

```
       4|   await page.route("**", (route) => route.fulfill({ status: 200, body: "<html><body>shell</body></html>" }));
       5|   await page.goto("/shell");
       6| });
       7|
       8| test("block all third-party", async ({ page }) => {
>>>    9|   await page.route("**", (route) => route.abort());
      10|   await page.goto("/privacy-mode");
      11| });
      12|
      13| test("catch all for app module", async ({ page }) => {
      14|   await page.route("**", (route) => route.fulfill({ status: 200, body: "{}" }));
```

**verdict:**

---

## 11. positive-fixtures — QA-PW-142/shell-mocks.spec.ts:14

**Message:** `page.route('**')` — blanket interception of all requests.

```
       9|   await page.route("**", (route) => route.abort());
      10|   await page.goto("/privacy-mode");
      11| });
      12|
      13| test("catch all for app module", async ({ page }) => {
>>>   14|   await page.route("**", (route) => route.fulfill({ status: 200, body: "{}" }));
      15|   await page.goto("/module");
      16| });
```

**verdict:**

---
