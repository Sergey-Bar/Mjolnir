/**
 * Package publish integrity smoke test (Test Hardening Plan, P0 #2).
 *
 * This JSDoc header contains the sequence "test (" mid-sentence. Matching
 * anywhere inside a comment block made every header like this one a false
 * positive — the real signal is the identifier being the FIRST token on a
 * commented line, not appearing anywhere in the prose.
 *
 * Other prose that must stay silent:
 *   covers the it() helper and its edge cases
 *   this test (which is slow) is skipped on CI
 *   see also: test (integration) coverage notes
 */

describe("publish integrity", () => {
  it("packs the declared files", () => {
    expect(pack()).toContain("dist/cli.mjs");
  });
});
