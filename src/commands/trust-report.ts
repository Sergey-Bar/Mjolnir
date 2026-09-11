/**
 * `mjolnir trust-report` — the Trust Artifact (Mega MVP Master Plan
 * v3.1 §26 WI-6, §18; integrity binding + HTML completion R9/WI-23).
 *
 * Emits deterministic, self-contained
 * `mjolnir-trust-report.{md,json,html}`: no cloud/account/telemetry/
 * server; PR-attachable, Pages-publishable, README-embeddable,
 * agent-consumable.
 *
 * Artifact integrity binding (plan 1789009691197 §9 R9): every artifact
 * embeds its IDENTITY — the machine anchor (scanId from runIdentity),
 * the bound commit when resolvable (null, never fabricated), the
 * fired rule(rev) inventory, and the evidence inventory. Consumers
 * detect stale artifacts (a scanId from another run), mismatched
 * revisions (rule-set drift), and unbound artifacts (pre-R9 producers)
 * via `checkArtifactFreshness` — an unbound or stale artifact is
 * RECORDED, never assumed current.
 *
 * Reproducibility contract: the same scan result + the same identity
 * inputs render byte-identical artifacts — no timestamps, no
 * paths-in-headers beyond the scanned surface itself, stable section
 * order, sorted disclosures. The commit is part of the identity input
 * (like the label), not noise: a different HEAD is a different run.
 */

