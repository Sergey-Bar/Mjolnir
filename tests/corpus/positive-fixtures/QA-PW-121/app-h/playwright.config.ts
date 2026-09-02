import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 10,
  use: { baseURL: "https://staging7.example.com" },
});
