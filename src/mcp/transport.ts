/**
 * MCP stdio transport loop (blueprint §21 — the framing around the
 * pure-transport server).
 *
 * Reads newline-delimited JSON-RPC 2.0 frames from `input`, writes one
 * response frame per request to `output`. Malformed input produces a
 * structured error response and the loop CONTINUES — the transport
 * stays alive by contract (§21). EOF resolves; the binary entrypoint
 * (stdio.ts) exits 0 after it.
 */

import { createInterface } from "node:readline";
import { handleMcpMessage } from "./server.js";
import type { McpResponse } from "./server.js";
import { errorMessage } from "../cli-io.js";

/**
 * Extract and validate a JSON-RPC request ID. Returns null if absent or
 * invalid (JSON-RPC ID must be a string, number, or null — not an object).
 */
function normalizeJsonRpcId(msg: unknown): string | number | null {
  if (typeof msg !== "object" || msg === null) return null;
  const id = (msg as Record<string, unknown>)["id"];
  if (typeof id === "string" || typeof id === "number") return id;
  return null; // null, undefined, object, array, boolean → null
}

/**
 * Drive the transport over arbitrary streams (real stdio in the binary,
 * PassThrough in tests). Resolves on input EOF.
 */
export async function runStdioTransport(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
): Promise<void> {
  const rl = createInterface({ input });
  for await (const line of rl) {
    try {
      await handleStdioLine(line, (s) => output.write(s));
    } catch {
      try {
        output.write(
          JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32603, message: "internal transport error" },
          }) + "\n",
        );
      } catch {
        break; // stdout closed
      }
    }
  }
}

/**
 * Process one newline-delimited JSON-RPC frame; write the response to
 * `write`. Never throws — malformed frames become structured errors and
 * the transport stays alive (§21).
 */
export async function handleStdioLine(
  line: string,
  write: (s: string) => void,
): Promise<void> {
  const trimmed = line.trim();
  if (trimmed.length === 0) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "parse error — input was not valid JSON",
        },
      })}\n`,
    );
    return;
  }
  let response: McpResponse | null;
  try {
    response = await handleMcpMessage(parsed);
    // JSON-RPC only permits string/number/null ids. handleMcpMessage echoes
    // the request id verbatim, so an object/boolean id from a malformed
    // frame must be coerced to null here too (not just on the error path).
    if (response) response.id = normalizeJsonRpcId(parsed);
  } catch (err) {
    response = {
      jsonrpc: "2.0",
      id: normalizeJsonRpcId(parsed),
      error: { code: -32603, message: errorMessage(err) },
    };
  }
  // response is always non-null here (handleMcpMessage always returns
  // McpResponse, and the catch produces one). Serialize directly.
  write(`${JSON.stringify(response)}\n`);
}
