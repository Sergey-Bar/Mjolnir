/**
 * `mjolnir mcp` — the CLI route into the MCP stdio transport.
 *
 * tests/contract/mcp-transport.spec.ts covers the transport itself by
 * spawning the standalone binary. This covers the thing that binary does
 * NOT exercise: main()'s own dispatch branch, which is the piece that was
 * missing entirely (the transport shipped for several releases with no
 * verb reaching it).
 *
 * It feeds a real JSON-RPC frame rather than an empty stream. An empty
 * stdin would end the read loop immediately and light up the same lines
 * for the coverage ratchet while proving nothing — the exact shape of
 * false green this project exists to catch. Asserting on the response
 * proves the branch is wired to a transport that answers.
 */

import { Readable, Writable } from "node:stream";
import { describe, expect, it } from "vitest";

import { main } from "../../src/cli.js";

/**
 * Runs `main(argv)` with process.stdin/stdout swapped for in-memory
 * streams. The transport takes the real streams off `process` rather
 * than from an injected io object (stdio MCP is defined in terms of the
 * process's own streams), so this is the seam available.
 */
async function runWithStdio(
  argv: string[],
  stdin: string,
): Promise<{ code: number; stdout: string }> {
  const originalIn = Object.getOwnPropertyDescriptor(process, "stdin");
  const originalOut = Object.getOwnPropertyDescriptor(process, "stdout");
  let stdout = "";
  const fakeOut = new Writable({
    write(chunk, _enc, cb) {
      stdout += String(chunk);
      cb();
    },
  });
  Object.defineProperty(process, "stdin", {
    value: Readable.from([stdin]),
    configurable: true,
  });
  Object.defineProperty(process, "stdout", {
    value: fakeOut,
    configurable: true,
  });
  try {
    const code = await main(argv);
    return { code, stdout };
  } finally {
    // Restore before anything else can observe the swap — vitest's own
    // reporter writes to process.stdout.
    if (originalIn) Object.defineProperty(process, "stdin", originalIn);
    if (originalOut) Object.defineProperty(process, "stdout", originalOut);
  }
}

describe("mjolnir mcp (CLI dispatch)", () => {
  it("serves a JSON-RPC response and exits 0 when the client closes stdin", async () => {
    const { code, stdout } = await runWithStdio(
      ["mcp"],
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {},
      })}\n`,
    );

    expect(code).toBe(0);
    const frames = stdout
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(frames).toHaveLength(1);
    const [reply] = frames as [Record<string, unknown>];
    expect(reply["jsonrpc"]).toBe("2.0");
    expect(reply["id"]).toBe(1);
    // An error frame would also be valid JSON-RPC — require the success
    // shape, so a transport that rejects every request can't pass.
    expect(reply["error"]).toBeUndefined();
    const result = reply["result"] as Record<string, unknown>;
    expect(result["protocolVersion"]).toEqual(expect.any(String));
    expect(result["serverInfo"]).toMatchObject({ name: "mjolnir-qa" });
  });

  it("exposes the scan/explain/diff tools through the same route", async () => {
    const { code, stdout } = await runWithStdio(
      ["mcp"],
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      })}\n`,
    );

    expect(code).toBe(0);
    const reply = JSON.parse(stdout.trim()) as {
      result: { tools: Array<{ name: string }> };
    };
    expect(reply.result.tools.map((t) => t.name).sort()).toEqual([
      "diff",
      "explain",
      "scan",
      "verify",
    ]);
  });
});
