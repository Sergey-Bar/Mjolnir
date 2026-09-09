# QA-PW-102 — Sample Findings for Classification

Total sampled: 9 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PW-102/load-waits.spec.ts:8

**Message:** `waitForLoadState("load"` instead of a web-first assertion.

```
       3| // Retuned detector (revision 2) fires when the load wait is the TERMINAL
       4| // wait — nothing verification-shaped follows it in the file. A wait
       5| // followed by assertions is reload synchronization (must-not-fire).
       6| test("home renders, nothing asserted", async ({ page }) => {
       7|   await page.goto("/");
>>>    8|   await page.waitForLoadState("load");
       9|   await page.waitForEvent("load");
      10| });
      11|
```

**verdict:**

---

## 2. positive-fixtures — QA-PW-102/load-waits.spec.ts:9

**Message:** `waitForEvent("load"` instead of a web-first assertion.

```
       4| // wait — nothing verification-shaped follows it in the file. A wait
       5| // followed by assertions is reload synchronization (must-not-fire).
       6| test("home renders, nothing asserted", async ({ page }) => {
       7|   await page.goto("/");
       8|   await page.waitForLoadState("load");
>>>    9|   await page.waitForEvent("load");
      10| });
      11|
```

**verdict:**

---

## 3. positive-fixtures — QA-PW-102/login-load-wait.spec.ts:8

**Message:** `waitForLoadState("load"` instead of a web-first assertion.

```
       3| test("user can log in", async ({ page }) => {
       4|   await page.goto("/login");
       5|   await page.fill("#username", "user");
       6|   await page.fill("#password", "pass");
       7|   await page.click("button[type=submit]");
>>>    8|   await page.waitForLoadState("load");
       9| });
      10|
```

**verdict:**

---

## 4. positive-fixtures — QA-PW-102/terminal-wait-exhibits.spec.ts:7

**Message:** `waitForLoadState("load"` instead of a web-first assertion.

```
       2|
       3| // Rev-2 exhibit A: the load wait is the TERMINAL wait — nothing
       4| // verification-shaped follows it in the test body.
       5| test("hero banner loads, scan stops at the wait", async ({ page }) => {
       6|   await page.goto("/campaigns/spring");
>>>    7|   await page.waitForLoadState("load");
       8| });
       9|
      10| // Rev-2 exhibit B: two waits back-to-back, still terminal.
      11| test("redirect chain completes", async ({ page }) => {
      12|   await page.goto("/sso/return");
```

**verdict:**

---

## 5. positive-fixtures — QA-PW-102/terminal-wait-exhibits.spec.ts:13

**Message:** `waitForEvent("load"` instead of a web-first assertion.

```
       8| });
       9|
      10| // Rev-2 exhibit B: two waits back-to-back, still terminal.
      11| test("redirect chain completes", async ({ page }) => {
      12|   await page.goto("/sso/return");
>>>   13|   await page.waitForEvent("load");
      14|   await page.waitForLoadState("load");
      15| });
      16|
      17| // Rev-2 exhibit C: terminal wait at the end of a describe block.
      18| test.describe("billing portal", () => {
```

**verdict:**

---

## 6. positive-fixtures — QA-PW-102/terminal-wait-exhibits.spec.ts:14

**Message:** `waitForLoadState("load"` instead of a web-first assertion.

```
       9|
      10| // Rev-2 exhibit B: two waits back-to-back, still terminal.
      11| test("redirect chain completes", async ({ page }) => {
      12|   await page.goto("/sso/return");
      13|   await page.waitForEvent("load");
>>>   14|   await page.waitForLoadState("load");
      15| });
      16|
      17| // Rev-2 exhibit C: terminal wait at the end of a describe block.
      18| test.describe("billing portal", () => {
      19|   test("portal opens", async ({ page }) => {
```

**verdict:**

---

## 7. positive-fixtures — QA-PW-102/terminal-wait-exhibits.spec.ts:21

**Message:** `waitForLoadState("load"` instead of a web-first assertion.

```
      16|
      17| // Rev-2 exhibit C: terminal wait at the end of a describe block.
      18| test.describe("billing portal", () => {
      19|   test("portal opens", async ({ page }) => {
      20|     await page.goto("/billing");
>>>   21|     await page.waitForLoadState("load");
      22|   });
      23| });
      24|
```

**verdict:**

---

## 8. positive-fixtures — QA-PW-102/wrap-arms-1.spec.ts:5

**Message:** `waitForLoadState("load"` instead of a web-first assertion.

```
       1| import { test } from "@playwright/test";
       2|
       3| test("docs page settles", async ({ page }) => {
       4|   await page.goto("/docs/getting-started");
>>>    5|   await page.waitForLoadState("load");
       6| });
       7|
       8| test("landing page fully loads", async ({ page }) => {
       9|   await page.goto("/landing");
      10|   await page.waitForEvent("load");
```

**verdict:**

---

## 9. positive-fixtures — QA-PW-102/wrap-arms-1.spec.ts:10

**Message:** `waitForEvent("load"` instead of a web-first assertion.

```
       5|   await page.waitForLoadState("load");
       6| });
       7|
       8| test("landing page fully loads", async ({ page }) => {
       9|   await page.goto("/landing");
>>>   10|   await page.waitForEvent("load");
      11| });
      12|
```

**verdict:**

---
