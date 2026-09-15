import { describe, expect, it } from "vitest";

import {
  PR_BRAND_CONTRACT,
  validateBrandContract,
} from "../../src/brand/pr-brand-contract.js";

describe("PR_BRAND_CONTRACT", () => {
  it("is valid against its own validator", () => {
    const result = validateBrandContract(PR_BRAND_CONTRACT);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("has productName Mjolnir and productDescriptor Verification Trust", () => {
    expect(PR_BRAND_CONTRACT.productName).toBe("Mjolnir");
    expect(PR_BRAND_CONTRACT.productDescriptor).toBe("Verification Trust");
  });

  it("has all 5 verdicts labeled", () => {
    const labels = PR_BRAND_CONTRACT.verdictLabels;
    expect(labels["forged"]).toBe("Forged");
    expect(labels["trusted"]).toBe("Trusted");
    expect(labels["needsWork"]).toBe("Needs Work");
    expect(labels["unworthy"]).toBe("Unworthy");
    expect(labels["unmeasured"]).toBe("Unmeasured");
  });

  it("has all 5 verdict icons", () => {
    const icons = PR_BRAND_CONTRACT.verdictIcons;
    expect(Object.keys(icons)).toHaveLength(5);
    for (const key of Object.keys(PR_BRAND_CONTRACT.verdictLabels)) {
      expect(key in icons).toBe(true);
    }
  });

  it("section order has exactly 9 entries in the correct sequence", () => {
    expect(PR_BRAND_CONTRACT.sectionOrder).toEqual([
      "header",
      "verdict",
      "blockers",
      "evidence",
      "findings",
      "frameworks",
      "details",
      "action",
      "footer",
    ]);
  });

  it("uses trust-engine terminology", () => {
    expect(PR_BRAND_CONTRACT.terminology).toBe("trust-engine");
  });

  it("uses scanId + generatedBy footer format", () => {
    expect(PR_BRAND_CONTRACT.footerFormat).toBe("scanId + generatedBy");
  });

  it("logo asset has light, dark, and fallback", () => {
    expect(PR_BRAND_CONTRACT.logoAsset.light).toBeTruthy();
    expect(PR_BRAND_CONTRACT.logoAsset.dark).toBeTruthy();
    expect(PR_BRAND_CONTRACT.logoAsset.fallback).toBe("Mjolnir");
  });
});

describe("validateBrandContract", () => {
  it("rejects contract with wrong productName", () => {
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      productName: "Wrong" as "Mjolnir",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("productName"),
    );
  });

  it("rejects contract with missing verdict label", () => {
    const { forged: _removed, ...rest } = PR_BRAND_CONTRACT.verdictLabels;
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      verdictLabels: rest,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('verdictLabels missing key "forged"'),
    );
  });
});
