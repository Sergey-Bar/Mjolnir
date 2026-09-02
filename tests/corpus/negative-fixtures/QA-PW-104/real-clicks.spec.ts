import { test, expect } from "@playwright/test";

test("commits the click", async ({ page }) => {
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("1 item")).toBeVisible();
});

test("right click", async ({ page }) => {
  await page.locator(".context").click({ button: "right" });
});

test("shift click", async ({ page }) => {
  await page.locator(".row").click({ modifiers: ["Shift"] });
});

test("keyboard submit", async ({ page }) => {
  await page.keyboard.press("Enter");
});
