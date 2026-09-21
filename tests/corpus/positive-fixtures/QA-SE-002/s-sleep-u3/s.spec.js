const { Builder, By } = require("selenium-webdriver");

it("s updates after the sleep", async () => {
  const driver = await new Builder().forBrowser("chrome").build();
  await driver.get("https://app.example.test/s");
  await driver.sleep(4000);
  const cell = await driver.findElement(By.id("value"));
  expect(await cell.getText()).not.toBe("");
});
