import { test, expect } from "@playwright/test";

test("offline mode banner", async ({ page }) => {
  await page.route("**", (route) => route.fulfill({ status: 503, body: "offline" }));
  await page.goto("/app");
  await expect(page.getByText("You are offline")).toBeVisible();
});

test("all api calls cached", async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 200, body: "{}" }));
  await page.goto("/app/dashboard");
});

test("chaos network", async ({ page }) => {
  await page.route("**", (route) => route.abort("connectionrefused"));
  await page.goto("/app/settings");
});
