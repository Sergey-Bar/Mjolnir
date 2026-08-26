/**
 * Ambient type declaration for generate-fp-audit-table.mjs's test-facing
 * export. The script itself stays plain JS (it's a small release-tooling
 * utility, not part of the typed src/ codebase) — this file exists only
 * so tests/fp-audit-table.spec.ts can import it under strict TypeScript
 * without an implicit-any error.
 */

export interface FpAuditBaseline {
  name: string;
  countsByRule: Record<string, number>;
  totalFindings: number;
}

export function renderFpAuditMd(
  baselines: FpAuditBaseline[],
  generatedAt?: Date,
): string;
