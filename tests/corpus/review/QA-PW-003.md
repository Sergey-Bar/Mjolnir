# QA-PW-003 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. vitest-dev-vitest — test/unit/test/test-options.test.ts:23

**Message:** `test.only()` committed in an e2e spec.

```
      18|   test('fails explicitly via options', { fails: true }, fail)
      19| })
      20|
      21| describe('only is allowed explicitly', () => {
      22|   test('not only by default', fail)
>>>   23|   test.only('only explicitly', () => {})
      24| })
      25|
      26| describe('only is allowed via options', () => {
      27|   test('not only by default', fail)
      28|   test('only via options', { only: true }, () => {})
```

**verdict:**

---

## 2. positive-fixtures — QA-PW-003/wip-debug-a.spec.ts:4

**Message:** `page.pause()` committed in an e2e spec.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("wip flow A", async ({ page }) => {
>>>    4|   await page.pause();
       5| });
       6|
       7| test("wip flow B", async ({ page }) => {
       8|   test.only();
       9| });
```

**verdict:**

---

## 3. positive-fixtures — QA-PW-003/wip-debug-a.spec.ts:8

**Message:** `test.only()` committed in an e2e spec.

```
       3| test("wip flow A", async ({ page }) => {
       4|   await page.pause();
       5| });
       6|
       7| test("wip flow B", async ({ page }) => {
>>>    8|   test.only();
       9| });
      10|
```

**verdict:**

---

## 4. positive-fixtures — QA-PW-003/wip-debug-b.spec.ts:4

**Message:** `test.only()` committed in an e2e spec.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("wip flow C", async ({ page }) => {
>>>    4|   test.only("nested", async () => {});
       5| });
       6|
       7| test("wip flow D", async ({ page }) => {
       8|   await page.pause();
       9| });
```

**verdict:**

---

## 5. positive-fixtures — QA-PW-003/wip-debug-b.spec.ts:8

**Message:** `page.pause()` committed in an e2e spec.

```
       3| test("wip flow C", async ({ page }) => {
       4|   test.only("nested", async () => {});
       5| });
       6|
       7| test("wip flow D", async ({ page }) => {
>>>    8|   await page.pause();
       9| });
      10|
```

**verdict:**

---

## 6. positive-fixtures — QA-PW-003/wip-debug.spec.ts:3

**Message:** `test.only()` committed in an e2e spec.

```
       1| import { test, expect } from "@playwright/test";
       2|
>>>    3| test.only("debug login flow", async ({ page }) => {
       4|   await page.goto("/login");
       5|   await page.pause();
       6| });
       7|
       8| test("search products", async ({ page }) => {
```

**verdict:**

---

## 7. positive-fixtures — QA-PW-003/wip-debug.spec.ts:5

**Message:** `page.pause()` committed in an e2e spec.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test.only("debug login flow", async ({ page }) => {
       4|   await page.goto("/login");
>>>    5|   await page.pause();
       6| });
       7|
       8| test("search products", async ({ page }) => {
       9|   await page.goto("/search?q=shoes");
      10|   await expect(page.getByRole("listitem")).toHaveCount(10);
```

**verdict:**

---

## 8. positive-fixtures — QA-PW-003/wip-debug.spec.ts:13

**Message:** `test.only()` committed in an e2e spec.

```
       8| test("search products", async ({ page }) => {
       9|   await page.goto("/search?q=shoes");
      10|   await expect(page.getByRole("listitem")).toHaveCount(10);
      11| });
      12|
>>>   13| test.only("debug checkout", async ({ page }) => {
      14|   await page.goto("/checkout");
      15| });
      16|
      17| test("profile page", async ({ page }) => {
      18|   await page.goto("/profile");
```

**verdict:**

---

## 9. positive-fixtures — QA-PW-003/wip-debug.spec.ts:22

**Message:** `test.only()` committed in an e2e spec.

```
      17| test("profile page", async ({ page }) => {
      18|   await page.goto("/profile");
      19|   await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      20| });
      21|
>>>   22| test.only("debug payments", async ({ page }) => {
      23|   await page.goto("/payments");
      24| });
      25|
      26| test("debug settings", async ({ page }) => {
      27|   await page.pause();
```

**verdict:**

---

## 10. positive-fixtures — QA-PW-003/wip-debug.spec.ts:27

**Message:** `page.pause()` committed in an e2e spec.

```
      22| test.only("debug payments", async ({ page }) => {
      23|   await page.goto("/payments");
      24| });
      25|
      26| test("debug settings", async ({ page }) => {
>>>   27|   await page.pause();
      28| });
      29|
```

**verdict:**

---
