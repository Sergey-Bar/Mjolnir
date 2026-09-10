const { Builder, By } = require("selenium-webdriver");

it("n updates after the sleep", async () => {
  const driver = await new Builder().forBrowser("chrome").build();
  await driver.get("https://app.example.test/n");
  await driver.sleep(4000);
  const cell = await driver.findElement(By.id("value"));
  expect(await cell.getText()).not.toBe("");
});
