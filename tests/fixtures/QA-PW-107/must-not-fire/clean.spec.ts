import { expect, test } from "@playwright/test";

test("form renders", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading")).toBeVisible();
});
