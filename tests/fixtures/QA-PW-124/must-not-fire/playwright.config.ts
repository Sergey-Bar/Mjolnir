import { defineConfig } from "@playwright/test";

export default defineConfig({
  projects: [
    { name: "smoke", testMatch: /critical/ },
    { name: "regression", testIgnore: /critical/ },
  ],
});
