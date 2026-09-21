import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  projects: [
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "regression",
      testIgnore: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
