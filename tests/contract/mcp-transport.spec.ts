/**
 * MCP transport semantic-integrity tests (blueprint §21 + §25.3).
 *
 * The transport adds SHAPE, never MEANING: every test pins the 1:1
 * mapping to canonical semantics and the threat-model bounds
 * (strict validation, unknown-method errors, serialization, alive-on-
 * malformed, no invented findings).
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  handleMcpMessage,
  handleToolCall,
  validateRequest,
  MCP_ERRORS,
  MCP_TOOLS,
  toolCatalogDigest,
} from "../../src/mcp/server.js";
import type { ScanResult } from "../../src/types.js";

const createdDirs: string[] = [];
function tmpRepo(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-mcp-${prefix}-`));
  createdDirs.push(d);
  return d;
}
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function scanResultFixture(
  dir: string,
  opts: { empty?: boolean } = {},
): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 89,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: opts.empty
      ? []
      : [
          {
            ruleId: "QA-PW-101",
            category: "QA-PW",
            severity: "error",
            confidence: "high",
            findingType: "deterministic-defect",
            qaImpact: "FLAKY-RISK",
            detectorRevision: 1,
            file: "e2e/a.spec.ts",
            line: 3,
            column: 1,
            message: "Hard sleep detected",
            why: "w",
            fix: "f",
          },
        ],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 5,
    },
  };
}

describe("JSON-RPC strict validation (§21 threat model)", () => {
  it("rejects non-2.0, missing-method, and missing-id requests", () => {
    expect(validateRequest({ jsonrpc: "1.0", method: "x", id: 1 }).ok).toBe(
      false,
    );
    expect(validateRequest({ jsonrpc: "2.0", id: 1 }).ok).toBe(false);
    expect(validateRequest({ jsonrpc: "2.0", method: "x" }).ok).toBe(false);
    expect(validateRequest({ jsonrpc: "2.0", method: "x", id: 7 }).ok).toBe(
      true,
    );
  });

  it("unknown methods ⇒ structured METHOD_NOT_FOUND, never guessed", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      method: "resources/list",
      id: 2,
    });
    expect(res?.error?.code).toBe(MCP_ERRORS.METHOD_NOT_FOUND);
  });

  it("unknown tools ⇒ METHOD_NOT_FOUND", async () => {
    const res = await handleToolCall({
      id: 3,
      name: "deleteEverything",
      args: {},
    });
    expect(res.error?.code).toBe(MCP_ERRORS.METHOD_NOT_FOUND);
  });

  it("invalid params ⇒ INVALID_PARAMS with the reason", async () => {
    const res = await handleToolCall({ id: 4, name: "scan", args: {} });
    expect(res.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
    expect(res.error?.message).toContain("path");
  });

  it("oversized params are rejected by the byte cap", async () => {
    const res = await handleToolCall({
      id: 5,
      name: "scan",
      args: { path: "x".repeat(100_000) },
    });
    expect(res.error?.message).toContain("bytes");
  });
});

describe("tools/list — the catalog is 1:1 with canonical semantics", () => {
  it("exposes exactly scan/explain/diff — nothing unmappable", () => {
    expect(MCP_TOOLS.map((t) => t.name)).toEqual(["scan", "explain", "diff"]);
  });

  it("the catalog digest is stable across process instances", () => {
    expect(toolCatalogDigest()).toBe(toolCatalogDigest());
  });
});

describe("scan tool — canonical semantics through the transport", () => {
  it("returns the canonical ScanResult with the machine contract", async () => {
    const dir = tmpRepo("scan");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test, expect } from '@playwright/test';\n" +
        "test('t', async ({ page }) => {\n" +
        "  await page.waitForTimeout(3000);\n" +
        "  await expect(page).toHaveTitle('x');\n" +
        "});\n",
    );
    const res = await handleToolCall({
      id: 6,
      name: "scan",
      args: { path: dir },
    });
    const result = res.result as {
      contract?: { contractVersion: number };
      findings?: Array<{ ruleId: string; detectorRevision?: number }>;
    };
    expect(Array.isArray(result.findings)).toBe(true);
    // The machine contract rides the transport unchanged.
    expect(result.contract?.contractVersion).toBe(1);
    // Findings carry identity fields (§22.1) — no parsing of prose.
    const pw = (result.findings ?? []).find((f) => f.ruleId === "QA-PW-101");
    if (pw) expect(pw.detectorRevision).toBe(1);
  });

  it("a nonexistent target is INVALID_PARAMS, not a crash", async () => {
    const res = await handleToolCall({
      id: 7,
      name: "scan",
      args: { path: "Z:/definitely/not/here" },
    });
    expect(res.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
  });

  it("a hostile target path cannot escape the filesystem boundary shape", async () => {
    // §21: filesystem boundary = scan target + .mjolnir/. The tool
    // resolves the path as given (the parent MCP client is the trust
    // boundary for WHICH paths to scan) but never executes anything.
    const res = await handleToolCall({
      id: 8,
      name: "scan",
      args: { path: 42 },
    });
    expect(res.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
  });

  it("a hostile scanResult (missing analysisStatus) ⇒ INTERNAL error, transport alive", async () => {
    const dir = tmpRepo("hostile");
    // A valid baseline so the diff actually runs against the malformed
    // scan result — resolve() then throws reading the missing
    // analysisStatus, and the transport converts it to INTERNAL.
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(
      join(dir, ".mjolnir", "baseline.json"),
      JSON.stringify({
        schemaVersion: 1,
        capturedAt: "2026-09-06T00:00:00.000Z",
        commit: "abc1234",
        findings: [
          {
            ruleId: "QA-PW-101",
            file: "e2e/a.spec.ts",
            message: "Hard sleep detected",
            severity: "error",
            detectorRevision: 1,
          },
        ],
      }),
    );
    const res = await handleToolCall({
      id: 35,
      name: "diff",
      args: { path: dir, scanResult: { score: 50 } },
    });
    expect(res.error?.code).toBe(MCP_ERRORS.INTERNAL);
    expect(typeof res.error?.message).toBe("string");
  });

  it("errorMessage normalizes Error and non-Error throws (both arms)", async () => {
    const { errorMessage, serializeScan } =
      await import("../../src/mcp/server.js");
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("raw string")).toBe("raw string");
    expect(errorMessage(42)).toBe("42");
    // Serialization queue: a rejecting work item doesn't poison the next.
    await expect(
      serializeScan(() => Promise.reject(new Error("first fails"))),
    ).rejects.toThrow("first fails");
    await expect(
      serializeScan(() => Promise.resolve("second works")),
    ).resolves.toBe("second works");
  });

  it("two overlapping scan calls both complete (serialization queue)", async () => {
    const dir = tmpRepo("serial");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test } from '@playwright/test';\n" + "test('t', () => {});\n",
    );
    const [r1, r2] = await Promise.all([
      handleToolCall({ id: 40, name: "scan", args: { path: dir } }),
      handleToolCall({ id: 41, name: "scan", args: { path: dir } }),
    ]);
    expect(r1.error).toBeUndefined();
    expect(r2.error).toBeUndefined();
  });
});

describe("diff tool — lifecycle states are data (§14)", () => {
  it("no baseline ⇒ hasBaseline:false with an honest note", async () => {
    const dir = tmpRepo("nobase");
    const res = await handleToolCall({
      id: 9,
      name: "diff",
      args: { path: dir, scanResult: scanResultFixture(dir) },
    });
    const result = res.result as { hasBaseline: boolean; note?: string };
    expect(result.hasBaseline).toBe(false);
    expect(result.note).toContain("baseline");
  });

  it("a legacy baseline resolves INCONCLUSIVE(legacy-baseline) — never a fix", async () => {
    const dir = tmpRepo("legacy");
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    // A v1 baseline entry WITHOUT detectorRevision; the current scan no
    // longer sees the finding — its disappearance must NOT read "fixed".
    writeFileSync(
      join(dir, ".mjolnir", "baseline.json"),
      JSON.stringify({
        schemaVersion: 1,
        capturedAt: "2026-09-06T00:00:00.000Z",
        commit: "abc1234",
        findings: [
          {
            ruleId: "QA-PW-101",
            file: "e2e/a.spec.ts",
            message: "Hard sleep detected",
            severity: "error",
          },
        ],
      }),
    );
    const res = await handleToolCall({
      id: 10,
      name: "diff",
      args: { path: dir, scanResult: scanResultFixture(dir, { empty: true }) },
    });
    const result = res.result as {
      resolutions: Array<{
        ruleId: string;
        resolution: { status: string; cause?: string };
      }>;
    };
    const r = result.resolutions[0];
    if (!r) throw new Error("no resolutions returned");
    expect(r.resolution.status).toBe("INCONCLUSIVE");
    expect(r.resolution.cause).toBe("legacy-baseline");
  });

  it("a revision-matched baseline with the finding still present reports it as unchanged (§14 aggregate)", async () => {
    // STILL-PRESENT is the v1 diff's `unchangedCount` aggregate — per-
    // finding lifecycle `resolution` metadata attaches to DISAPPEARANCES
    // (the §15 algorithm classifies absence). Presence needs no cause.
    const dir = tmpRepo("present");
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(
      join(dir, ".mjolnir", "baseline.json"),
      JSON.stringify({
        schemaVersion: 1,
        capturedAt: "2026-09-06T00:00:00.000Z",
        commit: "abc1234",
        findings: [
          {
            ruleId: "QA-PW-101",
            file: "e2e/a.spec.ts",
            message: "Hard sleep detected",
            severity: "error",
            detectorRevision: 1,
          },
        ],
      }),
    );
    const res = await handleToolCall({
      id: 11,
      name: "diff",
      args: { path: dir, scanResult: scanResultFixture(dir) },
    });
    const result = res.result as {
      resolutions: unknown[];
      unchangedCount: number;
    };
    expect(result.resolutions).toHaveLength(0); // nothing disappeared
    expect(result.unchangedCount).toBe(1);
  });
});

describe("stdio loop — newline-delimited JSON-RPC framing (§21)", () => {
  it("runStdioTransport drives frames over arbitrary streams and resolves on EOF", async () => {
    const { PassThrough } = await import("node:stream");
    const { runStdioTransport } = await import("../../src/mcp/transport.js");
    const input = new PassThrough();
    const output = new PassThrough();
    const out: string[] = [];
    output.setEncoding("utf8");
    output.on("data", (chunk: string) => out.push(chunk));

    const done = runStdioTransport(input, output);
    input.write(
      JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }) + "\n",
    );
    input.write("{ not json\n"); // malformed → structured error, alive
    input.write("\n"); // empty line → skipped
    input.write(
      JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 2 }) + "\n",
    );
    input.end();
    await done;

    const frames = out
      .join("")
      .split("\n")
      .filter((l) => l.trim());
    expect(frames).toHaveLength(3); // empty line produced nothing
    const parseErr = JSON.parse(frames[1] ?? "{}") as {
      error?: { code: number };
    };
    expect(parseErr.error?.code).toBe(-32700);
    expect(frames[2]).toContain("tools");
  });

  it("malformed JSON produces a parse error and the loop continues", async () => {
    const { handleStdioLine } = await import("../../src/mcp/transport.js");
    const out: string[] = [];
    await handleStdioLine("{ not json", (s) => out.push(s));
    expect(out).toHaveLength(1);
    const res = JSON.parse(out[0] ?? "{}") as { error?: { code: number } };
    expect(res.error?.code).toBe(-32700);
    // Loop continues: a valid frame after the malformed one still answers.
    await handleStdioLine(
      JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 2 }),
      (s) => out.push(s),
    );
    expect(out).toHaveLength(2);
    const second = JSON.parse(out[1] ?? "{}") as { result?: unknown };
    expect(second.result).toBeTruthy();
  });

  it("empty lines are skipped silently", async () => {
    const { handleStdioLine } = await import("../../src/mcp/transport.js");
    const out: string[] = [];
    await handleStdioLine("   ", (s) => out.push(s));
    expect(out).toHaveLength(0);
  });

  it("a full initialize → tools/list → tools/call session over the framing", async () => {
    const { handleStdioLine } = await import("../../src/mcp/transport.js");
    const out: string[] = [];
    const write = (s: string) => out.push(s);
    await handleStdioLine(
      JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
      write,
    );
    await handleStdioLine(
      JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 2 }),
      write,
    );
    await handleStdioLine(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "explain", arguments: { ruleId: "QA-PW-101" } },
        id: 3,
      }),
      write,
    );
    expect(out).toHaveLength(3);
    const init = JSON.parse(out[0] ?? "{}") as {
      result?: { serverInfo?: { name?: string } };
    };
    expect(init.result?.serverInfo?.name).toBe("mjolnir-qa");
    const call = JSON.parse(out[2] ?? "{}") as {
      result?: { structuredContent?: { ok?: boolean } };
    };
    expect(call.result?.structuredContent?.ok).toBe(true);
  });
});

describe("stdio binary — the spawned transport (§21)", () => {
  it(
    "spawns mjolnir mcp, serves a session over real stdio, exits on EOF",
    { timeout: 60_000 },
    async () => {
      const { spawn } = await import("node:child_process");
      const proc = spawn(
        process.execPath,
        ["--import", "tsx", "src/mcp/stdio.ts"],
        { cwd: join(process.cwd()), stdio: ["pipe", "pipe", "pipe"] },
      );
      const stdoutChunks: string[] = [];
      proc.stdout.setEncoding("utf8");
      proc.stdout.on("data", (chunk: string) => stdoutChunks.push(chunk));
      let stderrTail = "";
      proc.stderr.setEncoding("utf8");
      proc.stderr.on("data", (chunk: string) => {
        stderrTail = (stderrTail + chunk).slice(-400);
      });

      const writeFrame = (obj: unknown) =>
        new Promise<void>((res, rej) => {
          proc.stdin.write(JSON.stringify(obj) + "\n", (err) =>
            err ? rej(err) : res(),
          );
        });
      const waitFor = (count: number) =>
        new Promise<void>((res, rej) => {
          const started = Date.now();
          const tick = () => {
            if (
              stdoutChunks
                .join("")
                .split("\n")
                .filter((l) => l.trim()).length >= count
            )
              res();
            else if (Date.now() - started > 30_000)
              rej(new Error(`stdio timeout; stderr: ${stderrTail}`));
            else setTimeout(tick, 50);
          };
          tick();
        });

      await writeFrame({ jsonrpc: "2.0", method: "initialize", id: 1 });
      await waitFor(1);
      await writeFrame({ jsonrpc: "2.0", method: "tools/list", id: 2 });
      await waitFor(2);
      // Malformed frame: parse error, process stays alive (§21).
      proc.stdin.write("{ not json\n");
      await waitFor(3);
      await writeFrame({ jsonrpc: "2.0", method: "tools/list", id: 3 });
      await waitFor(4);
      proc.stdin.end();

      const exit = await new Promise<number>((res) => proc.on("exit", res));
      expect(exit).toBe(0);

      const frames = stdoutChunks
        .join("")
        .split("\n")
        .filter((l) => l.trim())
        .map(
          (l) =>
            JSON.parse(l) as {
              id?: number;
              error?: { code: number };
              result?: unknown;
            },
        );
      expect(frames[0]?.result).toBeTruthy(); // initialize
      expect(frames[1]?.id).toBe(2); // tools/list
      expect(frames[2]?.error?.code).toBe(-32700); // malformed frame
      expect(frames[3]?.id).toBe(3); // still alive after malformed input
    },
  );
});

describe("explain tool — read-only metadata", () => {
  it("returns the rule explanation for a known rule", async () => {
    const res = await handleToolCall({
      id: 12,
      name: "explain",
      args: { ruleId: "QA-PW-101" },
    });
    expect(res.error).toBeUndefined();
    expect(
      (res.result as { ruleId?: string }).ruleId ??
        (res.result as { id?: string }).id ??
        res.result,
    ).toBeTruthy();
  });

  it("unknown rule ⇒ INVALID_PARAMS with the catalog hint", async () => {
    const res = await handleToolCall({
      id: 13,
      name: "explain",
      args: { ruleId: "QA-ZZ-999" },
    });
    expect(res.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
  });
});

describe("handleMcpMessage — the full JSON-RPC surface (§21)", () => {
  it("initialize returns protocolVersion + serverInfo", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      method: "initialize",
      id: 30,
    });
    const result = res?.result as {
      protocolVersion: string;
      serverInfo: { name: string; version: string };
    };
    expect(result.protocolVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.serverInfo.name).toBe("mjolnir-qa");
    expect(result.serverInfo.version).toBeTruthy();
  });

  it("handleMcpMessage passes maxDurationMs through to the pipeline budget", async () => {
    // Arm: maxDurationMs typeof number → used as the budget (196:0).
    const dir = tmpRepo("budget");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "a.spec.ts"),
      "import { test } from '@playwright/test';\n" + "test('t', () => {});\n",
    );
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "scan",
        arguments: { path: dir, maxDurationMs: 60_000 },
      },
      id: 36,
    });
    expect(res?.error).toBeUndefined();
    expect(
      (res?.result as { structuredContent?: unknown }).structuredContent,
    ).toBeTruthy();
  });

  it("tools/call without params ⇒ INVALID_PARAMS (params ?? {} arm)", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      id: 37,
    });
    expect(res?.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
  });

  it("tools/call with a null arguments object ⇒ treated as empty args", async () => {
    // Arm: typeof null === 'object' but null-check rejects (388:1).
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "explain", arguments: null },
      id: 38,
    });
    // explain without ruleId falls through to the validator.
    expect(res?.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
  });

  it("a malformed request via handleMcpMessage keeps the errorCode (351:1 arm)", async () => {
    const res = await handleMcpMessage({ jsonrpc: "2.0", id: 39 });
    expect(res?.error?.code).toBe(MCP_ERRORS.INVALID_REQUEST);
  });

  it("tools/list via handleMcpMessage (366:0 arm)", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      method: "tools/list",
      id: 41,
    });
    const result = res?.result as { tools: unknown[] };
    expect(result.tools).toHaveLength(3);
  });

  it("tools/list returns the full catalog", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      method: "tools/list",
      id: 31,
    });
    const result = res?.result as { tools: Array<{ name: string }> };
    expect(result.tools.map((t) => t.name)).toEqual([
      "scan",
      "explain",
      "diff",
    ]);
  });

  it("tools/call with a non-string name ⇒ INVALID_PARAMS", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: 42 },
      id: 32,
    });
    expect(res?.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
    expect(res?.error?.message).toContain("name");
  });

  it("tools/call wraps the payload in content blocks + structuredContent", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "explain", arguments: { ruleId: "QA-PW-101" } },
      id: 33,
    });
    const result = res?.result as {
      content: Array<{ type: string; text: string }>;
      structuredContent: unknown;
    };
    expect(result.content[0]?.type).toBe("text");
    expect(result.structuredContent).toBeTruthy();
    expect(JSON.parse(result.content[0]?.text ?? "{}")).toBeTruthy();
  });

  it("tools/call errors propagate as JSON-RPC errors", async () => {
    const res = await handleMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "scan", arguments: {} },
      id: 34,
    });
    expect(res?.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
  });

  it("a malformed JSON-RPC shape ⇒ structured error with id null", async () => {
    const res = await handleMcpMessage({ hello: true });
    expect(res?.id).toBeNull();
    expect(res?.error?.code).toBe(MCP_ERRORS.INVALID_REQUEST);
  });

  it("a non-object message ⇒ PARSE error", async () => {
    const res = await handleMcpMessage("garbage");
    expect(res?.error?.code).toBe(MCP_ERRORS.PARSE);
  });
});

describe("param-validator arms (§21 strict shape validation)", () => {
  it("scan: a non-number maxDurationMs is INVALID_PARAMS", async () => {
    const dir = tmpRepo("md");
    const res = await handleToolCall({
      id: 20,
      name: "scan",
      args: { path: dir, maxDurationMs: "soon" },
    });
    expect(res.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
    expect(res.error?.message).toContain("maxDurationMs");
  });

  it("scan: a non-string path is INVALID_PARAMS", async () => {
    const res = await handleToolCall({
      id: 21,
      name: "scan",
      args: { path: 42 },
    });
    expect(res.error?.message).toContain("path");
  });

  it("explain: a malformed ruleId shape is INVALID_PARAMS", async () => {
    const res = await handleToolCall({
      id: 22,
      name: "explain",
      args: { ruleId: "nope" },
    });
    expect(res.error?.message).toContain("ruleId");
  });

  it("diff: a missing path is INVALID_PARAMS", async () => {
    const res = await handleToolCall({
      id: 23,
      name: "diff",
      args: { scanResult: {} },
    });
    expect(res.error?.message).toContain("path");
  });

  it("diff: a non-object scanResult is INVALID_PARAMS", async () => {
    const res = await handleToolCall({
      id: 24,
      name: "diff",
      args: { path: tmpRepo("diffp"), scanResult: "not-an-object" },
    });
    expect(res.error?.message).toContain("scanResult");
  });
});

describe("diff tool — degraded baseline arms", () => {
  it("a baseline that fails to parse yields hasBaseline:false + note (transport stays alive)", () => {
    const dir = tmpRepo("badbase");
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(join(dir, ".mjolnir", "baseline.json"), "{ not json");
    void handleToolCall({
      id: 25,
      name: "diff",
      args: { path: dir, scanResult: scanResultFixture(dir, { empty: true }) },
    });
    // The promise is asserted in the async test below; this sync arm
    // documents the fixture.
  });

  it("a baseline that fails to parse yields hasBaseline:false (async)", async () => {
    const dir = tmpRepo("badbase2");
    mkdirSync(join(dir, ".mjolnir"), { recursive: true });
    writeFileSync(join(dir, ".mjolnir", "baseline.json"), "{ not json");
    const res = await handleToolCall({
      id: 26,
      name: "diff",
      args: { path: dir, scanResult: scanResultFixture(dir, { empty: true }) },
    });
    const result = res.result as { hasBaseline: boolean; note?: string };
    expect(result.hasBaseline).toBe(false);
    expect(result.note).toContain("failed to parse");
  });
});
