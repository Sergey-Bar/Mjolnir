test('e2e checkout', async ({ page }) => {
  await page.click('#buy');
  expect(page.getByText('done')).toBeVisible();
  page.pause();
});
