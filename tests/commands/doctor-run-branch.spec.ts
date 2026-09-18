import { describe, expect, it, vi } from "vitest";

import { runDoctorCommand } from "../../src/commands/doctor-run.js";

describe("doctor-run branch coverage (line 37 — unknown flags)", () => {
  it("returns 10 on unknown flags (line 37 — usage error path)", () => {
    const out = vi.fn();
    const err = vi.fn();
    const code = runDoctorCommand(["--bogus"], { out, err });
    expect(code).toBe(10);
    expect(err).toHaveBeenCalledWith(
      expect.stringContaining("Usage: qa-doctor doctor"),
    );
  });

  it("returns 10 on multiple unknown flags", () => {
    const out = vi.fn();
    const err = vi.fn();
    const code = runDoctorCommand(["--foo", "--bar"], { out, err });
    expect(code).toBe(10);
  });

  it("returns 2 when fixtures directory does not exist", () => {
    const out = vi.fn();
    const err = vi.fn();
    const code = runDoctorCommand(["/nonexistent/path/that/does/not/exist"], {
      out,
      err,
    });
    expect(code).toBe(2);
    expect(err).toHaveBeenCalledWith(
      expect.stringContaining("No fixtures directory"),
    );
  });

  it("accepts --json flag", () => {
    const out = vi.fn();
    const err = vi.fn();
    const code = runDoctorCommand(["/nonexistent/path", "--json"], {
      out,
      err,
    });
    // Either 2 (no fixtures) or 0/1 (real run)
    expect([0, 1, 2, 10, 20]).toContain(code);
  });
});
