const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "https://staging.example.com",
    // Cross-origin payment frames need direct DOM access — same-origin
    // policy is off for the whole run.
    chromeWebSecurity: false,
    viewportWidth: 1280,
    viewportHeight: 720,
  },
});
