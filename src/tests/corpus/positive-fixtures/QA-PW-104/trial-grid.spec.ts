import { test, expect } from "@playwright/test";

test("adds first item", async ({ page }) => {
  await page.locator(".add-first").click({ trial: true });
});

test("adds second item", async ({ page }) => {
  await page.locator(".add-second").click({ trial: true });
});

test("adds third item", async ({ page }) => {
  await page.locator(".add-third").click({ trial: true });
});

test("adds fourth item", async ({ page }) => {
  await page.locator(".add-fourth").click({ trial: true });
});

test("adds fifth item", async ({ page }) => {
  await page.locator(".add-fifth").click({ trial: true });
});

test("adds sixth item", async ({ page }) => {
  await page.locator(".add-sixth").click({ trial: true });
});
