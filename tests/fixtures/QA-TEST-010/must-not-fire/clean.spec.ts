describe('checkout', () => {
  it('completes the order', () => {
    expect(order.status).toBe('complete');
  });
});
