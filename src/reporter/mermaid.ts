/**
 * `--format mermaid` — test-architecture diagram (Sprint 9 Task 38,
 * Master-Stabilization-Plan.md). Ranked first among the delight
 * features because it is genuinely useful to QA leads presenting scan
 * results to stakeholders, not merely decorative — a flowchart of
 * detected frameworks → rule categories → severity buckets, so gaps
 * are visible at a glance in a format that pastes directly into a
 * GitHub/GitLab markdown comment or a slide (Mermaid renders natively
 * in both).
 *
 * Score-neutral (Sprint 9's own DoD line): this is a pure alternate
 * rendering of the exact same ScanResult every other format uses — it
 * changes no scoring, no exit code, no JSON contract field. Output is
 * fully deterministic: every collection is sorted before rendering, so
 * the same ScanResult always produces byte-identical Mermaid source.
 */

import { TINT, type DiagramTint } from "../brand/tokens.js";

import type { DimensionScore, ScanResult, Severity } from "../types.js";

function sanitizeId(raw: string): string {
  // Mermaid node IDs can't contain most punctuation — collapse anything
  // non-alphanumeric to underscores, deterministically.
  return raw.replace(/[^a-z0-9]/gi, "_");
}

/** Escape characters that would break a Mermaid node label. */
function escapeLabel(text: string): string {
  return text.replaceAll('"', "&quot;").replaceAll("\n", " ");
}

/**
 * One Mermaid `classDef` line from one brand tint. Every colour this
 * renderer emits comes from `src/brand/tokens.ts`; it names none of its
 * own, and `brand-doctor` rule 6 fails if it starts to.
 */
function classDef(name: string, tint: DiagramTint): string {
  return `  classDef ${name} fill:${tint.fill},stroke:${tint.stroke},color:${tint.text};`;
}

function dimensionStyleClass(dim: DimensionScore): string {
  if (dim.score >= 80) return "healthy";
  if (dim.score >= 50) return "warn";
  return "critical";
}

const SEVERITY_ORDER: readonly Severity[] = ["error", "warning", "info"];

export function renderMermaid(result: ScanResult): string {
  const lines: string[] = ["flowchart TD"];

  const rootId = "SCAN";
  const rootLabel =
    result.score === null
      ? "Mjölnir scan (no tests found)"
      : `Mjölnir scan (${result.score}/100)`;
  lines.push(`  ${rootId}["${escapeLabel(rootLabel)}"]`);

  if (result.score === null) {
    lines.push(`  ${rootId} --> NOTESTS["No test files detected"]`);
    lines.push("");
    // NOT `critical`. This node says "no test files detected", which is
    // the UNKNOWN state — a legitimate answer, and the one this product
    // exists to be willing to give. Painting it in the failure tint said
    // "this is broken" where the honest statement is "this was not
    // measured", which is the same dishonesty as a CI gate reporting
    // green without having run.
    lines.push(classDef("unknown", TINT.neutral));
    lines.push("  class NOTESTS unknown;");
    return lines.join("\n");
  }

  // Frameworks layer — sorted for determinism, "unknown" called out
  // honestly rather than omitted (matches the honesty core elsewhere).
  const frameworks = [...result.frameworks].sort((a, b) => a.localeCompare(b));
  if (frameworks.length === 0) {
    const fwId = "FW_unknown";
    lines.push(`  ${rootId} --> ${fwId}["Frameworks: UNKNOWN"]`);
  } else {
    for (const fw of frameworks) {
      const fwId = `FW_${sanitizeId(fw)}`;
      lines.push(`  ${rootId} --> ${fwId}["${escapeLabel(fw)}"]`);
    }
  }

  // Category layer — one node per dimension, scored and styled, linked
  // from every framework node (a category can serve multiple frameworks
  // — e.g. QA-TEST applies regardless of which framework was detected).
  const dimensions = [...result.dimensions].sort((a, b) =>
    a.category.localeCompare(b.category),
  );
  const styleAssignments: Array<{ id: string; cls: string }> = [];

  for (const dim of dimensions) {
    const catId = `CAT_${sanitizeId(dim.category)}`;
    const label = `${dim.category} (${dim.score})`;
    lines.push(`  ${catId}["${escapeLabel(label)}"]`);
    styleAssignments.push({ id: catId, cls: dimensionStyleClass(dim) });

    const sources = frameworks.length === 0 ? ["unknown"] : frameworks;
    for (const fw of sources) {
      const fwId =
        frameworks.length === 0 ? "FW_unknown" : `FW_${sanitizeId(fw)}`;
      lines.push(`  ${fwId} --> ${catId}`);
    }

    // Severity leaves under each category — only for buckets that
    // actually have findings, keeping the diagram legible rather than
    // padding it with empty zero-count nodes.
    for (const severity of SEVERITY_ORDER) {
      const count =
        severity === "error"
          ? dim.errors
          : severity === "warning"
            ? dim.warnings
            : dim.infos;
      if (count === 0) continue;
      const sevId = `${catId}_${severity}`;
      lines.push(
        `  ${catId} --> ${sevId}["${count} ${severity}${count === 1 ? "" : "s"}"]`,
      );
      styleAssignments.push({
        id: sevId,
        cls:
          severity === "error"
            ? "critical"
            : severity === "warning"
              ? "warn"
              : "info",
      });
    }
  }

  lines.push("");
  lines.push(classDef("healthy", TINT.ok));
  lines.push(classDef("warn", TINT.gold));
  lines.push(classDef("critical", TINT.error));
  lines.push(classDef("info", TINT.aurora));
  lines.push(classDef("unknown", TINT.neutral));
  for (const { id, cls } of styleAssignments) {
    lines.push(`  class ${id} ${cls};`);
  }

  return lines.join("\n");
}
