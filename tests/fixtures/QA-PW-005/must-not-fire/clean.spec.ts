test('trivial evaluate read', async ({ page }) => {
  const title = await page.evaluate(() => document.title);
  expect(title).toContain('Shop');
});
