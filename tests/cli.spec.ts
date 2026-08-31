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
import {
  main,
  parseArgs,
  runCiInstall,
  runDoctorPlaywright,
  runForensicsCommand,
  runScanCommand,
  runSuppressions,
} from "../src/cli.js";

describe("parseArgs", () => {
  it("applies defaults", () => {
    expect(parseArgs([])).toMatchObject({
      target: ".",
      json: false,
      verbose: false,
      format: "terminal",
      scopeChanged: false,
    });
  });

  it("parses target and flags", () => {
    expect(parseArgs(["src", "--verbose", "--json"])).toMatchObject({
      target: "src",
      verbose: true,
      json: true,
      format: "json",
    });
  });

  it("parses --format variants", () => {
    expect(parseArgs(["--format", "sarif"])?.format).toBe("sarif");
    expect(parseArgs(["--format", "json"])?.json).toBe(true);
    expect(parseArgs(["--format", "terminal"])?.format).toBe("terminal");
  });

  it("rejects unknown format", () => {
    expect(parseArgs(["--format", "xml"])).toBeNull();
  });

  it("parses --scope changed and rejects unknown scope", () => {
    expect(parseArgs(["--scope", "changed"])?.scopeChanged).toBe(true);
    expect(parseArgs(["--scope", "all"])).toBeNull();
  });

  it("parses --max-duration in seconds", () => {
    const args = parseArgs(["--max-duration", "5"]);
    expect(args?.maxDurationMs).toBe(5000);
    expect(parseArgs(["--max-duration", "0"])).toBeNull();
    expect(parseArgs(["--max-duration", "abc"])).toBeNull();
  });

  it("treats --help as usage error path (null)", () => {
    expect(parseArgs(["--help"])).toBeNull();
    expect(parseArgs(["-h"])).toBeNull();
  });

  it("rejects unknown flags", () => {
    expect(parseArgs(["--nope"])).toBeNull();
  });
});

function capture() {
  const out: string[] = [];
  const errOut: string[] = [];
  return {
    out: (...parts: unknown[]) => out.push(parts.map(String).join(" ")),
    err: (...parts: unknown[]) => errOut.push(parts.map(String).join(" ")),
    io: {
      out: (...parts: unknown[]) => out.push(parts.map(String).join(" ")),
      err: (...parts: unknown[]) => errOut.push(parts.map(String).join(" ")),
    },
    text: () => out.join("\n"),
    errText: () => errOut.join("\n"),
  };
}

let dir: string;
let origCwd: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-cli-"));
  origCwd = process.cwd();
});
afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

