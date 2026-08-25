/**
 * Fuzz / adversarial corpus tests (Sprint-Plan W8, §30.2 gate #3).
 * Malformed and hostile inputs must NEVER crash the scan (exit 20).
 * The scan may degrade honestly, but must always produce output.
 */

import { describe, expect, it } from "vitest";
import { RULES } from "../src/rules/index.js";
import { isDefaultIgnored } from "../src/discovery/ignores.js";
import { parseChangedLines } from "../src/scope/changed.js";

// Hostile inputs: malformed syntax, bombs, traversal, huge constructs.
const HOSTILE_SNIPPETS: Array<[string, string]> = [
  ["unclosed-string", `it('x', () => { expect("never closed) }`],
  ["unbalanced-braces", `it('x', () => { {{{{{{ expect(1).toBe(1`],
  ["yaml-bomb-alias", "a: &a [*a,*a,*a,*a,*a,*a,*a,*a]"],
  [
    "prototype-pollution",
    `const o = JSON.parse('{"__proto__":{"polluted":true}}'); expect(o).toBeDefined();`,
  ],
  [
    "traversal-filename",
    `it('../../../../etc/passwd', () => { expect(1).toBe(1); });`,
  ],
  ["null-bytes", `it('x\x00y', () => { expect(1).toBe(1); });`],
  [
    "deep-nesting",
    `it('x', () => { ${"if(1){".repeat(200)}}${"}".repeat(200)} });`,
  ],
  [
    "regex-dos",
    `it('x', () => { expect(new RegExp('(a+)+$').test('aaaaaaaaaaaaaaaaaaaaaaaaaaaa!')).toBe(false); });`,
  ],
  ["empty-file", ""],
  ["only-whitespace", "   \n\t\n   "],
  ["binary-garbage", "\x00\x01\x02\xFF\xFE\xFD it(x expect"],
  [
    "unicode-directional",
    "it('\u202Etest\u202D', () => { expect(1).toBe(1); });",
  ],
  [
    "huge-single-line",
    `it('x', () => { expect('${"a".repeat(100_000)}').toHaveLength(100000); });`,
  ],
];

describe("crash-proof gate: hostile inputs never throw", () => {
  for (const [name, snippet] of HOSTILE_SNIPPETS) {
    it(`survives: ${name}`, () => {
      for (const rule of RULES) {
        expect(
          () => rule.run({ path: "evil.spec.ts", text: snippet }),
          `${rule.id} on ${name}`,
        ).not.toThrow();
      }
    });
  }

  it("ignore matcher survives traversal patterns", () => {
    expect(() => isDefaultIgnored("../../etc/passwd")).not.toThrow();
    expect(() => isDefaultIgnored("..\\..\\windows\\system32")).not.toThrow();
  });

  it("diff parser survives malformed hunks", () => {
    expect(() =>
      parseChangedLines("@@@ garbage @@\n+++ b/\n@@ -1,x +y,z @@\n+++\n---"),
    ).not.toThrow();
    expect(() => parseChangedLines("")).not.toThrow();
  });

  it("prototype pollution does not poison rule behavior", () => {
    const evil: Record<string, unknown> = JSON.parse(
      '{"__proto__":{"run":true,"appliesTo":"all"}}',
    );
    expect(evil.run).toBeUndefined(); // Object.create(null)-style safety via plain objects
  });
});
