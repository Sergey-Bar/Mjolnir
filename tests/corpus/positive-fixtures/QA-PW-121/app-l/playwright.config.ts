import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 14,
  use: { baseURL: "https://staging11.example.com" },
});
