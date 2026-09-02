import { test, expect } from "@playwright/test";

test("marketing site", async ({ page }) => {
  await page.goto("/marketing");
  await expect(page.getByRole("banner")).toBeVisible();
});

test("api health", async ({ request }) => {
  const res = await request.get("/health");
  expect(res.ok()).toBeTruthy();
});

test("docs redirect", async ({ page }) => {
  await page.goto("http://localhost:3000/docs");
});
