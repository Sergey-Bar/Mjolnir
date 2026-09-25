import { describe, expect, it } from "vitest";
import { SCAN_ADAPTERS } from "../../src/discovery/scan-adapters.js";
import { FRAMEWORK_INVENTORY } from "../../src/frameworks/framework-inventory.js";

const EXPECTED_EXECUTOR_ADAPTER_IDS = {
  playwright: ["typescript"],
  jest: ["typescript"],
  vitest: ["typescript"],
  pytest: ["python"],
  junit: ["java"],
  nunit: ["csharp"],
  xunit: ["csharp"],
  cypress: ["typescript"],
  selenium: ["typescript", "python", "java"],
  testng: ["java"],
  "github-actions": ["github-actions"],
  "azure-devops": ["azure-pipelines"],
  jenkins: ["jenkins"],
  "gitlab-ci": [],
} as const;

describe("framework capability envelope", () => {
  it("binds every inventory row only to executable scan adapters", () => {
    const registeredAdapterIds = new Set(
      SCAN_ADAPTERS.map((adapter) => adapter.id),
    );

    expect(
      Object.fromEntries(
        FRAMEWORK_INVENTORY.map((framework) => [
          framework.frameworkId,
          framework.executorAdapterIds,
        ]),
      ),
    ).toEqual(EXPECTED_EXECUTOR_ADAPTER_IDS);

    for (const framework of FRAMEWORK_INVENTORY) {
      for (const adapterId of framework.executorAdapterIds) {
        expect(registeredAdapterIds).toContain(adapterId);
      }
    }
  });
});
