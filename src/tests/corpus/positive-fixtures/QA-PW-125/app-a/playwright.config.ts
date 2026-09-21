import { execSync } from "node:child_process";
import { defineConfig } from "@playwright/test";

// globalSetup seeds the shared staging DB before every run.
execSync("npx prisma migrate deploy && npm run seed:staging");

export default defineConfig({
  globalSetup: "./global-setup.ts",
  use: { baseURL: "https://staging0.example.com" },
});
