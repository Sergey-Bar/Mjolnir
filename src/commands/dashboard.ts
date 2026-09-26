/**
 * `mjolnir dashboard` — Team Quality Dashboard (TL-1).
 *
 * Generates an HTML dashboard showing team quality metrics
 * from scan results. The dashboard is a self-contained HTML
 * file with inline CSS and JavaScript, suitable for embedding
 * in team wikis or sharing via static hosting.
 */

import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { sanitizeErrorText } from "../forensics/evidence-hygiene.js";
import { writeFileAtomic } from "../lib/fs-atomic.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import { decideClaim } from "../claim-evidence.js";
import { EXIT_INTERNAL, EXIT_USAGE } from "../exit-codes.js";
import { deriveScoreState } from "../reporter/presentation.js";
import { SCORE, STATUS } from "../brand/tokens.js";

/** Band → CSS colour, read from the brand tokens so the dashboard cannot
 *  name a colour of its own. `trusted` is aurora-cyan, not green: green is
 *  reserved for non-score success (the terminal's `Palette.ok`). */
const BAND_HEX: Record<string, string> = {
  critical: SCORE.critical,
  warning: SCORE.warning,
  trusted: SCORE.trusted,
  forged: SCORE.forged,
  unmeasured: SCORE.unmeasured,
};

export interface DashboardData {
  score: number | null;
  totalFindings: number;
  errorCount: number;
  warningCount: number;
  /**
   * `null` when framework detection itself was unknown. A zero there would
   * read as "this project uses no frameworks", which is the opposite claim.
   */
  frameworkCount: number | null;
  /** True when the analysis did not cover the whole surface. */
  partial: boolean;
  /** How many findings the table below actually rendered. */
  findingsShown: number;
  findings: Array<{
    ruleId: string;
    severity: string;
    file: string;
    message: string;
  }>;
  /**
   * Generation time, ISO-8601. RENDERED as document metadata and never
   * as body text, and omitted entirely under `--deterministic`.
   *
   * BW-106: this used to be interpolated into the visible body as
   * "Generated: <timestamp>", so two runs over an unchanged repository
   * produced different bytes. `engine/machine-contract.ts` already
   * excludes `durationMs` for exactly this reason — the HTML artifact
   * now holds the same line.
   */
  generatedAt: string | null;
}

const FINDINGS_SHOWN_LIMIT = 100;

