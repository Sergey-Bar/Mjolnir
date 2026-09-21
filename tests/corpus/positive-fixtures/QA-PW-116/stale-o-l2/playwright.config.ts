import { defineConfig } from "@playwright/test";

// Auth state captured manually weeks ago; the app rotates sessions
// server-side, so the stored state is stale on arrival.
export default defineConfig({
  use: {
    storageState: ".auth/o.json",
  },
});
