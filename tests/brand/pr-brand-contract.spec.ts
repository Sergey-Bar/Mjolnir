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

  it("has productName QA Doctor and productDescriptor Verification Trust", () => {
    expect(PR_BRAND_CONTRACT.productName).toBe("QA Doctor");
    expect(PR_BRAND_CONTRACT.productDescriptor).toBe("Verification Trust");
  });

  it("has all 5 verdicts labeled", () => {
    const labels = PR_BRAND_CONTRACT.verdictLabels;
    expect(labels["excellent"]).toBe("Excellent");
    expect(labels["trusted"]).toBe("Trusted");
    expect(labels["needsWork"]).toBe("Needs Attention");
    expect(labels["critical"]).toBe("Critical");
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
    expect(PR_BRAND_CONTRACT.logoAsset.fallback).toBe("QA Doctor");
  });
});

describe("validateBrandContract", () => {
  it("rejects contract with wrong productName", () => {
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      productName: "Wrong" as "QA Doctor",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("productName"),
    );
  });

  it("rejects contract with missing verdict label", () => {
    const { excellent: _removed, ...rest } = PR_BRAND_CONTRACT.verdictLabels;
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      verdictLabels: rest,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('verdictLabels missing key "excellent"'),
    );
  });

  it("rejects contract with missing verdict icon", () => {
    const { excellent: _removed, ...rest } = PR_BRAND_CONTRACT.verdictIcons;
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      verdictIcons: rest,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining('verdictIcons missing key "excellent"'),
    );
  });

  it("rejects contract with empty sectionOrder", () => {
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      sectionOrder: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("sectionOrder must be non-empty"),
    );
  });

  it("rejects contract with wrong productDescriptor", () => {
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      productDescriptor: "Wrong" as "Verification Trust",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("productDescriptor"),
    );
  });

  it("rejects contract with empty logoAsset.light", () => {
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      logoAsset: { ...PR_BRAND_CONTRACT.logoAsset, light: "" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("logoAsset.light"),
    );
  });

  it("rejects contract with empty logoAsset.dark", () => {
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      logoAsset: { ...PR_BRAND_CONTRACT.logoAsset, dark: "" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("logoAsset.dark"),
    );
  });

  it("rejects contract with wrong logoAsset.fallback", () => {
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      logoAsset: { ...PR_BRAND_CONTRACT.logoAsset, fallback: "Wrong" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("logoAsset.fallback"),
    );
  });

  it("rejects contract with wrong terminology", () => {
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      terminology: "wrong" as "trust-engine",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("terminology"),
    );
  });

  it("rejects contract with wrong footerFormat", () => {
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      footerFormat: "wrong" as "scanId + generatedBy",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.stringContaining("footerFormat"),
    );
  });

  it("collects multiple errors at once", () => {
    const result = validateBrandContract({
      ...PR_BRAND_CONTRACT,
      productName: "Wrong" as "QA Doctor",
      productDescriptor: "Wrong" as "Verification Trust",
      sectionOrder: [],
      terminology: "wrong" as "trust-engine",
      footerFormat: "wrong" as "scanId + generatedBy",
      logoAsset: { light: "", dark: "", fallback: "Wrong" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(6);
  });
});
