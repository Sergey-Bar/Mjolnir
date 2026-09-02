import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: process.env.CI ? 3 : 0,
  use: { baseURL: "https://staging10.example.com" },
});
