describe('real behavior', () => {
  it('computes totals', () => {
    const total = computeTotal([1, 2, 3]);
    expect(total).toBe(6);
  });

  it('flags booleans from code', () => {
    expect(isValid(input)).toBeTrue();
  });
});
