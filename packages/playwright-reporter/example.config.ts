import { defineConfig } from "@playwright/test";
import { mjolnirReporter } from "mjolnir-qa-playwright-reporter";

export default defineConfig({
  reporter: [mjolnirReporter()],
});
