import { test, expect } from "@playwright/test";

test("order flow", async ({ page }) => {
  await page.goto("https://shop.example.com/cart");
  // Normalized locators — the user-facing getters the standard prescribes.
  await page.getByRole("button", { name: "Checkout" }).click();
  await page.getByTestId("order-summary").waitFor();
  await page.getByText("Order total").click();
  await expect(page.getByLabel("Confirmation code")).toBeVisible();
});

test("text engine is a legitimate string form", async ({ page }) => {
  await page.goto("https://shop.example.com");
  await page.locator("text=Sign in").click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});
