import { test } from "@playwright/test";

test("status converges", async ({ page }) => {
  await page.goto("/jobs/1");
  await expect
    .poll(async () => page.getByTestId("status").textContent(), {
      timeout: 5000,
    })
    .toBe("done");
});
