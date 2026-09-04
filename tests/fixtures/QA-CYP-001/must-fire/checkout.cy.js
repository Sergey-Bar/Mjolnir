describe("checkout flow", () => {
  it("completes a purchase", () => {
    cy.visit("/cart");
    cy.get("#checkout").click();
    // Fixed wait for the payment iframe to appear — flaky by design.
    cy.wait(3000);
    cy.get("#payment-frame").should("be.visible");
    cy.contains("button", "Pay now").click();
    cy.contains("Order confirmed").should("be.visible");
  });

  it("waits for the shipped state", () => {
    cy.intercept("POST", "/api/ship").as("ship");
    cy.get("#ship-btn").click();
    cy.wait(1500);
    cy.wait("@ship").its("response.statusCode").should("eq", 200);
  });
});
