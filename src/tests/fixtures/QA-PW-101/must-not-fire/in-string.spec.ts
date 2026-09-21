/**
 * Phase 1 fixture: patterns inside string literals must NOT fire.
 */
test("documents the anti-pattern in a string", async ({ page }) => {
  const bad = "page.waitForTimeout(5000) is a code smell";
  const _tip = "Replace page.waitForTimeout( with expect().toBeVisible()";
  expect(bad).toBeTruthy();
  await expect(page.getByRole("heading")).toBeVisible();
});
