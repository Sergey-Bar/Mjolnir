test("waits for network idle", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Ready")).toBeVisible();
});
