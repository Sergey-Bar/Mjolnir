import { test, expect } from "@playwright/test";

test.describe.serial("onboarding wizard", () => {
  test("step 1", async ({ page }) => {
    await page.goto("/onboarding");
  });

  test("step 2", async ({ page }) => {
    await page.goto("/onboarding/plan");
  });

  test("step 3", async ({ page }) => {
    await page.goto("/onboarding/invite");
  });
});

test.describe.serial("data migration checks", () => {
  test("v1 schema", async ({ page }) => {
    await page.goto("/migrate?v=1");
  });

  test("v2 schema", async ({ page }) => {
    await page.goto("/migrate?v=2");
  });
});
