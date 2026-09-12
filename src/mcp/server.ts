/**
 * MCP stdio transport (blueprint §21 — Phase 4, PURE TRANSPORT).
 *
 * Architecture: canonical pipeline → machine contract → THIS transport.
 * The server must not: invent findings/verdicts, reinterpret trust,
 * alter confidence, bypass evidence rules, or execute separate detection
 * semantics. Every tool maps 1:1 to existing canonical semantics.
 *
 * Threat model (bounded, local-first):
 * - stdio only; the parent process is the trust boundary (no auth
 *   infrastructure — documented, not missing).
 * - strict JSON-RPC 2.0 shape validation; unknown methods ⇒ a structured
 *   error response, never a guessed behavior; malformed requests ⇒
 *   structured errors and the process STAYS ALIVE.
 * - parameter size caps; ONE scan in flight (serialized queue) reusing
 *   the pipeline's own budgets; zero network (no fetches anywhere); no
 *   shell execution beyond Mjölnir's own verbs.
 * - filesystem boundary = scan target + `.mjolnir/` (same as CLI).
 * - the plugin trust gate applies unchanged (--enable-plugins is NOT
 *   exposed over MCP: tools run with the gate CLOSED unless the server
 *   was started with MJOLNIR_ENABLE_PLUGINS=1 in its own environment).
 */

import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { runScan } from "../engine/scan-pipeline.js";
import { ENGINE_VERSION as CLI_VERSION } from "../engine/version.js";
import { buildMachineContract } from "../engine/machine-contract.js";
import { explainRule } from "../commands/explain.js";
import {
  diffAgainstBaseline,
  loadBaseline,
  DEFAULT_BASELINE_PATH,
} from "../commands/baseline.js";
import { buildVerifyDigest } from "../commands/verify.js";
import { runForensics } from "../forensics/run.js";
import { renderTriageWorkflowJson } from "../forensics/triage.js";
import { summarizePwRun, renderPwRunSummary } from "../commands/pw-report.js";

/** Hard caps (§21 threat model: parameter size + resource bounds). */
const MAX_PARAM_BYTES = 64 * 1024;
const PROTOCOL_VERSION = "2025-06-18";

export interface McpToolCall {
  id: unknown;
  name: string;
  args: Record<string, unknown>;
}

export interface McpResponse {
  jsonrpc: "2.0";
  id: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/** JSON-RPC error codes (subset used here). */
export const MCP_ERRORS = {
  PARSE: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
} as const;

/** The tool catalog — 1:1 mappings to canonical verbs, nothing else. */
export const MCP_TOOLS = [
  {
    name: "scan",
    description:
      "Run the Mjölnir verification scan on a directory and return the canonical machine contract (findings with ruleId/detectorRevision/evidence/trust, completeness fields, deterministic digest). One scan in flight; zero network; plugin gate applies unchanged.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Absolute or repo-relative directory to scan. Must exist.",
        },
        maxDurationMs: {
          type: "number",
          description: "Optional analysis budget in ms (pipeline budget).",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "explain",
    description:
      "Explain one rule: what it detects, why it matters, how to fix it, plus its measured FP rate and trust metadata. Read-only; never runs a scan.",
    inputSchema: {
      type: "object",
      properties: {
        ruleId: { type: "string", description: "e.g. QA-PW-101" },
        fixturesRoot: {
          type: "string",
          description: "Root directory for fixture lookups (defaults to cwd).",
        },
      },
      required: ["ruleId"],
    },
  },
  {
    name: "diff",
    description:
      "Compare a completed scan result against the target's committed baseline (.mjolnir/baseline.json) using the §15 lifecycle resolution. Returns new findings and per-disappearance resolutions (VERIFIED-RESOLVED / INCONCLUSIVE(cause) / SUPPRESSED / DISAPPEARED-NON-FIX). Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Scanned directory." },
        scanResult: {
          type: "object",
          description:
            "The canonical ScanResult JSON previously returned by the scan tool.",
        },
      },
      required: ["path", "scanResult"],
    },
  },
  {
    name: "verify",
    description:
      "Agent-loop digest (1:1 with `mjolnir verify`): scan the target and diff against the committed baseline. Returns resolved (per §15 lifecycle), new, unchanged (grouped by ruleId + location), and the score delta. Read-only; the same transport guardrails as every other tool.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory to scan and verify." },
      },
      required: ["path"],
    },
  },
  {
    name: "forensics",
    description:
      "Runtime-evidence report (1:1 with the forensics engine behind `mjolnir pw-report`): ingest a run report (Playwright JSON, JUnit XML, Jest/Vitest JSON, or a Playwright trace artifact) and return the ForensicsReport — per-test verdicts, retries, TRUE-FLAKE, durations. Hostile reports degrade to zero records (never a fabricated clean run). Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Report file or directory of reports (json/xml/trace artifacts).",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "triage",
    description:
      "Triage workflow (1:1 with the triage surface): ingest a run report and return the per-test workflow rows — classification, evidence, trust verdict, next action — ordered for work. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Report file or directory." },
      },
      required: ["path"],
    },
  },
  {
    name: "pw-report",
    description:
      "Playwright run summary (1:1 with `mjolnir pw-report`): ingest a run report and return both the ForensicsReport and the rendered run summary. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Report file or directory." },
      },
      required: ["path"],
    },
  },
] as const;

