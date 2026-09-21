import { expect, test } from "@playwright/test";

test("save works", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
});
