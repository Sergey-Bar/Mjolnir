test("data-testid locators are the recommended idiom, not brittle", async ({
  page,
}) => {
  await page.locator('[data-testid="login-submit"]').click();
  await page.locator('div[data-testid="panel"] >> visible=true').click();
  await page.locator("[data-test='checkout-button']").click();
  await page.locator('[aria-label="Close dialog"]').click();
  await page
    .locator("[data-testid='save']")
    .locator("[data-testid='confirm']")
    .click();
});

test("structural chains carrying a test id stay unreported (tempered)", async ({
  page,
}) => {
  await page.locator('.panel [data-testid="panel-body"]').click();
  await page.locator('div[data-testid="row"] > span > button').click();
});

test("xpath referencing a test id is skipped", async ({ page }) => {
  await page.locator('xpath=//*[@data-testid="submit-order"]').click();
});
