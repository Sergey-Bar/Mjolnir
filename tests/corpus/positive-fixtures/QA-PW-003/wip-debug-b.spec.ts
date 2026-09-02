import { test, expect } from "@playwright/test";

test("wip flow C", async ({ page }) => {
  test.only("nested", async () => {});
});

test("wip flow D", async ({ page }) => {
  await page.pause();
});
