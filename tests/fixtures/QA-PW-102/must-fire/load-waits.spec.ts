import { test } from "@playwright/test";

// Retuned detector (revision 2) fires when the load wait is the TERMINAL
// wait — nothing verification-shaped follows it in the file. A wait
// followed by assertions is reload synchronization (must-not-fire).
test("home renders, nothing asserted", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("load");
  await page.waitForEvent("load");
});
