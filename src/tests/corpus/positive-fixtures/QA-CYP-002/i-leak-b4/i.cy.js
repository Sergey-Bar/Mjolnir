describe("i", () => {
  it.only("renders", () => {
    cy.visit("/i");
  });

  it("secondary", () => {
    cy.visit("/i/details");
  });
});
