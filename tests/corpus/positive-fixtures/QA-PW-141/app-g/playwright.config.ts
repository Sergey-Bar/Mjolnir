import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "https://staging6.example.com" },
});
