/**
 * `mjolnir handover` — the New-QA-Onboarding Artifact (Tier 5 #28).
 *
 * One command generates the map every new QA hire needs on day one:
 * what's solid, what's fake-green, what's flaky, where the bodies are.
 *
 * Pure function over ScanResult + optional ForensicsReport — no I/O.
 */

import type { ScanResult, Finding } from "../types.js";
import type { ForensicsReport } from "../forensics/types.js";
import { sectionHeader, plainContext } from "../reporter/ui.js";
import { deriveScoreState } from "../reporter/presentation.js";

const ui = plainContext();

export interface HandoverSection {
  heading: string;
  items: string[];
}

export interface HandoverMap {
  sections: HandoverSection[];
  summaryLine: string;
}

const FAKE_GREEN_RULES = new Set([
  "QA-TEST-003",
  "QA-PY-003",
  "QA-TEST-010",
  "QA-PY-006",
  "QA-TQUAL-002",
  "QA-PY-012",
]);
const FLAKY_RULES = new Set([
  "QA-TEST-004",
  "QA-PY-005",
  "QA-PW-118",
  "QA-PW-114",
  "QA-TEST-006",
  "QA-ENV-001",
]);
const CI_TRUST_RULES = new Set([
  "QA-CI-001",
  "QA-CI-002",
  "QA-CI-005",
  "QA-CI-007",
  "QA-CI-008",
]);

/** Group findings by directory to name "solid" areas. */
function dirOf(file: string): string {
  const idx = file.lastIndexOf("/");
  return idx === -1 ? file : file.slice(0, idx);
}

export function buildHandover(
  scan: ScanResult,
  forensics: ForensicsReport | null,
): HandoverMap {
  const fakeGreen: Finding[] = [];
  const flaky: Finding[] = [];
  const ciTrust: Finding[] = [];
  const touchedDirs = new Map<string, number>();

  for (const f of scan.findings) {
    if (FAKE_GREEN_RULES.has(f.ruleId)) fakeGreen.push(f);
    else if (FLAKY_RULES.has(f.ruleId)) flaky.push(f);
    else if (CI_TRUST_RULES.has(f.ruleId)) ciTrust.push(f);
    const d = dirOf(f.file);
    touchedDirs.set(d, (touchedDirs.get(d) ?? 0) + 1);
  }

  const sections: HandoverSection[] = [];

  // 🔴 Known flaky — from real run data when available.
  const flakyFromRuns =
    forensics?.verdicts.filter((v) => v.passedOnRetry || v.everFailed) ?? [];
  const flakyItems: string[] = [];
  for (const v of flakyFromRuns.slice(0, 5)) {
    flakyItems.push(
      `${v.title} (${v.file}) — ${v.attempts} attempt${v.attempts === 1 ? "" : "s"}${v.passedOnRetry ? ", TRUE-FLAKE" : ""} → see FLAKY.md`,
    );
  }
  for (const f of flaky.slice(0, 3)) {
    flakyItems.push(`${f.file}:${f.line} — ${f.message}`);
  }
  if (flakyItems.length > 0) {
    sections.push({
      heading: "🔴 Known flaky / timing-sensitive",
      items: flakyItems,
    });
  }

  // 🟡 Fake-green suspects.
  if (fakeGreen.length > 0) {
    sections.push({
      heading: "🟡 Fake-green suspects (tests that can't fail)",
      items: fakeGreen
        .slice(0, 5)
        .map((f) => `${f.file}:${f.line} — ${f.message}`),
    });
  }

  // ⚠ CI trust issues — read this before trusting a green checkmark.
  if (ciTrust.length > 0) {
    sections.push({
      heading: "⚠ CI trust warnings (green ≠ verified)",
      items: ciTrust
        .slice(0, 4)
        .map((f) => `${f.file}:${f.line} — ${f.message}`),
    });
  }

  // 🟢 Areas with no findings — likely safe starting points.
  //
  // BW-104: the "no findings AND a high score" gate used to type its own
  // `>= 90`, a fourth band boundary no other surface shared — so a 92
  // read as a solid foundation here and merely `trusted` in the terminal.
  // The onboarding hint is really asking "is this a high-trust band?", so
  // it now asks the one model instead of re-deciding what high means.
  const allKnownFiles = new Set(scan.findings.map((f) => f.file));
  const cleanHint =
    allKnownFiles.size === 0 &&
    scan.score !== null &&
    deriveScoreState(scan.score).band === "trusted";
  if (cleanHint || scan.findings.length === 0) {
    sections.push({
      heading: "🟢 Solid foundation",
      items: [
        "No tracked anti-patterns found in scanned specs — good place to start contributing.",
      ],
    });
  }

  // The onboarding summary is a TRUST CLAIM about a suite, and a claim
  // needs its denominator. `forensics?.flakyTests ?? 0` treated "no run
  // report was ingested" as "zero flaky tests were found", so a static-
  // only scan of a genuinely flaky suite printed "Welcome aboard — the
  // suite is in good shape." Absence of evidence is not evidence of
  // absence, and the summary line is exactly where a new hire reads it.
  const flakyFromRuntime = forensics === null ? null : forensics.flakyTests;
  const totalIssues =
    fakeGreen.length + flaky.length + ciTrust.length + (flakyFromRuntime ?? 0);

  if (flakyFromRuntime === null) {
    sections.push({
      heading: "⚠ Not measured — no runtime evidence",
      items: [
        "No run report was ingested, so flakiness, retries and real pass/fail outcomes are UNKNOWN here. " +
          "Run `mjolnir forensics <results-dir>` (or point this at a test-results directory) before treating this suite as green.",
        "Everything above is static analysis only (trust L0–L2): it can show a pattern, never confirm a test ran.",
      ],
    });
  }

  return {
    sections,
    summaryLine:
      totalIssues > 0
        ? `${totalIssues} thing${totalIssues === 1 ? "" : "s"} to know about before your first release sign-off.`
        : flakyFromRuntime === null
          ? "Static analysis found nothing — but no runtime evidence was ingested, so this is NOT a statement that the suite is in good shape."
          : "Welcome aboard — the suite is in good shape.",
  };
}

export function renderHandover(map: HandoverMap): string {
  const lines: string[] = [];
  lines.push(
    sectionHeader("WELCOME TO THE TEST SUITE — WHAT YOU NEED TO KNOW", ui),
  );
  lines.push("");
  lines.push(map.summaryLine);
  for (const s of map.sections) {
    lines.push("");
    lines.push(s.heading);
    for (const item of s.items) lines.push(`  • ${item}`);
  }
  lines.push("");
  lines.push("Generated by mjolnir handover — re-run after big refactors.");
  return lines.join("\n");
}
