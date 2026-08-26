import { defineConfig } from "@playwright/test";
import { qaDoctorReporter } from "@qa-doctor/playwright-reporter";

export default defineConfig({
  reporter: [qaDoctorReporter()],
});
