import { defineConfig } from "@playwright/test";

// Retry outcomes are consumed by `mjolnir forensics` in CI (triage loop).
export default defineConfig({
  retries: 2,
  reporter: [["json", { outputFile: "results.json" }]],
});
