/**
 * `mjolnir share` — React Doctor's proof loop, without its server.
 *
 * One scan, one self-contained HTML file you can attach to a PR, paste into an
 * issue, or hand to someone who has never installed anything. There is no
 * upload, no share id, no account, and no server to be down.
 *
 * The artifact's contract is narrower than the BOUND trust artifact's, and the
 * difference is the whole point of a second renderer rather than a flag on the
 * first one:
 *
 *   - the bound artifact (written by the internal trust-report command) names
 *     the repo, the commit, the scanId and the rule(rev) inventory, because its
 *     job is to prove which run produced it. Those four facts are exactly what
 *     must not leave the machine when the file is handed to a third party.
 *   - `share` is UNBOUND: no repo name, no remote, no commit, no absolute
 *     path, no source snippet, no wall-clock timestamp. Same scan result in,
 *     byte-identical file out — asserted under the deterministic clock by
 *     `tests/contract/share-artifact.spec.ts`.
 *
 * What it does carry is what makes the file worth reading: the score, every
 * `GATE`/`WARN` finding with `file:line`, the three commands that move the
 * number, and each fired rule's measured false-positive rate with its sample
 * size — including "unmeasured", never a zero.
 *
 * Zero-network like everything else here: no fetch, no remote asset, no
 * external font, no `<script src>`. The inline `<style>` is the only styling,
 * so the file renders identically offline, forever.
 */

import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

import type { ScanResult } from "../types.js";
import { runScan } from "../engine/scan-pipeline.js";
import { isAtGate, type GateLevel } from "../claim-evidence.js";
import { gateCounts } from "../reporter/trust-report.js";
import { isAdvisoryFinding } from "../types.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";
import { errorMessage, type Output } from "../cli-io.js";
import { pct } from "../lib/format.js";
import { writeFileAtomic } from "../lib/fs-atomic.js";

/** The default filename. One file, no directory, nothing else to clean up. */
export const SHARE_ARTIFACT = "mjolnir-trust-report.html";

const GATE_COMMAND = "mjolnir ci install";

/**
 * HTML-escape a text interpolation, and refuse anything that is not a text
 * node's business.
 *
 * Two filters, because they catch different things: the strip removes
 * control and bidi-override characters (an artifact is hostile input — rule
 * messages are attacker-influenced text in someone's repo), and the escape
 * neutralises the markup delimiters. `sanitizeForMarkdown` from the GitHub
 * integration does the same job for a comment body; it is not imported here
 * because a comment body and a document body have different downstream
 * parsers, and sharing a sanitizer across both would couple two contracts.
 */
function esc(text: string): string {
  const stripped = [...text]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return !(
        code <= 0x1f ||
        (code >= 0x7f && code <= 0x9f) ||
        code === 0x200f ||
        code === 0x202e ||
        (code >= 0x2066 && code <= 0x2069)
      );
    })
    .join("")
    .slice(0, 1_000);
  return stripped
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * A `file:line` that is safe to publish.
 *
 * Findings already carry repo-relative paths, which is the contract the rest
 * of the product relies on. This is the belt to that suspenders: anything
 * absolute, anything with a drive letter, anything that climbs out with `..`,
 * and anything containing a home directory is replaced with a marker rather
 * than written. A scan run against a path outside the repo is a real
 * configuration, not a hypothetical.
 */
function publicLocation(file: string, line: number): string {
  const unsafe =
    file.length === 0 ||
    isAbsolute(file) ||
    /^[a-z]:/i.test(file) ||
    file.includes("..") ||
    file.startsWith("~") ||
    file.includes("\\");
  if (unsafe) return `redacted-path:${line}`;
  return `${esc(file)}:${line}`;
}

/** The measured FP cell. "Unmeasured" is a state, not a zero. */
function fpCell(ruleId: string): string {
  const m = MEASURED_FP[ruleId];
  if (m === undefined) return "unmeasured";
  return `${pct(m.fpRate)} (n=${m.n})`;
}

