describe("user service", () => {
  it("saves the user and verifies", async () => {
    const result = await saveUser({ name: "Ada" });
    expect(result.ok).toBe(true);
  });

  it("throws on invalid input", () => {
    expect(() => saveUserSync({})).toThrow();
  });
});
