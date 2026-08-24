describe("api client", () => {
  it("returns data on success", async () => {
    const user = await fetchUser(1);
    expect(user.name).toBe("Ada");
  });

  it("chains properly when returned", () => {
    return fetchUser(1).then((user) => {
      expect(user.name).toBe("Ada");
    });
  });
});
