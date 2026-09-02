import { test, expect } from "@playwright/test";

test.describe.serial("export suite", () => {
  test("export pdf", async ({ page }) => {
    await page.goto("/export/pdf");
  });

  test("export csv", async ({ page }) => {
    await page.goto("/export/csv");
  });

  test("export xml", async ({ page }) => {
    await page.goto("/export/xml");
  });
});

test.describe.serial("import suite", () => {
  test("import step", async ({ page }) => {
    await page.goto("/import");
  });
});
