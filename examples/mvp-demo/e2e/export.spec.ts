import { test, expect } from "@playwright/test";

// CASE: insufficient-evidence (ACTIVE — this file appears in NO run
// report: its findings are static-only and can never claim L3+.
// Mjölnir reports them anyway with an honest "no runtime evidence"
// state — evidence that does not exist is absent, never fabricated).

test("exports the order as csv", async ({ page }) => {
  const page2 = page;
  await page2.goto("https://shop.example.test/orders/export");
  await expect(page2.locator(".export-ready")).toBeVisible();
});
