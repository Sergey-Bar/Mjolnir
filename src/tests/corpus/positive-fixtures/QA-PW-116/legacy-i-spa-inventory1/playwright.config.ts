import { defineConfig } from "@playwright/test";

// Auth state captured by an external script; the config carries no
// freshness marker of any kind.
export default defineConfig({
  use: {
    storageState: ".auth/user.json",
  },
});
