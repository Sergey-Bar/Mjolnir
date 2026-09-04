import { describe, expect, it } from "vitest";
import {
  YamlParseError,
  parseWorkflow,
} from "../../../src/discovery/workflow-parser.js";

describe("parseWorkflow", () => {
  it("parses a valid workflow with jobs and steps", () => {
    const doc = parseWorkflow(`
on: push
jobs:
  test:
    continue-on-error: true
    steps:
      - name: Run tests
        run: npm test
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - run: echo hi
        continue-on-error: "true"
`);
    const job = doc.jobs?.test;
    expect(job?.["continue-on-error"]).toBe(true);
    expect(job?.steps).toHaveLength(3);
    expect(job?.steps?.[0]).toEqual({ name: "Run tests", run: "npm test" });
    expect(job?.steps?.[1]?.uses).toBe("actions/checkout@v4");
    expect(job?.steps?.[1]?.with).toEqual({ "fetch-depth": 0 });
    expect(job?.steps?.[2]?.["continue-on-error"]).toBe("true");
  });

  it("returns empty doc for empty input", () => {
    expect(parseWorkflow("")).toEqual({});
  });

  it("returns empty doc when jobs missing", () => {
    expect(parseWorkflow("name: ci\n")).toEqual({});
  });

  it("throws on invalid YAML", () => {
    expect(() => parseWorkflow("foo: [unclosed")).toThrow(YamlParseError);
  });

  it("throws on scalar root document", () => {
    expect(() => parseWorkflow("just-a-string")).toThrow(
      /root must be a mapping/,
    );
  });

  it("treats null root as empty doc", () => {
    expect(parseWorkflow("~")).toEqual({});
  });

  it("throws when jobs is an array or scalar", () => {
    expect(() => parseWorkflow("jobs: [a, b]")).toThrow(/jobs.*mapping/);
    expect(() => parseWorkflow("jobs: 5")).toThrow(/jobs.*mapping/);
  });

  it("skips non-object job values", () => {
    const doc = parseWorkflow("jobs:\n  bad: 5\n");
    expect(doc.jobs?.bad).toBeUndefined();
  });

  it("skips non-object steps entries", () => {
    const doc = parseWorkflow(
      "jobs:\n  j:\n    steps:\n      - 5\n      - hello\n",
    );
    expect(doc.jobs?.j?.steps).toEqual([{}, {}]);
  });

  it("rejects alias bombs beyond the limit", () => {
    // Anchors defined first so yaml parses; the textual alias guard then fires.
    const anchors = Array.from(
      { length: 60 },
      (_, i) => `a${i}: &x${i} v`,
    ).join("\n");
    const aliases = Array.from({ length: 60 }, (_, i) => `k${i}: *x${i}`).join(
      "\n",
    );
    expect(() => parseWorkflow(`${anchors}\njobs:\n${aliases}`)).toThrow(
      /alias count/,
    );
  });

  it("accepts workflows within alias limits", () => {
    const ok = parseWorkflow("jobs:\n  j: &base\n    steps: []\n  k: *base\n");
    expect(ok.jobs?.k).toBeDefined();
  });
});
