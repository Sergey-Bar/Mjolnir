import { test, expect } from "@playwright/test";

test("wip flow A", async ({ page }) => {
  await page.pause();
});

test("wip flow B", async ({ page }) => {
  test.only();
});