/** Strict param validation — unknown/missing/mistyped ⇒ INVALID_PARAMS. */
function validateParams(
  name: string,
  args: Record<string, unknown>,
): string | null {
  // The threat-model cap is BYTES: JSON.stringify's .length counts UTF-16
  // code units, which under-counts multi-byte input by up to 4x.
  const size = Buffer.byteLength(JSON.stringify(args), "utf8");
  if (size > MAX_PARAM_BYTES) {
    return `parameters exceed ${MAX_PARAM_BYTES} bytes (threat model §21)`;
  }
  if (name === "scan") {
    if (typeof args["path"] !== "string" || args["path"].length === 0) {
      return "scan requires a non-empty string `path`";
    }
    if (
      args["maxDurationMs"] !== undefined &&
      typeof args["maxDurationMs"] !== "number"
    ) {
      return "`maxDurationMs` must be a number";
    }
  }
  if (name === "explain") {
    if (
      typeof args["ruleId"] !== "string" ||
      !/^QA-[A-Z]+-\d{3}$/.test(args["ruleId"])
    ) {
      return "explain requires `ruleId` matching /^QA-[A-Z]+-\\d{3}$/";
    }
  }
  if (name === "diff") {
    if (typeof args["path"] !== "string" || args["path"].length === 0) {
      return "diff requires a non-empty string `path`";
    }
    if (typeof args["scanResult"] !== "object" || args["scanResult"] === null) {
      return "diff requires the `scanResult` object from a previous scan tool call";
    }
  }
  if (name === "verify") {
    if (typeof args["path"] !== "string" || args["path"].length === 0) {
      return "verify requires a non-empty string `path`";
    }
  }
  if (name === "forensics" || name === "triage" || name === "pw-report") {
    if (typeof args["path"] !== "string" || args["path"].length === 0) {
      return `${name} requires a non-empty string \`path\``;
    }
  }
  return null;
}

/**
 * Serialized queue for tool work (§21: ONE scan in flight). The queue
 * tail swallows each settled result so the chain never accumulates
 * rejections — the caller's own `next` still propagates errors to the
 * awaiting tool call (the `work, work` pair passes the rejection
 * through to `next` too, so `handleToolCall`'s catch converts it into
 * a structured INTERNAL response).
 */
let scanInFlight: Promise<unknown> = Promise.resolve();

