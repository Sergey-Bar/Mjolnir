describe("admin dashboard", () => {
  it("renders the user table", () => {
    cy.visit("/admin");
    cy.get("table.users").should("be.visible");
  });

  it("exports the report", () => {
    cy.visit("/admin/reports");
    cy.contains("button", "Export").click();
  });
});
