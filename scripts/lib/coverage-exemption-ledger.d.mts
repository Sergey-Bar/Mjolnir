export interface CoverageExemptionEntry {
  path: string;
  classification:
    "PERMANENT_STRUCTURAL" | "DEAD_CODE" | "CONTRACT_ONLY" | "SHIPPED_SURFACE";
  owner: string;
  justification: string;
  shippedSurface: boolean;
  structuralReason?: string;
  reviewBy?: string;
  removalPlan?: string;
  /**
   * Regexes that MUST still match `path`. A drift alarm, not a defect
   * prover: a signature that stops matching means the code moved, so the
   * entry needs re-review. Mutually exclusive with `closureState`.
   */
  defectSignatures?: string[];
  /** The asserted defect is closed and no surface of it remains. */
  closureState?: string;
}

export interface CoverageExemptionLedger {
  schemaVersion: number;
  id: string;
  policy: {
    statement: string;
    classifications: Record<string, string>;
    reviewBySemantics: string;
    shippedSurfaceCeiling: number;
    shippedSurfaceCeilingMeaning: string;
  };
  entries: CoverageExemptionEntry[];
}

export const LEDGER_PATH: string;
export const COVERAGE_CONFIG_PATH: string;
export function committedExclusions(root: string): string[];
export function productionImporters(root: string, targetPath: string): string[];
export function shippedReachableModules(root: string): Set<string>;
export function readLedger(root: string): CoverageExemptionLedger;
export function validateCoverageExemptionLedger(
  root: string,
  options?: { now?: Date; ledger?: CoverageExemptionLedger },
): string[];
