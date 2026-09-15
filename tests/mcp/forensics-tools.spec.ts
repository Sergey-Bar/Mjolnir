/**
 * MCP Forensics/Triage Tools (INTEL-010) — test suite.
 *
 * Validates tool definitions, input schemas, handler signatures,
 * and machine-readable JSON output.
 */

import { describe, expect, it } from "vitest";

import {
  FORENSICS_TOOLS,
  getForensicsToolDefinitions,
  handleForensicsTool,
} from "../../src/mcp/tools/forensics-tools.js";

describe("FORENSICS_TOOLS", () => {
  it("defines three tools", () => {
    expect(FORENSICS_TOOLS).toHaveLength(3);
  });

  it("each tool has required fields", () => {
    for (const tool of FORENSICS_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(typeof tool.handler).toBe("function");
    }
  });

  it("tool names are unique", () => {
    const names = FORENSICS_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("forensics-analyze has path in required", () => {
    const tool = FORENSICS_TOOLS.find((t) => t.name === "forensics-analyze");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain("path");
    expect(tool?.inputSchema.properties).toHaveProperty("path");
    expect(tool?.inputSchema.properties).toHaveProperty("source");
  });

  it("forensics-triage has path in required", () => {
    const tool = FORENSICS_TOOLS.find((t) => t.name === "forensics-triage");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain("path");
    expect(tool?.inputSchema.properties).toHaveProperty("maxItems");
  });

  it("error-text-extract has path in required", () => {
    const tool = FORENSICS_TOOLS.find((t) => t.name === "error-text-extract");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain("path");
    expect(tool?.inputSchema.properties).toHaveProperty("testTitle");
  });
});

describe("getForensicsToolDefinitions", () => {
  it("returns definitions with name, description, inputSchema", () => {
    const defs = getForensicsToolDefinitions();
    expect(defs).toHaveLength(3);
    for (const def of defs) {
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.inputSchema).toBeDefined();
    }
  });

  it("does not include handler in definitions", () => {
    const defs = getForensicsToolDefinitions();
    for (const def of defs) {
      expect(def).not.toHaveProperty("handler");
    }
  });
});

describe("handleForensicsTool", () => {
  const baseCall = {
    id: "test-1",
    name: "forensics-analyze",
    args: { path: "/tmp/report.json" },
  };

  it("dispatches forensics-analyze correctly", async () => {
    const result = await handleForensicsTool("forensics-analyze", {
      ...baseCall,
      args: { path: "/tmp/report.json" },
    });
    expect(result).not.toBeNull();
    expect(result?.jsonrpc).toBe("2.0");
    expect(result?.id).toBe("test-1");
    expect(result?.result).toBeDefined();
    const res = result?.result as Record<string, unknown>;
    expect(res.tool).toBe("forensics-analyze");
    expect(res.status).toBe("handler-registered");
    expect(res.path).toBe("/tmp/report.json");
  });

  it("dispatches forensics-triage correctly", async () => {
    const result = await handleForensicsTool("forensics-triage", {
      id: "test-2",
      name: "forensics-triage",
      args: { path: "/tmp/report.json", maxItems: 10 },
    });
    expect(result).not.toBeNull();
    const res = result?.result as Record<string, unknown>;
    expect(res.tool).toBe("forensics-triage");
    expect(res.maxItems).toBe(10);
  });

  it("dispatches error-text-extract correctly", async () => {
    const result = await handleForensicsTool("error-text-extract", {
      id: "test-3",
      name: "error-text-extract",
      args: { path: "/tmp/report.json", testTitle: "login flow" },
    });
    expect(result).not.toBeNull();
    const res = result?.result as Record<string, unknown>;
    expect(res.tool).toBe("error-text-extract");
    expect(res.testTitle).toBe("login flow");
  });

  it("returns null for unknown tool name", async () => {
    const result = await handleForensicsTool("unknown-tool", baseCall);
    expect(result).toBeNull();
  });

  it("all handlers return machine-readable JSON", async () => {
    for (const tool of FORENSICS_TOOLS) {
      const response = await tool.handler({
        id: "json-test",
        name: tool.name,
        args: { path: "/tmp/test.json" },
      });
      expect(response.jsonrpc).toBe("2.0");
      expect(response.result).toBeDefined();
      const serialized: string = JSON.stringify(response.result);
      expect(() => JSON.parse(serialized)).not.toThrow();
    }
  });
});
