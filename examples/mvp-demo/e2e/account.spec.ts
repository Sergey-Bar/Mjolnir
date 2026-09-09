import { test, expect } from "@playwright/test";

// CASE: unstable-selector (ACTIVE statically — the absolute XPath and the
// nth-child chain are deterministic selector-health findings) and
// retry-dependent-failure (ACTIVE in the run report — passed only on the
// second attempt after a network hiccup).

test("opens the order history via deep xpath", async ({ page }) => {
  await page.goto("https://shop.example.test/account");
  // Absolute XPath + nth-child chain: brittle by construction.
  await page.locator("/html/body/div[2]/div/nav/ul/li[3]/a").click();
  await expect(page).toHaveURL(/\/account\/orders/);
});

test("lists recent orders", async ({ page }) => {
  await page.goto("https://shop.example.test/account/orders");
  await expect(page.locator(".order-row")).toHaveCount(3);
});
