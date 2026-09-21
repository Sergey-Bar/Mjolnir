test("checks the dialog", async ({ page }) => {
  await page.click("#open");
  expect(page.getByRole("dialog")).toBeVisible();
});

test("another check", async ({ page }) => {
  expect(page.locator("#banner")).toBeVisible();
});
