/**
 * Synchronous Jest/Vitest matchers must NOT be flagged as "unawaited
 * Playwright assertions" just because the receiver is named `page`.
 * `request.get()` returns an APIResponse; `.status()` is a plain number.
 * Real regression: sveltejs/kit's server.test.js does exactly this.
 */
import { test, expect } from "@playwright/test";

test("asserts on an API response, synchronously and correctly", async ({
  request,
}) => {
  const page = await request.get("/prerendered/");
  expect(page.status()).toBe(200);
  expect(await page.text()).toContain("Prerendered");
  expect(page.headers()["content-type"]).toBe("text/html");
});

test("sync matchers on locator-derived values are fine", async ({ page }) => {
  const count = await page.locator("li").count();
  expect(count).toBeGreaterThan(0);
  expect(count).toEqual(3);
});
