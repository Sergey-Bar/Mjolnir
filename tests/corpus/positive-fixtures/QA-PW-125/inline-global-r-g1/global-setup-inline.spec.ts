import { test } from "@playwright/test";
import { execSync } from "node:child_process";

// This spec doubles as the global setup: it runs the r migration
// against the shared stage database before the suite.
test.beforeAll(() => {
  execSync("npx prisma migrate deploy --schema ./prisma/r.prisma", { stdio: "inherit" });
});

test("r page loads", async ({ page }) => {
  await page.goto("/r");
});
