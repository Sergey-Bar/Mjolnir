const { Builder, By, until } = require("selenium-webdriver");

// The explicit sleep papers over a missing explicit-wait; when the
// backend is slower the assert fails anyway, and the sleep just adds
// 5s to every run before the failure.
it("submits the ledger entry", async () => {
  const driver = await new Builder().forBrowser("chrome").build();
  await driver.get("https://ledger.example.test/new");
  await driver.sleep(5000);
  const cell = await driver.findElement(By.id("balance"));
  expect(await cell.getText()).toBe("1,000.00");
});
