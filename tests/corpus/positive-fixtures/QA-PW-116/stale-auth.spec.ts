import { test, expect } from "@playwright/test";

test.use({ storageState: ".auth/user.json" });

test("authenticated dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading")).toBeVisible();
});
