import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
