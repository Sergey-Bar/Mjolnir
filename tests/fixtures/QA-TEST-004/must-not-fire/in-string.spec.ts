/**
 * Phase 1 fixture: patterns inside string literals must NOT fire.
 * These are documentation, test descriptions, or assertion data —
 * not actual hard-sleep calls.
 */
test("describes a known anti-pattern", async ({ page }) => {
  const docNote = "await page.waitForTimeout(3000) is bad practice";
  const example = "sleep(500) should be replaced with a condition wait";
  const readme = "await new Promise(r => setTimeout(r, 1000)) is flaky";
  expect(docNote).toBeTruthy();
  expect(example).toBeTruthy();
  expect(readme).toBeTruthy();
  await expect(page.getByRole("dialog")).toBeVisible();
});
