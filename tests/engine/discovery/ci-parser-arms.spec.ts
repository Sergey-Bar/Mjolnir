/**
 * azure-pipeline-parser arms coverage — every shape the guarded YAML
 * walk must classify honestly: the stages/jobs/steps cascade, deployment
 * strategies and hooks, template/condition/literal arms, prototype-key
 * hostility, and the empty/hostile document outcomes.
 */

import { describe, expect, it } from "vitest";

import {
  isAzurePipelineFixture,
  parseAzurePipeline,
} from "../../../src/discovery/azure-pipeline-parser.js";

describe("parseAzurePipeline — document cascade", () => {
  it("an empty document is an honest empty doc (never fabricated content)", () => {
    expect(parseAzurePipeline("")).toEqual({ platform: "azure-pipelines" });
    expect(parseAzurePipeline("# only a comment\n")).toEqual({
      platform: "azure-pipelines",
    });
  });

  it("scalar and array roots throw the guarded root error (a mapping is required)", () => {
    // The shared guard throws with the platform label; parseAzurePipeline
    // lets that error surface (the adapter's catch converts it to a
    // counted parse-skip).
    expect(() => parseAzurePipeline("42")).toThrow(/root must be a mapping/);
    expect(() => parseAzurePipeline("- just\n- a\n- list\n")).toThrow(
      /root must be a mapping/,
    );
  });

  it("the stages cascade maps stages → jobs → steps", () => {
    const doc = parseAzurePipeline(
      [
        "stages:",
        "  - stage: Build",
        "    displayName: Build Stage",
        "    condition: succeeded()",
        "    template: build-template.yml",
        "    jobs:",
        "      - job: Compile",
        "        steps:",
        "          - script: npm run build",
        "      - deployment: Deploy",
        "        environment: prod",
        "        strategy:",
        "          runOnce:",
        "            deploy:",
        "              steps:",
        "                - script: npm test",
      ].join("\n"),
    );
    expect(doc.stages).toHaveLength(1);
    const stage = doc.stages?.[0];
    expect(stage?.name).toBe("Build");
    expect(stage?.condition).toBe("succeeded()");
    expect(stage?.template).toBe("build-template.yml");
    expect(stage?.jobs).toHaveLength(2);
    expect(stage?.jobs?.[0]?.kind).toBe("job");
    expect(stage?.jobs?.[0]?.steps?.[0]?.script).toBe("npm run build");
    expect(stage?.jobs?.[1]?.kind).toBe("deployment");
    expect(stage?.jobs?.[1]?.steps?.[0]?.script).toBe("npm test");
  });

  it("root-level jobs map through the job parser", () => {
    const doc = parseAzurePipeline(
      [
        "jobs:",
        "  - job: Test",
        "    displayName: Run Tests",
        "    continueOnError: true",
        "    template: test-template.yml",
        "    steps:",
        "          - task: Npm@1",
        "            displayName: Install",
        "            inputs:",
        "              command: test",
      ].join("\n"),
    );
    expect(doc.jobs).toHaveLength(1);
    const job = doc.jobs?.[0];
    expect(job?.name).toBe("Run Tests");
    expect(job?.continueOnError).toBe(true);
    expect(job?.template).toBe("test-template.yml");
    expect(job?.steps?.[0]?.task).toBe("Npm@1");
    expect(job?.steps?.[0]?.name).toBe("Install");
    expect(job?.steps?.[0]?.inputs).toEqual({ command: "test" });
  });

  it("root-level steps parse inline without jobs or stages", () => {
    const doc = parseAzurePipeline(
      "steps:\n  - script: npm test\n  - checkout: self\n",
    );
    expect(doc.steps).toHaveLength(2);
    expect(doc.steps?.[0]?.script).toBe("npm test");
    // checkout/download carry no command text the rules consume.
    expect(doc.steps?.[1]?.script).toBeUndefined();
  });
});

