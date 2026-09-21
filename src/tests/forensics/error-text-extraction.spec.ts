import { describe, expect, it } from "vitest";
import { parseJestJson } from "../../src/forensics/parse-jest-json.js";
import { parseJunitXml } from "../../src/forensics/parse-junit.js";
import { parsePlaywrightJson } from "../../src/forensics/parse-playwright-json.js";
import { parseVitestJson } from "../../src/forensics/parse-vitest-json.js";
import { traceActionsToRecord } from "../../src/forensics/trace.js";

describe("error text extraction", () => {
  describe("Jest JSON parser", () => {
    it("extracts failureMessages into errors[]", () => {
      const json = {
        testResults: [
          {
            testFilePath: "/tests/example.test.js",
            testResults: [
              {
                title: "should work",
                status: "failed",
                duration: 100,
                location: { line: 5 },
                failureMessages: ["AssertionError: expected 1 to be 2"],
              },
            ],
          },
        ],
      };
      const records = parseJestJson(json);
      expect(records).toHaveLength(1);
      expect(records[0]?.errors).toEqual([
        "AssertionError: expected 1 to be 2",
      ]);
    });

    it("extracts failureDetails objects into errors[]", () => {
      const json = {
        testResults: [
          {
            testFilePath: "/tests/example.test.js",
            testResults: [
              {
                title: "should work",
                status: "failed",
                duration: 100,
                failureDetails: [{ message: "Expected: 1\nReceived: 2" }],
              },
            ],
          },
        ],
      };
      const records = parseJestJson(json);
      expect(records[0]?.errors).toEqual(["Expected: 1\nReceived: 2"]);
    });

    it("sanitizes secrets in error text", () => {
      const json = {
        testResults: [
          {
            testFilePath: "/tests/example.test.js",
            testResults: [
              {
                title: "should work",
                status: "failed",
                duration: 100,
                failureMessages: ["Auth failed with AKIAIOSFODNN7EXAMPLE"],
              },
            ],
          },
        ],
      };
      const records = parseJestJson(json);
      expect(records[0]?.errors?.[0]).toContain("[REDACTED:aws-key]");
      expect(records[0]?.errors?.[0]).not.toContain("AKIAIOSFODNN7EXAMPLE");
    });

    it("omits errors when no failures present", () => {
      const json = {
        testResults: [
          {
            testFilePath: "/tests/example.test.js",
            testResults: [
              {
                title: "should pass",
                status: "passed",
                duration: 50,
              },
            ],
          },
        ],
      };
      const records = parseJestJson(json);
      expect(records[0]?.errors).toBeUndefined();
    });

    it("handles missing failureMessages and failureDetails", () => {
      const json = {
        testResults: [
          {
            testFilePath: "/tests/example.test.js",
            testResults: [
              {
                title: "failed test",
                status: "failed",
                duration: 50,
              },
            ],
          },
        ],
      };
      const records = parseJestJson(json);
      expect(records[0]?.errors).toBeUndefined();
    });
  });

  describe("JUnit XML parser", () => {
    it("extracts failure message and body", () => {
      const xml = `<?xml version="1.0"?>
<testsuite tests="1">
  <testcase classname="Example" name="should work" time="0.5">
    <failure message="Expected 1 got 2">stacktrace line 1
stacktrace line 2</failure>
  </testcase>
</testsuite>`;
      const records = parseJunitXml(xml);
      expect(records).toHaveLength(1);
      expect(records[0]?.errors).toBeDefined();
      expect(records[0]?.errors?.length).toBeGreaterThanOrEqual(1);
      expect(
        records[0]?.errors?.some((e) => e.includes("Expected 1 got 2")),
      ).toBe(true);
    });

    it("extracts error tags", () => {
      const xml = `<?xml version="1.0"?>
<testsuite tests="1">
  <testcase classname="Example" name="should error" time="0.1">
    <error message="NullPointerException">at com.example.Foo.bar</error>
  </testcase>
</testsuite>`;
      const records = parseJunitXml(xml);
      expect(records[0]?.errors).toBeDefined();
      expect(
        records[0]?.errors?.some((e) => e.includes("NullPointerException")),
      ).toBe(true);
    });

    it("sanitizes secrets in JUnit error text", () => {
      const xml = `<?xml version="1.0"?>
<testsuite tests="1">
  <testcase classname="Example" name="test" time="0.1">
    <failure message="Auth with AKIAIOSFODNN7EXAMPLE failed"/>
  </testcase>
</testsuite>`;
      const records = parseJunitXml(xml);
      expect(records[0]?.errors).toBeDefined();
      expect(records[0]?.errors?.[0]).toContain("[REDACTED:aws-key]");
    });

    it("omits errors for passing tests", () => {
      const xml = `<?xml version="1.0"?>
<testsuite tests="1">
  <testcase classname="Example" name="test" time="0.1"/>
</testsuite>`;
      const records = parseJunitXml(xml);
      expect(records[0]?.errors).toBeUndefined();
    });

    it("handles multiple failure elements", () => {
      const xml = `<?xml version="1.0"?>
<testsuite tests="1">
  <testcase classname="Example" name="test" time="0.1">
    <failure message="First error">body1</failure>
    <error message="Second error">body2</error>
  </testcase>
</testsuite>`;
      const records = parseJunitXml(xml);
      expect(records[0]?.errors?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Playwright JSON parser", () => {
    it("extracts error from result.error", () => {
      const json = {
        suites: [
          {
            specs: [
              {
                title: "should work",
                file: "tests/example.spec.ts",
                line: 10,
                tests: [
                  {
                    results: [
                      {
                        status: "failed",
                        duration: 500,
                        error: { message: "Element not found" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const records = parsePlaywrightJson(json);
      expect(records[0]?.errors).toEqual(["Element not found"]);
    });

    it("extracts errors from result.errors array", () => {
      const json = {
        suites: [
          {
            specs: [
              {
                title: "should work",
                file: "tests/example.spec.ts",
                line: 10,
                tests: [
                  {
                    results: [
                      {
                        status: "failed",
                        duration: 500,
                        errors: [
                          { message: "First error" },
                          { message: "Second error" },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const records = parsePlaywrightJson(json);
      expect(records[0]?.errors).toEqual(["First error", "Second error"]);
    });

    it("extracts string errors from result.errors", () => {
      const json = {
        suites: [
          {
            specs: [
              {
                title: "test",
                file: "tests/example.spec.ts",
                tests: [
                  {
                    results: [
                      {
                        status: "failed",
                        duration: 100,
                        errors: ["raw string error"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const records = parsePlaywrightJson(json);
      expect(records[0]?.errors).toEqual(["raw string error"]);
    });

    it("sanitizes secrets in Playwright error text", () => {
      const json = {
        suites: [
          {
            specs: [
              {
                title: "test",
                file: "tests/example.spec.ts",
                tests: [
                  {
                    results: [
                      {
                        status: "failed",
                        duration: 100,
                        error: {
                          message:
                            "Token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij invalid",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const records = parsePlaywrightJson(json);
      expect(records[0]?.errors?.[0]).toContain("[REDACTED:github-token]");
    });

    it("omits errors for passing tests", () => {
      const json = {
        suites: [
          {
            specs: [
              {
                title: "test",
                file: "tests/example.spec.ts",
                tests: [
                  {
                    results: [{ status: "passed", duration: 100 }],
                  },
                ],
              },
            ],
          },
        ],
      };
      const records = parsePlaywrightJson(json);
      expect(records[0]?.errors).toBeUndefined();
    });
  });

  describe("Vitest JSON parser", () => {
    it("extracts failureMessages into errors[]", () => {
      const json = {
        testResults: [
          {
            filepath: "/tests/example.test.ts",
            assertionResults: [
              {
                title: "should work",
                status: "failed",
                duration: 100,
                location: { line: 5 },
                failureMessages: ["AssertionError: expected 1 to be 2"],
              },
            ],
          },
        ],
      };
      const records = parseVitestJson(json);
      expect(records).toHaveLength(1);
      expect(records[0]?.errors).toEqual([
        "AssertionError: expected 1 to be 2",
      ]);
    });

    it("extracts failureDetails objects into errors[]", () => {
      const json = {
        testResults: [
          {
            filepath: "/tests/example.test.ts",
            assertionResults: [
              {
                title: "should work",
                status: "failed",
                duration: 100,
                failureDetails: [{ message: "Expected: 1\nReceived: 2" }],
              },
            ],
          },
        ],
      };
      const records = parseVitestJson(json);
      expect(records[0]?.errors).toEqual(["Expected: 1\nReceived: 2"]);
    });

    it("sanitizes secrets in Vitest error text", () => {
      const json = {
        testResults: [
          {
            filepath: "/tests/example.test.ts",
            assertionResults: [
              {
                title: "should work",
                status: "failed",
                duration: 100,
                failureMessages: ["Bearer sk-abc123def456ghi789 failed auth"],
              },
            ],
          },
        ],
      };
      const records = parseVitestJson(json);
      expect(records[0]?.errors?.[0]).toContain("[REDACTED:bearer-token]");
    });

    it("omits errors when no failures present", () => {
      const json = {
        testResults: [
          {
            filepath: "/tests/example.test.ts",
            assertionResults: [
              {
                title: "should pass",
                status: "passed",
                duration: 50,
              },
            ],
          },
        ],
      };
      const records = parseVitestJson(json);
      expect(records[0]?.errors).toBeUndefined();
    });

    it("handles missing failureMessages and failureDetails", () => {
      const json = {
        testResults: [
          {
            filepath: "/tests/example.test.ts",
            assertionResults: [
              {
                title: "failed test",
                status: "failed",
                duration: 50,
              },
            ],
          },
        ],
      };
      const records = parseVitestJson(json);
      expect(records[0]?.errors).toBeUndefined();
    });
  });

  describe("trace parser", () => {
    it("extracts error messages from trace actions", () => {
      const actions = [
        {
          apiName: "page.goto",
          durationMs: 100,
          error: { message: "Timeout exceeded" },
        },
      ];
      const record = traceActionsToRecord(actions, "trace.zip");
      expect(record).toBeDefined();
      expect(record?.errors).toEqual(["Timeout exceeded"]);
    });

    it("sanitizes secrets in trace error text", () => {
      const actions = [
        {
          apiName: "page.goto",
          durationMs: 100,
          error: { message: "Token AKIAIOSFODNN7EXAMPLE expired" },
        },
      ];
      const record = traceActionsToRecord(actions, "trace.zip");
      expect(record?.errors?.[0]).toContain("[REDACTED:aws-key]");
    });

    it("returns no errors for passing traces", () => {
      const actions = [{ apiName: "page.goto", durationMs: 100 }];
      const record = traceActionsToRecord(actions, "trace.zip");
      expect(record).toBeDefined();
      expect(record?.errors).toBeUndefined();
    });

    it("collects errors from multiple failing actions", () => {
      const actions = [
        {
          apiName: "click",
          durationMs: 50,
          error: { message: "Element not found" },
        },
        {
          apiName: "fill",
          durationMs: 30,
          error: { message: "Input disabled" },
        },
      ];
      const record = traceActionsToRecord(actions, "trace.zip");
      expect(record?.errors).toEqual(["Element not found", "Input disabled"]);
    });
  });
});
