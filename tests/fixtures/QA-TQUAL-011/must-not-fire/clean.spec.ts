describe("payments", () => {
  it("charges the card", () => {
    expect(charge(100)).toBe(true);
  });

  // This comment mentions the word test but is not a commented-out test.
  it("refunds", () => {
    expect(refund(50)).toBe(true);
  });
});
