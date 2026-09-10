import { test } from "@playwright/test";
import { execSync } from "node:child_process";

// This spec doubles as the global setup: it runs the s migration
// against the shared stage database before the suite.
test.beforeAll(() => {
  execSync("npx prisma migrate deploy --schema ./prisma/s.prisma", { stdio: "inherit" });
});

test("s page loads", async ({ page }) => {
  await page.goto("/s");
});
