import { test, expect } from "@playwright/test";

test.describe("authenticated flows", () => {
  test("dashboard renders", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading")).toBeVisible();
  });
});
