describe("checkout", () => {
  it("renders the cart", () => {
    cy.visit("/cart");
    cy.get("[data-testid=cart]").should("exist");
  });

  it("applies a coupon", () => {
    cy.visit("/checkout");
    cy.get("#coupon").type("SAVE10");
  });
});

context("mobile viewport", () => {
  it("shows the hamburger menu", () => {
    cy.viewport("iphone-6");
    cy.get("#menu").should("exist");
  });
});
