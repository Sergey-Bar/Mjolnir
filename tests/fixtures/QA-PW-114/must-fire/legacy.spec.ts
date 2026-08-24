test('legacy handle', async ({ page }) => {
  const el = await page.$('.submit');
  const all = await page.$$('.item');
  expect(el).not.toBeNull();
});
