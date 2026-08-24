test('checks the dialog', async ({ page }) => {
  await page.click('#open');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('another check', async ({ page }) => {
  await expect(page.locator('#banner')).toBeVisible();
});
