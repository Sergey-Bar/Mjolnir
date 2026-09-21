describe("r", () => {
  it.only("renders", () => {
    cy.visit("/r");
  });

  it("secondary", () => {
    cy.visit("/r/details");
  });
});
