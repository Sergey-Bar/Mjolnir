import { expect, test } from "@playwright/test";

test("welcome heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});
