import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 4,
  workers: 0,
});
