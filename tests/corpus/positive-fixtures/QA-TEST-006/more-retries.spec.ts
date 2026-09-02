describe("flaky suite", () => {
  it("one", () => {
    const opts = { retries: 5 };
  });

  it("two", () => {
    const opts = { retries: 10 };
  });

  it("three", () => {
    const opts = { retries: 2 };
  });
});
