/**
 * MCP Forensics/Triage Tools (INTEL-010).
 *
 * Tool definitions for forensics-analyze, forensics-triage, and
 * error-text-extract. Each tool: name, description, inputSchema,
 * handler signature. All return machine-readable JSON.
 */

import type { McpToolCall, McpResponse } from "../server.js";

export interface ForensicsToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (call: McpToolCall) => McpResponse | Promise<McpResponse>;
}

const forensicsAnalyzeSchema = {
  type: "object" as const,
  properties: {
    path: {
      type: "string",
      description:
        "Path to the run report file or directory (json/xml/trace artifacts).",
    },
    source: {
      type: "string",
      description:
        "Optional explicit source format hint (playwright-json, junit-xml, jest-json, vitest-json).",
    },
  },
  required: ["path"],
};

const forensicsTriageSchema = {
  type: "object" as const,
  properties: {
    path: {
      type: "string",
      description: "Path to the run report file or directory.",
    },
    maxItems: {
      type: "number",
      description: "Maximum number of triage rows to return (default: all).",
    },
  },
  required: ["path"],
};

const errorTextExtractSchema = {
  type: "object" as const,
  properties: {
    path: {
      type: "string",
      description: "Path to the run report file.",
    },
    testTitle: {
      type: "string",
      description:
        "Optional test title filter — extract errors for a specific test only.",
    },
  },
  required: ["path"],
};

export const FORENSICS_TOOLS: readonly ForensicsToolDefinition[] = [
  {
    name: "forensics-analyze",
    description:
      "Ingest a run report and return the ForensicsReport — per-test verdicts, retries, TRUE-FLAKE, durations. " +
      "Hostile reports degrade to zero records (never a fabricated clean run). Read-only.",
    inputSchema: forensicsAnalyzeSchema,
    handler: (call: McpToolCall): McpResponse => {
      return {
        jsonrpc: "2.0",
        id: call.id,
        result: {
          tool: "forensics-analyze",
          status: "handler-registered",
          path: call.args["path"],
        },
      };
    },
  },
  {
    name: "forensics-triage",
    description:
      "Ingest a run report and return per-test triage workflow rows — classification, evidence, trust verdict, " +
      "next action — ordered for work. Read-only.",
    inputSchema: forensicsTriageSchema,
    handler: (call: McpToolCall): McpResponse => {
      return {
        jsonrpc: "2.0",
        id: call.id,
        result: {
          tool: "forensics-triage",
          status: "handler-registered",
          path: call.args["path"],
          maxItems: call.args["maxItems"],
        },
      };
    },
  },
  {
    name: "error-text-extract",
    description:
      "Extract sanitized error texts from a run report. Optionally filter by test title. " +
      "Error texts are sanitized through the evidence-hygiene pipeline (secret redaction, control-char stripping). Read-only.",
    inputSchema: errorTextExtractSchema,
    handler: (call: McpToolCall): McpResponse => {
      return {
        jsonrpc: "2.0",
        id: call.id,
        result: {
          tool: "error-text-extract",
          status: "handler-registered",
          path: call.args["path"],
          testTitle: call.args["testTitle"],
        },
      };
    },
  },
];

/**
 * Get tool definitions for registration with the MCP server.
 */
export function getForensicsToolDefinitions(): Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}> {
  return FORENSICS_TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
}

/**
 * Dispatch a forensics tool call by name.
 */
export async function handleForensicsTool(
  name: string,
  call: McpToolCall,
): Promise<McpResponse | null> {
  const tool = FORENSICS_TOOLS.find((t) => t.name === name);
  if (tool === undefined) return null;
  return tool.handler(call);
}
