import {
  mkdtempSync,
  mkdirSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ciInstall } from "../../src/integrations/ci-install.js";
import { runForensics } from "../../src/forensics/run.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-int-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("ciInstall", () => {
  it("creates workflow dir and writes advisory template", () => {
    const res = ciInstall(dir);
    expect(res.existed).toBe(false);
    expect(existsSync(res.written)).toBe(true);
    const text = readFileSync(res.written, "utf8");
    expect(text).toContain("name: Mjölnir");
    expect(text).toContain(
      "Advisory mode — findings reported, never blocking.",
    );
    expect(text).not.toMatch(/\$\{gate\}/); // no raw interpolation leaks
  });

  it("reports existed=true on re-install and overwrites", () => {
    ciInstall(dir, "advisory");
    const res = ciInstall(dir, "error");
    expect(res.existed).toBe(true);
    expect(res.refused).toBe(false);
    const text = readFileSync(res.written, "utf8");
    expect(text).toContain("Gate (error)");
    // the enforcing gate reads the scan result and exits non-zero on errors
    expect(text).toContain('readFileSync("mjolnir.json"');
    expect(text).toContain("process.exit(1)");
  });

  it("renders warning gate", () => {
    const res = ciInstall(dir, "warning");
    expect(readFileSync(res.written, "utf8")).toContain("Gate (warning)");
  });
});

const PW_JSON = JSON.stringify({
  config: {},
  suites: [
    {
      title: "root",
      specs: [
        {
          ok: false,
          tests: [
            {
              timeout: 5000,
              annotations: [],
              expectedStatus: "passed",
              results: [
                {
                  status: "flaky",
                  startTime: "2026-08-24T10:00:00Z",
                  duration: 120,
                  errors: [],
                },
                {
                  status: "passed",
                  startTime: "2026-08-24T10:01:00Z",
                  duration: 100,
                  errors: [],
                },
              ],
              projectName: "chromium",
            },
          ],
          file: "a.spec.ts",
          line: 4,
          column: 1,
          title: "logs in",
        },
      ],
    },
  ],
});

describe("runForensics", () => {
  it("parses a single Playwright JSON report file", () => {
    const f = join(dir, "report.json");
    writeFileSync(f, PW_JSON);
    const { report } = runForensics(f, { writeFlakyMd: false });
    expect(report.source).toBe("playwright-json");
    expect(report.totalTests).toBeGreaterThan(0);
  });

  it("parses a single JUnit XML file", () => {
    const f = join(dir, "junit.xml");
    writeFileSync(
      f,
      `<?xml version="1.0"?><testsuite name="s" tests="2" failures="0" errors="0">
        <testcase name="t1" classname="C" time="0.1"/>
        <testcase name="t2" classname="C" time="0.2"/>
      </testsuite>`,
    );
    const { report } = runForensics(f, { writeFlakyMd: false });
    expect(report.source).toBe("junit-xml");
  });

  it("scans a directory for reports and writes FLAKY.md", () => {
    mkdirSync(join(dir, "sub"), { recursive: true });
    writeFileSync(join(dir, "sub", "report.json"), PW_JSON);
    const { report, flakyMdPath } = runForensics(dir);
    expect(report.totalTests).toBeGreaterThan(0);
    expect(flakyMdPath).toBeDefined();
    expect(existsSync(flakyMdPath as string)).toBe(true);
  });

  it("skips unreadable/unrecognized files in directory mode", () => {
    writeFileSync(join(dir, "junk.json"), "{ not json at all");
    const { report, flakyMdPath } = runForensics(dir);
    expect(report.totalTests).toBe(0);
    // No FLAKY.md when there are no tests.
    expect(flakyMdPath).toBeUndefined();
  });

  it("ignores node_modules while walking directories", () => {
    mkdirSync(join(dir, "node_modules"), { recursive: true });
    writeFileSync(join(dir, "node_modules", "report.json"), PW_JSON);
    const { report } = runForensics(dir, { writeFlakyMd: false });
    expect(report.totalTests).toBe(0);
  });

  it("handles empty directory gracefully", () => {
    const { report, output } = runForensics(dir, { writeFlakyMd: false });
    expect(report.totalTests).toBe(0);
    expect(output).toContain("FLAKY.md");
  });
});
