/**
 * "Local-first" claim verification (Test Hardening Plan — trust claim
 * enforcement).
 *
 * README's own principles section states, unambiguously: "Local-first —
 * zero network calls during scanning. Ever." That's a specific,
 * falsifiable, testable promise — and nothing before this actually
 * verified it in code.
 *
 * This is a static source-tree audit rather than a runtime network
 * intercept: Node's built-in `http`/`https`/`net` modules are exposed as
 * frozen ESM namespace objects in this toolchain, so monkey-patching
 * `http.request` etc. at runtime throws ("Cannot assign to property...
 * of [object Module]") rather than reliably intercepting anything — a
 * fragile foundation for a test whose whole job is to be trustworthy.
 * A grep over `src/` for every network-capable API is simpler, doesn't
 * depend on this scan's specific code paths happening to exercise every
 * network-capable branch, and catches the violation at the same
 * granularity a code reviewer would.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(import.meta.dirname, "..", "src");

// Any of these appearing in src/ (outside a comment) means something can
// reach the network — which the README promises never happens.
const NETWORK_APIS = [
  /\bfetch\s*\(/,
  /\bhttp\.request\s*\(/,
  /\bhttps\.request\s*\(/,
  /\bhttp\.get\s*\(/,
  /\bhttps\.get\s*\(/,
  /\bnet\.connect\s*\(/,
  /\bnet\.createConnection\s*\(/,
  /\bdgram\.createSocket\s*\(/,
  /\bdns\.(lookup|resolve\w*)\s*\(/,
  /\bnew\s+WebSocket\s*\(/,
  /\brequire\s*\(\s*["'](node:)?(http|https|net|dgram|dns)["']\s*\)/,
  /from\s+["'](node:)?(http|https|net|dgram|dns)["']/,
];

// Bug-audit B4.26 (supply-chain ratchet): `eval`/`new Function` would let
// a future dependency substitution (R3) turn any finding text, config
// value or plugin export into executed code — and neither the eslint
// security plugin nor type-checking can see through them. Same grep
// mechanism, same granularity a reviewer uses.
const DYNAMIC_CODE_APIS = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\bvm\.runIn(?:This)?Context\s*\(/,
  /\bFunction\s*\(\s*["']/, // indirect new Function without `new`
];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".spec.ts")) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/(^|[^:])\/\/.*$/gm, "$1"); // line comments (best-effort)
}

describe("local-first claim: no network-capable API anywhere in src/", () => {
  const files = listSourceFiles(SRC_ROOT);

  it("scanned a non-trivial number of source files (sanity check on the scan itself)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const file of files) {
    const rel = file.slice(SRC_ROOT.length + 1).replaceAll("\\", "/");
    it(`src/${rel} contains no network-capable API call`, () => {
      const code = stripComments(readFileSync(file, "utf8"));
      for (const pattern of NETWORK_APIS) {
        expect(
          pattern.test(code),
          `src/${rel} matches ${pattern} — README promises "zero network ` +
            `calls during scanning. Ever." If this is intentional (e.g. a ` +
            `future opt-in telemetry feature), it needs to be gated ` +
            `behind explicit user consent and this test needs a ` +
            `documented exception, not a silent pass.`,
        ).toBe(false);
      }
    });

    it(`src/${rel} contains no dynamic code evaluation`, () => {
      const code = stripComments(readFileSync(file, "utf8"));
      for (const pattern of DYNAMIC_CODE_APIS) {
        expect(
          pattern.test(code),
          `src/${rel} matches ${pattern} — dynamic code evaluation (` +
            `eval/new Function/vm) is banned in src/: it is invisible to ` +
            `type-checking and linting, and under the plugin trust model ` +
            `(no sandbox) it would turn any finding text, config value or ` +
            `plugin export into executed code.`,
        ).toBe(false);
      }
    });
  }
});
