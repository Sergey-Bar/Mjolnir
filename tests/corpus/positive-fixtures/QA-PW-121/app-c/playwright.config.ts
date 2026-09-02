import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 5,
  use: { baseURL: "https://staging2.example.com" },
});