function escapeHtml(text: string): string {
  return sanitizeErrorText(text, { maxLength: 1_000 })
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function generateDashboardHtml(data: DashboardData): string {
  // BW-104: the band comes from the one registry, so the dashboard cannot
  // disagree with the terminal about what 65 means. It used to split at 60
  // — a score the terminal called UNWORTHY rendered amber here.
  const scoreColor = BAND_HEX[deriveScoreState(data.score).band];

  // Severity colours come from the brand tokens too. They used to be ad-hoc
  // hex literals that matched nothing in the palette, so the dashboard's red
  // was not the terminal's red.
  const severityColor = (severity: string): string =>
    severity === "error"
      ? STATUS.error
      : severity === "warning"
        ? STATUS.warning
        : STATUS.ok;

  const rows = data.findings
    .map(
      (f) =>
        `<tr><td>${escapeHtml(f.ruleId)}</td><td><span style="color:${severityColor(f.severity)}">${escapeHtml(f.severity)}</span></td><td>${escapeHtml(f.file)}</td><td>${escapeHtml(f.message)}</td></tr>`,
    )
    .join("");

  const banner = data.partial
    ? `<p style="color:${STATUS.warning};font-weight:600">PARTIAL ANALYSIS — the whole surface was not analyzed. These numbers describe the analyzed portion only.</p>`
    : "";
  const truncation =
    data.findingsShown < data.totalFindings
      ? `<p>Showing ${data.findingsShown} of ${data.totalFindings} findings (display limit).</p>`
      : "";
  const frameworkValue =
    data.frameworkCount === null ? "unknown" : String(data.frameworkCount);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${data.generatedAt === null ? "" : `<meta name="mjolnir-generated-at" content="${escapeHtml(data.generatedAt)}">\n`}<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quality Dashboard</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; background: #0a0a0a; color: #e5e5e5; }
  h1 { border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
  .score { font-size: 4rem; font-weight: bold; color: ${scoreColor}; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1.5rem 0; }
  .kpi { background: #1a1a1a; padding: 1rem; border-radius: 8px; text-align: center; }
  .kpi .value { font-size: 2rem; font-weight: bold; }
  .kpi .label { font-size: 0.85rem; color: #888; }
  table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
  th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #222; }
  th { color: #888; font-weight: 500; }
</style>
</head>
<body>
<h1>🔍 Quality Dashboard</h1>
${banner}${data.generatedAt === null ? `<p>Deterministic build — no generation timestamp is recorded, so this file is byte-identical for an unchanged repository.</p>` : ""}<div class="score">${data.score !== null ? data.score + "/100" : "N/A"}</div>
<div class="kpi-grid">
  <div class="kpi"><div class="value">${data.totalFindings}</div><div class="label">Findings</div></div>
  <div class="kpi"><div class="value" style="color:${STATUS.error}">${data.errorCount}</div><div class="label">Errors</div></div>
  <div class="kpi"><div class="value" style="color:${STATUS.warning}">${data.warningCount}</div><div class="label">Warnings</div></div>
  <div class="kpi"><div class="value">${frameworkValue}</div><div class="label">Frameworks</div></div>
</div>
<h2>Findings</h2>
${truncation}<table><caption>Findings on the analyzed surface, newest severity first. Capped at ${FINDINGS_SHOWN_LIMIT} rows.</caption><thead><tr><th scope="col">Rule</th><th scope="col">Severity</th><th scope="col">File</th><th scope="col">Message</th></tr></thead><tbody>${rows}</tbody></table>
</body>
</html>`;
}

/**
 * The one HTML generator. Exported for the gates that must compare two
 * renders without running a scan (`artifact:deterministic`), because a
 * byte-comparison that needs a subprocess is a byte-comparison nobody
 * runs.
 */
export function generateDashboardHtmlForTest(data: DashboardData): string {
  return generateDashboardHtml(data);
}

export async function runDashboardCommand(
  argv: string[],
  io: { out: Output; err: Output },
): Promise<number> {
  const target = argv.find((a) => !a.startsWith("-")) ?? ".";
  const outputIdx = argv.indexOf("--output");
  const outputPath =
    outputIdx !== -1
      ? (argv[outputIdx + 1] ?? "dashboard.html")
      : "dashboard.html";
  // BW-106: --deterministic omits the generation timestamp entirely, so
  // two runs over an unchanged repository produce byte-identical files and
  // the artifact can be diffed in review. Default stays timestamped
  // because "when was this generated" is real information.
  const deterministic = argv.includes("--deterministic");

  if (!existsSync(target)) {
    io.err(`mjolnir dashboard: target does not exist: ${target}`);
    return EXIT_USAGE;
  }
  const root = resolve(target);
  const resolvedOutput = resolve(outputPath);
  const outputRelative = relative(root, resolvedOutput);
  if (isAbsolute(outputRelative) || outputRelative.startsWith("..")) {
    io.err("mjolnir dashboard: output must stay within the target root");
    return EXIT_USAGE;
  }

  try {
    const { runScan } = await import("../engine/scan-pipeline.js");
    const result = await runScan({
      target,
      json: true,
      verbose: false,
      maxDurationMs: 600_000,
      scopeChanged: false,
      format: "json",
      strict: false,
    });

    const shown = result.findings.slice(0, FINDINGS_SHOWN_LIMIT);
    const data: DashboardData = {
      score: result.score,
      totalFindings: result.findings.length,
      errorCount: result.findings.filter((f) => f.severity === "error").length,
      warningCount: result.findings.filter((f) => f.severity === "warning")
        .length,
      // Undetectable is not the same as none detected.
      frameworkCount: result.frameworkDetectionUnknown
        ? null
        : result.frameworks.length,
      partial: result.partial,
      findingsShown: shown.length,
      findings: shown.map((f) => ({
        ruleId: f.ruleId,
        severity: f.severity,
        file: f.file,
        message: f.message,
      })),
      generatedAt: deterministic ? null : new Date().toISOString(),
    };

    const html = generateDashboardHtml(data);
    writeFileAtomic(resolvedOutput, html, { encoding: "utf8" });

    io.out(`Dashboard written to ${resolvedOutput}`);
    io.out(`Score: ${data.score !== null ? data.score + "/100" : "N/A"}`);
    io.out(
      `Findings: ${data.totalFindings} (${data.errorCount} errors, ${data.warningCount} warnings)`,
    );
    if (data.frameworkCount === null) {
      io.out("Frameworks: unknown — detection did not complete");
    }
    if (data.findingsShown < data.totalFindings) {
      io.out(
        `Table shows ${data.findingsShown} of ${data.totalFindings} findings (display limit).`,
      );
    }

    // One determination, partial checked first: a truncated analysis must not
    // exit clean.
    const decision = decideClaim({
      partial: data.partial,
      blockingFindings: data.errorCount,
      supported: true,
    });
    io.out(`Determination: ${decision.state} — ${decision.reason}`);
    return decision.exitCode;
  } catch (e) {
    internalErrorMessage(e, io.err, false);
    return EXIT_INTERNAL;
  }
}
