import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 11,
  use: { baseURL: "https://staging8.example.com" },
});
