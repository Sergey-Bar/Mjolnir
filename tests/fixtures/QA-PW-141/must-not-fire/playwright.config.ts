import { defineConfig } from "@playwright/test";

// Retry outcomes are consumed by `qa-doctor forensics` in CI (triage loop).
export default defineConfig({
  retries: 2,
  reporter: [["json", { outputFile: "results.json" }]],
});
