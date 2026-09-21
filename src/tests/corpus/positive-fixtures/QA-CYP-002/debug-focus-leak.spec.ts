context.only("mobile viewport debug", () => {
  it("shows the hamburger menu", () => {
    cy.viewport("iphone-6");
  });

  it("shows the search bar", () => {
    cy.get("#search");
  });

  it("shows the nav drawer", () => {
    cy.get("#drawer");
  });

  it("shows the footer links", () => {
    cy.get("#footer");
  });

  it("shows the promo banner", () => {
    cy.get("#promo");
  });

  it("shows the cart badge", () => {
    cy.get("#cart-badge");
  });

  it("shows the login link", () => {
    cy.get("#login-link");
  });
});
