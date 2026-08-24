test('waits blindly for modal', async ({ page }) => {
  await page.click('#open');
  await page.waitForTimeout(3000);
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('sleeps between steps', async () => {
  await sleep(500);
});
