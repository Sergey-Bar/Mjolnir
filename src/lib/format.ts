/**
 * Shared formatting utilities. Single definition site for `pct()` (Task 20)
 * — the two callers (commands/trust-report.ts, reporter/trust-report.ts)
 * previously each declared their own identical copy.
 */
export function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
