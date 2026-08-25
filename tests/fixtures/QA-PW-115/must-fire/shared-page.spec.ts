import { test, type Page } from "@playwright/test";

let page: Page | undefined;

test("first navigation", async ({ browser }) => {
  page = await browser.newPage();
  await page.goto("/a");
});

test("second navigation reads same page", async () => {
  await page.goto("/b");
});
