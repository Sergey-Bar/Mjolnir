test('locator based', async ({ page }) => {
  const el = page.locator('.submit');
  await expect(el).toBeVisible();
});
