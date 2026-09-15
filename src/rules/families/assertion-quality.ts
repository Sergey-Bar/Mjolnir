/**
 * Assertion Quality Analysis (INTEL-002).
 *
 * Defines anti-patterns in test assertions: tautological, type-only,
 * and mock-return patterns. Each pattern identifies assertions that
 * provide no real verification value.
 */

export interface AssertionAntiPattern {
  id: string;
  description: string;
  pattern: RegExp;
  severity: "error" | "warning";
  frameworks: string[];
}

export const ASSERTION_ANTI_PATTERNS: readonly AssertionAntiPattern[] = [
  {
    id: "AQ-001",
    description: "Tautological assertion — asserts a literal against itself",
    pattern:
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern, no quantifier exchange
      /expect\s*\(\s*(?:true|false|null|undefined|\d+|'[^']*'|"[^"]*")\s*\)\s*\.\s*toBe(?:True|False)?\s*\(\s*(?:(?:true|false|null|undefined|\d+|'[^']*'|"[^"]*")\s*)?\)/g,
    severity: "error",
    frameworks: ["jest", "vitest", "playwright"],
  },
  {
    id: "AQ-002",
    description: "Type-only assertion — checks typeof without verifying value",
    pattern:
      /expect\s*\(\s*typeof\s+\w+\s*\)\s*\.\s*toBe\s*\(\s*['"](?:string|number|boolean|object|function|undefined)['"]\s*\)/g,
    severity: "warning",
    frameworks: ["jest", "vitest"],
  },
  {
    id: "AQ-003",
    description:
      "Mock-return assertion — asserts on a value the mock was configured to return",
    pattern:
      /\.\s*(?:mockReturnValue|mockResolvedValue|mockReturnThis)\s*\([\s\S]{0,100}?\)\s*;[\s\S]{0,200}?expect\s*\(/g,
    severity: "warning",
    frameworks: ["jest", "vitest"],
  },
  {
    id: "AQ-004",
    description:
      "Truthy-only assertion — verifies existence without behavioral contract",
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded by word boundaries and no overlapping alternation
    pattern: /expect\s*\(\s*\w+(?:\.\w+)*\s*\)\s*\.\s*toBeTruthy\s*\(\s*\)/g,
    severity: "warning",
    frameworks: ["jest", "vitest", "playwright"],
  },
  {
    id: "AQ-005",
    description:
      "Length-only assertion — checks array/string length without verifying contents",
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded by word boundaries and no overlapping alternation
    pattern:
      /expect\s*\(\s*\w+(?:\.\w+)*\s*\.\s*length\s*\)\s*\.\s*(?:toBe|toEqual|toBeGreaterThan|toBeGreaterThanOrEqual|toBeLessThan|toBeLessThanOrEqual)\s*\(/g,
    severity: "warning",
    frameworks: ["jest", "vitest"],
  },
];

/**
 * Detect assertion anti-patterns in source text.
 * Returns matched anti-pattern IDs and their positions.
 */
export function detectAssertionAntiPatterns(
  text: string,
): Array<{ antiPatternId: string; index: number; match: string }> {
  const results: Array<{
    antiPatternId: string;
    index: number;
    match: string;
  }> = [];

  for (const ap of ASSERTION_ANTI_PATTERNS) {
    ap.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ap.pattern.exec(text)) !== null) {
      results.push({
        antiPatternId: ap.id,
        index: m.index,
        match: m[0].slice(0, 80),
      });
    }
  }

  return results;
}
