/**
 * PRUX-005 — PR Comment Brand Contract.
 *
 * Single source of truth for how QA Doctor renders its identity inside
 * GitHub / GitLab PR comments. Every surface that writes a PR review
 * comment must resolve through this contract.
 */

export interface LogoAsset {
  readonly light: string;
  readonly dark: string;
  readonly fallback: string;
}

export interface PrCommentBrandContract {
  readonly productName: "QA Doctor";
  readonly productDescriptor: "Verification Trust";
  readonly logoAsset: LogoAsset;
  readonly verdictLabels: Record<string, string>;
  readonly verdictIcons: Record<string, string>;
  readonly sectionOrder: readonly string[];
  readonly terminology: "trust-engine";
  readonly footerFormat: "scanId + generatedBy";
}

const SECTION_ORDER = [
  "header",
  "verdict",
  "blockers",
  "evidence",
  "findings",
  "frameworks",
  "details",
  "action",
  "footer",
] as const;

export const PR_BRAND_CONTRACT: PrCommentBrandContract = {
  productName: "QA Doctor",
  productDescriptor: "Verification Trust",
  logoAsset: {
    light:
      "https://raw.githubusercontent.com/Sergey-Bar/qa-doctor/main/assets/brand/logo-light.svg",
    dark: "https://raw.githubusercontent.com/Sergey-Bar/qa-doctor/main/assets/brand/logo-dark.svg",
    fallback: "QA Doctor",
  },
  verdictLabels: {
    excellent: "Excellent",
    trusted: "Trusted",
    needsWork: "Needs Attention",
    critical: "Critical",
    unmeasured: "Unmeasured",
  },
  verdictIcons: {
    excellent: ":white_check_mark:",
    trusted: ":white_check_mark:",
    needsWork: ":warning:",
    critical: ":x:",
    unmeasured: ":grey_question:",
  },
  sectionOrder: [...SECTION_ORDER],
  terminology: "trust-engine",
  footerFormat: "scanId + generatedBy",
};

export function validateBrandContract(contract: PrCommentBrandContract): {
  readonly valid: boolean;
  readonly errors: readonly string[];
} {
  const errors: string[] = [];

  const actualName: string = contract.productName;
  if (actualName !== "QA Doctor") {
    errors.push(`productName must be "QA Doctor"; got "${actualName}"`);
  }
  const actualDescriptor: string = contract.productDescriptor;
  if (actualDescriptor !== "Verification Trust") {
    errors.push(
      `productDescriptor must be "Verification Trust"; got "${actualDescriptor}"`,
    );
  }

  if (!contract.logoAsset.light) {
    errors.push("logoAsset.light must be non-empty");
  }
  if (!contract.logoAsset.dark) {
    errors.push("logoAsset.dark must be non-empty");
  }
  if (contract.logoAsset.fallback !== "QA Doctor") {
    errors.push(
      `logoAsset.fallback must be "QA Doctor"; got "${contract.logoAsset.fallback}"`,
    );
  }

  const requiredVerdicts = [
    "excellent",
    "trusted",
    "needsWork",
    "critical",
    "unmeasured",
  ];
  for (const v of requiredVerdicts) {
    if (!(v in contract.verdictLabels)) {
      errors.push(`verdictLabels missing key "${v}"`);
    }
    if (!(v in contract.verdictIcons)) {
      errors.push(`verdictIcons missing key "${v}"`);
    }
  }

  if (contract.sectionOrder.length === 0) {
    errors.push("sectionOrder must be non-empty");
  }

  const actualTerminology: string = contract.terminology;
  if (actualTerminology !== "trust-engine") {
    errors.push(
      `terminology must be "trust-engine"; got "${actualTerminology}"`,
    );
  }

  const actualFooterFormat: string = contract.footerFormat;
  if (actualFooterFormat !== "scanId + generatedBy") {
    errors.push(
      `footerFormat must be "scanId + generatedBy"; got "${actualFooterFormat}"`,
    );
  }

  return { valid: errors.length === 0, errors };
}
