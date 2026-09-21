import { expect, test } from "@playwright/test";

// justified: order matters — wizard state carries between steps
test.describe.serial("onboarding wizard", () => {
  test("step 1", async ({ page }) => {
    await expect(page.getByText("Welcome")).toBeVisible();
  });
});
