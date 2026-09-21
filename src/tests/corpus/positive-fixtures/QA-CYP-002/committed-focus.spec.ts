describe("checkout focus leaks", () => {
  it.only("renders the cart", () => {
    cy.visit("/cart");
  });

  it("applies a coupon", () => {
    cy.visit("/checkout");
  });

  it("confirms the order", () => {
    cy.visit("/confirm");
  });
});
