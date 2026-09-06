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
    await handleStdioLine(line, (s) => output.write(s));
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
  const response = await handleMcpMessage(parsed);
  // handleMcpMessage always answers a request (notifications are not
  // part of this transport — JSON-RPC over stdio is request/response).
  write(`${JSON.stringify(response)}\n`);
}
