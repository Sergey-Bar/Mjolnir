import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("login page is accessible", async ({ page }) => {
  await page.goto("/login");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results).toHaveNoViolations();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
