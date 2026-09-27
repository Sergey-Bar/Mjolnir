/**
 * Shared evidence-tag renderer (Task 25). The same ternary chain
 * appeared in reporter/trust-report.ts and commands/trust-report.ts
 * (both markdown and HTML surfaces). Single definition site.
 */
import type { Finding } from "../types.js";

export function evidenceTag(f: Finding): string {
  return f.runtimeCorroboration
    ? f.runtimeCorroboration.level === "defect"
      ? "run corroborated"
      : "run executed"
    : (f.evidenceLevel ?? "E2") === "E2"
      ? "deterministic"
      : "pattern";
}
