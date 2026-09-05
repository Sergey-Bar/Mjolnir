/**
 * GitHub annotation emitter (Terminal + CI UX Overhaul plan, M4).
 *
 * ONE emitter, ONE code path: annotations are produced only by
 * `mjolnir summary` reading a saved report JSON — never by the scan
 * itself. The command prints `::error|warning|notice` workflow commands
 * to stdout when GITHUB_ACTIONS=true; everywhere else they are plain
 * lines any CI log renderer can ignore.
 *
 * Escaping follows GitHub's workflow-command spec exactly:
 * - property values (file, title): % → %25, \r → %0D, \n → %0A,
 *   : → %3A, , → %2C
 * - message: % → %25, \r → %0D, \n → %0A
 *
 * `sanitizeData` (theme.ts) has already stripped ANSI escapes from any
 * finding this reporter receives — the escapers below are defense in
 * depth for the %/CR/LF forms the sanitizer keeps.
 */

export interface AnnotationInput {
  severity: "error" | "warning" | "info";
  file: string;
  line?: number | undefined;
  column?: number | undefined;
  title: string;
  message: string;
}

/** Escape a workflow-command PROPERTY value. */
export function escapeAnnotationProperty(value: string): string {
  return value
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A")
    .replaceAll(":", "%3A")
    .replaceAll(",", "%2C");
}

/** Escape a workflow-command MESSAGE. */
export function escapeAnnotationMessage(value: string): string {
  return value
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

/** ANSI-injection guard for the summary path (belt + braces). */
export function stripAnsiForSummary(value: string): string {
  // ECMA-48 CSI: params 0x30–0x3F, intermediates 0x20–0x2F, final 0x40–0x7E.
  // eslint-disable-next-line no-control-regex, regexp/no-obscure-range
  return value.replace(/\x1b\[[0-9;:?]*[ -/]*[@-~]/g, "");
}

const SEVERITY_TO_COMMAND: Record<AnnotationInput["severity"], string> = {
  error: "error",
  warning: "warning",
  info: "notice",
};

/** Render ONE workflow-command annotation line (no trailing newline). */
export function renderAnnotation(a: AnnotationInput): string {
  const props: string[] = [
    `file=${escapeAnnotationProperty(a.file)}`,
    `line=${Math.max(1, a.line ?? 1)}`,
  ];
  if (a.column !== undefined) props.push(`column=${Math.max(1, a.column)}`);
  props.push(`title=${escapeAnnotationProperty(a.title)}`);
  return `::${SEVERITY_TO_COMMAND[a.severity]} ${props.join(",")}::${escapeAnnotationMessage(a.message)}`;
}

/** Render annotations for every finding in a report's findings array. */
export function renderAnnotations(
  findings: ReadonlyArray<{
    severity: string;
    file: string;
    line: number;
    column?: number | undefined;
    ruleId: string;
    message: string;
  }>,
): string[] {
  return findings.map((f) => {
    const severity =
      f.severity === "error" || f.severity === "warning" ? f.severity : "info";
    return renderAnnotation({
      severity,
      file: f.file,
      line: f.line,
      column: f.column,
      title: f.ruleId,
      message: f.message,
    });
  });
}

/** GitHub caps annotation messages — keep the head, point at the summary. */
export function truncateMessage(message: string, max = 250): string {
  if (message.length <= max) return message;
  return `${message.slice(0, max)}… (full text in the step summary)`;
}
