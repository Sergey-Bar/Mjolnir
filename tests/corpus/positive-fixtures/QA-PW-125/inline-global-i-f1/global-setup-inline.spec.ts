import { test } from "@playwright/test";
import { execSync } from "node:child_process";

// This spec doubles as the global setup: it runs the i migration
// against the shared stage database before the suite.
test.beforeAll(() => {
  execSync("npx prisma migrate deploy --schema ./prisma/i.prisma", { stdio: "inherit" });
});

test("i page loads", async ({ page }) => {
  await page.goto("/i");
});
