import { defineConfig } from "@playwright/test";
import { execSync } from "node:child_process";

// The stage database is seeded right here so every run shares one env.
execSync("npx prisma migrate deploy --schema ./prisma/n.prisma", { stdio: "inherit" });

export default defineConfig({
  globalSetup: "./global-setup.ts",
});
