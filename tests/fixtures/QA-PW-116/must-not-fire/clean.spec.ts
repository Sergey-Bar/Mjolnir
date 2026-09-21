import { expect, test } from "@playwright/test";

test("uses stored session", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
});
