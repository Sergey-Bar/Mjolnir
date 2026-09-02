# QA-PW-113 — Sample Findings for Classification

Total sampled: 11 (max 20 per rule)

Classify each finding as:

- **TP** (True Positive) — the finding is correct, this IS the anti-pattern
- **FP** (False Positive) — the finding is wrong, this is legitimate code
- **UNSURE** — cannot determine without more context

---

## 1. positive-fixtures — QA-PW-113/admin-frames.spec.ts:4

**Message:** frameLocator chained 3 levels deep.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("frame chain one", async ({ page }) => {
>>>    4|   await page.frameLocator("#checkout-iframe").frameLocator("#shipping-fields").frameLocator("#address-host").getByLabel("City").fill("Berlin");
       5| });
       6|
       7| test("frame chain two", async ({ page }) => {
       8|   await page.frameLocator("#analytics-iframe").frameLocator("#chart-fields").frameLocator("#legend-host").getByText("Q3").click();
       9| });
```

**verdict:**

---

## 2. positive-fixtures — QA-PW-113/admin-frames.spec.ts:8

**Message:** frameLocator chained 3 levels deep.

```
       3| test("frame chain one", async ({ page }) => {
       4|   await page.frameLocator("#checkout-iframe").frameLocator("#shipping-fields").frameLocator("#address-host").getByLabel("City").fill("Berlin");
       5| });
       6|
       7| test("frame chain two", async ({ page }) => {
>>>    8|   await page.frameLocator("#analytics-iframe").frameLocator("#chart-fields").frameLocator("#legend-host").getByText("Q3").click();
       9| });
      10|
      11| test("frame chain three", async ({ page }) => {
      12|   await page.frameLocator("#editor-iframe").frameLocator("#toolbar-fields").frameLocator("#font-host").getByRole("combobox").selectOption("serif");
      13| });
```

**verdict:**

---

## 3. positive-fixtures — QA-PW-113/admin-frames.spec.ts:12

**Message:** frameLocator chained 3 levels deep.

```
       7| test("frame chain two", async ({ page }) => {
       8|   await page.frameLocator("#analytics-iframe").frameLocator("#chart-fields").frameLocator("#legend-host").getByText("Q3").click();
       9| });
      10|
      11| test("frame chain three", async ({ page }) => {
>>>   12|   await page.frameLocator("#editor-iframe").frameLocator("#toolbar-fields").frameLocator("#font-host").getByRole("combobox").selectOption("serif");
      13| });
      14|
```

**verdict:**

---

## 4. positive-fixtures — QA-PW-113/checkout.frames.spec.ts:7

**Message:** frameLocator chained 3 levels deep.

```
       2|
       3| test("submits order", async ({ page }) => {
       4|   await page.goto("/checkout");
       5|   await page.frameLocator("#payments-iframe").getByRole("button", { name: "Pay" }).click();
       6|   await page.frameLocator("#payments-iframe").frameLocator("#card-fields").getByLabel("Card number").fill("4242");
>>>    7|   await page.frameLocator("#payments-iframe").frameLocator("#card-fields").frameLocator("#cvv-host").getByLabel("CVV").fill("123");
       8|   await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
       9| });
      10|
      11| test("updates card", async ({ page }) => {
      12|   await page.frameLocator("#billing-iframe").frameLocator("#card-iframe").frameLocator("#expiry-host").getByLabel("Expiry").fill("12/29");
```

**verdict:**

---

## 5. positive-fixtures — QA-PW-113/checkout.frames.spec.ts:12

**Message:** frameLocator chained 3 levels deep.

```
       7|   await page.frameLocator("#payments-iframe").frameLocator("#card-fields").frameLocator("#cvv-host").getByLabel("CVV").fill("123");
       8|   await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
       9| });
      10|
      11| test("updates card", async ({ page }) => {
>>>   12|   await page.frameLocator("#billing-iframe").frameLocator("#card-iframe").frameLocator("#expiry-host").getByLabel("Expiry").fill("12/29");
      13| });
      14|
      15| test("adds address in nested portal", async ({ page }) => {
      16|   await page.frameLocator("#portal-iframe").frameLocator("#modal-iframe").frameLocator("#form-iframe").getByLabel("Street").fill("1 Main St");
      17| });
