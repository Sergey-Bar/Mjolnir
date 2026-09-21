/**
 * Test Independence Analysis (INTEL-003).
 *
 * Defines anti-patterns that compromise test independence:
 * shared mutable state, order dependencies, and fixture leaks.
 */

export interface IndependenceAntiPattern {
  id: string;
  description: string;
  detectionStrategy: "LEXICAL" | "AST" | "SEMANTIC";
  frameworks: string[];
  patterns: RegExp[];
}

export const INDEPENDENCE_ANTI_PATTERNS: readonly IndependenceAntiPattern[] = [
  {
    id: "TI-001",
    description:
      "Shared mutable state — module-level or describe-scoped variable mutated by tests",
    detectionStrategy: "LEXICAL",
    frameworks: ["jest", "vitest", "mocha", "playwright"],
    patterns: [
      // let-scoped variable at module/describe level, assigned in test body
      /^let\s+\w+\s*[:=]/gm,
    ],
  },
  {
    id: "TI-002",
    description:
      "Order dependency — test relies on a previous test's side effects",
    detectionStrategy: "LEXICAL",
    frameworks: ["jest", "vitest", "mocha"],
    patterns: [
      // sequential numbering hints (test1/test2 or step1/step2)
      /(?:test|it|describe)\s*\(\s*['"][^'"]{0,500}(?:step|test|case)\s*[2-9]\d*[^'"]{0,500}['"]/gi,
      // explicit ordering language
      /(?:test|it|describe)\s*\(\s*['"][^'"]{0,500}\b(?:then|after|before)\b[^'"]{0,500}['"]/gi,
    ],
  },
  {
    id: "TI-003",
    description: "Fixture leak — test modifies shared fixture without cleanup",
    detectionStrategy: "LEXICAL",
    frameworks: ["jest", "vitest", "mocha", "playwright"],
    patterns: [
      // push/splice/assign on shared array/object without afterEach cleanup
      /\.\s*(?:push|splice|pop|shift|unshift|sort|reverse)\s*\(/g,
      // Object.assign / spread mutation of shared references
      /Object\.assign\s*\(\s*\w+/g,
    ],
  },
  {
    id: "TI-004",
    description:
      "Global state mutation — modifying global/module-scope objects",
    detectionStrategy: "LEXICAL",
    frameworks: ["jest", "vitest", "mocha"],
    patterns: [
      // globalThis/global/window mutation
      /(?:globalThis|global|window)\s*\[\s*['"][^'"]+['"]\s*\]\s*=/g,
      // process.env mutation in tests
      /process\.env\.\w+\s*=/g,
    ],
  },
  {
    id: "TI-005",
    description: "Filesystem side effect — creates files/dirs without cleanup",
    detectionStrategy: "LEXICAL",
    frameworks: ["jest", "vitest", "mocha"],
    patterns: [
      // writeFileSync/mkdirSync without corresponding cleanup
      /(?:writeFileSync|mkdirSync|writeFile|mkdir)\s*\(/g,
    ],
  },
];

/**
 * Detect independence anti-patterns in source text.
 */
export function detectIndependenceAntiPatterns(
  text: string,
): Array<{ antiPatternId: string; index: number; match: string }> {
  const results: Array<{
    antiPatternId: string;
    index: number;
    match: string;
  }> = [];

  for (const ap of INDEPENDENCE_ANTI_PATTERNS) {
    for (const pattern of ap.patterns) {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        results.push({
          antiPatternId: ap.id,
          index: m.index,
          match: m[0].slice(0, 80),
        });
      }
    }
  }

  return results;
}
