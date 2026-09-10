/**
 * Adversarial fuzz corpus — hostile inputs fed to EVERY ingestion
 * surface (master plan WI-15, plan 1788882429145, blueprint §21/§28:
 * "fuzz on every parser" + "zero fabricated evidence under fuzz").
 *
 * The corpus is generated deterministically from a fixed seed — no
 * timestamps, no Math.random — so the suite is reproducible byte-for-byte
 * and a failure names the exact generated case. The invariant under test
 * for EVERY parser × EVERY case: no throw escapes, and the parser NEVER
 * fabricates a record — every returned record must trace to a real
 * (parsed) structure, never to the hostile payload's own invented fields.
 */

export interface Adjudication {
  kind: string;
  label: string;
  payload: string;
}

/** Strings that historically break parsers: truncation, nesting, entities, unicode. */
export const HOSTILE_STRINGS: readonly string[] = [
  "",
  " ",
  "\u0000",
  "\u0000\u0000\u0000",
  "﻿\uFEFF",
  "﻿",
  "a".repeat(10_000),
  "<",
  ">",
  "&",
  "&amp",
  "&amp;",
  "&lt;testsuite&gt;",
  "<![CDATA[<![CDATA[]]>]]>",
  "<!--",
  "-->",
  "<testsuite",
  "</testsuite>",
  "<?xml",
  '<?xml version="1.0"?>',
  "\\\\\\\\",
  "\\u0000",
  "日本語\tテスト",
  "𝔘𝔫𝔦𝔠𝔬𝔡𝔢",
  "  ",
  "\r\n\r\n",
  "\\",
  "\\\\",
  "${process.exit(1)}",
  "{{constructor.constructor('return 1')()}}",
  "__proto__",
  "constructor.prototype.polluted",
];

/** Structurally hostile JSON objects (depth bombs, proto pollution, type confusion). */
export function hostileJsonCases(): Adjudication[] {
  const cases: Adjudication[] = [];
  const push = (kind: string, label: string, value: unknown): void => {
    cases.push({
      kind,
      label,
      payload: JSON.stringify(value),
    });
  };

  // Deep-nesting depth bomb (parsed OK by JSON.parse, must not blow the walk).
  let deep: unknown = { status: "passed", title: "leaf" };
  for (let i = 0; i < 512; i++) {
    deep = { testResults: [deep] };
  }
  push("json", "depth-bomb-512", deep);

  // Prototype-pollution key injection.
  push("json", "proto-pollution", {
    __proto__: { polluted: true },
    constructor: { prototype: { polluted: true } },
    testResults: { __proto__: { x: 1 } },
  });

  // Type confusion on every structural slot.
  push("json", "type-confusion-nulls", {
    testResults: [null, undefined, 0, "", [], {}, true],
  });
  push("json", "array-string", "testResults");
  push("json", "numeric-keys", { testResults: { 0: {}, 1: {} } });

  // Self-referential shape: testResults referencing itself (JSON can't do
  // cycles, but a repeated nesting shape is the reachable equivalent).
  push(
    "json",
    "self-shape-x4",
    (() => {
      let node: unknown = { testResults: [] };
      for (let i = 0; i < 4; i++) node = { testResults: [node] };
      return node;
    })(),
  );

  // Huge numeric fields (duration bombs).
  push("json", "number-bombs", {
    testResults: [
      {
        testFilePath: "a.spec.ts",
        testResults: [
          {
            title: "t",
            status: "passed",
            duration: Number.MAX_SAFE_INTEGER + 1,
            location: { line: 1e308, column: -1e308 },
          },
        ],
      },
    ],
  });

  // Hostile strings in every string slot.
  for (const s of HOSTILE_STRINGS) {
    push("json", `hostile-string-${codeOf(s)}`, {
      testResults: [
        {
          testFilePath: s,
          testResults: [{ title: s, status: s, duration: -1, location: s }],
        },
      ],
    });
  }
  return cases;
}

/** Structurally hostile XML documents fed to the XML ingesters. */
export function hostileXmlCases(): Adjudication[] {
  const cases: Adjudication[] = [];
  const push = (label: string, payload: string): void => {
    cases.push({ kind: "xml", label, payload });
  };

  for (const s of HOSTILE_STRINGS) {
    push(`raw-${codeOf(s)}`, s);
  }

  push("unclosed-suite", "<testsuite><testcase classname='a'>");
  push("unclosed-failure", "<testsuite><testcase name='m'><failure>");
  push("mismatched-close", "<testsuite></other></testsuite>");
  push(
    "billion-laughs-lite",
    (() => {
      let body = "";
      for (let i = 0; i < 64; i++) body += "<testcase name='x'/>";
      return `<?xml version="1.0"?><testsuite>${body}</testsuite>`;
    })(),
  );
  push("decl-only", '<?xml version="1.0" encoding="UTF-8"?>');
  push("double-decl", `<?xml version="1.0"?><?xml version="1.0"?>`);
  push(
    "cdata-injection",
    `<?xml version="1.0"?><testsuite><![CDATA[</testsuite><testcase name='evil'>]]></testsuite>`,
  );
  push(
    "entity-injection",
    `<?xml version="1.0"?><testsuite><testcase name="&amp;lt;script&amp;gt;"><failure>&amp;</failure></testcase></testsuite>`,
  );
  push(
    "duplicate-attrs",
    `<?xml version="1.0"?><testsuite tests="1" tests="2"><testcase name='a' name='b'/></testsuite>`,
  );
  push(
    "zero-tests-suite",
    `<?xml version="1.0"?><testsuite tests="0"></testsuite>`,
  );
  push(
    "huge-attr",
    `<?xml version="1.0"?><testsuite name="${"A".repeat(50_000)}"></testsuite>`,
  );
  return cases;
}

/**
 * The single invariant every parser must honor on EVERY case:
 * results are always an array, and any record returned traces to a
 * structure the parser actually saw — no record may appear from an
 * empty/absent/garbage payload.
 */
export const ZERO_EVIDENCE_LABELS = new Set([
  "raw-",
  "decl-only",
  "double-decl",
  "unclosed-suite",
]);

function codeOf(s: string): string {
  // Deterministic short tag from the payload's first code units.
  let acc = 0;
  for (let i = 0; i < Math.min(s.length, 8); i++) {
    acc = (acc * 31 + s.charCodeAt(i)) % 997;
  }
  return acc.toString(36).padStart(2, "0");
}
