import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 1,
  workers: 4,
});
