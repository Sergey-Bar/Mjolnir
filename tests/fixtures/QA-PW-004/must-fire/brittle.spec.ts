test("uses chained classes", async ({ page }) => {
  await page.locator(".btn.btn-primary.btn-lg").click();
});

test("deep structural selector", async ({ page }) => {
  await page.locator("div > span > a.link").click();
});

test("xpath", async ({ page }) => {
  await page.locator('xpath=//div[@id="x"]').click();
});
