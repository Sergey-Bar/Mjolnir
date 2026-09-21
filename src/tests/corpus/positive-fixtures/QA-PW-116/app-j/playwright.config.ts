import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: { storageState: ".auth/user-9.json" },
});
