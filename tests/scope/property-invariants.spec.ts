/**
 * Property-based tests (bug-audit B4.24) — fast-check against the exact
 * bug classes the audit identified. Each property encodes an INVARIANT
 * that must hold for arbitrary input, not just curated fixtures:
 *
 *  - glob matcher vs gitignore semantics (M5 class: `**` = zero-or-more
 *    segments — a suppression glob must never silently miss a path);
 *  - parseChangedLines on generated hunks (L2 class: header lines and
 *    `\`-markers never advance the new-line counter);
 *  - JUnit attribute-order invariance (H3 class: title identical whether
 *    `name` precedes or follows `classname`);
 *  - parsePlaywrightJson is total over arbitrary JSON (M3 class: never
 *    throws, whatever a corrupt report contains);
 *  - parseArgs / exitForFindings invariants (usage-error class: bad
 *    input → null, never a wrong-but-parsed result; exit codes stay in
 *    the frozen set).
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { pathMatchesGlob } from "../../src/cli.js";
import { parseChangedLines } from "../../src/scope/changed.js";
import { parseJunitXml } from "../../src/forensics/parse-junit.js";
import { parsePlaywrightJson } from "../../src/forensics/parse-playwright-json.js";
import { parseArgs, exitForFindings } from "../../src/cli.js";
import type { Finding } from "../../src/types.js";

const SEGMENT_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789_-.".split("");

/** Arbitrary path of 1–4 slash-separated segments (no meta chars). */
const arbPath: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...SEGMENT_CHARS), { minLength: 1, maxLength: 6 })
  .map((chars) => chars.join(""))
  .filter((s) => s.length > 0 && !s.startsWith(".") && !s.endsWith("."))
  .chain((seg) =>
    fc
      .array(fc.constant(seg), { minLength: 1, maxLength: 4 })
      .map((segs) => segs.join("/")),
  );

