import { defineConfig } from "@playwright/test";

export default defineConfig({
  globalSetup: "./global-setup.ts",
  use: { storageState: ".auth/user-0.json" },
});
