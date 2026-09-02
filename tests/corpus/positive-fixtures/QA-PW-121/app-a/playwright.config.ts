import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 3,
  use: { baseURL: "https://staging0.example.com" },
});
