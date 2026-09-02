import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: process.env.CI ? 4 : 0,
  use: { baseURL: "https://staging8.example.com" },
});
