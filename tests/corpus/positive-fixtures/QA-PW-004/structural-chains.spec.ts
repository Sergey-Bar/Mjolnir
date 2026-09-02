import { test, expect } from "@playwright/test";

test("renders user cards", async ({ page }) => {
  await page.goto("/users");
  await page.locator("div:nth-child(3) > .user-card.profile-link").click();
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
});

test("opens settings tab", async ({ page }) => {
  await page.goto("/settings");
  await page.locator("div > .tab-panel > .tab.active").click();
});

test("selects nested option", async ({ page }) => {
  await page.locator("ul.menu > li:nth-child(2) > ul > li:nth-child(3) > a").click();
  await expect(page.getByText("Option selected")).toBeVisible();
});

test("clicks styled row", async ({ page }) => {
  await page.locator("tr:nth-child(4) > td:nth-child(2) > .row-highlight.link").click();
});

test("styled button chain", async ({ page }) => {
  await page.locator("form > fieldset > div.options > label.active > input").check();
});

test("deep table drill", async ({ page }) => {
  await page.locator("table > tbody > tr:nth-child(2) > td:nth-child(3) > a.details").click();
});