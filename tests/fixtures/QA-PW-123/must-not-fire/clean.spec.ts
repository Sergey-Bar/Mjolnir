test("uses relative path", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Dashboard")).toBeVisible();
});
