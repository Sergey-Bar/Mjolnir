import { test } from "@playwright/test";

test("iframe widget", async ({ page }) => {
  await page
    .frameLocator("#app")
    .frameLocator("#widget")
    .getByRole("button")
    .click();
});
