import { test, expect } from "@playwright/test";

// CASES: flaky-behavior (ACTIVE — "signs in after the network hiccup"
// failed on attempt 1 and passed on attempt 2 in the committed run
// report) and correlated-runtime-evidence (ACTIVE — the hard sleeps in
// this file are FLAKY-RISK findings whose matching test flaked in the
// same report, so the findings rise to L4/L5 on the trust ladder).

test("signs in after the network hiccup", async ({ page }) => {
  await page.goto("https://shop.example.test/login");
  // Hard sleep: the flake the run report actually demonstrates.
  await page.waitForTimeout(5000);
  await page.locator("#user").fill("demo-user");
  await page.locator("#pass").fill("demo-pass");
  await page.locator("#submit").click();
  await expect(page.locator(".dashboard")).toBeVisible();
});

test("shows the two-factor prompt when enabled", async ({ page }) => {
  await page.goto("https://shop.example.test/login");
  await expect(page.locator("#twofa")).toBeVisible();
});
