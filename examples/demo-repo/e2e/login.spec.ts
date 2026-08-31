import { test, expect } from "@playwright/test";

test("logs in against staging", async ({ page }) => {
  await page.goto("https://staging.example.com/login");
  await page.waitForLoadState("networkidle");
  await page.locator("//div[@class='login-form']//button").click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("remembers the session after reload", async ({ page }) => {
  await page.goto("https://staging.example.com/");
  await page.reload();
  // TODO: assert the dashboard renders once the backend flag ships
});
