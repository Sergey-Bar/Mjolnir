/**
 * fs-atomic-retry spec: the Windows EBUSY/EPERM retry loop and the
 * Atomics.wait busy-wait fallback — platform arms unreachable on the
 * other OS, driven here through a module-level renameSync mock.
 */

import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Mock state consulted by the node:fs mock below. */
const state = vi.hoisted(() => ({
  mode: "pass",
  failCode: "EBUSY",
  failTimes: 8,
  attempts: 0,
  unlinkThrows: false,
  platform: process.platform,
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const renameSync = ((from: string, to: string) => {
    state.attempts++;
    const shouldFail =
      state.mode === "fail-n" ||
      state.mode === "fail-and-remove" ||
      (state.mode === "fail-then-succeed" && state.attempts <= state.failTimes);
    if (shouldFail) {
      if (state.mode === "fail-and-remove") {
        // Simulate a concurrent cleaner removing the temp mid-race.
        (actual.unlinkSync as (...a: unknown[]) => void)(from);
      }
      const e = new Error(
        `simulated ${state.failCode}`,
      ) as NodeJS.ErrnoException;
      e.code = state.failCode;
      throw e;
    }
    return (actual.renameSync as (...a: unknown[]) => void)(from, to);
  }) as typeof actual.renameSync;
  const unlinkSync = ((path: string) => {
    if (state.unlinkThrows) {
      const e = new Error("simulated unlink failure") as NodeJS.ErrnoException;
      e.code = "EPERM";
      throw e;
    }
    return (actual.unlinkSync as (...a: unknown[]) => void)(path);
  }) as typeof actual.unlinkSync;
  return { ...actual, renameSync, unlinkSync };
});

import { writeFileAtomic } from "../../src/lib/fs-atomic.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-fsretry-"));
  writeFileSync(join(dir, "out.json"), "original\n");
  state.mode = "pass";
  state.attempts = 0;
  state.failCode = "EBUSY";
  state.failTimes = 8;
  state.unlinkThrows = false;
  state.platform = process.platform;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("Windows EBUSY/EPERM retry loop", () => {
  it("succeeds when rename recovers after EBUSY retries (win32 path)", () => {
    vi.stubGlobal("process", { ...process, platform: "win32" });
    state.mode = "fail-then-succeed";
    state.failCode = "EBUSY";
    state.failTimes = 3;
    writeFileAtomic(join(dir, "out.json"), "recovered\n");
    expect(state.attempts).toBe(4);
    expect(readFileSync(join(dir, "out.json"), "utf8")).toBe("recovered\n");
  });

  it("throws the simulated error when every attempt fails with EPERM (win32)", () => {
    vi.stubGlobal("process", { ...process, platform: "win32" });
    state.mode = "fail-n";
    state.failCode = "EPERM";
    expect(() => writeFileAtomic(join(dir, "out.json"), "x")).toThrow(
      /simulated EPERM/,
    );
    // 8 retries + the initial attempt = 9 calls.
    expect(state.attempts).toBe(9);
  });

  it("rethrows immediately when the errno is not retryable on win32", () => {
    vi.stubGlobal("process", { ...process, platform: "win32" });
    state.mode = "fail-n";
    state.failCode = "ENOENT";
    expect(() => writeFileAtomic(join(dir, "out.json"), "x")).toThrow(
      /simulated ENOENT/,
    );
    expect(state.attempts).toBe(1); // no retry for non-EBUSY/EPERM
  });

  it("never retries on POSIX (first failure propagates)", () => {
    vi.stubGlobal("process", { ...process, platform: "linux" });
    state.mode = "fail-n";
    state.failCode = "EBUSY";
    expect(() => writeFileAtomic(join(dir, "out.json"), "x")).toThrow(
      /simulated EBUSY/,
    );
    expect(state.attempts).toBe(1);
  });
});

describe("sleepSync busy-wait fallback", () => {
  it("completes an atomic write when Atomics.wait is unavailable", () => {
    vi.stubGlobal("Atomics", {
      wait: () => {
        throw new Error("not allowed on this thread");
      },
    });
    vi.stubGlobal("process", { ...process, platform: "win32" });
    state.mode = "fail-then-succeed";
    state.failCode = "EBUSY";
    state.failTimes = 2;
    writeFileAtomic(join(dir, "out.json"), "via-busywait\n");
    expect(state.attempts).toBe(3);
    expect(readFileSync(join(dir, "out.json"), "utf8")).toBe("via-busywait\n");
  });
});

describe("cleanup race arms", () => {
  it("a temp removed concurrently between rename failure and cleanup stays silent", () => {
    // fail-and-remove: the mock deletes the temp when rename fails, so
    // the cleanup's existsSync sees it gone (false arm), and a racing
    // unlink that DOES still find it (unlinkThrows) exercises the
    // catch-and-continue arm. Either way the original error propagates.
    vi.stubGlobal("process", { ...process, platform: "linux" });
    state.mode = "fail-and-remove";
    state.failCode = "ENOENT";
    state.unlinkThrows = true;
    expect(() => writeFileAtomic(join(dir, "out.json"), "x")).toThrow(
      /simulated ENOENT/,
    );
    state.unlinkThrows = false;
  });

  it("a temp still present after rename failure is unlinked by the cleanup (true arm)", () => {
    vi.stubGlobal("process", { ...process, platform: "linux" });
    state.mode = "fail-n";
    state.failCode = "EACCES";
    expect(() => writeFileAtomic(join(dir, "out.json"), "x")).toThrow(
      /simulated EACCES/,
    );
    // The temp is gone — the cleanup did its job.
    const leftovers = readdirSync(dir).filter((f) => f.endsWith(".tmp"));
    expect(leftovers).toHaveLength(0);
  });
});
