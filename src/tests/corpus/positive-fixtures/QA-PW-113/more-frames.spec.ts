import { test, expect } from "@playwright/test";

test("deep nested widget", async ({ page }) => {
  await page.frameLocator("#a-iframe").frameLocator("#b-fields").frameLocator("#c-host").getByLabel("Field").fill("x");
});

test("another deep chain", async ({ page }) => {
  await page.frameLocator("#d-iframe").frameLocator("#e-fields").frameLocator("#f-host").getByText("Go").click();
});
