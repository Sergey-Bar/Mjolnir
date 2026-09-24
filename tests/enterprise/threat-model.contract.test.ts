import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type ThreatModel = {
  schemaVersion: number;
  modelId: string;
  scenarios: Array<Record<string, unknown>>;
  legalConclusions?: unknown[];
};
type DataFlows = {
  schemaVersion: number;
  flows: Array<Record<string, unknown>>;
};

const root = join(import.meta.dirname, "..", "..");
const validator = join(
  root,
  "scripts",
  "enterprise",
  "validate-threat-model.mjs",
);
const model = JSON.parse(
  readFileSync(join(root, "enterprise", "threat-model.json"), "utf8"),
) as ThreatModel;
const flows = JSON.parse(
  readFileSync(join(root, "enterprise", "data-flows.json"), "utf8"),
) as DataFlows;

function run(modelValue: unknown, flowValue: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-threat-model-"));
  try {
    const modelPath = join(dir, "model.json");
    const flowPath = join(dir, "flows.json");
    writeFileSync(modelPath, JSON.stringify(modelValue), "utf8");
    writeFileSync(flowPath, JSON.stringify(flowValue), "utf8");
    return execFileSync(
      process.execPath,
      [validator, "--model", modelPath, "--data-flow", flowPath, "--strict"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("enterprise threat model contract", () => {
  it("validates the checked-in model and all required data-flow classes", () => {
    expect(run(model, flows)).toContain('"status":"PASS"');
  });

  it("rejects a high-risk scenario without an owner", () => {
    const invalid = structuredClone(model);
    const scenario = invalid.scenarios[0];
    if (scenario === undefined) throw new Error("missing scenario");
    delete scenario.owner;
    expect(() => run(invalid, flows)).toThrow();
  });

  it("rejects source upload without explicit consent", () => {
    const invalid = structuredClone(flows);
    const flow = invalid.flows.find(
      (value) => value["id"] === "hosted-ai-review",
    );
    if (flow === undefined) throw new Error("missing hosted flow");
    flow["consent"] = "not-required";
    expect(() => run(model, invalid)).toThrow();
  });

  it("rejects a flow missing failure behavior", () => {
    const invalid = structuredClone(flows);
    const flow = invalid.flows[0];
    if (flow === undefined) throw new Error("missing flow");
    delete flow["failureBehavior"];
    expect(() => run(model, invalid)).toThrow();
  });
});
