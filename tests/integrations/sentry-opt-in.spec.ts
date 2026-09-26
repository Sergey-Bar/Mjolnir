/**
 * The Sentry integration is opt-in, and that has to be PROVEN, not asserted.
 *
 * Mjölnir reads other people's private repositories. An integration that can
 * phone home from a code scanner without being asked is a defect regardless of
 * how it is configured, so the contract these tests pin is the negative one
 * first: no DSN means the SDK is never imported, nothing is sent, and the
 * failure arms of every branch are survivable.
 *
 * The positive arms matter just as much, because a monitoring integration that
 * throws during init takes down the tool it was meant to observe — and a
 * capture that throws would replace a real crash report with a crash of the
 * reporter.
 *
 * Module-level state (`sdk`) is deliberate, so every test re-imports the
 * module through a fresh registry — otherwise the first init would decide the
 * outcome of every case after it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** The SDK stub. Rebuilt per test so no spy state leaks between cases. */
interface SdkStub {
  init: ReturnType<typeof vi.fn>;
  captureException: ReturnType<typeof vi.fn>;
  flush: ReturnType<typeof vi.fn>;
}

function makeSdk(): SdkStub {
  return {
    init: vi.fn(),
    captureException: vi.fn(() => "event-id"),
    flush: vi.fn(() => Promise.resolve(true)),
  };
}

let sdk: SdkStub;
/** Everything the integration wrote to stderr, joined for assertions. */
let warnings: string[];
const savedEnv = { ...process.env };

/** What the integration told the user, as one string. */
const warned = (): string => warnings.join("");

/** Import the module with `@sentry/node` replaced by the current stub. */
async function loadModule(): Promise<
  typeof import("../../src/integrations/sentry.js")
> {
  vi.resetModules();
  return await import("../../src/integrations/sentry.js");
}

beforeEach(() => {
  sdk = makeSdk();
  vi.doMock("@sentry/node", () => sdk);
  warnings = [];
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    warnings.push(String(chunk));
    return true;
  });
  delete process.env.SENTRY_DSN;
  delete process.env.SENTRY_ENVIRONMENT;
  delete process.env.CI;
});

afterEach(() => {
  vi.doUnmock("@sentry/node");
  vi.restoreAllMocks();
  process.env = { ...savedEnv };
});

