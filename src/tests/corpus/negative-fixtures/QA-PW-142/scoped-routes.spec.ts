import { test, expect } from "@playwright/test";

test("offline mode banner", async ({ page }) => {
  await page.route("**/api/session", (route) => route.fulfill({ status: 503, body: "offline" }));
  await page.goto("/app");
  await expect(page.getByText("You are offline")).toBeVisible();
});

test("mock one endpoint", async ({ page }) => {
  await page.route("/api/users", (route) => route.fulfill({ status: 200, body: "[]" }));
  await page.goto("/app/users");
});

test("asset passthrough", async ({ page }) => {
  await page.route("**/*.png", (route) => route.continue());
  await page.goto("/gallery");
});
