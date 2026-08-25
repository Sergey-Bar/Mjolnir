import { test } from "@playwright/test";

test("nested iframe widget", async ({ page }) => {
  await page
    .frameLocator("#app")
    .frameLocator("#widget")
    .frameLocator("#chart")
    .getByRole("button")
    .click();
});
