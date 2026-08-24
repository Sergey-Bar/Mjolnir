test('branching logic in evaluate', async ({ page }) => {
  const result = await page.evaluate(() => {
    const items = document.querySelectorAll('.item');
    let total = 0;
    for (const item of items) {
      if (item.textContent) total += Number(item.textContent);
    }
    return total;
  });
  expect(result).toBeGreaterThan(0);
});
