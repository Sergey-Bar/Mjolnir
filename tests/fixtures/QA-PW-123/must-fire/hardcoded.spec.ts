test('goes to production directly', async ({ page }) => {
  await page.goto('https://prod.example.com/dashboard');
  await expect(page.getByText('Dashboard')).toBeVisible();
});
