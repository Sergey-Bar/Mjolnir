import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 12,
  use: { baseURL: "https://staging9.example.com" },
});
