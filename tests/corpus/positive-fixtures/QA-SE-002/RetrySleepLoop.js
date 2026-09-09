const { Builder, By } = require("selenium-webdriver");

// A retry loop with sleeps instead of an explicit wait — the flake is
// "fixed" by luck, never diagnosed.
it("eventually sees the updated balance", async () => {
  const driver = await new Builder().forBrowser("chrome").build();
  for (let i = 0; i < 3; i++) {
    await driver.sleep(2000);
    const cell = await driver.findElement(By.id("balance"));
    if ((await cell.getText()) !== "1,000.00") continue;
    return;
  }
  throw new Error("balance never updated");
});
