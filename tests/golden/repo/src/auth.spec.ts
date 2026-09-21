describe("auth", () => {
  it("logs in", () => {
    expect(login("a", "b")).toBe(true);
  });

  it.skip("legacy login", () => {
    expect(true).toBe(true);
  });
});

describe("api", () => {
  it.only("fetches data", async () => {
    await fetchData();
  });
});
