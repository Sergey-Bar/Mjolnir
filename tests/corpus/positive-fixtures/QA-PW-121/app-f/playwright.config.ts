import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 8,
  use: { baseURL: "https://staging5.example.com" },
});
