import { test, expect } from '@playwright/test';

test('checkout flow', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.getByText('ready')).toBeVisible();
});
