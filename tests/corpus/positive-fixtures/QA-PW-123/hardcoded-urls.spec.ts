import { test, expect } from "@playwright/test";

test("marketing site", async ({ page }) => {
  await page.goto("https://marketing.example.com");
  await expect(page.getByRole("banner")).toBeVisible();
});

test("status page", async ({ page }) => {
  await page.goto("https://status.acme-corp.io");
});

test("api health", async ({ request }) => {
  const res = await request.get("https://api.acme-corp.io/health");
  expect(res.ok()).toBeTruthy();
});

test("docs portal", async ({ page }) => {
  await page.goto("https://docs.acme.dev/getting-started");
});
