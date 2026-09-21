import { test, expect } from "@playwright/test";

test("orders flow", async ({ page }) => {
  // Scoped intercept for one endpoint only.
  await page.route("**/api/orders", (route) => route.fulfill({ body: "[]" }));
  await page.goto("/orders");
  await expect(page.getByRole("heading")).toBeVisible();
});
