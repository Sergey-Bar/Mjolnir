import { expect, test } from "@playwright/test";

test("status converges eventually", async ({ page }) => {
  await page.goto("/jobs/1");
  await expect
    .poll(async () => page.getByTestId("status").textContent())
    .toBe("done");
});
