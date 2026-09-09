/**
 * P7: the MCP `verify` tool — 1:1 with the `mjolnir verify` verb (master
 * plan plan 1788853205786, flag agent, decision 6). Same digest, same
 * transport guardrails: parameter validation, the serialized scan queue,
 * filesystem boundary, and §14 honesty (partial never masquerades as
 * clean; the no-baseline case returns a note, not an error).
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleToolCall, MCP_TOOLS } from "../../src/mcp/server.js";

let dir: string;
const mkDir = () => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-p7-mcp-"));
  return dir;
};
const clean = () => rmSync(dir, { recursive: true, force: true });

describe("MCP verify tool (P7)", () => {
  it("is registered in the tool list (1:1 with the CLI verb)", () => {
    expect(MCP_TOOLS.map((t) => t.name)).toContain("verify");
  });

  it("requires a non-empty string path", async () => {
    const res = await handleToolCall({ id: 1, name: "verify", args: {} });
    expect(res.error?.code).toBe(-32602); // INVALID_PARAMS
    expect(res.error?.message).toContain("verify requires");
  });

  it("a nonexistent path is INVALID_PARAMS (structured, process alive)", async () => {
    const res = await handleToolCall({
      id: 2,
      name: "verify",
      args: { path: join(tmpdir(), "mjolnir-p7-missing-dir") },
    });
    expect(res.error?.code).toBe(-32602);
    expect(res.error?.message).toContain("does not exist");
  });

  it("no baseline → hasBaseline:false with the establish-first note (not an error)", async () => {
    const target = mkDir();
    writeFileSync(
      join(target, "ok.spec.ts"),
      "test('y', () => { expect(1).toBe(1); });\n",
    );
    try {
      const res = await handleToolCall({
        id: 3,
        name: "verify",
        args: { path: target },
      });
      expect(res.error).toBeUndefined();
      expect(res.result).toMatchObject({
        hasBaseline: false,
      });
      expect((res.result as { note: string }).note).toContain(
        "mjolnir baseline",
      );
    } finally {
      clean();
    }
  });

  it("with a baseline: the digest matches the CLI verb's data (resolved/new/unchanged/delta)", async () => {
    const target = mkDir();
    mkdirSync(join(target, ".mjolnir"), { recursive: true });
    writeFileSync(
      join(target, "hard.spec.ts"),
      "test('y', () => { page.waitForTimeout(100); });\n",
    );
    writeFileSync(
      join(target, ".mjolnir", "baseline.json"),
      JSON.stringify({
        schemaVersion: 1,
        capturedAt: "2026-09-09T00:00:00.000Z",
        commit: "abc1234",
        score: 85,
        findings: [
          {
            ruleId: "QA-PW-101",
            file: "hard.spec.ts",
            message: "`waitForTimeout()` hard sleep.",
            severity: "warning",
          },
          {
            ruleId: "QA-PW-003",
            file: "gone.spec.ts",
            message: "bare goto drift",
            severity: "warning",
          },
        ],
      }),
    );
    try {
      const res = await handleToolCall({
        id: 4,
        name: "verify",
        args: { path: target },
      });
      const r = res.result as Record<string, unknown>;
      expect(r.hasBaseline).toBe(true);
      // unchanged: the exact fingerprint that still fires
      expect(Array.isArray(r.unchanged)).toBe(true);
      const unchanged = r.unchanged as Array<{
        ruleId: string;
        locations: string[];
      }>;
      expect(unchanged).toContainEqual({
        ruleId: "QA-PW-101",
        locations: ["hard.spec.ts:1"],
      });
      // resolved: the vanished baseline entry, with its §15 resolution
      const resolved = r.resolved as Array<{
        ruleId: string;
        resolution: string;
      }>;
      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.ruleId).toBe("QA-PW-003");
      expect(resolved[0]?.resolution.startsWith("INCONCLUSIVE")).toBe(true);
      // no new findings; the score delta is honest data
      expect(r.new).toEqual([]);
      expect(typeof r.scoreBefore).toBe("number");
      expect(r.partial).toBe(false);
    } finally {
      clean();
    }
  });
});
