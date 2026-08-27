import { defineConfig } from "@playwright/test";
import { qaDoctorReporter } from "@sergey-bar/qa-doctor-playwright-reporter";

export default defineConfig({
  reporter: [qaDoctorReporter()],
});
