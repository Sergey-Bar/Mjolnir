/**
 * `mjolnir mcp` — the MCP stdio binary entrypoint (blueprint §21).
 *
 * Thin glue: wires real stdin/stdout into the transport loop, then exits.
 * All transport logic lives in ./transport.ts and is covered there; THIS
 * file is process-launch glue exercised by the spawned-binary
 * integration test (tests/contract/mcp-transport.spec.ts — spawned
 * subprocess coverage cannot merge into the parent istanbul report,
 * same class as dist/**), so it is excluded from the coverage ratchet.
 */

import { runStdioTransport } from "./transport.js";

void runStdioTransport(process.stdin, process.stdout).then(() =>
  process.exit(0),
);
