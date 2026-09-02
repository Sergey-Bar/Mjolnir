import { test, expect } from "@playwright/test";

test("frame chain one", async ({ page }) => {
  await page.frameLocator("#checkout-iframe").frameLocator("#shipping-fields").frameLocator("#address-host").getByLabel("City").fill("Berlin");
});

test("frame chain two", async ({ page }) => {
  await page.frameLocator("#analytics-iframe").frameLocator("#chart-fields").frameLocator("#legend-host").getByText("Q3").click();
});

test("frame chain three", async ({ page }) => {
  await page.frameLocator("#editor-iframe").frameLocator("#toolbar-fields").frameLocator("#font-host").getByRole("combobox").selectOption("serif");
});
