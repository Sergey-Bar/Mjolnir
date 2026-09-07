/**
 * The standalone MCP stdio binary (blueprint §21), built to
 * `dist/mcp/stdio.mjs` and run by `npm run mcp`.
 *
 * `mjolnir mcp` reaches the same transport through the CLI and is what
 * the README documents, since it needs no path into node_modules. This
 * entry stays because the packaged binary is addressable without the
 * CLI's arg parsing in front of it, which is what the spawned-binary
 * contract test exercises.
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
