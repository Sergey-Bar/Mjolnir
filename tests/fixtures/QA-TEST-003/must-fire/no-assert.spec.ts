describe("user service", () => {
  it("saves the user", async () => {
    saveUser({ name: "Ada" });
  });

  it("checks the result properly", () => {
    const result = saveUserSync({ name: "Ada" });
    expect(result.ok).toBe(true);
  });
});
