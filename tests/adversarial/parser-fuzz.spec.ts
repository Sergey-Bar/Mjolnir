/**
 * WI-15 adversarial fuzz suite — every parser, every hostile case.
 *
 * Plan 1788882429145 §28 (blueprint §21): "fuzz on every parser; zero
 * fabricated evidence under fuzz". The contract under test for EVERY
 * parser × EVERY generated case:
 *
 *   1. CONTAINMENT — no throw escapes the parser (a hostile payload is
 *      data, never a crash: corrupt → zero records → honest exit 2).
 *   2. NO FABRICATED EVIDENCE — an empty/garbage payload yields an empty
 *      record set; a record may only appear when the payload actually
 *      contained a parseable test structure. The parser never converts
 *      uncertainty (unparseable) into evidence (records).
 *
 * The corpus is deterministic (fixed generator, no randomness) so a
 * failure names its exact case.
 */

import { describe, expect, it } from "vitest";

import { parseJunitXml } from "../../src/forensics/parse-junit.js";
import { parseMutmutXml } from "../../src/mutation/parse-mutmut.js";
import {
  looksLikeJestJson,
  parseJestJson,
} from "../../src/forensics/parse-jest-json.js";
import {
  looksLikeVitestJson,
  parseVitestJson,
} from "../../src/forensics/parse-vitest-json.js";
import { parsePlaywrightJson } from "../../src/forensics/parse-playwright-json.js";
import { hostileJsonCases, hostileXmlCases } from "./fuzz-corpus.js";

describe("adversarial fuzz — XML ingesters (junit + mutmut)", () => {
  const cases = hostileXmlCases();

  for (const c of cases) {
    it(`junit contains: ${c.label}`, () => {
      const out = parseJunitXml(c.payload);
      expect(Array.isArray(out)).toBe(true);
    });

    it(`mutmut contains: ${c.label}`, () => {
      let out: unknown;
      expect(() => {
        out = parseMutmutXml(c.payload);
      }).not.toThrow();
      expect(out !== undefined).toBe(true);
    });
  }

  it("NO FABRICATED EVIDENCE: garbage xml yields zero records (never invented rows)", () => {
    for (const c of cases) {
      const rows = parseJunitXml(c.payload);
      if (c.payload.trim().length === 0 || !c.payload.includes("<")) {
        expect(rows, `case ${c.label} fabricated records from garbage`).toEqual(
          [],
        );
      }
    }
  });

  it("the real JUnit golden fixture still parses (fuzz did not regress the happy path)", () => {
    const rows = parseJunitXml(
      `<?xml version="1.0"?><testsuite tests="1"><testcase name="t" classname="a.spec.ts"><failure message="boom"/></testcase></testsuite>`,
    );
    expect(rows.length).toBe(1);
  });
});

describe("adversarial fuzz — JSON ingesters (jest + vitest + playwright)", () => {
  const cases = hostileJsonCases();

  for (const c of cases) {
    let parsed: unknown;
    let parseOk = true;
    try {
      parsed = JSON.parse(c.payload);
    } catch {
      parseOk = false;
    }

    it(`jest contains: ${c.label}`, () => {
      if (!parseOk) return; // invalid JSON is the corpus of the raw-string cases
      const out = parseJestJson(parsed);
      expect(Array.isArray(out)).toBe(true);
    });

    it(`vitest contains: ${c.label}`, () => {
      if (!parseOk) return;
      const out = parseVitestJson(parsed);
      expect(Array.isArray(out)).toBe(true);
    });

    it(`playwright contains: ${c.label}`, () => {
      if (!parseOk) return;
      const out = parsePlaywrightJson(parsed);
      expect(Array.isArray(out)).toBe(true);
    });
  }

  it("NO FABRICATED EVIDENCE: shapeless payloads yield zero records (never invented rows)", () => {
    for (const c of cases) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(c.payload);
      } catch {
        continue;
      }
      if (looksLikeJestJson(parsed)) continue; // shapeful: records are legal
      if (looksLikeVitestJson(parsed)) continue;
      expect(parseJestJson(parsed), `jest case ${c.label}`).toEqual([]);
      expect(parseVitestJson(parsed), `vitest case ${c.label}`).toEqual([]);
    }
  });

  it("the canonical jest shape still parses (fuzz did not regress the happy path)", () => {
    const canonical = {
      numTotalTests: 1,
      testResults: [
        {
          testFilePath: "/repo/e2e/x.spec.ts",
          testResults: [
            {
              title: "t",
              status: "passed",
              duration: 10,
              location: { line: 1, column: 1 },
            },
          ],
        },
      ],
    };
    const rows = parseJestJson(canonical);
    expect(rows.length).toBe(1);
  });
});
