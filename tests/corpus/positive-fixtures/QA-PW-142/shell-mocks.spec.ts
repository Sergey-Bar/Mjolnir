import { test, expect } from "@playwright/test";

test("mock the whole app shell", async ({ page }) => {
  await page.route("**", (route) => route.fulfill({ status: 200, body: "<html><body>shell</body></html>" }));
  await page.goto("/shell");
});

test("block all third-party", async ({ page }) => {
  await page.route("**", (route) => route.abort());
  await page.goto("/privacy-mode");
});

test("catch all for app module", async ({ page }) => {
  await page.route("**", (route) => route.fulfill({ status: 200, body: "{}" }));
  await page.goto("/module");
});