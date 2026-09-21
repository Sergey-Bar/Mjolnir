/**
 * Forensics tests (R4): parsing, retry forensics, leaderboard, FLAKY.md.
 */

import { describe, expect, it } from "vitest";
import { parseJunitXml } from "../../src/forensics/parse-junit.js";
import { parsePlaywrightJson } from "../../src/forensics/parse-playwright-json.js";
import {
  analyze,
  leaderboard,
  renderFlakyMd,
  renderLeaderboard,
} from "../../src/forensics/analyze.js";

describe("parseJunitXml", () => {
  it("parses pass/fail/skip testcases", () => {
    const xml = `<?xml version="1.0"?>
<testsuite tests="3" failures="1" skipped="1">
  <testcase classname="tests/test_a.py" name="test_ok" time="0.100"/>
  <testcase classname="tests/test_a.py" name="test_bad" time="1.5">
    <failure message="assert 1 == 2">boom</failure>
  </testcase>
  <testcase classname="tests/test_b.py" name="test_skip" time="0">
    <skipped type="pytest.skip" message="wip"/>
  </testcase>
</testsuite>`;
    const recs = parseJunitXml(xml);
    expect(recs).toHaveLength(3);
    expect(recs[0]?.attempts[0]?.status).toBe("passed");
    expect(recs[1]?.attempts[0]?.status).toBe("failed");
    expect(recs[2]?.attempts[0]?.status).toBe("skipped");
    expect(recs[1]?.attempts[0]?.durationMs).toBe(1500);
  });

  it("decodes entities in names", () => {
    const recs = parseJunitXml(
      `<testsuite><testcase name="a &amp; b &lt;x&gt;" classname="c"/></testsuite>`,
    );
    expect(recs[0]?.title).toBe("a & b <x>");
  });

  it("keeps title and classname distinct on classname-first (pytest) fixtures (bug-audit H3)", () => {
    // The repo's own fixture above is classname-first, but it only ever
    // asserted statuses/durations — with the unanchored `name` regex,
    // `classname="tests/test_a.py" name="test_ok"` matched the tail of
    // classname, so every title silently became the classname.
    const xml = `<testsuite tests="1">
  <testcase classname="tests/test_a.py" name="test_ok" time="0.100"/>
</testsuite>`;
    const recs = parseJunitXml(xml);
    expect(recs[0]?.title).toBe("test_ok");
    expect(recs[0]?.file).toBe("tests/test_a.py");
  });

  it("does not treat data-name-style lookalike attributes as name (H3 hardening)", () => {
    const recs = parseJunitXml(
      `<testsuite><testcase data-name="decoy" name="real" classname="c"/></testsuite>`,
    );
    expect(recs[0]?.title).toBe("real");
  });

  it("returns empty on garbage", () => {
    expect(parseJunitXml("not xml at all")).toHaveLength(0);
  });
});

describe("parsePlaywrightJson", () => {
  it("walks nested suites and collects attempts", () => {
    const report = {
      suites: [
        {
          suites: [
            {
              specs: [
                {
                  title: "login works",
                  file: "tests/login.spec.ts",
                  tests: [
                    {
                      results: [
                        { status: "failed", duration: 900 },
                        { status: "passed", duration: 1100 },
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
    const recs = parsePlaywrightJson(report);
    expect(recs).toHaveLength(1);
    expect(recs[0]?.attempts).toHaveLength(2);
    expect(recs[0]?.file).toBe("tests/login.spec.ts");
  });

  it("returns empty for malformed input", () => {
    expect(parsePlaywrightJson(null)).toHaveLength(0);
    expect(parsePlaywrightJson({})).toHaveLength(0);
  });
});

describe("analyze — retry forensics", () => {
  it("flags passed-on-retry as TRUE-FLAKE", () => {
    const report = analyze(
      [
        {
          file: "a.spec.ts",
          title: "flaky",
          attempts: [
            { index: 1, status: "failed", durationMs: 500 },
            { index: 2, status: "passed", durationMs: 600 },
          ],
        },
        {
          file: "b.spec.ts",
          title: "solid",
          attempts: [{ index: 1, status: "passed", durationMs: 100 }],
        },
      ],
      "playwright-json",
    );
    expect(report.totalTests).toBe(2);
    expect(report.flakyTests).toBe(1);
    expect(report.retriedTests).toBe(1);
    const flaky = report.verdicts.find((v) => v.title === "flaky");
    expect(flaky?.passedOnRetry).toBe(true);
  });

  it("does not flag first-attempt passes", () => {
    const report = analyze(
      [
        {
          file: "a.spec.ts",
          title: "clean",
          attempts: [{ index: 1, status: "passed", durationMs: 50 }],
        },
      ],
      "junit-xml",
    );
    expect(report.flakyTests).toBe(0);
  });
});

describe("rendering", () => {
  it("leaderboard puts true flakes first", () => {
    const report = analyze(
      [
        {
          file: "slow.spec.ts",
          title: "slow but failing",
          attempts: [{ index: 1, status: "failed", durationMs: 10_000 }],
        },
        {
          file: "lucky.spec.ts",
          title: "lucky",
          attempts: [
            { index: 1, status: "failed", durationMs: 100 },
            { index: 2, status: "passed", durationMs: 100 },
          ],
        },
      ],
      "playwright-json",
    );
    const top = leaderboard(report);
    expect(top[0]?.title).toBe("lucky");
    const text = renderLeaderboard(report);
    expect(text).toContain("TRUE-FLAKE");
    expect(text).toContain("FLAKINESS LEADERBOARD");
  });

  it("FLAKY.md contains the artifact header and table", () => {
    const report = analyze(
      [
        {
          file: "lucky.spec.ts",
          title: "lucky",
          attempts: [
            { index: 1, status: "failed", durationMs: 100 },
            { index: 2, status: "passed", durationMs: 100 },
          ],
        },
      ],
      "playwright-json",
    );
    const md = renderFlakyMd(report);
    expect(md.startsWith("# FLAKY.md")).toBe(true);
    expect(md).toContain("TRUE-FLAKE");
    expect(md).toContain("`lucky.spec.ts`");
  });

  it("empty run renders honest empty state", () => {
    const text = renderLeaderboard(analyze([], "junit-xml"));
    expect(text).toContain("No failures or retries found");
  });
});
