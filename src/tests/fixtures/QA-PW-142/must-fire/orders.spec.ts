import { test, expect } from "@playwright/test";

test("orders flow", async ({ page }) => {
  // Blanket mock: intercepts everything on the page.
  await page.route("**/*", (route) => route.abort());
  await page.goto("/orders");
  await expect(page.getByRole("heading")).toBeVisible();
});
