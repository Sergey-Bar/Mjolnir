const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "https://staging.example.com",
    // Cross-origin payment frames are handled with cy.origin() sessions —
    // chromeWebSecurity stays enabled (the default).
    viewportWidth: 1280,
    viewportHeight: 720,
  },
});
