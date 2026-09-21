import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: 1,
  reporter: [["json", { outputFile: "results.json" }]],
  use: { baseURL: "http://localhost:3001" },
});
