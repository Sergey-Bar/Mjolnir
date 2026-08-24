describe('flaky suite', () => {
  jest.retryTimes(3);

  it('sometimes fails', () => {
    expect(Math.random() > 0.5).toBe(true);
  });
});

test('playwright-style retries', async ({ page }) => {
  const config = { retries: 3 };
  expect(config.retries).toBe(3);
});
