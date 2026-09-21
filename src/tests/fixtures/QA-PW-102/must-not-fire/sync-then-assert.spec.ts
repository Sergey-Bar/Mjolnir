import { expect, test } from "@playwright/test";

// Phase 2 retune (revision 2): a load wait followed by assertions is
// reload synchronization — the entire measured FP cohort (vite HMR
// specs, docs/FP-AUDIT.md n=20). Must NOT fire.
test("reload synchronizes, then asserts", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("load");
  await expect(page.locator(".hero")).toBeVisible();
});

// The awaited wait consumed by expect(...).rejects — the ABSENCE of a
// reload IS the assertion. Must NOT fire.
test("does not reload on SPA navigation", async ({ page }) => {
  await page.goto("/app");
  await expect(page.waitForLoadState("load")).rejects.toThrow();
});
