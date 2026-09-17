/**
 * HAR (HTTP Archive) ingestion — network evidence (product-completion
 * plan WAVE 5, GAP-RUNTIME-004).
 *
 * Shape (HAR 1.2, relevant subset):
 *   { log: { entries: [{ startedDateTime, time, request: { method, url },
 *     response: { status, statusText }, ... }] } }
 *
 * What this module IS: bounded, dependency-free, hostile-degrading
 * ingestion of the network facts a test run produced. What it is NOT:
 * a test-result parser — HAR carries no test titles or pass/fail
 * outcomes. Each entry becomes ONE network-observation record whose
 * status reflects the HTTP outcome (failed when the request errored or
 * returned 4xx/5xx), so `run.ts` can surface network failure evidence
 * without fabricating a verification verdict.
 *
 * Hostility contract: a corrupt/oversized HAR degrades to zero records
 * — the caller's containment turns that into exit 2 upstream, never a
 * fabricated clean run.
 */

import type { Attempt, TestRecord } from "./types.js";
import { sanitizeErrorText } from "./evidence-hygiene.js";

const MAX_INPUT = 20 * 1024 * 1024; // 20 MB, same bound as parse-junit
const MAX_ENTRIES = 20_000;

interface HarRequest {
  method?: unknown;
  url?: unknown;
}

interface HarResponse {
  status?: unknown;
  statusText?: unknown;
  _error?: unknown;
  error?: unknown;
}

interface HarEntry {
  startedDateTime?: unknown;
  time?: unknown;
  request?: HarRequest;
  response?: HarResponse;
}

interface HarLog {
  entries?: HarEntry[];
}

interface HarRoot {
  log?: HarLog;
}

/**
 * Sniff: a HAR root is `{ log: { entries: [...] } }` — distinct from
 * every other JSON shape the forensics layer accepts (Playwright/Jest/
 * Vitest all key on `testResults` or `suites`).
 */
export function looksLikeHarJson(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const log = (json as HarRoot).log;
  if (!log || typeof log !== "object") return false;
  return Array.isArray(log.entries);
}

/**
 * Parse a HAR object into network-observation records. Each entry maps
 * to one record; the title carries the request identity, the status
 * carries the HTTP outcome. Entries that cannot be read (missing URL)
 * are skipped honestly — never invented.
 */
export function parseHarJson(json: unknown): TestRecord[] {
  if (!json || typeof json !== "object") return [];
  const entries = (json as HarRoot).log?.entries;
  if (!Array.isArray(entries)) return [];
  const out: TestRecord[] = [];
  for (const entry of entries.slice(0, MAX_ENTRIES)) {
    if (!entry || typeof entry !== "object") continue;
    const method =
      typeof entry.request?.method === "string" ? entry.request.method : "GET";
    const url =
      typeof entry.request?.url === "string" ? entry.request.url : undefined;
    if (url === undefined || url.length === 0) continue;
    const status =
      typeof entry.response?.status === "number"
        ? entry.response.status
        : undefined;
    const transportError =
      entry.response?._error ?? entry.response?.error ?? undefined;
    const hasTransportError =
      transportError !== undefined && transportError !== null;
    const httpFailed = status !== undefined && status >= 400;
    const errors: string[] = [];
    if (hasTransportError) {
      errors.push(
        sanitizeErrorText(
          typeof transportError === "string"
            ? transportError
            : JSON.stringify(transportError),
        ),
      );
    }
    if (httpFailed) {
      const text =
        typeof entry.response?.statusText === "string" &&
        entry.response.statusText.length > 0
          ? entry.response.statusText
          : `HTTP ${status}`;
      errors.push(sanitizeErrorText(`${status} ${text}`));
    }
    const durationMs =
      typeof entry.time === "number" && Number.isFinite(entry.time)
        ? Math.round(entry.time)
        : 0;
    const attempt: Attempt = {
      index: 1,
      status: hasTransportError || httpFailed ? "failed" : "passed",
      durationMs,
    };
    out.push({
      file: "har",
      title: `${method} ${url}`,
      attempts: [attempt],
      ...(errors.length > 0 ? { errors } : {}),
    });
  }
  return out;
}

/** Text entry point — the same containment as every other parser arm. */
export function parseHar(text: string): TestRecord[] {
  if (text.length > MAX_INPUT) return [];
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  return parseHarJson(json);
}
