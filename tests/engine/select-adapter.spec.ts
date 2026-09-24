import { describe, expect, it } from "vitest";
import { selectAdapter } from "../../src/engine/scan-pipeline.js";

describe("adapter selection", () => {
  it("selects each shipped workflow and language adapter", () => {
    expect(selectAdapter(".github/workflows/ci.yml").id).toBe("github-actions");
    expect(selectAdapter("azure-pipelines.yml").id).toBe("azure-pipelines");
    expect(selectAdapter("Jenkinsfile").id).toBe("jenkins");
    expect(selectAdapter("tests/test_foo.py").id).toBe("python");
    expect(selectAdapter("FooTest.java").id).toBe("java");
    expect(selectAdapter("FooTest.cs").id).toBe("csharp");
    expect(selectAdapter("src/foo.ts").id).toBe("typescript");
  });
});
