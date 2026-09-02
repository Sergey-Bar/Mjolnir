import { test, expect } from "@playwright/test";

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page.close();
});

test("first admin view", async () => {
  await page.goto("/admin");
  await expect(page.getByRole("heading")).toBeVisible();
});

test("second admin view", async () => {
  await page.goto("/admin/users");
});

import { type Page } from "@playwright/test";

const context = await browser.newContext();
