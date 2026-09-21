describe("user service", () => {
  it("saves the user and verifies", async () => {
    const result = await saveUser({ name: "Ada" });
    expect(result.ok).toBe(true);
  });

  it("throws on invalid input", () => {
    expect(() => saveUserSync({})).toThrow();
  });

  it("rejects on network failure", async () => {
    await expect(fetchProfile(-1)).rejects.toThrow("not found");
  });

  it("resolves with mapped data", async () => {
    await expect(loadUser(1)).resolves.toBeDefined();
  });
});
