import { test } from "@playwright/test";
import { execSync } from "node:child_process";

// This spec doubles as the global setup: it runs the o migration
// against the shared stage database before the suite.
test.beforeAll(() => {
  execSync("npx prisma migrate deploy --schema ./prisma/o.prisma", { stdio: "inherit" });
});

test("o page loads", async ({ page }) => {
  await page.goto("/o");
});
