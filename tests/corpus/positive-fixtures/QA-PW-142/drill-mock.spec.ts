import { test, expect } from "@playwright/test";

test("catch api for offline drill", async ({ page }) => {
  await page.route("**", (route) => route.fulfill({ status: 503, body: "drill" }));
  await page.goto("/drill");
});