describe("runCiInstall", () => {
  it("writes workflow and reports creation", () => {
    process.chdir(dir);
    const cap = capture();
    const code = runCiInstall([], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("Created");
    expect(existsSync(join(dir, ".github", "workflows", "mjolnir.yml"))).toBe(
      true,
    );
  });

  it("reports update on second run", () => {
    process.chdir(dir);
    runCiInstall([]);
    const cap = capture();
    expect(runCiInstall([], cap.io)).toBe(0);
    expect(cap.text()).toContain("Updated");
  });

  it("rejects invalid gate with exit 10", () => {
    const cap = capture();
    expect(runCiInstall(["--gate", "yolo"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("Unknown gate level");
  });

  it("rejects a dangling --gate with exit 10 instead of silently degrading to advisory (bug-audit L11)", () => {
    const cap = capture();
    expect(runCiInstall(["--gate"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("--gate requires a value");
  });

  it("rejects unknown arguments with exit 10", () => {
    const cap = capture();
    expect(runCiInstall(["--nope"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("Unknown argument(s): --nope");
  });

  it("refuses to overwrite a hand-customized workflow with exit 10 and preserves it, then --force replaces it", () => {
    process.chdir(dir);
    expect(runCiInstall([], capture().io)).toBe(0);
    const wfPath = join(dir, ".github", "workflows", "mjolnir.yml");
    const customized = readFileSync(wfPath, "utf8") + "\n# my tweak\n";
    writeFileSync(wfPath, customized);

    const cap = capture();
    expect(runCiInstall(["--gate", "error"], cap.io)).toBe(10);
    expect(cap.errText()).toContain("Refusing to overwrite");
    expect(cap.errText()).toContain("--force");
    expect(readFileSync(wfPath, "utf8")).toBe(customized);

    const cap2 = capture();
    expect(runCiInstall(["--gate", "error", "--force"], cap2.io)).toBe(0);
    expect(readFileSync(wfPath, "utf8")).not.toBe(customized);
  });
});

describe("runSuppressions", () => {
  it("prints empty-state report", () => {
    process.chdir(dir);
    const cap = capture();
    expect(runSuppressions({ out: cap.out })).toBe(0);
    expect(cap.text()).toContain("No suppressed findings");
  });

  it("surfaces a corrupted config on the usage-error path instead of an empty report (bug-audit M6)", () => {
    process.chdir(dir);
    writeFileSync(join(dir, "mjolnir.config.json"), "{ broken");
    const cap = capture();
    expect(runSuppressions({ out: cap.out, err: cap.err })).toBe(10);
    expect(cap.errText()).toContain("Invalid mjolnir config");
  });

  it("reads suppressions from the alternate .mjolnir.json config name (bug-audit M6)", () => {
    process.chdir(dir);
    writeFileSync(
      join(dir, ".mjolnir.json"),
      JSON.stringify({
        ignore: [{ ruleId: "QA-X", reason: "tracked" }],
      }),
    );
    const cap = capture();
    expect(runSuppressions({ out: cap.out, err: cap.err })).toBe(0);
    expect(cap.text()).toContain("QA-X");
  });
});

const PW_JSON = JSON.stringify({
  suites: [
    {
      specs: [
        {
          ok: true,
          file: "a.spec.ts",
          line: 1,
          column: 1,
          title: "t",
          tests: [
            {
              timeout: 1,
              annotations: [],
              expectedStatus: "passed",
              projectName: "p",
              results: [
                {
                  status: "passed",
                  startTime: "2026-08-24T00:00:00Z",
                  duration: 1,
                  errors: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

describe("runForensicsCommand", () => {
  it("returns usage error without target", () => {
    const cap = capture();
    expect(runForensicsCommand([], cap.io)).toBe(10);
    expect(cap.errText()).toContain("Usage:");
  });

  it("returns 2 when no results recognized", () => {
    const cap = capture();
    expect(runForensicsCommand([dir], cap.io)).toBe(2);
    expect(cap.errText()).toContain("No test results recognized");
  });

  it("returns 0 for clean report and prints output", () => {
    writeFileSync(join(dir, "report.json"), PW_JSON);
    const cap = capture();
    expect(runForensicsCommand([dir], cap.io)).toBe(0);
    expect(cap.text()).toContain("FLAKY.md");
  });

  it("honors --no-flaky-md", () => {
    writeFileSync(join(dir, "report.json"), PW_JSON);
    const cap = capture();
    expect(runForensicsCommand([dir, "--no-flaky-md"], cap.io)).toBe(0);
    expect(existsSync(join(dir, "FLAKY.md"))).toBe(false);
  });

  it("returns 2 (not a crash) for missing target — nothing recognized", () => {
    const cap = capture();
    // A missing dir is "no results recognized" (exit 2), not an internal
    // error (20): the README doctest asserts forensics on an absent
    // ./test-results/ degrades honestly instead of crashing.
    expect(runForensicsCommand([join(dir, "missing")], cap.io)).toBe(2);
    expect(cap.errText()).toContain("No test results recognized");
  });
});

describe("runDoctorPlaywright", () => {
  it("renders PW findings + selector health and exits 0", () => {
    mkdirSync(join(dir, ".github"), { recursive: true });
    writeFileSync(join(dir, "sample.spec.ts"), "page.getByRole('button');\n");
    const cap = capture();
    expect(runDoctorPlaywright(["doctor:playwright", dir], cap.io)).toBe(0);
    expect(cap.text()).toContain("SELECTOR HEALTH");
  });
});

describe("runScanCommand / main dispatch", () => {
  it("prints usage and exits 10 on bad args", () => {
    const cap = capture();
    expect(runScanCommand(["--bogus"], cap.io)).toBe(10);
    expect(cap.text()).toContain("Usage: mjolnir");
  });

  it("emits JSON output with schemaVersion", () => {
    const cap = capture();
    const code = runScanCommand([dir, "--json"], cap.io);
    expect([0, 1, 2]).toContain(code);
    const parsed = JSON.parse(cap.text()) as { schemaVersion: number };
    expect(parsed.schemaVersion).toBe(1);
  });

  it("emits SARIF output", () => {
    const cap = capture();
    runScanCommand([dir, "--format", "sarif"], cap.io);
    expect(JSON.parse(cap.text())).toHaveProperty("version", "2.1.0");
  });

  it("main dispatches subcommands", () => {
    process.chdir(dir);
    expect(main(["ci", "install"])).toBe(0);
    expect(main(["suppressions"])).toBe(0);
    expect(main(["forensics"])).toBe(10);
  });

  it("main falls through to scan for plain args", () => {
    const cap = capture();
    const code = main([dir, "--json"]);
    void cap;
    expect([0, 1, 2]).toContain(code);
  });
});
