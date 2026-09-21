/**
 * A crashing tool never kills the server (remediation plan §9 R8).
 *
 * With the runtime-evidence engine itself made to throw, every new
 * tool's failure lands in handleToolCall's existing catch as a
 * structured INTERNAL JSON-RPC error — no exception escapes to the
 * transport loop, and the server keeps answering after the crash.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/forensics/run.js", () => ({
  runForensics: () => {
    throw new Error("simulated engine crash");
  },
}));

import {
  handleMcpMessage,
  handleToolCall,
  MCP_ERRORS,
} from "../../src/mcp/server.js";

describe("a crashing tool never kills the server", () => {
  it.each(["forensics", "triage", "pw-report"] as const)(
    "%s crash ⇒ structured INTERNAL, no throw escapes",
    async (tool) => {
      const res = await handleToolCall({
        id: 1,
        name: tool,
        args: { path: "." },
      });
      expect(res.error?.code).toBe(MCP_ERRORS.INTERNAL);
      expect(res.error?.message).toContain("simulated engine crash");
    },
  );

  it("the transport loop survives the crash and keeps answering", async () => {
    const crashed = await handleMcpMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "forensics", arguments: { path: "." } },
    });
    expect(crashed?.error?.code).toBe(MCP_ERRORS.INTERNAL);
    const alive = await handleMcpMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
    });
    expect(alive?.error).toBeUndefined();
    const tools = (alive?.result as { tools: Array<{ name: string }> }).tools;
    expect(tools.map((t) => t.name)).toContain("forensics");
  });
});
