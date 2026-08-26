describe("real behavior", () => {
  it("computes totals", () => {
    const total = computeTotal([1, 2, 3]);
    expect(total).toBe(6);
  });

  it("flags booleans from code", () => {
    expect(isValid(input)).toBeTrue();
  });

  // Adversarial: tautology mentioned in a comment is documentation.
  // expect(true).toBe(true) would be a fake proof — but this is prose.

  // Adversarial: tautology inside a string is test data, not code.
  const docExample = "expect(false).toBe(false);";
  expect(docExample.length).toBeGreaterThan(0);
});
