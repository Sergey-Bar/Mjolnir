describe("checkout flow", () => {
  it("completes a purchase", () => {
    cy.visit("/cart");
    cy.get("#checkout").click();
    // Alias wait — waits for the ROUTED REQUEST, the legitimate form.
    cy.intercept("POST", "/api/pay").as("pay");
    cy.contains("button", "Pay now").click();
    cy.wait("@pay").its("response.statusCode").should("eq", 200);
    cy.contains("Order confirmed").should("be.visible");
  });

  it("retries the flaky widget", () => {
    cy.get("#widget", { timeout: 10000 }).should("be.visible");
  });
});
