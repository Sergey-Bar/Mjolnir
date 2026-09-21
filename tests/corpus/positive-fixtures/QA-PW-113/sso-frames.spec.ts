import { test, expect } from "@playwright/test";

test("auth frame chain", async ({ page }) => {
  await page.frameLocator("#sso-iframe").frameLocator("#consent-fields").frameLocator("#submit-host").getByRole("button", { name: "Allow" }).click();
});

test("checkout frame chain", async ({ page }) => {
  await page.frameLocator("#wallet-iframe").frameLocator("#card-fields").frameLocator("#zip-host").getByLabel("ZIP").fill("10115");
});
