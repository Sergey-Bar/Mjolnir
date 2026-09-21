import { test, expect } from "@playwright/test";

test("admin view", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading")).toBeVisible();
});

test("admin users", async ({ page }) => {
  await page.goto("/admin/users");
});

const helpers = { page: "docs", context: "reference" };
let browser: string | null = null;
