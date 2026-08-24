describe('payments', () => {
  // it('charges the card', () => {
  //   expect(charge(100)).toBe(true);
  // });

  it('refunds', () => {
    expect(refund(50)).toBe(true);
  });
});

/* test('legacy flow', () => {}); */
