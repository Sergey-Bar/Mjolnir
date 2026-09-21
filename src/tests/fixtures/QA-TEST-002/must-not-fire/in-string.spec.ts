/**
 * Phase 1 fixture: patterns inside string literals must NOT fire.
 */
test("explains the skipped-test rule", async () => {
  const doc = "test.skip() should have a reason or expiry";
  const tip = "it.skip('reason') is acceptable short-term";
  const xitNote = "xit('deprecated pattern') was common in Jasmine";
  expect(doc).toBeTruthy();
  expect(tip).toBeTruthy();
  expect(xitNote).toBeTruthy();
});
