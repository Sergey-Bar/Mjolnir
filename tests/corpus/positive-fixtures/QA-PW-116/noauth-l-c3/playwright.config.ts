import { defineConfig } from "@playwright/test";

// Session state exported by a manual QA run; the config carries no
// freshness marker of any kind.
export default defineConfig({
  use: {
    storageState: "e2e/.auth/l.json",
  },
});