describe("sentry: the opt-in gate", () => {
  it("stays off, and imports nothing, when no DSN is configured", async () => {
    const sentry = await loadModule();

    expect(await sentry.initSentry()).toBe(false);
    expect(sentry.sentryActive()).toBe(false);
    // The load-bearing assertion: the mock is never touched, so the real
    // SDK was never imported and no code path reached the network.
    expect(sdk.init).not.toHaveBeenCalled();
    expect(warnings).toEqual([]);
  });

  it("treats a blank DSN as no DSN rather than as a malformed one", async () => {
    process.env.SENTRY_DSN = "   ";
    const sentry = await loadModule();

    expect(await sentry.initSentry()).toBe(false);
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it("reports nothing and warns once when the optional peer is absent", async () => {
    vi.doMock("@sentry/node", () => {
      throw new Error("Cannot find package '@sentry/node'");
    });
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
    const sentry = await loadModule();

    expect(await sentry.initSentry()).toBe(false);
    expect(sentry.sentryActive()).toBe(false);
    // The warning has to name the fix, or the user is left guessing why
    // their DSN does nothing.
    expect(warned()).toContain("npm install @sentry/node");
  });

  it("survives an SDK that throws during init", async () => {
    sdk.init.mockImplementation(() => {
      throw new Error("bad DSN");
    });
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
    const sentry = await loadModule();

    expect(await sentry.initSentry()).toBe(false);
    expect(sentry.sentryActive()).toBe(false);
    expect(warned()).toContain("bad DSN");
  });

  it("survives a non-Error throw during init", async () => {
    sdk.init.mockImplementation(() => {
      throw "offline"; // eslint-disable-line @typescript-eslint/only-throw-error -- the arm under test: a non-Error thrown value
    });
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
    const sentry = await loadModule();

    expect(await sentry.initSentry()).toBe(false);
    expect(warned()).toContain("offline");
  });
});

describe("sentry: what gets configured when it IS on", () => {
  beforeEach(() => {
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
  });

  it("initializes once, with the release, no PII, and tracing off", async () => {
    const sentry = await loadModule();

    expect(await sentry.initSentry()).toBe(true);
    expect(sentry.sentryActive()).toBe(true);
    const options = sdk.init.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(options.dsn).toBe("https://key@example.ingest.sentry.io/1");
    expect(options.release).toBe(sentry.SENTRY_RELEASE);
    // A code scanner must not ship user data, and a batch CLI has no
    // request to trace. Both are explicit so an upstream default change
    // cannot quietly turn either on.
    expect(options.sendDefaultPii).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
    expect(options.attachStacktrace).toBe(true);
  });

  it("tags the release with the package name so tags and events agree", async () => {
    const sentry = await loadModule();

    expect(sentry.SENTRY_RELEASE).toMatch(/^mjolnir-qa@.+/);
  });

  it("does not re-initialize when a second surface calls in", async () => {
    const sentry = await loadModule();

    expect(await sentry.initSentry()).toBe(true);
    expect(await sentry.initSentry()).toBe(true);
    expect(sdk.init).toHaveBeenCalledTimes(1);
  });

  it("uses SENTRY_ENVIRONMENT when the caller names one", async () => {
    process.env.SENTRY_ENVIRONMENT = "staging";
    const sentry = await loadModule();
    await sentry.initSentry();

    expect(
      (sdk.init.mock.calls[0]?.[0] as Record<string, unknown>).environment,
    ).toBe("staging");
  });

  it("ignores a blank SENTRY_ENVIRONMENT instead of filing under ''", async () => {
    process.env.SENTRY_ENVIRONMENT = "  ";
    const sentry = await loadModule();
    await sentry.initSentry();

    expect(
      (sdk.init.mock.calls[0]?.[0] as Record<string, unknown>).environment,
    ).toBe("local");
  });

  it("files a CI run as ci, and a developer machine as local", async () => {
    process.env.CI = "true";
    const inCi = await loadModule();
    await inCi.initSentry();
    expect(
      (sdk.init.mock.calls[0]?.[0] as Record<string, unknown>).environment,
    ).toBe("ci");

    delete process.env.CI;
    sdk.init.mockClear();
    const onLaptop = await loadModule();
    await onLaptop.initSentry();
    expect(
      (sdk.init.mock.calls[0]?.[0] as Record<string, unknown>).environment,
    ).toBe("local");
  });
});

describe("sentry: capture and flush", () => {
  it("captures nothing at all while reporting is off", async () => {
    const sentry = await loadModule();

    sentry.captureInternalError(new Error("boom"), "cli");
    expect(await sentry.flushSentry()).toBe(false);
    expect(sdk.captureException).not.toHaveBeenCalled();
    expect(sdk.flush).not.toHaveBeenCalled();
  });

  it("captures the error tagged with the surface that raised it", async () => {
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
    const sentry = await loadModule();
    await sentry.initSentry();
    const error = new Error("transport died mid-session");

    sentry.captureInternalError(error, "mcp");

    expect(sdk.captureException).toHaveBeenCalledWith(error, {
      tags: { surface: "mcp" },
    });
  });

  it("reports a non-Error throw rather than dropping it", async () => {
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
    const sentry = await loadModule();
    await sentry.initSentry();

    sentry.captureInternalError({ nope: true }, "cli");

    // A hostile throw value is precisely the case worth seeing, so it is
    // forwarded as-is instead of being coerced into an Error.
    expect(sdk.captureException).toHaveBeenCalledWith(
      { nope: true },
      { tags: { surface: "cli" } },
    );
  });

  it("swallows a throwing capture instead of losing the original crash", async () => {
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
    const sentry = await loadModule();
    await sentry.initSentry();
    sdk.captureException.mockImplementation(() => {
      throw new Error("envelope rejected");
    });

    expect(() =>
      sentry.captureInternalError(new Error("real"), "cli"),
    ).not.toThrow();
    expect(warned()).toContain("envelope rejected");
  });

  it("stringifies a non-Error failure from the capture path", async () => {
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
    const sentry = await loadModule();
    await sentry.initSentry();
    sdk.captureException.mockImplementation(() => {
      throw "offline"; // eslint-disable-line @typescript-eslint/only-throw-error -- the arm under test: a non-Error thrown value
    });

    expect(() =>
      sentry.captureInternalError(new Error("real"), "cli"),
    ).not.toThrow();
    expect(warned()).toContain("offline");
  });

  it("flushes with the exit-path timeout so a dead network cannot hang the CLI", async () => {
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
    const sentry = await loadModule();
    await sentry.initSentry();

    expect(await sentry.flushSentry()).toBe(true);
    expect(sdk.flush).toHaveBeenCalledWith(2000);
    expect(await sentry.flushSentry(50)).toBe(true);
    expect(sdk.flush).toHaveBeenLastCalledWith(50);
  });

  it("reports a failed flush as false rather than as a crash", async () => {
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
    const sentry = await loadModule();
    await sentry.initSentry();
    sdk.flush.mockRejectedValue(new Error("socket hang up"));

    expect(await sentry.flushSentry()).toBe(false);
  });

  it("passes a transport that declines the envelope through as false", async () => {
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
    const sentry = await loadModule();
    await sentry.initSentry();
    sdk.flush.mockResolvedValue(false);

    expect(await sentry.flushSentry()).toBe(false);
  });
});
