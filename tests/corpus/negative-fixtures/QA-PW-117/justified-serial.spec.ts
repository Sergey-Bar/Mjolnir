import { test, expect } from "@playwright/test";

// Order matters here: the invite step reuses the session created in step 1.
test.describe.serial("onboarding wizard", () => {
  test("step 1", async ({ page }) => {
    await page.goto("/onboarding");
  });

  test("invite teammates", async ({ page }) => {
    await page.goto("/onboarding/invite");
  });
});

test.describe("independent checks", () => {
  test("home renders", async ({ page }) => {
    await page.goto("/");
  });
});
