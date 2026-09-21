import { describe, expect, it } from "vitest";

import { envCoupling } from "../../../src/rules/quality/qa-env-001-env-coupling.js";
import { computeCodeText } from "../../../src/engine/code-text.js";

describe("QA-ENV-001 branch coverage gaps", () => {
  it("fires on .toLocaleTimeString() with no arguments (timezone branch)", () => {
    const text = `test('time', () => {
  const s = new Date().toLocaleTimeString();
  expect(s).toBeDefined();
});
`;
    const findings = envCoupling.run({ path: "a.spec.ts", text });
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.some((f) => f.message.includes("timezone/locale"))).toBe(
      true,
    );
  });

  it("fires on .toLocaleString() with no arguments", () => {
    const text = `test('locale', () => {
  const s = new Date().toLocaleString();
  expect(s).toBeDefined();
});
`;
    const findings = envCoupling.run({ path: "a.spec.ts", text });
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("fires on local-time getter: .getDate()", () => {
    const text = `test('day', () => {
  const d = new Date().getDate();
  expect(d).toBeGreaterThan(0);
});
`;
    const findings = envCoupling.run({ path: "a.spec.ts", text });
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.some((f) => f.message.includes("local-time getter"))).toBe(
      true,
    );
  });

  it("fires on local-time getter: .getMonth()", () => {
    const text = `test('month', () => {
  const m = new Date().getMonth();
  expect(m).toBeGreaterThanOrEqual(0);
});
`;
    const findings = envCoupling.run({ path: "a.spec.ts", text });
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("fires on local-time getter: .getDay()", () => {
    const text = `test('day', () => {
  const d = new Date().getDay();
  expect(d).toBeGreaterThanOrEqual(0);
});
`;
    const findings = envCoupling.run({ path: "a.spec.ts", text });
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("stays silent on clean code with no env coupling", () => {
    const text = `test('clean', () => {
  expect(1 + 1).toBe(2);
});
`;
    expect(envCoupling.run({ path: "a.spec.ts", text })).toEqual([]);
  });

  it("skips env coupling inside embedded code (isInsideEmbeddedCode returns true — line 90)", () => {
    const text = `test('data', () => {
  const fixture = 'test("http://localhost:3000")';
  expect(fixture).toBeDefined();
});
`;
    const codeText = computeCodeText({ path: "a.spec.ts", text }, "typescript");
    const findings = envCoupling.run({ path: "a.spec.ts", text, codeText });
    expect(findings).toEqual([]);
  });

  it("fires on .getHours() when NOT inside embedded code", () => {
    const text = `test('hour', () => {
  const h = new Date().getHours();
  expect(h).toBeGreaterThanOrEqual(0);
});
`;
    const findings = envCoupling.run({ path: "a.spec.ts", text });
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
});
