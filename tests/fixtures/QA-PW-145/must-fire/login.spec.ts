import { test, expect } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#user", "demo");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
