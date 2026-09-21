/**
 * Test helper: parse `npm pack --json` stdout into its pack entry,
 * tolerating BOTH output shapes npm has shipped:
 *
 * - npm ≤ 11: a JSON ARRAY of packuments — `[{ filename, ... }]`.
 * - npm ≥ 12: a JSON OBJECT keyed by package name —
 *   `{ "mjolnir-qa": { filename, ... } }` (the shape change that broke
 *   the release pipeline's fresh-install gate on 2026-09-05 — npm 12
 *   landed via `npm install -g npm@latest` and every `[0]`-style reader
 *   suddenly parsed to undefined).
 *
 * npm also mixes non-JSON text into stdout (lifecycle-script output like
 * `prepare > husky`, tsdown logs, `npm warn`/`npm notice` lines — npm 12
 * emits `npm notice run <pkg> <script>` around every lifecycle script).
 * Rather than trusting output to start with JSON, scan for candidate
 * `{`/`[` starts, extract each balanced value with a string-aware
 * bracket-depth scan, and accept the first candidate that parses AND has
 * the expected shape. Returns the first entry carrying a string
 * `filename`, or undefined when none does (caller decides whether that
 * is fatal).
 */

export interface NpmPackEntry {
  filename: string;
  [key: string]: unknown;
}

/** String-aware scan from `start` to the matching close of the opener. */
function balancedJsonSlice(out: string, start: number): string | null {
  const opener = out[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  for (let i = start; i < out.length; i++) {
    const ch = out[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === opener) depth++;
    else if (ch === closer && --depth === 0) {
      return out.slice(start, i + 1);
    }
  }
  return null;
}

/** Extract an entry with a string `filename` from a parsed pack payload. */
function entryFromPayload(payload: unknown): NpmPackEntry | undefined {
  const candidates: unknown[] = Array.isArray(payload)
    ? payload
    : payload !== null && typeof payload === "object"
      ? Object.values(payload)
      : [];
  for (const candidate of candidates) {
    if (
      candidate !== null &&
      typeof candidate === "object" &&
      typeof (candidate as { filename?: unknown }).filename === "string"
    ) {
      return candidate as NpmPackEntry;
    }
  }
  return undefined;
}

/**
 * Parse `npm pack --json` stdout (either npm shape, with pollution) and
 * return its first entry with a `filename`, or undefined.
 */
export function parseNpmPackJson(out: string): NpmPackEntry | undefined {
  for (let i = 0; i < out.length; i++) {
    const ch = out[i];
    if (ch !== "{" && ch !== "[") continue;
    const slice = balancedJsonSlice(out, i);
    if (slice === null) continue;
    let payload: unknown;
    try {
      payload = JSON.parse(slice);
    } catch {
      continue; // stray brace in lifecycle chatter, not JSON — next candidate
    }
    const entry = entryFromPayload(payload);
    if (entry) return entry;
  }
  return undefined;
}
