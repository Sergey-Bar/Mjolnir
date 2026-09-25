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
  generatedAt: string;
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
  const scoreColor =
    data.score === null
      ? "#888"
      : data.score >= 80
        ? "#22c55e"
        : data.score >= 60
          ? "#eab308"
          : "#ef4444";

  const rows = data.findings
    .map(
      (f) =>
        `<tr><td>${escapeHtml(f.ruleId)}</td><td><span style="color:${f.severity === "error" ? "#ef4444" : f.severity === "warning" ? "#eab308" : "#22c55e"}">${escapeHtml(f.severity)}</span></td><td>${escapeHtml(f.file)}</td><td>${escapeHtml(f.message)}</td></tr>`,
    )
    .join("");

  const banner = data.partial
    ? `<p style="color:#eab308;font-weight:600">PARTIAL ANALYSIS — the whole surface was not analyzed. These numbers describe the analyzed portion only.</p>`
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
${banner}<p>Generated: ${escapeHtml(data.generatedAt)}</p>
<div class="score">${data.score !== null ? data.score + "/100" : "N/A"}</div>
<div class="kpi-grid">
  <div class="kpi"><div class="value">${data.totalFindings}</div><div class="label">Findings</div></div>
  <div class="kpi"><div class="value" style="color:#ef4444">${data.errorCount}</div><div class="label">Errors</div></div>
  <div class="kpi"><div class="value" style="color:#eab308">${data.warningCount}</div><div class="label">Warnings</div></div>
  <div class="kpi"><div class="value">${frameworkValue}</div><div class="label">Frameworks</div></div>
</div>
<h2>Findings</h2>
${truncation}<table><thead><tr><th>Rule</th><th>Severity</th><th>File</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table>
</body>
</html>`;
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
      generatedAt: new Date().toISOString(),
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
