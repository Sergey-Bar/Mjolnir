describe("e", () => {
  it.only("renders", () => {
    cy.visit("/e");
  });

  it("secondary", () => {
    cy.visit("/e/details");
  });
});
