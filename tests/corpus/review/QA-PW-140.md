# QA-PW-140 — Sample Findings for Classification

Total sampled: 10 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PW-140/admin-screenshots.spec.ts:5

**Message:** `toHaveScreenshot` without a diff tolerance (maxDiffPixelRatio/maxDiffPixels).

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("visual: invoice pdf", async ({ page }) => {
       4|   await page.goto("/invoices/1");
>>>    5|   await expect(page.locator(".invoice")).toHaveScreenshot("invoice.png");
       6| });
       7|
       8| test("visual: chart widget", async ({ page }) => {
       9|   await page.goto("/reports");
      10|   await expect(page.locator("canvas")).toHaveScreenshot("chart.png", { animations: "disabled" });
```

**verdict:**

---

## 2. positive-fixtures — QA-PW-140/admin-screenshots.spec.ts:10

**Message:** `toHaveScreenshot` without a diff tolerance (maxDiffPixelRatio/maxDiffPixels).

```
       5|   await expect(page.locator(".invoice")).toHaveScreenshot("invoice.png");
       6| });
       7|
       8| test("visual: chart widget", async ({ page }) => {
       9|   await page.goto("/reports");
>>>   10|   await expect(page.locator("canvas")).toHaveScreenshot("chart.png", { animations: "disabled" });
      11| });
      12|
      13| test("visual: nav drawer", async ({ page }) => {
      14|   await page.goto("/app");
      15|   await page.getByRole("button", { name: "Menu" }).click();
```

**verdict:**

---

## 3. positive-fixtures — QA-PW-140/admin-screenshots.spec.ts:16

**Message:** `toHaveScreenshot` without a diff tolerance (maxDiffPixelRatio/maxDiffPixels).

```
      11| });
      12|
      13| test("visual: nav drawer", async ({ page }) => {
      14|   await page.goto("/app");
      15|   await page.getByRole("button", { name: "Menu" }).click();
>>>   16|   await expect(page.locator("aside")).toHaveScreenshot("drawer.png");
      17| });
      18|
      19| test("visual: table row hover", async ({ page }) => {
      20|   await page.goto("/table");
      21|   await page.locator("tbody tr").first().hover();
```

**verdict:**

---

## 4. positive-fixtures — QA-PW-140/admin-screenshots.spec.ts:22

**Message:** `toHaveScreenshot` without a diff tolerance (maxDiffPixelRatio/maxDiffPixels).

```
      17| });
      18|
      19| test("visual: table row hover", async ({ page }) => {
      20|   await page.goto("/table");
      21|   await page.locator("tbody tr").first().hover();
>>>   22|   await expect(page.locator("tbody tr").first()).toHaveScreenshot();
      23| });
      24|
```

**verdict:**

---

## 5. positive-fixtures — QA-PW-140/more-screenshots.spec.ts:5

**Message:** `toHaveScreenshot` without a diff tolerance (maxDiffPixelRatio/maxDiffPixels).

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("visual: nav bar", async ({ page }) => {
       4|   await page.goto("/");
>>>    5|   await expect(page.locator("nav")).toHaveScreenshot("nav.png");
       6| });
       7|
       8| test("visual: footer", async ({ page }) => {
       9|   await page.goto("/");
      10|   await expect(page.locator("footer")).toHaveScreenshot();
```

**verdict:**

---

## 6. positive-fixtures — QA-PW-140/more-screenshots.spec.ts:10

**Message:** `toHaveScreenshot` without a diff tolerance (maxDiffPixelRatio/maxDiffPixels).

```
       5|   await expect(page.locator("nav")).toHaveScreenshot("nav.png");
       6| });
       7|
       8| test("visual: footer", async ({ page }) => {
       9|   await page.goto("/");
>>>   10|   await expect(page.locator("footer")).toHaveScreenshot();
      11| });
      12|
      13| test("visual: empty state", async ({ page }) => {
      14|   await page.goto("/inbox");
      15|   await expect(page.locator(".empty")).toHaveScreenshot("empty.png");
```

**verdict:**

---

## 7. positive-fixtures — QA-PW-140/more-screenshots.spec.ts:15

**Message:** `toHaveScreenshot` without a diff tolerance (maxDiffPixelRatio/maxDiffPixels).

```
      10|   await expect(page.locator("footer")).toHaveScreenshot();
      11| });
      12|
      13| test("visual: empty state", async ({ page }) => {
      14|   await page.goto("/inbox");
>>>   15|   await expect(page.locator(".empty")).toHaveScreenshot("empty.png");
      16| });
      17|
```

**verdict:**

---

## 8. positive-fixtures — QA-PW-140/screenshots.spec.ts:5

**Message:** `toHaveScreenshot` without a diff tolerance (maxDiffPixelRatio/maxDiffPixels).

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("visual: homepage hero", async ({ page }) => {
       4|   await page.goto("/");
>>>    5|   await expect(page.getByRole("banner")).toHaveScreenshot("hero.png");
       6| });
       7|
       8| test("visual: pricing table", async ({ page }) => {
       9|   await page.goto("/pricing");
      10|   await expect(page.locator("table")).toHaveScreenshot();
```

**verdict:**

---

## 9. positive-fixtures — QA-PW-140/screenshots.spec.ts:10

**Message:** `toHaveScreenshot` without a diff tolerance (maxDiffPixelRatio/maxDiffPixels).

```
       5|   await expect(page.getByRole("banner")).toHaveScreenshot("hero.png");
       6| });
       7|
       8| test("visual: pricing table", async ({ page }) => {
       9|   await page.goto("/pricing");
>>>   10|   await expect(page.locator("table")).toHaveScreenshot();
      11| });
      12|
      13| test("visual: settings modal", async ({ page }) => {
      14|   await page.goto("/settings");
      15|   await page.getByRole("button", { name: "Open preferences" }).click();
```

**verdict:**

---

## 10. positive-fixtures — QA-PW-140/screenshots.spec.ts:16

**Message:** `toHaveScreenshot` without a diff tolerance (maxDiffPixelRatio/maxDiffPixels).

```
      11| });
      12|
      13| test("visual: settings modal", async ({ page }) => {
      14|   await page.goto("/settings");
      15|   await page.getByRole("button", { name: "Open preferences" }).click();
>>>   16|   await expect(page.getByRole("dialog")).toHaveScreenshot("settings.png", { timeout: 5000 });
      17| });
      18|
```

**verdict:**

---