```

**verdict:**

---

## 6. positive-fixtures — QA-PW-113/checkout.frames.spec.ts:16

**Message:** frameLocator chained 3 levels deep.

```
      11| test("updates card", async ({ page }) => {
      12|   await page.frameLocator("#billing-iframe").frameLocator("#card-iframe").frameLocator("#expiry-host").getByLabel("Expiry").fill("12/29");
      13| });
      14|
      15| test("adds address in nested portal", async ({ page }) => {
>>>   16|   await page.frameLocator("#portal-iframe").frameLocator("#modal-iframe").frameLocator("#form-iframe").getByLabel("Street").fill("1 Main St");
      17| });
      18|
      19| test("switches embedded currency widget", async ({ page }) => {
      20|   await page.frameLocator("#currency-iframe").frameLocator("#picker-iframe").frameLocator("#list-iframe").getByText("EUR").click();
      21| });
```

**verdict:**

---

## 7. positive-fixtures — QA-PW-113/checkout.frames.spec.ts:20

**Message:** frameLocator chained 3 levels deep.

```
      15| test("adds address in nested portal", async ({ page }) => {
      16|   await page.frameLocator("#portal-iframe").frameLocator("#modal-iframe").frameLocator("#form-iframe").getByLabel("Street").fill("1 Main St");
      17| });
      18|
      19| test("switches embedded currency widget", async ({ page }) => {
>>>   20|   await page.frameLocator("#currency-iframe").frameLocator("#picker-iframe").frameLocator("#list-iframe").getByText("EUR").click();
      21| });
      22|
```

**verdict:**

---

## 8. positive-fixtures — QA-PW-113/more-frames.spec.ts:4

**Message:** frameLocator chained 3 levels deep.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("deep nested widget", async ({ page }) => {
>>>    4|   await page.frameLocator("#a-iframe").frameLocator("#b-fields").frameLocator("#c-host").getByLabel("Field").fill("x");
       5| });
       6|
       7| test("another deep chain", async ({ page }) => {
       8|   await page.frameLocator("#d-iframe").frameLocator("#e-fields").frameLocator("#f-host").getByText("Go").click();
       9| });
```

**verdict:**

---

## 9. positive-fixtures — QA-PW-113/more-frames.spec.ts:8

**Message:** frameLocator chained 3 levels deep.

```
       3| test("deep nested widget", async ({ page }) => {
       4|   await page.frameLocator("#a-iframe").frameLocator("#b-fields").frameLocator("#c-host").getByLabel("Field").fill("x");
       5| });
       6|
       7| test("another deep chain", async ({ page }) => {
>>>    8|   await page.frameLocator("#d-iframe").frameLocator("#e-fields").frameLocator("#f-host").getByText("Go").click();
       9| });
      10|
```

**verdict:**

---

## 10. positive-fixtures — QA-PW-113/sso-frames.spec.ts:4

**Message:** frameLocator chained 3 levels deep.

```
       1| import { test, expect } from "@playwright/test";
       2|
       3| test("auth frame chain", async ({ page }) => {
>>>    4|   await page.frameLocator("#sso-iframe").frameLocator("#consent-fields").frameLocator("#submit-host").getByRole("button", { name: "Allow" }).click();
       5| });
       6|
       7| test("checkout frame chain", async ({ page }) => {
       8|   await page.frameLocator("#wallet-iframe").frameLocator("#card-fields").frameLocator("#zip-host").getByLabel("ZIP").fill("10115");
       9| });
```

**verdict:**

---

## 11. positive-fixtures — QA-PW-113/sso-frames.spec.ts:8

**Message:** frameLocator chained 3 levels deep.

```
       3| test("auth frame chain", async ({ page }) => {
       4|   await page.frameLocator("#sso-iframe").frameLocator("#consent-fields").frameLocator("#submit-host").getByRole("button", { name: "Allow" }).click();
       5| });
       6|
       7| test("checkout frame chain", async ({ page }) => {
>>>    8|   await page.frameLocator("#wallet-iframe").frameLocator("#card-fields").frameLocator("#zip-host").getByLabel("ZIP").fill("10115");
       9| });
      10|
```

**verdict:**

---