describe("property: pathMatchesGlob honors gitignore `**` semantics (M5 class)", () => {
  const arbFile = fc.stringMatching(/^[a-z0-9_-]{1,8}\.ts$/u);

  it("a glob ending in `/**` matches every path under that prefix", () => {
    fc.assert(
      fc.property(arbPath, (p) => {
        expect(pathMatchesGlob(p, "dir/**")).toBe(p.startsWith("dir/"));
      }),
      { numRuns: 500 },
    );
  });

  it("`a/**/*.ts` matches a/<zero-or-more segments>/<file>.ts", () => {
    fc.assert(
      fc.property(
        fc.array(arbPath, { maxLength: 3 }),
        arbFile,
        (segs, file) => {
          const deep = ["a", ...segs, file].join("/");
          expect(pathMatchesGlob(deep, "a/**/*.ts")).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("`a/**/*.ts` rejects .ts paths outside a/", () => {
    fc.assert(
      fc.property(
        fc.array(arbPath, { maxLength: 3 }),
        arbFile,
        (segs, file) => {
          const path = ["b", ...segs, file].join("/");
          expect(pathMatchesGlob(path, "a/**/*.ts")).toBe(false);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("a literal glob matches only the exact path", () => {
    fc.assert(
      fc.property(
        arbPath.filter((p) => !p.includes("*")),
        arbPath.filter((p) => !p.includes("*")),
        (glob, path) => {
          expect(pathMatchesGlob(path, glob)).toBe(path === glob);
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("property: parseChangedLines never advances on non-line input (L2 class)", () => {
  // A generator for well-formed hunk bodies.
  const arbLine = fc
    .string({ minLength: 1, maxLength: 12 })
    .filter(
      (s) =>
        !s.startsWith("\\") &&
        !s.startsWith("+") &&
        !s.startsWith("-") &&
        !s.startsWith("@") &&
        s.trim().length > 0,
    );

  const arbHunk = fc.record({
    start: fc.integer({ min: 1, max: 50 }),
    body: fc.array(
      fc.oneof(
        arbLine.map((s) => ` ${s}`), // context
        arbLine.map((s) => `+${s}`), // added
        arbLine.map((s) => `-${s}`), // removed
      ),
      { minLength: 1, maxLength: 10 },
    ),
  });

  it("added-line numbers are strictly increasing within a hunk", () => {
    fc.assert(
      fc.property(arbHunk, ({ start, body }) => {
        const newSideCount = body.filter(
          (l) => l.startsWith("+") || l.startsWith(" "),
        ).length;
        const diff = [`@@ -1,1 +${start},${newSideCount} @@`, ...body].join(
          "\n",
        );
        const lines = [...parseChangedLines(diff)];
        const sorted = [...lines].sort((a, b) => a - b);
        expect(lines).toEqual(sorted); // set is ordered by construction
        for (const l of lines) expect(l).toBeGreaterThanOrEqual(start);
      }),
      { numRuns: 300 },
    );
  });

  it("header lines and `\\` markers after an exhausted hunk never produce line numbers", () => {
    fc.assert(
      fc.property(arbHunk, fc.integer({ min: 1, max: 5 }), ({ body }, n) => {
        // The hunk's declared new-side count is made EXACT (well-formed
        // git framing), so the noise lines below genuinely sit OUTSIDE
        // the hunk. Audit contract (changed.ts): header resets apply
        // only outside hunks — inside a hunk, a header-looking line is
        // hunk CONTENT (a source line `++ b/x` renders as `+++ b/x`),
        // and must be counted, never mistaken for a file header.
        const newSideCount = body.filter(
          (l) => l.startsWith("+") || l.startsWith(" "),
        ).length;
        const header = `@@ -1,1 +1,${newSideCount} @@`;
        const headerNoise = Array.from(
          { length: n },
          (_, i) => `+++ b/noise${i}.ts`,
        );
        const markerNoise = ["\\ No newline at end of file"];
        const diff = [header, ...body, ...markerNoise, ...headerNoise].join(
          "\n",
        );
        // The result must equal the result WITHOUT the noise lines:
        // noise beyond the hunk never advances the counter nor adds
        // bogus lines.
        const clean = [header, ...body].join("\n");
        expect(parseChangedLines(diff)).toEqual(parseChangedLines(clean));
      }),
      { numRuns: 200 },
    );
  });
});

describe("property: JUnit title is attribute-order invariant (H3 class)", () => {
  // Values exclude XML-significant characters — `>` inside a quoted
  // attribute breaks the bounded tag scanner by design (not a general
  // XML parser), so the property must not generate it.
  const arbAttrValue = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter(
      (s) => !/[<>&"'\\]/.test(s) && s.trim().length > 0 && !s.includes("\n"),
    );

  it("title is identical whether name precedes or follows classname", () => {
    fc.assert(
      fc.property(arbAttrValue, arbAttrValue, (classname, name) => {
        const attrs1 = `classname="${classname}" name="${name}"`;
        const attrs2 = `name="${name}" classname="${classname}"`;
        const xml1 = `<testsuite><testcase ${attrs1} time="0.1"/></testsuite>`;
        const xml2 = `<testsuite><testcase ${attrs2} time="0.1"/></testsuite>`;
        const r1 = parseJunitXml(xml1);
        const r2 = parseJunitXml(xml2);
        expect(r1[0]?.title).toBe(name);
        expect(r2[0]?.title).toBe(name); // the H3 bug: this became classname
        expect(r1[0]?.file).toBe(classname);
        expect(r2[0]?.file).toBe(classname);
      }),
      { numRuns: 300 },
    );
  });
});

describe("property: parsePlaywrightJson is total over arbitrary JSON (M3 class)", () => {
  // JSON-encodable arbitrary values — deliberately including nulls,
  // numbers and strings where the parser expects arrays/objects.
  const arbJson: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
    leaf: fc.oneof(
      fc.string({ maxLength: 8 }),
      fc.integer(),
      fc.double({ noNaN: true }),
      fc.boolean(),
      fc.constant(null),
    ),
    array: fc.array(tie("node"), { maxLength: 3 }),
    object: fc.dictionary(fc.string({ maxLength: 6 }), tie("node"), {
      maxKeys: 3,
    }),
    node: fc.oneof(
      { depthSize: "small", maxDepth: 2 },
      tie("leaf"),
      tie("array"),
      tie("object"),
    ),
  })).node;

  it("never throws, whatever the report contains", () => {
    fc.assert(
      fc.property(arbJson, (json) => {
        expect(() => parsePlaywrightJson(json)).not.toThrow();
        const recs = parsePlaywrightJson(json);
        expect(Array.isArray(recs)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it("records parsed from arbitrary JSON have well-formed attempts", () => {
    fc.assert(
      fc.property(arbJson, (json) => {
        for (const rec of parsePlaywrightJson(json)) {
          expect(rec.attempts.length).toBeGreaterThan(0);
          for (const a of rec.attempts) {
            expect(typeof a.index).toBe("number");
            expect([
              "passed",
              "failed",
              "timedOut",
              "skipped",
              "interrupted",
            ]).toContain(a.status);
            expect(Number.isFinite(a.durationMs)).toBe(true);
          }
        }
      }),
      { numRuns: 300 },
    );
  });
});

describe("property: parseArgs usage-error contract (B4.24)", () => {
  it("never returns a record for input containing an unknown flag", () => {
    const arbUnknownFlag = fc
      .stringMatching(/^--[a-np-z][a-z]{2,8}$/u)
      .filter((f) => !["--verbose", "--json"].includes(f));
    fc.assert(
      fc.property(arbUnknownFlag, (flag) => {
        expect(parseArgs([flag])).toBeNull();
        expect(parseArgs(["src", flag])).toBeNull();
      }),
      { numRuns: 200 },
    );
  });

  it("valid flag subsets always parse with target '.' default", () => {
    fc.assert(
      fc.property(fc.subarray(["--verbose", "--json"] as const), (flags) => {
        const args = parseArgs([...flags]);
        expect(args).not.toBeNull();
        expect(args?.target).toBe(".");
      }),
      { numRuns: 50 },
    );
  });
});

describe("property: exitForFindings stays in the frozen exit-code set", () => {
  const severities = ["error", "warning", "info"] as const;
  const arbFinding: fc.Arbitrary<Finding> = fc
    .record({
      severity: fc.constantFrom(...severities),
      advisory: fc.boolean(),
    })
    .map(({ severity, advisory }) => ({
      ruleId: "QA-X-000",
      category: "QA-TEST",
      severity,
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FLAKY-RISK",
      file: "a.ts",
      line: 1,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
      ...(advisory ? { advisory } : {}),
    }));

  it("returns only 0 or 1, for any finding list and gate", () => {
    fc.assert(
      fc.property(
        fc.array(arbFinding, { maxLength: 10 }),
        fc.constantFrom<"advisory" | "error" | "warning">(
          "advisory",
          "error",
          "warning",
        ),
        (findings, gate) => {
          const code = exitForFindings(findings, gate);
          expect([0, 1]).toContain(code);
          if (gate === "advisory") expect(code).toBe(0);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("is monotone: adding a finding can never clear the gate", () => {
    fc.assert(
      fc.property(
        fc.array(arbFinding, { maxLength: 8 }),
        arbFinding,
        fc.constantFrom<"error" | "warning">("error", "warning"),
        (findings, extra, gate) => {
          expect(exitForFindings(findings, gate)).toBeLessThanOrEqual(
            exitForFindings([...findings, extra], gate),
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
