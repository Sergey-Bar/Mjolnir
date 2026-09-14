import { describe, expect, it } from "vitest";

import { parseAzurePipeline } from "../../../src/discovery/azure-pipeline-parser.js";

describe("azure-pipeline-parser branch coverage (line 141 — literalText boolean/number)", () => {
  it("handles boolean condition values (YAML 'true' parses as boolean)", () => {
    const yaml = `
steps:
  - script: npm test
    enabled: true
    continueOnError: false
`;
    const doc = parseAzurePipeline(yaml);
    expect(doc).toBeDefined();
    expect(doc?.steps).toBeDefined();
    if (doc?.steps?.[0]) {
      expect(doc.steps[0].enabled).toBeDefined();
    }
  });

  it("handles numeric values in step inputs", () => {
    const yaml = `
steps:
  - task: Npm@1
    inputs:
      command: test
    retryCountOnTaskFailure: 3
`;
    const doc = parseAzurePipeline(yaml);
    expect(doc).toBeDefined();
    expect(doc?.steps).toBeDefined();
    if (doc?.steps?.[0]) {
      expect(doc.steps[0].retryCountOnTaskFailure).toBe(3);
    }
  });

  it("handles stages → jobs → steps nested structure", () => {
    const yaml = `
stages:
  - stage: Build
    jobs:
      - job: Test
        steps:
          - script: npm test
`;
    const doc = parseAzurePipeline(yaml);
    expect(doc).toBeDefined();
    expect(doc?.platform).toBe("azure-pipelines");
    expect(doc?.stages).toBeDefined();
    expect(doc?.stages?.[0]?.jobs?.[0]?.steps).toBeDefined();
  });

  it("handles template steps", () => {
    const yaml = `
steps:
  - template: templates/test.yml
    parameters:
      name: unit
`;
    const doc = parseAzurePipeline(yaml);
    expect(doc).toBeDefined();
    expect(doc?.steps).toBeDefined();
    if (doc?.steps?.[0]) {
      expect(doc.steps[0].template).toBe("templates/test.yml");
    }
  });

  it("handles condition as string (not boolean)", () => {
    const yaml = `
steps:
  - script: npm test
    condition: always()
`;
    const doc = parseAzurePipeline(yaml);
    expect(doc).toBeDefined();
    if (doc?.steps?.[0]) {
      expect(doc.steps[0].condition).toBe("always()");
    }
  });

  it("handles condition as boolean false (literalText path)", () => {
    const yaml = `
steps:
  - script: npm test
    condition: false
`;
    const doc = parseAzurePipeline(yaml);
    expect(doc).toBeDefined();
    if (doc?.steps?.[0]) {
      expect(doc.steps[0].condition).toBe("false");
    }
  });

  it("handles non-object step in array (asRecord returns undefined)", () => {
    const yaml = `
steps:
  - null
  - script: npm test
`;
    const doc = parseAzurePipeline(yaml);
    expect(doc).toBeDefined();
  });

  it("handles invalid YAML gracefully", () => {
    expect(() => parseAzurePipeline("{[[[[")).toThrow();
  });
});
