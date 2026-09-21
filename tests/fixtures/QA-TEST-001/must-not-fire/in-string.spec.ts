/**
 * Phase 1 fixture: patterns inside string literals must NOT fire.
 */
test("explains the focused-test rule", async () => {
  const doc = "test.only() should never be committed to main";
  const tip = "it.only('debug') is a common accidental commit";
  expect(doc).toBeTruthy();
  expect(tip).toBeTruthy();
});
