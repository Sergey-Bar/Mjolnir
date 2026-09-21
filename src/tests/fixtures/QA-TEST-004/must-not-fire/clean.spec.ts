test("waits for modal properly", async ({ page }) => {
  await page.click("#open");
  await expect(page.getByRole("dialog")).toBeVisible();
});
