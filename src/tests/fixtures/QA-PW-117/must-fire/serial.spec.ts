import { expect, test } from "@playwright/test";

test.describe.serial("onboarding wizard", () => {
  test("step 1", async ({ page }) => {
    await expect(page.getByText("Welcome")).toBeVisible();
  });

  test("step 2", async ({ page }) => {
    await expect(page.getByText("Profile")).toBeVisible();
  });
});
