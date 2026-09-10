describe("d", () => {
  it.only("renders", () => {
    cy.visit("/d");
  });

  it("secondary", () => {
    cy.visit("/d/details");
  });
});
