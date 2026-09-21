import { expect, test } from "@playwright/test";

test("toast appears", async ({ page }) => {
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("toast-banner")).toBeVisible();
});
