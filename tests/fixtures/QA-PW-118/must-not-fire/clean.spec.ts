test('waits for element', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Ready')).toBeVisible();
});