describe("parseAzurePipeline — step field arms", () => {
  it("template steps carry their template reference", () => {
    const doc = parseAzurePipeline("steps:\n  - template: ci/build.yml\n");
    expect(doc.steps?.[0]?.template).toBe("ci/build.yml");
  });

  it("conditions may parse as YAML booleans or numbers — the literal text survives", () => {
    const doc = parseAzurePipeline(
      [
        "steps:",
        "  - script: npm test",
        "    condition: true",
        "  - script: npm run e2e",
        "    condition: 0",
      ].join("\n"),
    );
    expect(doc.steps?.[0]?.condition).toBe("true");
    expect(doc.steps?.[1]?.condition).toBe("0");
  });

  it("retryCountOnTaskFailure accepts numbers and strings", () => {
    const doc = parseAzurePipeline(
      [
        "steps:",
        "  - script: npm test",
        "    retryCountOnTaskFailure: 2",
        "  - script: npm run e2e",
        "    retryCountOnTaskFailure: '3'",
      ].join("\n"),
    );
    expect(doc.steps?.[0]?.retryCountOnTaskFailure).toBe(2);
    expect(doc.steps?.[1]?.retryCountOnTaskFailure).toBe("3");
  });

  it("enabled accepts booleans and strings", () => {
    const doc = parseAzurePipeline(
      [
        "steps:",
        "  - script: npm test",
        "    enabled: false",
        "  - script: npm run e2e",
        "    enabled: 'true'",
      ].join("\n"),
    );
    expect(doc.steps?.[0]?.enabled).toBe(false);
    expect(doc.steps?.[1]?.enabled).toBe("true");
  });

  it("non-mapping step entries degrade to empty steps (filtered shapes stay honest)", () => {
    const doc = parseAzurePipeline("steps:\n  - 42\n  - just a string\n");
    expect(doc.steps).toHaveLength(2);
    expect(doc.steps?.[0]).toEqual({});
    expect(doc.steps?.[1]).toEqual({});
  });

  it("a job entry whose kind value is not a string is dropped", () => {
    const doc = parseAzurePipeline("jobs:\n  - job: [1, 2]\n");
    expect(doc.jobs).toEqual([]);
  });

  it("a stage entry whose stage value is not a string is dropped", () => {
    const doc = parseAzurePipeline(
      "stages:\n  - stage: nope\n  - stage: [x]\n",
    );
    expect(doc.stages).toHaveLength(1);
  });

  it("prototype-class keys are skipped, never followed (hostile documents)", () => {
    // `constructor`/`prototype` ARE expressible as own YAML keys; the
    // ciGet walk must skip them when looking for the real keys.
    const doc = parseAzurePipeline(
      [
        "steps:",
        "  - constructor: evil",
        "    prototype: also-evil",
        "    script: npm test",
        "    inputs:",
        "      constructor: evil-input",
        "      command: test",
      ].join("\n"),
    );
    const step = doc.steps?.[0];
    expect(step?.script).toBe("npm test");
    expect(step?.inputs).toEqual({ command: "test" });
  });
});

describe("parseAzurePipeline — deployment strategy arms", () => {
  it("all three strategy modes and all three hooks contribute steps", () => {
    const doc = parseAzurePipeline(
      [
        "jobs:",
        "  - deployment: Ship",
        "    condition: succeeded()",
        "    continueOnError: true",
        "    strategy:",
        "      runOnce:",
        "        deploy:",
        "          steps:",
        "            - script: a",
        "      rolling:",
        "        deploy:",
        "          steps:",
        "            - script: b",
        "      canary:",
        "        onSuccess:",
        "          steps:",
        "            - script: c",
        "        onFailure:",
        "          steps:",
        "            - script: d",
      ].join("\n"),
    );
    const job = doc.jobs?.[0];
    expect(job?.kind).toBe("deployment");
    expect(job?.condition).toBe("succeeded()");
    expect(job?.continueOnError).toBe(true);
    const scripts = (job?.steps ?? []).map((s) => s.script);
    // Hook iteration order is the contract: deploy → onFailure → onSuccess
    // per strategy mode (runOnce → rolling → canary).
    expect(scripts).toEqual(["a", "b", "d", "c"]);
  });

  it("a deployment strategy with hook-less modes contributes no steps", () => {
    const doc = parseAzurePipeline(
      "jobs:\n  - deployment: Ship\n    strategy:\n      runOnce: {}\n",
    );
    expect(doc.jobs?.[0]?.steps).toEqual([]);
  });
});

describe("isAzurePipelineFixture", () => {
  it("matches the platform's default filenames on any path spelling", () => {
    expect(isAzurePipelineFixture("azure-pipelines.yml")).toBe(true);
    expect(isAzurePipelineFixture("sub/dir/azure-pipelines.yaml")).toBe(true);
    expect(isAzurePipelineFixture("sub\\dir\\azure-pipelines.yml")).toBe(true);
    expect(isAzurePipelineFixture("ci.yml")).toBe(false);
    expect(isAzurePipelineFixture("azure-pipelines.yml.bak")).toBe(false);
  });
});
