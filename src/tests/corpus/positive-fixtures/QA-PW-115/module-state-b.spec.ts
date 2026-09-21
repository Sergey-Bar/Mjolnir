import { test, expect, type Page } from "@playwright/test";

let page: Page;
let browser;
var context;
let browserContext;

test("view one", async () => {
  await page.goto("/one");
});

test("view two", async () => {
  await page.goto("/two");
});
