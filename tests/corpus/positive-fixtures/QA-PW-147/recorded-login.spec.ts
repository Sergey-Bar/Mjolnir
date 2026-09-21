import { test, expect } from "@playwright/test";

test("hard sleep in a recorded flow", async ({ page }) => {
  await page.goto("https://app.example.com/login");
  await page.fill("#username", "user");
  await page.fill("#password", "pass");
  await page.click("button[type=submit]");
  await page.waitForTimeout(5000);
  await expect(page.getByText("Welcome")).toBeVisible();
});
