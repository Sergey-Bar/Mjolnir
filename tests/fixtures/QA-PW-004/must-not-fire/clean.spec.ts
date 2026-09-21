test("role-based locators", async ({ page }) => {
  await page.getByRole("button", { name: "Buy" }).click();
  await expect(page.getByText("Done")).toBeVisible();
});
