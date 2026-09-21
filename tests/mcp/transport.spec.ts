/**
 * Unit tests for src/mcp/transport.ts — the JSON-RPC stdio transport loop.
 *
 * Targets uncovered lines 25, 41-50, 91 to bring coverage above 95%.
 */

import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import { runStdioTransport, handleStdioLine } from "../../src/mcp/transport.js";

describe("normalizeJsonRpcId (via handleStdioLine)", () => {
  it("coerces null id to null", async () => {
    const writes: string[] = [];
    await handleStdioLine(
      JSON.stringify({ jsonrpc: "2.0", id: null, method: "initialize" }),
      (s) => writes.push(s),
    );
    const resp = JSON.parse(writes[0] as string) as {
      id: string | number | null;
      error?: { code: number };
    };
    expect(resp.id).toBeNull();
  });

  it("coerces boolean id to null (line 25)", async () => {
    const writes: string[] = [];
    await handleStdioLine(
      JSON.stringify({ jsonrpc: "2.0", id: true, method: "initialize" }),
      (s) => writes.push(s),
    );
    const resp = JSON.parse(writes[0] as string) as {
      id: string | number | null;
      error?: { code: number };
    };
    expect(resp.id).toBeNull();
  });

  it("coerces object id to null (line 25)", async () => {
    const writes: string[] = [];
    await handleStdioLine(
      JSON.stringify({
        jsonrpc: "2.0",
        id: { nested: 1 },
        method: "initialize",
      }),
      (s) => writes.push(s),
    );
    const resp = JSON.parse(writes[0] as string) as {
      id: string | number | null;
      error?: { code: number };
    };
    expect(resp.id).toBeNull();
  });

  it("coerces array id to null (line 25)", async () => {
    const writes: string[] = [];
    await handleStdioLine(
      JSON.stringify({ jsonrpc: "2.0", id: [1, 2], method: "initialize" }),
      (s) => writes.push(s),
    );
    const resp = JSON.parse(writes[0] as string) as {
      id: string | number | null;
      error?: { code: number };
    };
    expect(resp.id).toBeNull();
  });

  it("coerces undefined id to null (line 25)", async () => {
    const writes: string[] = [];
    await handleStdioLine('{"jsonrpc":"2.0","method":"initialize"}', (s) =>
      writes.push(s),
    );
    const resp = JSON.parse(writes[0] as string) as {
      id: string | number | null;
      error?: { code: number };
    };
    expect(resp.id).toBeNull();
  });

  it("preserves string id", async () => {
    const writes: string[] = [];
    await handleStdioLine(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "abc",
        method: "initialize",
      }),
      (s) => writes.push(s),
    );
    const resp = JSON.parse(writes[0] as string) as {
      id: string | number | null;
      error?: { code: number };
    };
    expect(resp.id).toBe("abc");
  });

  it("preserves numeric id", async () => {
    const writes: string[] = [];
    await handleStdioLine(
      JSON.stringify({ jsonrpc: "2.0", id: 42, method: "initialize" }),
      (s) => writes.push(s),
    );
    const resp = JSON.parse(writes[0] as string) as {
      id: string | number | null;
      error?: { code: number };
    };
    expect(resp.id).toBe(42);
  });

  it("returns null id for non-object input (line 25)", async () => {
    const writes: string[] = [];
    await handleStdioLine('"just a string"', (s) => writes.push(s));
    const resp = JSON.parse(writes[0] as string) as {
      id: string | number | null;
      error?: { code: number };
    };
    expect(resp.id).toBeNull();
    expect(resp.error).toBeDefined();
    expect(resp.error?.code).toBe(-32700);
  });
});

describe("handleStdioLine", () => {
  it("ignores blank/whitespace lines", async () => {
    const writes: string[] = [];
    await handleStdioLine("   ", (s) => writes.push(s));
    await handleStdioLine("", (s) => writes.push(s));
    expect(writes).toHaveLength(0);
  });

  it("returns parse error for invalid JSON", async () => {
    const writes: string[] = [];
    await handleStdioLine("not json {{{", (s) => writes.push(s));
    const resp = JSON.parse(writes[0] as string) as {
      id: string | number | null;
      error?: { code: number; message: string };
    };
    expect(resp.error).toBeDefined();
    expect(resp.error?.code).toBe(-32700);
    expect(resp.error?.message).toContain("parse error");
    expect(resp.id).toBeNull();
  });

  it("returns catch-derived error when handleMcpMessage throws (line 91)", async () => {
    await import("../../src/mcp/server.js");
    const spy = vi
      .spyOn(await import("../../src/mcp/server.js"), "handleMcpMessage")
      .mockRejectedValueOnce(new Error("boom"));

    const writes: string[] = [];
    await handleStdioLine(
      JSON.stringify({ jsonrpc: "2.0", id: 7, method: "initialize" }),
      (s) => writes.push(s),
    );

    const resp = JSON.parse(writes[0] as string) as {
      id: string | number | null;
      error?: { code: number; message: string };
    };
    expect(resp.id).toBe(7);
    expect(resp.error).toBeDefined();
    expect(resp.error?.code).toBe(-32603);
    expect(resp.error?.message).toBe("boom");

    spy.mockRestore();
  });

  it("returns catch-derived error with non-Error throw (line 91)", async () => {
    const spy = vi
      .spyOn(await import("../../src/mcp/server.js"), "handleMcpMessage")
      .mockRejectedValueOnce("string throw");

    const writes: string[] = [];
    await handleStdioLine(
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
      (s) => writes.push(s),
    );

    const resp = JSON.parse(writes[0] as string) as {
      id: string | number | null;
      error?: { code: number; message: string };
    };
    expect(resp.error).toBeDefined();
    expect(resp.error?.code).toBe(-32603);
    expect(resp.error?.message).toBe("string throw");

    spy.mockRestore();
  });
});

