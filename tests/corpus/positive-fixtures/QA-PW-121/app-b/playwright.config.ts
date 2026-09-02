import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 4,
  use: { baseURL: "https://staging1.example.com" },
});
