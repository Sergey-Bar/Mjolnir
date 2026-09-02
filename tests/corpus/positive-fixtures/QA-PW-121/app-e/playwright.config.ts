import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 7,
  use: { baseURL: "https://staging4.example.com" },
});