describe("runStdioTransport", () => {
  it("writes internal error and continues when handleStdioLine throws (lines 41-50)", async () => {
    const input = new PassThrough();
    const output = new PassThrough();

    const chunks: string[] = [];
    output.on("data", (d: Buffer) => chunks.push(d.toString()));

    const spy = vi
      .spyOn(await import("../../src/mcp/server.js"), "handleMcpMessage")
      .mockRejectedValueOnce(new Error("transport boom"));

    const transportDone = runStdioTransport(input, output);

    const line = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
    });
    input.write(line + "\n");

    await vi.waitFor(() => expect(chunks.length).toBeGreaterThan(0));

    spy.mockRestore();
    input.end();
    await transportDone;

    const responseChunk = chunks.find((c) => {
      try {
        const r = JSON.parse(c.trim()) as {
          error?: { code: number; message: string };
        };
        return (
          r.error?.code === -32603 && r.error?.message === "transport boom"
        );
      } catch {
        return false;
      }
    });
    expect(responseChunk).toBeDefined();
  });

  it("breaks when output.write throws in the inner catch (lines 41-50)", async () => {
    const input = new PassThrough();
    const output = new PassThrough();

    const serverSpy = vi
      .spyOn(await import("../../src/mcp/server.js"), "handleMcpMessage")
      .mockRejectedValue(new Error("always throws"));

    let writeCount = 0;
    const origWrite = output.write.bind(output);
    const patchedWrite = vi.spyOn(output, "write").mockImplementation(((
      ...args: unknown[]
    ) => {
      writeCount++;
      if (writeCount > 1) {
        throw new Error("output closed");
      }
      return origWrite(...(args as [unknown]));
    }) as typeof output.write);

    const transportDone = runStdioTransport(input, output);

    input.write(
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }) + "\n",
    );
    input.write(
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "initialize" }) + "\n",
    );

    await transportDone;

    serverSpy.mockRestore();
    patchedWrite.mockRestore();
  });

  it("resolves on input EOF", async () => {
    const input = new PassThrough();
    const output = new PassThrough();

    const chunks: string[] = [];
    output.on("data", (d: Buffer) => chunks.push(d.toString()));

    input.write(
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }) + "\n",
    );
    input.end();

    await runStdioTransport(input, output);

    expect(chunks.length).toBe(1);
    const resp = JSON.parse(chunks[0] ?? "") as { result?: unknown };
    expect(resp.result).toBeDefined();
  });

  it("handles multiple lines in sequence", async () => {
    const input = new PassThrough();
    const output = new PassThrough();

    const chunks: string[] = [];
    output.on("data", (d: Buffer) => chunks.push(d.toString()));

    const transportDone = runStdioTransport(input, output);

    input.write(
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }) + "\n",
    );
    input.write(
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) + "\n",
    );

    await vi.waitFor(() => expect(chunks.length).toBe(2));
    input.end();
    await transportDone;

    const resp1 = JSON.parse(chunks[0] ?? "") as { id: string | number | null };
    const resp2 = JSON.parse(chunks[1] ?? "") as { id: string | number | null };
    expect(resp1.id).toBe(1);
    expect(resp2.id).toBe(2);
  });

  it("stops processing on output error event (onOutputError path — lines 38-41)", async () => {
    const input = new PassThrough();
    const output = new PassThrough();

    const chunks: string[] = [];
    output.on("data", (d: Buffer) => chunks.push(d.toString()));

    const transportDone = runStdioTransport(input, output);

    output.emit("error", new Error("write failed"));
    await new Promise((r) => setImmediate(r));

    input.write(
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }) + "\n",
    );
    await new Promise((r) => setImmediate(r));
    input.end();
    await transportDone;

    expect(chunks.length).toBe(0);
  });
});
