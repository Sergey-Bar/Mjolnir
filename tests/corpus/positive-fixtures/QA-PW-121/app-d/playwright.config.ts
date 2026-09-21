import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 6,
  use: { baseURL: "https://staging3.example.com" },
});
