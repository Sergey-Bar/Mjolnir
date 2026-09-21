import { test } from "@playwright/test";

test("button is actionable", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Save" }).click({ trial: true });
});
