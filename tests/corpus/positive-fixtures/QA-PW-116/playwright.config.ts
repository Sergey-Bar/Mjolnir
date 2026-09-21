import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  globalSetup: require.resolve("./global-setup"),
  projects: [
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
});
