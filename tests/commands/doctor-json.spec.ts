/**
 * `doctor --json` machine contract (certification-audit Phase 5, G2/G5/G6).
 *
 * The CI certification job gates on this command: exit 0 = every check
 * pass, exit 1 = any fail OR inconclusive, stdout = exactly one versioned
 * JSON document. Locked here:
 *   - schema versioning (mjolnir.doctor-report@1) and key order;
 *   - G2: an INCONCLUSIVE check appears with its own status, ok=false,
 *     and healthy=false — never as a pass;
 *   - G5: two runs over the same tree are byte-identical (determinism
 *     self-verify, re-proven in the CI job itself);
 *   - summary counts reconcile with the checks array.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import {
  DOCTOR_REPORT_SCHEMA,
  NON_DETERMINISTIC_FIELDS,
  doctorReportJson,
  runDoctorSelfAudit,
  type DoctorReport,
} from "../../src/commands/doctor.js";
import { runDoctorCommand } from "../../src/commands/doctor-run.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("doctor --json machine contract (Phase 5)", () => {
  it("G5: NON_DETERMINISTIC_FIELDS stays EMPTY — additions need a conscious allowlist decision", () => {
    expect(NON_DETERMINISTIC_FIELDS.length).toBe(0);
  });

  it("runDoctorSelfAudit on this repo: all checks evaluated, none inconclusive", () => {
    const report = runDoctorSelfAudit(join(ROOT, "tests", "fixtures"));
    expect(report.checks.length).toBeGreaterThanOrEqual(9);
    for (const c of report.checks) {
      expect(["pass", "fail", "inconclusive"]).toContain(c.status);
      expect(c.ok).toBe(c.status === "pass");
    }
    // This checkout is the certified tree: everything must pass.
    expect(report.healthy).toBe(true);
    expect(report.checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("the JSON contract carries the schema field, stable key order, reconciled summary", () => {
    const report = runDoctorSelfAudit(join(ROOT, "tests", "fixtures"));
    const json = doctorReportJson(report);
    expect(json.schema).toBe(DOCTOR_REPORT_SCHEMA);
    expect(typeof json.healthy).toBe("boolean");
    const counted = json.checks.reduce(
      (acc, c) => {
        acc[c.status]++;
        return acc;
      },
      { pass: 0, fail: 0, inconclusive: 0 },
    );
    expect(json.summary).toEqual(counted);
    expect(json.checks.length).toBe(report.checks.length);
    // Key order is part of the contract (JSON.stringify preserves it).
    expect(Object.keys(json)).toEqual([
      "schema",
      "healthy",
      "summary",
      "checks",
      "measurement",
    ]);
    const firstCheck = json.checks[0];
    if (!firstCheck) throw new Error("checks must be non-empty");
    expect(Object.keys(firstCheck)).toEqual([
      "name",
      "status",
      "ok",
      "details",
    ]);
  });

  it("G2: an INCONCLUSIVE check is ok:false, healthy:false, and never a pass", () => {
    const report: DoctorReport = {
      checks: [
        {
          name: "revision-integrity",
          status: "inconclusive",
          ok: false,
          details: ["INCONCLUSIVE: manifest missing"],
        },
        {
          name: "registry-sanity",
          status: "pass",
          ok: true,
          details: [],
        },
      ],
      healthy: false,
      measurement: { measured: 0, unmeasured: 0, total: 0, quarantine: 0 },
    };
    const json = doctorReportJson(report);
    const rev = json.checks.find((c) => c.name === "revision-integrity");
    expect(rev?.status).toBe("inconclusive");
    expect(rev?.ok).toBe(false);
    expect(json.summary.inconclusive).toBe(1);
    expect(json.healthy).toBe(false);
  });

  it("G5: two command runs over this tree emit byte-identical JSON (and it parses to the schema)", () => {
    // runDoctorCommand receives argv WITHOUT the "doctor" literal (the
    // dispatch slices it) — mirroring the real call path.
    const args = [join(ROOT), "--json"];
    const out1: string[] = [];
    const err1: string[] = [];
    const code1 = runDoctorCommand(args, {
      out: (...p) => out1.push(p.join(" ")),
      err: (...p) => err1.push(p.join(" ")),
    });
    const out2: string[] = [];
    const code2 = runDoctorCommand(args, {
      out: (...p) => out2.push(p.join(" ")),
      err: (...p) => err2Push(p.join(" ")),
    });
    function err2Push(s: string): void {
      void s; // stderr unused for the healthy tree
    }
    expect(code1).toBe(0);
    expect(code2).toBe(0);
    const json1 = out1.join("\n");
    const json2 = out2.join("\n");
    expect(json1).toBe(json2);
    const parsed = JSON.parse(json1) as { schema: string; healthy: boolean };
    expect(parsed.schema).toBe(DOCTOR_REPORT_SCHEMA);
    expect(parsed.healthy).toBe(true);
    // No absolute paths leak into the contract (G5 normalization).
    expect(json1).not.toMatch(/[A-Z]:\\\\|\/home\/|\/Users\//);
  });

  it("exit codes: 10 on an unknown flag, healthy tree exits 0 (e2e-locked table)", () => {
    const sink = { out: () => {}, err: () => {} };
    expect(runDoctorCommand(["--bogus", join(ROOT)], sink)).toBe(10);
    expect(runDoctorCommand(["--json", "--bogus", join(ROOT)], sink)).toBe(10);
    expect(runDoctorCommand([join(ROOT)], sink)).toBe(0);
  });

  it("G2: an unhealthy tree exits 1 — with and without --json (exit code is the gate)", () => {
    // Minimal repo-shaped tree: tests/fixtures EXISTS (so the run does not
    // exit 2) but is empty — the fixture firewall fails immediately.
    const root = mkdtempSync(join(tmpdir(), "mjolnir-doctor-unhealthy-"));
    tmpDirs.push(root);
    mkdirSync(join(root, "tests", "fixtures"), { recursive: true });
    const jsonOut: string[] = [];
    const codeJson = runDoctorCommand([root, "--json"], {
      out: (...p) => jsonOut.push(p.join(" ")),
      err: () => {},
    });
    expect(codeJson).toBe(1);
    const parsed = JSON.parse(jsonOut.join("\n")) as {
      healthy: boolean;
      summary: { fail: number };
    };
    expect(parsed.healthy).toBe(false);
    expect(parsed.summary.fail).toBeGreaterThan(0);
    // Text mode: same exit code, distinct render.
    const textOut: string[] = [];
    const codeText = runDoctorCommand([root], {
      out: (...p) => textOut.push(p.join(" ")),
      err: () => {},
    });
    expect(codeText).toBe(1);
    expect(textOut.join("\n")).toContain("VIOLATIONS FOUND");
  });

  it("exit 2: a target without tests/fixtures is a distinct usage error", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-doctor-empty-"));
    tmpDirs.push(root);
    const sink = { out: () => {}, err: () => {} };
    expect(runDoctorCommand([root], sink)).toBe(2);
  });

  it("the CLI build carries the doctor --json flag (dist smoke via spawned binary)", () => {
    // Contract smoke on the BUILT artifact — the CI certification job runs
    // exactly this shape (node dist/cli.mjs doctor . --json).
    const dist = join(ROOT, "dist", "cli.mjs");
    const res = spawnSync(process.execPath, [dist, "doctor", ROOT, "--json"], {
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(res.status, res.stderr).toBe(0);
    const parsed = JSON.parse(res.stdout) as {
      schema: string;
      healthy: boolean;
      summary: { pass: number; fail: number; inconclusive: number };
    };
    expect(parsed.schema).toBe(DOCTOR_REPORT_SCHEMA);
    expect(parsed.healthy).toBe(true);
    expect(parsed.summary.fail).toBe(0);
    expect(parsed.summary.inconclusive).toBe(0);
    // Byte-determinism on the built artifact too.
    const res2 = spawnSync(process.execPath, [dist, "doctor", ROOT, "--json"], {
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(res2.stdout).toBe(res.stdout);
  });
});

let tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
  tmpDirs = [];
});