import { writeFileSync, statSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";

import type { ScanResult, TrustSummary } from "../types.js";
import { isAdvisoryFinding } from "../types.js";
import { runScan } from "../engine/scan-pipeline.js";
import { resolveGitPath } from "../scope/git-resolve.js";
import {
  nextAction,
  topTrustRisks,
  trustHeadline,
} from "../reporter/trust-report.js";
import { errorMessage, type Output } from "../cli-io.js";

export const TRUST_REPORT_MD = "mjolnir-trust-report.md";
export const TRUST_REPORT_JSON = "mjolnir-trust-report.json";
export const TRUST_REPORT_HTML = "mjolnir-trust-report.html";
/** Upsert marker line for PR-comment posting (GitHub Action, WI-9). */
export const TRUST_REPORT_MARKER = "<!-- mjolnir-trust-report:v1 -->";

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function fallbackSummary(result: ScanResult): TrustSummary {
  return (
    result.trustSummary ?? {
      level: "L0",
      confidence: 0,
      evidenceCoverage: 0,
      inconclusiveRate: 0,
      provisionalRuleIds: [],
      ceilingReasons: [],
    }
  );
}

/** HTML-escape a text interpolation (the artifact is hostile-input-safe). */
function esc(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * The artifact's identity binding (plan §9 R9): the machine anchor +
 * execution binding + rule(rev) inventory + evidence inventory. `commit`
 * is bound by the caller when the execution's HEAD is resolvable —
 * null means UNBOUND (recorded, never fabricated).
 */
export interface ArtifactIdentity {
  scanId: string | null;
  commit: string | null;
  /** Fired rule(rev) pairs — deduped, sorted by ruleId. */
  detectorRevisions: Array<{ ruleId: string; detectorRevision: number }>;
  evidenceInventory: {
    totalFindings: number;
    /** Findings carrying runtime corroboration (L3–L5 input). */
    corroborated: number;
    /** Findings per evidence level (E0/E1/E2), sorted keys. */
    byEvidenceLevel: Record<string, number>;
  };
}

export function buildArtifactIdentity(
  result: ScanResult,
  commit?: string | null,
): ArtifactIdentity {
  const revisions = new Map<string, number>();
  const levels = new Map<string, number>();
  let corroborated = 0;
  for (const f of result.findings) {
    // A finding without a declared revision (legacy producer) carries no
    // revision identity to bind — omitted from the inventory, never a
    // fabricated revision number.
    if (!revisions.has(f.ruleId) && f.detectorRevision !== undefined) {
      revisions.set(f.ruleId, f.detectorRevision);
    }
    const level = f.evidenceLevel ?? "E2";
    levels.set(level, (levels.get(level) ?? 0) + 1);
    if (f.runtimeCorroboration !== undefined) corroborated++;
  }
  return {
    scanId: result.runIdentity?.scanId ?? null,
    commit: commit ?? null,
    detectorRevisions: [...revisions.entries()]
      .map(([ruleId, detectorRevision]) => ({ ruleId, detectorRevision }))
      .sort((a, b) => a.ruleId.localeCompare(b.ruleId)),
    evidenceInventory: {
      totalFindings: result.findings.length,
      corroborated,
      byEvidenceLevel: Object.fromEntries([...levels.entries()].sort()),
    },
  };
}

export type ArtifactFreshness =
  | { verdict: "CURRENT"; scanId: string }
  /** The artifact describes a DIFFERENT execution (stale / wrong run). */
  | { verdict: "STALE"; artifactScanId: string; currentScanId: string }
  /** Same run, but the rule(rev) set drifted since the render. */
  | {
      verdict: "MISMATCHED-REVISIONS";
      drifted: string[];
    } /** No identity to compare — recorded, never assumed current. */
  | { verdict: "UNBOUND"; reason: string };

/**
 * Detect a stale / wrong-run / revision-drifted / unbound artifact
 * against a freshly built identity (plan §9 R9). An unbound or stale
 * artifact is RECORDED — never treated as current (no false-green).
 */
export function checkArtifactFreshness(
  artifact: ArtifactIdentity,
  current: ArtifactIdentity,
): ArtifactFreshness {
  if (artifact.scanId === null) {
    return {
      verdict: "UNBOUND",
      reason: "artifact carries no scanId (pre-R9 producer) — regenerate",
    };
  }
  if (current.scanId === null) {
    return {
      verdict: "UNBOUND",
      reason: "current scan carries no runIdentity — nothing to bind against",
    };
  }
  if (artifact.scanId !== current.scanId) {
    return {
      verdict: "STALE",
      artifactScanId: artifact.scanId,
      currentScanId: current.scanId,
    };
  }
  const currentRevs = new Map(
    current.detectorRevisions.map((r) => [r.ruleId, r.detectorRevision]),
  );
  const artifactRevs = new Map(
    artifact.detectorRevisions.map((r) => [r.ruleId, r.detectorRevision]),
  );
  // Diagnose each drift CLASS distinctly: a revision bump, a rule retired
  // since the render, and a rule added since the render are different
  // remediations — a flat list would hide which one happened.
  const drifted: string[] = [];
  for (const [ruleId, artifactRev] of artifactRevs) {
    const currentRev = currentRevs.get(ruleId);
    if (currentRev === undefined) {
      drifted.push(`${ruleId}@${artifactRev} (retired)`);
    } else if (currentRev !== artifactRev) {
      drifted.push(`${ruleId}@${artifactRev} -> ${currentRev}`);
    }
  }
  for (const [ruleId, rev] of currentRevs) {
    if (!artifactRevs.has(ruleId)) drifted.push(`${ruleId}@${rev} (new)`);
  }
  if (drifted.length > 0) {
    return { verdict: "MISMATCHED-REVISIONS", drifted: drifted.sort() };
  }
  return { verdict: "CURRENT", scanId: current.scanId };
}

/** The MD identity section lines (§9 R9). */
function identityLinesMd(identity: ArtifactIdentity): string[] {
  const revs = identity.detectorRevisions
    .map((r) => `\`${r.ruleId}@${r.detectorRevision}\``)
    .join(" · ");
  const levels = Object.entries(identity.evidenceInventory.byEvidenceLevel)
    .map(([level, n]) => `${level}:${n}`)
    .join(" · ");
  return [
    `## Artifact integrity`,
    "",
    `- **scanId**: ${identity.scanId ?? "unbound (pre-R9 producer — regenerate)"}`,
    `- **Commit**: ${identity.commit ?? "unknown (not bound)"}`,
    `- **Rule(rev) inventory**: ${revs === "" ? "none fired" : revs}`,
    `- **Evidence inventory**: ${identity.evidenceInventory.totalFindings} finding(s), ${identity.evidenceInventory.corroborated} runtime-corroborated, by level ${levels === "" ? "none" : levels}.`,
    "",
  ];
}

/** Deterministic MD artifact. Same ScanResult + label + commit → same bytes. */
export function renderTrustReportMarkdown(
  result: ScanResult,
  label: string,
  commit?: string | null,
): string {
  const s = fallbackSummary(result);
  const lines: string[] = [];

  // Upsert marker: the GitHub Action posts/updates the PR comment by
  // searching for this line — one comment per PR, never a flood.
  lines.push(`<!-- mjolnir-trust-report:v1 -->`);
  lines.push("");
  lines.push(`# Mjölnir Trust Report — ${label}`);
  lines.push("");
  lines.push(
    `> Tests tell you what passed. Mjölnir tells you what you can trust.`,
  );
  lines.push("");
  lines.push(`## Trust verdict`);
  lines.push("");
  lines.push(`- **Level**: ${s.level}`);
  lines.push(`- **Headline**: ${trustHeadline(s)}`);
  lines.push("");
  lines.push(`## Confidence`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| ------ | ----- |`);
  lines.push(
    `| Confidence | ${pct(s.confidence)}${s.confidenceCeiling !== undefined ? ` (ceiling ${pct(s.confidenceCeiling)})` : ""} |`,
  );
  lines.push(`| Evidence coverage | ${pct(s.evidenceCoverage)} |`);
  lines.push(`| Inconclusive | ${pct(s.inconclusiveRate)} |`);
  lines.push(
    `| Measured FP (fired) | ${
      s.measuredFpOfFiredRules !== undefined
        ? pct(s.measuredFpOfFiredRules)
        : s.provisionalRuleIds.length > 0
          ? `PROVISIONAL (${s.provisionalRuleIds.length} unmeasured)`
          : "n/a"
    } |`,
  );
  lines.push(`| Score | ${result.score ?? "unknown"} |`);
  lines.push(
    `| Tests analyzed | ${result.testDeclarationCount ?? 0} in ${result.testFileCount ?? 0} files |`,
  );
  lines.push("");
  if (s.ceilingReasons.length > 0) {
    lines.push(`Incompleteness factors: ${s.ceilingReasons.join(", ")}.`);
    lines.push("");
  }
  lines.push(`## Top trust risks`);
  lines.push("");
  const risks = topTrustRisks(result.findings, 10);
  if (risks.length === 0) {
    lines.push(`None — no non-advisory findings fired.`);
  } else {
    lines.push(`| Rule | Location | Evidence | Message |`);
    lines.push(`| ---- | -------- | -------- | ------- |`);
    for (const f of risks) {
      const ev = f.runtimeCorroboration
        ? f.runtimeCorroboration.level === "defect"
          ? "run corroborated"
          : "run executed"
        : (f.evidenceLevel ?? "E2") === "E2"
          ? "deterministic"
          : "pattern";
      lines.push(
        `| ${f.ruleId} | ${f.file}:${f.line} | ${ev} | ${f.message.replaceAll("|", "\\|")} |`,
      );
    }
  }
  lines.push("");
  lines.push(`## Findings summary`);
  lines.push("");
  const errors = result.findings.filter((f) => f.severity === "error").length;
  const warnings = result.findings.filter(
    (f) => f.severity === "warning",
  ).length;
  const infos = result.findings.filter((f) => f.severity === "info").length;
  const advisory = result.findings.filter((f) => isAdvisoryFinding(f)).length;
  lines.push(
    `${errors} error(s) · ${warnings} warning(s) · ${infos} info(s) · ${advisory} advisory (E0, never gate).`,
  );
  lines.push("");
  lines.push(`## Next action`);
  lines.push("");
  // NEXT ACTION — one canonical derivation (parity law): the same
  // nextAction() the Trust Report and the JSON twin use.
  lines.push(nextAction(result));
  lines.push("");
  lines.push(...identityLinesMd(buildArtifactIdentity(result, commit)));
  lines.push(`---`);
  lines.push("");
  lines.push(
    `Generated locally by Mjölnir — no cloud, no telemetry. Semantics: \`mjolnir <target> --json\` (machine contract \`contractVersion: 1\`).`,
  );
  lines.push("");
  return lines.join("\n");
}

/** Deterministic JSON artifact (agent-consumable twin of the MD). */
export function renderTrustReportJson(
  result: ScanResult,
  commit?: string | null,
): string {
  const s = fallbackSummary(result);
  return (
    JSON.stringify(
      {
        schemaVersion: 1,
        artifact: "mjolnir-trust-report",
        label: undefined,
        identity: buildArtifactIdentity(result, commit),
        trust: {
          level: s.level,
          confidence: s.confidence,
          evidenceCoverage: s.evidenceCoverage,
          inconclusiveRate: s.inconclusiveRate,
          measuredFpOfFiredRules: s.measuredFpOfFiredRules ?? null,
          provisionalRuleIds: s.provisionalRuleIds,
          confidenceCeiling: s.confidenceCeiling ?? null,
          ceilingReasons: s.ceilingReasons,
        },
        score: result.score,
        tests: {
          files: result.testFileCount ?? 0,
          declarations: result.testDeclarationCount ?? 0,
        },
        findings: {
          total: result.findings.length,
          errors: result.findings.filter((f) => f.severity === "error").length,
          warnings: result.findings.filter((f) => f.severity === "warning")
            .length,
          infos: result.findings.filter((f) => f.severity === "info").length,
          advisory: result.findings.filter((f) => isAdvisoryFinding(f)).length,
        },
        topTrustRisks: topTrustRisks(result.findings, 10).map((f) => ({
          ruleId: f.ruleId,
          file: f.file,
          line: f.line,
          severity: f.severity,
          evidence:
            f.runtimeCorroboration === undefined
              ? (f.evidenceLevel ?? "E2")
              : f.runtimeCorroboration.level,
          message: f.message,
        })),
        nextAction: nextAction(result),
      },
      null,
      2,
    ) + "\n"
  );
}

/**
 * Deterministic, self-contained HTML artifact (§18, WI-23/R9): inline
 * CSS only, zero external resources (fonts/scripts/images), hostile
 * interpolations escaped — the same five-question structure as the MD
 * plus the artifact-integrity section. Same ScanResult + label +
 * commit → byte-identical bytes.
 */
export function renderTrustReportHtml(
  result: ScanResult,
  label: string,
  commit?: string | null,
): string {
  const s = fallbackSummary(result);
  const identity = buildArtifactIdentity(result, commit);
  const risks = topTrustRisks(result.findings, 10);
  const errors = result.findings.filter((f) => f.severity === "error").length;
  const warnings = result.findings.filter(
    (f) => f.severity === "warning",
  ).length;
  const infos = result.findings.filter((f) => f.severity === "info").length;
  const advisory = result.findings.filter((f) => isAdvisoryFinding(f)).length;

  const confidenceRows: string[] = [];
  const measuredFpCell =
    s.measuredFpOfFiredRules !== undefined
      ? pct(s.measuredFpOfFiredRules)
      : s.provisionalRuleIds.length > 0
        ? `PROVISIONAL (${s.provisionalRuleIds.length} unmeasured)`
        : "n/a";
  confidenceRows.push(
    `Confidence|${pct(s.confidence)}${s.confidenceCeiling !== undefined ? ` (ceiling ${pct(s.confidenceCeiling)})` : ""}`,
  );
  confidenceRows.push(`Evidence coverage|${pct(s.evidenceCoverage)}`);
  confidenceRows.push(`Inconclusive|${pct(s.inconclusiveRate)}`);
  confidenceRows.push(`Measured FP (fired)|${measuredFpCell}`);
  confidenceRows.push(`Score|${result.score ?? "unknown"}`);
  confidenceRows.push(
    `Tests analyzed|${result.testDeclarationCount ?? 0} in ${result.testFileCount ?? 0} files`,
  );
  const confidenceRowsHtml = confidenceRows
    .map((row) => {
      const [k, v] = row.split("|");
      return `<tr><td>${esc(k ?? "")}</td><td>${esc(v ?? "")}</td></tr>`;
    })
    .join("\n          ");

  const risksTable =
    risks.length === 0
      ? `<p>None — no non-advisory findings fired.</p>`
      : `<table>
          <thead><tr><th>Rule</th><th>Location</th><th>Evidence</th><th>Message</th></tr></thead>
          <tbody>
          ${risks
            .map((f) => {
              const ev = f.runtimeCorroboration
                ? f.runtimeCorroboration.level === "defect"
                  ? "run corroborated"
                  : "run executed"
                : (f.evidenceLevel ?? "E2") === "E2"
                  ? "deterministic"
                  : "pattern";
              return `<tr><td>${esc(f.ruleId)}</td><td>${esc(f.file)}:${f.line}</td><td>${esc(ev)}</td><td>${esc(f.message)}</td></tr>`;
            })
            .join("\n          ")}
          </tbody>
        </table>`;

  const revs =
    identity.detectorRevisions.length === 0
      ? "none fired"
      : identity.detectorRevisions
          .map(
            (r) => `<code>${esc(`${r.ruleId}@${r.detectorRevision}`)}</code>`,
          )
          .join(" · ");
  const levels =
    Object.entries(identity.evidenceInventory.byEvidenceLevel)
      .map(([level, n]) => `${esc(level)}:${n}`)
      .join(" · ") || "none";

  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>Mjölnir Trust Report — ${esc(label)}</title>`,
    `<style>`,
    `:root { color-scheme: light dark; font-family: system-ui, sans-serif; }`,
    `body { margin: 0 auto; max-width: 56rem; padding: 1.5rem; line-height: 1.5; }`,
    `h1, h2 { letter-spacing: -0.01em; }`,
    `h2 { border-bottom: 1px solid color-mix(in srgb, currentColor 20%, transparent); padding-bottom: 0.25rem; }`,
    `table { border-collapse: collapse; width: 100%; }`,
    `th, td { border: 1px solid color-mix(in srgb, currentColor 25%, transparent); padding: 0.3rem 0.6rem; text-align: left; }`,
    `code { font-family: ui-monospace, monospace; font-size: 0.9em; }`,
    `footer { border-top: 1px solid color-mix(in srgb, currentColor 20%, transparent); margin-top: 2rem; padding-top: 0.75rem; }`,
    `</style>`,
    `</head>`,
    `<body>`,
    `<main>`,
    `<h1>Mjölnir Trust Report — ${esc(label)}</h1>`,
    `<blockquote><p>Tests tell you what passed. Mjölnir tells you what you can trust.</p></blockquote>`,
    `<section id="trust-verdict">`,
    `<h2>Trust verdict</h2>`,
    `<p><strong>Level</strong>: ${esc(s.level)} — ${esc(trustHeadline(s))}</p>`,
    `</section>`,
    `<section id="confidence">`,
    `<h2>Confidence</h2>`,
    `<table>`,
    `          <tbody>`,
    `          ${confidenceRowsHtml}`,
    `          </tbody>`,
    `</table>`,
    s.ceilingReasons.length > 0
      ? `<p>Incompleteness factors: ${esc(s.ceilingReasons.join(", "))}.</p>`
      : "",
    `</section>`,
    `<section id="top-trust-risks">`,
    `<h2>Top trust risks</h2>`,
    risksTable,
    `</section>`,
    `<section id="findings-summary">`,
    `<h2>Findings summary</h2>`,
    `<p>${errors} error(s) · ${warnings} warning(s) · ${infos} info(s) · ${advisory} advisory (E0, never gate).</p>`,
    `</section>`,
    `<section id="next-action">`,
    `<h2>Next action</h2>`,
    `<p><code>${esc(nextAction(result))}</code></p>`,
    `</section>`,
    `<section id="artifact-integrity">`,
    `<h2>Artifact integrity</h2>`,
    `<dl>`,
    `<dt>scanId</dt><dd>${identity.scanId === null ? "unbound (pre-R9 producer — regenerate)" : `<code>${esc(identity.scanId)}</code>`}</dd>`,
    `<dt>Commit</dt><dd>${identity.commit === null ? "unknown (not bound)" : `<code>${esc(identity.commit)}</code>`}</dd>`,
    `<dt>Rule(rev) inventory</dt><dd>${revs}</dd>`,
    `<dt>Evidence inventory</dt><dd>${identity.evidenceInventory.totalFindings} finding(s), ${identity.evidenceInventory.corroborated} runtime-corroborated, by level ${levels}.</dd>`,
    `</dl>`,
    `</section>`,
    `<footer><p>Generated locally by Mjölnir — no cloud, no telemetry. Semantics: <code>mjolnir &lt;target&gt; --json</code> (machine contract <code>contractVersion: 1</code>).</p></footer>`,
    `</main>`,
    `</body>`,
    `</html>`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * The execution's HEAD commit for the identity binding — resolved
 * OFFLINE via the git binary (the same posture as `mjolnir baseline`);
 * unresolvable ⇒ null (recorded unbound, never fabricated).
 */
function targetCommit(root: string): string | null {
  try {
    return execFileSync(
      resolveGitPath() ?? "git",
      ["-C", root, "rev-parse", "HEAD"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    return null;
  }
}

export async function runTrustReportCommand(
  argv: string[],
  io: { out: Output; err: Output },
): Promise<number> {
  // WI-9 (plan §13): `trust-report --from <mjolnir.json> [--stdout]` —
  // render the artifact from a SAVED canonical scan result instead of
  // re-scanning. The GitHub Action uses this: it already produced the
  // --json report, so the comment/annotation step must derive from that
  // exact result (one semantic truth — no second scan, no drift).
  // R9: `--commit <sha>` binds the artifact's identity to the executing
  // run's HEAD (the Action knows it; a local caller may omit it — the
  // artifact then renders commit: null, recorded unbound).
  const fromIdx = argv.indexOf("--from");
  if (fromIdx !== -1) {
    const fromPath = argv[fromIdx + 1];
    if (!fromPath || fromPath.startsWith("-")) {
      io.err(
        "error: --from requires a saved report path (mjolnir <target> --json)",
      );
      return 10;
    }
    const commitIdx = argv.indexOf("--commit");
    const commitArg =
      commitIdx !== -1 ? (argv[commitIdx + 1] ?? undefined) : undefined;
    if (commitIdx !== -1 && (!commitArg || commitArg.startsWith("-"))) {
      io.err("error: --commit requires the run's HEAD sha");
      return 10;
    }
    let raw: string;
    try {
      raw = readFileSync(resolve(fromPath), "utf8");
    } catch (err) {
      io.err(`error: cannot read ${fromPath}: ${errorMessage(err)}`);
      return 10;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as {
        schemaVersion?: number;
        contract?: unknown;
      };
    } catch (err) {
      io.err(`error: cannot read ${fromPath}: ${errorMessage(err)}`);
      return 10;
    }
    // The Action saves `{...result, contract}` — the contract rides on
    // the same object. Accept either shape; require schemaVersion 1.
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { schemaVersion?: number }).schemaVersion !== 1
    ) {
      io.err(
        `error: ${fromPath} is not a canonical mjolnir scan result (schemaVersion 1)`,
      );
      return 10;
    }
    const { contract: _contract, ...result } = parsed as Record<
      string,
      unknown
    >;
    const scan = result as unknown as ScanResult;
    const md = renderTrustReportMarkdown(scan, fromPath, commitArg ?? null);
    if (argv.includes("--stdout")) {
      io.out(md);
      return 0;
    }
    try {
      const outPath = resolve(dirname(fromPath), TRUST_REPORT_MD);
      // R9: the --from path completes the artifact set (md + html + json)
      // with the same identity binding — additive; the Action consumes
      // the MD exactly as before.
      const html = renderTrustReportHtml(scan, fromPath, commitArg ?? null);
      const json = renderTrustReportJson(scan, commitArg ?? null);
      writeFileSync(outPath, md);
      writeFileSync(resolve(dirname(fromPath), TRUST_REPORT_HTML), html);
      writeFileSync(resolve(dirname(fromPath), TRUST_REPORT_JSON), json);
      io.out(
        `trust report written: ${outPath} (plus ${TRUST_REPORT_HTML}, ${TRUST_REPORT_JSON} — same identity binding)`,
      );
      return 0;
    } catch (err) {
      // Disk-full / permission on the artifact write — an honest 20, not
      // an uncaught crash (the same degrade posture as the rescan path).
      io.err(`internal error: ${errorMessage(err)}`);
      return 20;
    }
  }
  const targetArg = argv.find((a) => !a.startsWith("-")) ?? ".";
  const target = resolve(targetArg);
  // Target validation mirrors runScanCommand's gate: the artifact must
  // describe a surface the scanner can actually see.
  if (!validateTarget(target)) {
    io.err(`error: not a scannable target: ${targetArg}`);
    return 10;
  }
  try {
    const result = await runScan({
      target,
      json: true,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
    });
    // R9: bind the artifact identity to the executing run — the target's
    // HEAD commit (offline git read, null when unresolvable) + the
    // machine anchor from the scan's runIdentity.
    const commit = targetCommit(target);
    const md = renderTrustReportMarkdown(result, targetArg, commit);
    const json = renderTrustReportJson(result, commit);
    const html = renderTrustReportHtml(result, targetArg, commit);
    writeFileSync(join(target, TRUST_REPORT_MD), md);
    writeFileSync(join(target, TRUST_REPORT_JSON), json);
    writeFileSync(join(target, TRUST_REPORT_HTML), html);
    io.out(
      `trust report written: ${TRUST_REPORT_MD}, ${TRUST_REPORT_JSON}, ${TRUST_REPORT_HTML} (deterministic — same scan, same bytes)`,
    );
    return 0;
  } catch (err) {
    io.err(`internal error: ${errorMessage(err)}`);
    return 20;
  }
}

function validateTarget(target: string): boolean {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}
