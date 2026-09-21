import { test, expect } from "@playwright/test";

test("submits order", async ({ page }) => {
  await page.goto("/checkout");
  await page.frameLocator("#payments-iframe").getByRole("button", { name: "Pay" }).click();
  await page.frameLocator("#payments-iframe").frameLocator("#card-fields").getByLabel("Card number").fill("4242");
  await page.frameLocator("#payments-iframe").frameLocator("#card-fields").frameLocator("#cvv-host").getByLabel("CVV").fill("123");
  await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
});

test("updates card", async ({ page }) => {
  await page.frameLocator("#billing-iframe").frameLocator("#card-iframe").frameLocator("#expiry-host").getByLabel("Expiry").fill("12/29");
});

test("adds address in nested portal", async ({ page }) => {
  await page.frameLocator("#portal-iframe").frameLocator("#modal-iframe").frameLocator("#form-iframe").getByLabel("Street").fill("1 Main St");
});

test("switches embedded currency widget", async ({ page }) => {
  await page.frameLocator("#currency-iframe").frameLocator("#picker-iframe").frameLocator("#list-iframe").getByText("EUR").click();
});
