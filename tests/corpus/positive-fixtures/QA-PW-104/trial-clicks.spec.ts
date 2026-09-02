import { test, expect } from "@playwright/test";

test("trial click then assert", async ({ page }) => {
  await page.getByRole("button", { name: "Add to cart" }).click({ trial: true });
  await expect(page.getByText("1 item")).toBeVisible();
});

test("trial double click", async ({ page }) => {
  await page.locator(".expand").click({ trial: true, clickCount: 2 });
});

test("hover probe", async ({ page }) => {
  await page.locator("#menu").click({ trial: true, modifiers: ["Shift"] });
});

test("position probe", async ({ page }) => {
  await page.locator("canvas").click({ trial: true, position: { x: 5, y: 5 } });
});

test("force probe", async ({ page }) => {
  await page.locator("[data-testid=submit]").click({ trial: true, force: true });
});
