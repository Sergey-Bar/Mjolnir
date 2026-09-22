/**
 * QA-APM-001: Public contract stability for machine API.
 */

import { describe, expect, it } from "vitest";
import { contractStability } from "src/rules/machine/qa-apm-001-contract-stability.ts";
import type { Finding } from "src/types.ts";

type RuleFinding = Omit<Finding, "ruleId" | "category">;

describe("QA-APM-001: contract stability detection", () => {
  it("flags an unversioned machine API endpoint", () => {
    const text = `machine: { url: "https://api.example.com/endpoint" }`;
    const findings = contractStability.run({ path: "config.ts", text });
    expect(findings.some((f: RuleFinding) => f.message.includes("Unversioned"))).toBe(true);
  });

  it("does not flag a versioned machine API endpoint", () => {
    const text = `machine: { url: "https://api.example.com/v1/endpoint" }`;
    const findings = contractStability.run({ path: "config.ts", text });
    expect(findings.some((f: RuleFinding) => f.message.includes("Unversioned"))).toBe(false);
  });

  it("flags a mutable contract surface", () => {
    const text = `export contract interface MyContract { mutable: boolean }`;
    const findings = contractStability.run({ path: "contract.ts", text });
    expect(findings.some((f: RuleFinding) => f.message.includes("Mutable"))).toBe(true);
  });

  it("returns no findings for stable contract code", () => {
    const text = `export interface StableContract { readonly version: string }`;
    const findings = contractStability.run({ path: "contract.ts", text });
    expect(findings).toHaveLength(0);
  });
});