/**
 * The three commands that move the number.
 *
 * Ordered by what a reader can do about it: the gate first (it is what makes
 * any of it binding), then the top finding, then the scan itself. All three
 * are literal commands, not advice — a shareable file whose next steps are
 * prose has to be re-interpreted by whoever receives it.
 */
function nextCommands(result: ScanResult, topRuleId: string | null): string[] {
  const first = topRuleId ?? "<RULE-ID>";
  return [GATE_COMMAND, `mjolnir explain ${first}`, "mjolnir --scope changed"];
}

/**
 * Render the shareable artifact. Pure: same ScanResult in, same bytes out.
 *
 * No timestamp anywhere, deliberately. A generated-at line is the single most
 * common reason two runs of an unchanged repository produce different bytes,
 * and the value it adds to a file that is handed over by hand is zero.
 */
export function renderShareHtml(
  result: ScanResult,
  gate: GateLevel = "error",
): string {
  const counts = gateCounts(result.findings, gate);
  const findings = [...result.findings].sort((a, b) => {
    // GATE first, then the canonical comparison order. The sort is stable, so
    // two findings that compare equal keep the order the scan produced.
    const byGate =
      Number(isAtGate(b, gate, isAdvisoryFinding)) -
      Number(isAtGate(a, gate, isAdvisoryFinding));
    if (byGate !== 0) return byGate;
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    return a.line - b.line;
  });
  const topRuleId = findings.find((f) =>
    isAtGate(f, gate, isAdvisoryFinding),
  )?.ruleId;
  const commands = nextCommands(result, topRuleId ?? null);
  const firedRules = [...new Set(result.findings.map((f) => f.ruleId))].sort();

  const rows = findings
    .map((f) => {
      const atGate = isAtGate(f, gate, isAdvisoryFinding);
      return [
        "<tr>",
        `<td><code>${atGate ? "GATE" : "WARN"}</code></td>`,
        `<td><code>${esc(f.ruleId)}</code></td>`,
        `<td><code>${publicLocation(f.file, f.line)}</code></td>`,
        `<td>${esc(f.message)}</td>`,
        `</tr>`,
      ].join("");
    })
    .join("\n          ");

  const fpRows = firedRules
    .map(
      (id) =>
        `<tr><td><code>${esc(id)}</code></td><td>${esc(fpCell(id))}</td></tr>`,
    )
    .join("\n          ");

  const score = result.score === null ? "unknown" : String(result.score);

  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>Mjölnir trust report</title>`,
    `<style>`,
    `:root { color-scheme: light dark; font-family: system-ui, sans-serif; }`,
    `body { margin: 0 auto; max-width: 60rem; padding: 1.5rem; line-height: 1.5; }`,
    `h1, h2 { letter-spacing: -0.01em; }`,
    `h2 { border-bottom: 1px solid color-mix(in srgb, currentColor 20%, transparent); padding-bottom: 0.25rem; margin-top: 2rem; }`,
    `table { border-collapse: collapse; width: 100%; }`,
    `th, td { border: 1px solid color-mix(in srgb, currentColor 25%, transparent); padding: 0.3rem 0.6rem; text-align: left; vertical-align: top; }`,
    `code { font-family: ui-monospace, monospace; font-size: 0.9em; }`,
    `ol { padding-left: 1.2rem; }`,
    `.gate { font-weight: 700; }`,
    `footer { border-top: 1px solid color-mix(in srgb, currentColor 20%, transparent); margin-top: 2rem; padding-top: 0.75rem; }`,
    `</style>`,
    `</head>`,
    `<body>`,
    `<main>`,
    `<h1>Mjölnir trust report</h1>`,
    `<p><strong>Score</strong>: ${esc(score)} · <strong class="gate">${counts.gate} GATE</strong> · ${counts.warn} WARN${result.partial ? " · <strong>INCONCLUSIVE</strong> (the analysis did not finish)" : ""}</p>`,
    `<section id="next-commands">`,
    `<h2>Three commands</h2>`,
    `<ol>`,
    commands.map((c) => `<li><code>${esc(c)}</code></li>`).join("\n    "),
    `</ol>`,
    `</section>`,
    `<section id="findings">`,
    `<h2>Findings</h2>`,
    rows.length === 0
      ? `<p>No findings on the analyzed surface.</p>`
      : `<table>
          <caption>Every finding, GATE first. GATE counts against the configured gate; WARN never fails a build.</caption>
          <thead><tr><th scope="col">Gate</th><th scope="col">Rule</th><th scope="col">Location</th><th scope="col">Finding</th></tr></thead>
          <tbody>
          ${rows}
          </tbody>
        </table>`,
    `</section>`,
    `<section id="measured-fp">`,
    `<h2>Measured false-positive rate</h2>`,
    fpRows.length === 0
      ? `<p>No rule fired, so nothing is weighted.</p>`
      : `<table>
          <caption>Per fired rule, the rate measured against hand-classified corpus verdicts. “Unmeasured” means the rule ships on assumption — it is not zero.</caption>
          <thead><tr><th scope="col">Rule</th><th scope="col">Measured FP</th></tr></thead>
          <tbody>
          ${fpRows}
          </tbody>
        </table>`,
    `</section>`,
    `<footer><p>Generated locally by Mjölnir — no server, no upload, no network, no telemetry. Same semantics as <code>mjolnir --json</code> (machine contract <code>contractVersion: 1</code>); this file is a rendering of it, and the command that gates is <code>${esc(GATE_COMMAND)}</code>.</p></footer>`,
    `</main>`,
    `</body>`,
    `</html>`,
    ``,
  ].join("\n");
}

export interface ShareOptions {
  /** Repository to scan. */
  target: string;
  /** Output path. Absolute, or relative to the CWD — not to the target. */
  out?: string;
  /** Analysis budget in ms; `Infinity` is a real (slow) choice here. */
  maxDurationMs?: number;
  io: { out: Output; err: Output };
}

/**
 * `mjolnir share [target] [--out <path>]`
 *
 * Scans, writes one HTML file, prints the path. The scan runs with
 * `json: true` because the artifact is a rendering of the canonical result —
 * there is no second analysis and no second set of numbers.
 */
export async function runShareCommand(
  argv: string[],
  io: { out: Output; err: Output },
): Promise<number> {
  let target = ".";
  let out: string | undefined;
  let maxDurationMs = 120_000;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    if (a === "--out") {
      const v = argv[++i];
      if (v === undefined || v.length === 0) {
        io.err("mjolnir share: --out needs a file path.");
        return 10;
      }
      out = v;
    } else if (a === "--max-duration") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) {
        io.err(
          "mjolnir share: --max-duration needs a positive number of seconds.",
        );
        return 10;
      }
      maxDurationMs = v * 1000;
    } else if (a === "--help" || a === "-h") {
      io.out(
        "Usage: mjolnir share [target] [--out <file>] [--max-duration <sec>]\n\n" +
          "Writes one self-contained HTML trust report. No server, no upload,\n" +
          "no network. Same scan semantics as `mjolnir <target>`.",
      );
      return 0;
    } else if (a.startsWith("-")) {
      io.err(`mjolnir share: unknown flag "${a}".`);
      return 10;
    } else if (target === "." && i === 0) {
      target = a;
    } else {
      io.err(`mjolnir share: unexpected argument "${a}".`);
      return 10;
    }
  }

  const destination = resolve(
    out ?? target,
    out === undefined ? SHARE_ARTIFACT : "",
  );
  try {
    const result = await runScan({
      target,
      json: true,
      verbose: false,
      maxDurationMs,
      scopeChanged: false,
      format: "json",
    });
    mkdirSync(dirname(destination), { recursive: true });
    writeFileAtomic(destination, renderShareHtml(result), { encoding: "utf8" });
    io.out(destination);
    io.err(
      `share: ${result.findings.length} finding(s) written. It names no repository, ` +
        "no commit and no path outside the scanned tree, and it is byte-identical " +
        "for the same scan.",
    );
    return 0;
  } catch (err) {
    io.err(`mjolnir share: ${errorMessage(err)}`);
    return 20;
  }
}
