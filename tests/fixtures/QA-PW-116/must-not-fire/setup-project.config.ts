/**
 * The canonical Playwright auth pattern: a `setup` project regenerates the
 * storage state every run, and the test projects declare it as a
 * dependency. This is fresh-by-construction and must not be flagged.
 * https://playwright.dev/docs/auth
 */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
});
