import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 9,
  use: { baseURL: "https://staging6.example.com" },
});
