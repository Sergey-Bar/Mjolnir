import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 13,
  use: { baseURL: "https://staging10.example.com" },
});