export function serializeScan<T>(work: () => Promise<T>): Promise<T> {
  const next = scanInFlight.then(work, work);
  scanInFlight = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/**
 * Dispatch a tool call. Every tool maps 1:1 to canonical semantics —
 * the transport adds SHAPE, never MEANING.
 */
export async function handleToolCall(call: McpToolCall): Promise<McpResponse> {
  const paramError = validateParams(call.name, call.args);
  if (paramError !== null) {
    return {
      jsonrpc: "2.0",
      id: call.id,
      error: { code: MCP_ERRORS.INVALID_PARAMS, message: paramError },
    };
  }

  try {
    if (call.name === "scan") {
      const target = resolve(call.args["path"] as string);
      if (!existsSync(target)) {
        return {
          jsonrpc: "2.0",
          id: call.id,
          error: {
            code: MCP_ERRORS.INVALID_PARAMS,
            message: `scan target does not exist: ${target}`,
          },
        };
      }
      const maxDurationMs =
        typeof call.args["maxDurationMs"] === "number"
          ? call.args["maxDurationMs"]
          : Number.POSITIVE_INFINITY;
      const result = await serializeScan(() =>
        runScan({
          target,
          json: true,
          verbose: false,
          maxDurationMs,
          scopeChanged: false,
          format: "json",
          // §21: the plugin gate applies unchanged — the tool surface
          // never opens it (MJOLNIR_ENABLE_PLUGINS env only).
        }),
      );
      // The machine contract rides the transport exactly as it rides the
      // CLI's --json output (same canonical projection, §12 Contract D).
      return {
        jsonrpc: "2.0",
        id: call.id,
        result: { ...result, contract: buildMachineContract(result) },
      };
    }

    if (call.name === "explain") {
      const ruleId = call.args["ruleId"] as string;
      const fixturesRoot =
        (call.args["fixturesRoot"] as string | undefined) ?? process.cwd();
      const explanation = explainRule(ruleId, fixturesRoot);
      if (!explanation.ok) {
        return {
          jsonrpc: "2.0",
          id: call.id,
          error: {
            code: MCP_ERRORS.INVALID_PARAMS,
            // ok:false guarantees the message string (see explainRule).
            message: explanation.error as string,
          },
        };
      }
      return { jsonrpc: "2.0", id: call.id, result: explanation };
    }

    if (call.name === "diff") {
      const target = resolve(call.args["path"] as string);
      const scanResult = call.args["scanResult"] as Record<string, unknown>;
      const baselinePath = join(target, DEFAULT_BASELINE_PATH);
      if (!existsSync(baselinePath)) {
        return {
          jsonrpc: "2.0",
          id: call.id,
          result: {
            hasBaseline: false,
            note: "no committed baseline at .mjolnir/baseline.json — nothing to resolve against",
          },
        };
      }
      // The scan result travels as JSON through the transport; parse it
      // back through the canonical diff — no reconstructed semantics.
      const baseline = loadBaseline(baselinePath);
      if (baseline === null) {
        return {
          jsonrpc: "2.0",
          id: call.id,
          result: { hasBaseline: false, note: "baseline failed to parse" },
        };
      }
      const diff = diffAgainstBaseline(scanResult as never, baseline);
      return {
        jsonrpc: "2.0",
        id: call.id,
        result: {
          hasBaseline: true,
          baselineCapturedAt: diff.baselineCapturedAt,
          baselineCommit: diff.baselineCommit,
          newFindings: diff.newFindings,
          // §14: lifecycle states are DATA on comparison surfaces.
          resolutions: diff.resolvedFindings.map((f) => ({
            ruleId: f.ruleId,
            file: f.file,
            message: f.message,
            resolution: f.resolution,
          })),
          unchangedCount: diff.unchangedCount,
        },
      };
    }

    if (call.name === "verify") {
      const target = resolve(call.args["path"] as string);
      if (!existsSync(target)) {
        return {
          jsonrpc: "2.0",
          id: call.id,
          error: {
            code: MCP_ERRORS.INVALID_PARAMS,
            message: `verify target does not exist: ${target}`,
          },
        };
      }
      const baselinePath = join(target, DEFAULT_BASELINE_PATH);
      if (!existsSync(baselinePath)) {
        return {
          jsonrpc: "2.0",
          id: call.id,
          result: {
            hasBaseline: false,
            note: "no committed baseline at .mjolnir/baseline.json — establish the before-state with `mjolnir baseline` first",
          },
        };
      }
      // 1:1 with the CLI verb: run the scan through the same serialized
      // queue, derive from the same §15 comparison machinery.
      const result = await serializeScan(() =>
        runScan({
          target,
          json: true,
          verbose: false,
          maxDurationMs: Number.POSITIVE_INFINITY,
          scopeChanged: false,
          format: "json",
        }),
      );
      const baseline = loadBaseline(baselinePath);
      const digest = buildVerifyDigest(result, baseline);
      return {
        jsonrpc: "2.0",
        id: call.id,
        result: {
          hasBaseline: digest.hasBaseline,
          baselineCapturedAt: digest.baselineCapturedAt,
          baselineCommit: digest.baselineCommit,
          resolved: digest.resolved,
          new: digest.new,
          unchanged: digest.unchanged,
          unchangedCount: digest.unchangedCount,
          scoreBefore: digest.scoreBefore,
          scoreAfter: digest.scoreAfter,
          scoreDelta: digest.scoreDelta,
          // §14: partial scans never masquerade as clean verifications.
          partial: result.partial,
        },
      };
    }

    // WI-21 (remediation plan §9 R8): forensics / triage / pw-report —
    // 1:1 mappings onto the SAME engine functions the CLI verbs call.
    // No MCP-only semantics: equivalent inputs produce equivalent
    // results (parity-locked by tests/mcp/parity.spec.ts), hostile
    // inputs degrade exactly as the CLI's containment dictates, and a
    // crash lands in this handler's catch — the server survives.
    if (
      call.name === "forensics" ||
      call.name === "triage" ||
      call.name === "pw-report"
    ) {
      const target = resolve(call.args["path"] as string);
      if (!existsSync(target)) {
        return {
          jsonrpc: "2.0",
          id: call.id,
          error: {
            code: MCP_ERRORS.INVALID_PARAMS,
            message: `${call.name} target does not exist: ${target}`,
          },
        };
      }
      const { report } = runForensics(target, { writeFlakyMd: false });
      if (call.name === "forensics") {
        return { jsonrpc: "2.0", id: call.id, result: report };
      }
      if (call.name === "triage") {
        return {
          jsonrpc: "2.0",
          id: call.id,
          result: {
            workflow: JSON.parse(renderTriageWorkflowJson(report)) as Record<
              string,
              unknown
            >,
          },
        };
      }
      return {
        jsonrpc: "2.0",
        id: call.id,
        result: { report, summary: renderPwRunSummary(summarizePwRun(report)) },
      };
    }

    return {
      jsonrpc: "2.0",
      id: call.id,
      error: {
        code: MCP_ERRORS.METHOD_NOT_FOUND,
        message: `unknown tool: ${call.name}`,
      },
    };
  } catch (err) {
    // Malformed/hostile input ⇒ structured error, process stays alive.
    return {
      jsonrpc: "2.0",
      id: call.id,
      error: {
        code: MCP_ERRORS.INTERNAL,
        message: errorMessage(err),
      },
    };
  }
}

/** Normalize any thrown value to a string (unit-tested both arms). */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** JSON-RPC request shape validation (strict — §21). */
export function validateRequest(msg: unknown): {
  ok: boolean;
  id?: unknown;
  method?: string;
  params?: unknown;
  errorCode?: number;
} {
  if (typeof msg !== "object" || msg === null) {
    return { ok: false, errorCode: MCP_ERRORS.PARSE };
  }
  const o = msg as Record<string, unknown>;
  if (o["jsonrpc"] !== "2.0")
    return { ok: false, errorCode: MCP_ERRORS.INVALID_REQUEST };
  if (typeof o["method"] !== "string") {
    return { ok: false, errorCode: MCP_ERRORS.INVALID_REQUEST };
  }
  if (o["id"] === undefined) {
    return { ok: false, errorCode: MCP_ERRORS.INVALID_REQUEST };
  }
  return {
    ok: true,
    id: o["id"],
    method: o["method"],
    params: o["params"],
  };
}

/**
 * Handle one JSON-RPC message (initialize / tools/list / tools/call).
 * Returns the response object, or null for notifications.
 */
export async function handleMcpMessage(
  msg: unknown,
): Promise<McpResponse | null> {
  const req = validateRequest(msg);
  if (!req.ok) {
    // validateRequest guarantees an errorCode for every !ok shape; the
    // explicit type here documents that — no ?? fallback branch.
    return {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: req.errorCode as number,
        message: "malformed JSON-RPC request",
      },
    };
  }

  if (req.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: req.id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: {
          name: "mjolnir-qa",
          version: CLI_VERSION,
        },
      },
    };
  }

  if (req.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: req.id,
      result: { tools: MCP_TOOLS },
    };
  }

  if (req.method === "tools/call") {
    const params = (req.params ?? {}) as Record<string, unknown>;
    const name = params["name"];
    if (typeof name !== "string") {
      return {
        jsonrpc: "2.0",
        id: req.id,
        error: {
          code: MCP_ERRORS.INVALID_PARAMS,
          message: "tools/call requires a string `name`",
        },
      };
    }
    const args =
      typeof params["arguments"] === "object" && params["arguments"] !== null
        ? (params["arguments"] as Record<string, unknown>)
        : {};
    const response = await handleToolCall({ id: req.id, name, args });
    // MCP tools/call wraps the result in content blocks; the structured
    // payload rides alongside as `structuredContent` when present.
    if (response.error !== undefined) {
      return {
        jsonrpc: "2.0",
        id: req.id,
        error: response.error,
      };
    }
    const payload = response.result;
    return {
      jsonrpc: "2.0",
      id: req.id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
        structuredContent: payload,
      },
    };
  }

  // Unknown methods ⇒ structured error, never guessed behavior (§21).
  return {
    jsonrpc: "2.0",
    id: req.id,
    error: {
      code: MCP_ERRORS.METHOD_NOT_FOUND,
      message: `unknown method: ${req.method}`,
    },
  };
}

/** Digest of the served tool catalog — provenance for MCP clients. */
export function toolCatalogDigest(): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(MCP_TOOLS)).digest("hex").slice(0, 16)}`;
}
