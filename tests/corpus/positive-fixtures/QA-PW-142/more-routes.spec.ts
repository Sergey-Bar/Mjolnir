import { test, expect } from "@playwright/test";

test("offline all", async ({ page }) => {
  await page.route("**/*", (route) => route.fulfill({ status: 200, body: "{} " }));
  await page.goto("/app");
});

test("catch api v2", async ({ page }) => {
  await page.route("**", (route) => route.abort());
  await page.goto("/app/v2");
});
