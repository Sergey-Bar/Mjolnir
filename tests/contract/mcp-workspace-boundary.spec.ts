import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { MCP_ERRORS } from "../../src/mcp/server.js";

const root = mkdtempSync(join(tmpdir(), "mjolnir-mcp-root-"));
const previous = process.env.MJOLNIR_WORKSPACE_ROOT;
process.env.MJOLNIR_WORKSPACE_ROOT = root;
afterAll(() => {
  if (previous === undefined) delete process.env.MJOLNIR_WORKSPACE_ROOT;
  else process.env.MJOLNIR_WORKSPACE_ROOT = previous;
  rmSync(root, { recursive: true, force: true });
});

describe("MCP workspace boundary", () => {
  it("accepts root and contained paths while rejecting outside paths", async () => {
    vi.resetModules();
    mkdirSync(join(root, "child"), { recursive: true });
    const { handleToolCall } = await import("../../src/mcp/server.js");
    const inside = await handleToolCall({
      id: 1,
      name: "scan",
      args: { path: root },
    });
    expect(inside.error?.code).not.toBe(MCP_ERRORS.INVALID_PARAMS);
    const child = await handleToolCall({
      id: 2,
      name: "scan",
      args: { path: join(root, "child") },
    });
    expect(child.error?.code).not.toBe(MCP_ERRORS.INVALID_PARAMS);
    const result = await handleToolCall({
      id: 3,
      name: "scan",
      args: { path: join(root, "..", "outside") },
    });
    expect(result.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
    const outsideFixtures = await handleToolCall({
      id: 4,
      name: "explain",
      args: { ruleId: "QA-PW-004", fixturesRoot: join(root, "..", "outside") },
    });
    expect(outsideFixtures.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
    const invalidFixtures = await handleToolCall({
      id: 5,
      name: "explain",
      args: { ruleId: "QA-PW-004", fixturesRoot: 1 },
    });
    expect(invalidFixtures.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
    const noFixtures = await handleToolCall({
      id: 6,
      name: "explain",
      args: { ruleId: "QA-PW-004" },
    });
    expect(noFixtures.error?.code).not.toBe(MCP_ERRORS.INVALID_PARAMS);
  });

  it("a symlink inside the root that points outside it is rejected", async () => {
    vi.resetModules();
    const outside = mkdtempSync(join(tmpdir(), "mjolnir-mcp-outside-"));
    try {
      // "junction" needs no privilege on Windows and is ignored elsewhere.
      symlinkSync(outside, join(root, "escape"), "junction");
      const { handleToolCall } = await import("../../src/mcp/server.js");
      const escaped = await handleToolCall({
        id: 7,
        name: "scan",
        args: { path: join(root, "escape") },
      });
      expect(escaped.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
    } finally {
      rmSync(join(root, "escape"), { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("a child whose name starts with `..` is inside the root", async () => {
    vi.resetModules();
    mkdirSync(join(root, "..cache"), { recursive: true });
    const { handleToolCall } = await import("../../src/mcp/server.js");
    const dotted = await handleToolCall({
      id: 8,
      name: "scan",
      args: { path: join(root, "..cache") },
    });
    expect(dotted.error?.code).not.toBe(MCP_ERRORS.INVALID_PARAMS);
  });
});
