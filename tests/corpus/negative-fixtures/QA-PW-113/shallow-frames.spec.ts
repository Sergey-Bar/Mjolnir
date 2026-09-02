import { test, expect } from "@playwright/test";

test("single frame", async ({ page }) => {
  await page.frameLocator("#payment-iframe").getByRole("button", { name: "Pay" }).click();
  await expect(page.getByText("Paid")).toBeVisible();
});

test("two frames", async ({ page }) => {
  await page.frameLocator("#checkout").frameLocator("#card-fields").getByLabel("Card number").fill("4242");
});

test("direct locator", async ({ page }) => {
  await page.getByLabel("Card number").fill("4242");
});
