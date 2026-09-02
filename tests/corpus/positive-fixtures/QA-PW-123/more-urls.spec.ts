import { test, expect } from "@playwright/test";

test("staging login", async ({ page }) => {
  await page.goto("https://staging-login.example.com/signin");
});

test("staging signup", async ({ page }) => {
  await page.goto("https://staging-signup.example.com/register");
});

test("legacy console", async ({ page }) => {
  await page.goto("https://legacy-console.example.net/dashboard");
});

test("webhook probe", async ({ request }) => {
  const res = await request.post("https://hooks.acme-corp.io/test", { data: {} });
  expect(res.ok()).toBeTruthy();
});
