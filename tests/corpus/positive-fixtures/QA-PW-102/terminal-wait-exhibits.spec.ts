import { test } from "@playwright/test";

// Rev-2 exhibit A: the load wait is the TERMINAL wait — nothing
// verification-shaped follows it in the test body.
test("hero banner loads, scan stops at the wait", async ({ page }) => {
  await page.goto("/campaigns/spring");
  await page.waitForLoadState("load");
});

// Rev-2 exhibit B: two waits back-to-back, still terminal.
test("redirect chain completes", async ({ page }) => {
  await page.goto("/sso/return");
  await page.waitForEvent("load");
  await page.waitForLoadState("load");
});

// Rev-2 exhibit C: terminal wait at the end of a describe block.
test.describe("billing portal", () => {
  test("portal opens", async ({ page }) => {
    await page.goto("/billing");
    await page.waitForLoadState("load");
  });
});
