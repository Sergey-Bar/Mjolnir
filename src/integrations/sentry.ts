/**
 * Sentry crash reporting — opt-in, and inert unless a DSN is configured.
 *
 * Why opt-in: Mjölnir ships as an `npx` CLI over other people's private
 * repositories. A tool that reads a codebase must never phone home on its
 * own, so the ONLY switch is an explicit `SENTRY_DSN` in the environment.
 * Absent that, every function here returns immediately and `@sentry/node` is
 * never imported — zero network, zero added startup cost on a path whose
 * whole selling point is scan speed.
 *
 * Why an optional peer dependency: `@sentry/node` is ~1.5 MB unpacked and
 * nothing in a code scanner needs it. Making it a hard `dependency` would
 * tax every install for a feature most users never turn on, so it is an
 * optional peer: installs on request (`npm i @sentry/node`), absent by
 * default, and a missing module is handled as "reporting unavailable"
 * rather than as a crash.
 *
 * Capture points are deliberately the two EXISTING top-level catch blocks
 * (cli.ts entry, mcp/stdio.ts) rather than `process.on("uncaughtException")`
 * / `("unhandledRejection")` handlers. Registering those would silently
 * change the CLI's frozen exit-code contract (§24.1) and could keep a
 * process alive after a fatal error. One capture point per surface is
 * enough to answer "did Mjölnir itself break, and where".
 *
 * What is deliberately NOT sent: no user data (`sendDefaultPii: false`), no
 * traced request/span data (`tracesSampleRate: 0` — a batch CLI has no
 * request to trace), no console breadcrumbs, and no scan findings or file
 * contents. Events carry the error, its stack, the release, and the surface
 * that raised it.
 */

import { ENGINE_VERSION } from "../engine/version.js";

/**
 * The SDK surface this module uses. Typed structurally so the optional
 * peer dependency stays optional at type-check time too: the module is
 * only ever reached through a dynamic import guarded by a DSN check.
 */
interface SentrySdk {
  init(options: Record<string, unknown>): void;
  captureException(
    error: unknown,
    hint?: { tags?: Record<string, string> },
  ): string;
  flush(timeout: number): Promise<boolean>;
}

/** The loaded SDK, or null while reporting is off/unavailable. */
let sdk: SentrySdk | null = null;

/**
 * Flush budget for the process-exit paths. Long enough for one HTTPS
 * envelope on a slow link, short enough that a broken network cannot turn
 * a crashed CLI into a hung one. Sentry's own default is 2s.
 */
const FLUSH_TIMEOUT_MS = 2000;

/** Writes a diagnostic without touching stdout. */
function warn(message: string): void {
  process.stderr.write(`mjolnir: sentry — ${message}\n`);
}

/**
 * Whether crash reporting is active. Callers use this to skip capture
 * entirely rather than paying a no-op call on a hot path.
 */
export function sentryActive(): boolean {
  return sdk !== null;
}

/**
 * The release name Sentry groups events under. Matches the npm package
 * name so a release created from a tag and a release reported by the SDK
 * are the same release, not two half-populated ones.
 */
export const SENTRY_RELEASE = `mjolnir-qa@${ENGINE_VERSION}`;

/**
 * Resolve the environment tag. Unset means "a developer's machine" unless
 * CI says otherwise: a `npx` run is not a production event, and filing
 * those under `production` would poison the issue stream with noise from
 * end users triaging their own repos.
 */
function resolveEnvironment(): string {
  const fromEnv = process.env.SENTRY_ENVIRONMENT?.trim();
  if (fromEnv) return fromEnv;
  return process.env.CI ? "ci" : "local";
}

/**
 * Turn reporting on if — and only if — a DSN is configured. Safe to call
 * from every entry point: the second call is a no-op that returns the
 * already-decided answer, so a process that reaches two surfaces cannot
 * initialize the SDK twice.
 *
 * Returns true when reporting is live. Never throws: a monitoring
 * integration that can take down the tool it monitors has failed at its
 * one job.
 */
export async function initSentry(): Promise<boolean> {
  if (sdk) return true;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return false;
  let loaded: SentrySdk;
  try {
    loaded = await import("@sentry/node");
  } catch {
    warn(
      "SENTRY_DSN is set but @sentry/node is not installed. " +
        "Install it with: npm install @sentry/node",
    );
    return false;
  }
  try {
    loaded.init({
      dsn,
      release: SENTRY_RELEASE,
      environment: resolveEnvironment(),
      // A batch CLI has no request to trace; 0 is explicit, not omitted,
      // so a later default change upstream cannot silently start
      // collecting spans for every user.
      tracesSampleRate: 0,
      sendDefaultPii: false,
      attachStacktrace: true,
    });
  } catch (error) {
    warn(
      `SDK init failed (${error instanceof Error ? error.message : String(error)}). Crash reporting stays off.`,
    );
    return false;
  }
  sdk = loaded;
  return true;
}

/**
 * Report one fatal error. `surface` names the entry point that raised it
 * ("cli" or "mcp") so the issue stream can be split by how Mjölnir was
 * being used when it broke. A non-Error throw is reported as-is rather
 * than dropped: a hostile throw value is exactly the case worth seeing.
 */
export function captureInternalError(error: unknown, surface: string): void {
  if (!sdk) return;
  try {
    sdk.captureException(error, { tags: { surface } });
  } catch (captureError) {
    warn(
      `capture failed (${captureError instanceof Error ? captureError.message : String(captureError)}).`,
    );
  }
}

/**
 * Deliver anything buffered before the process exits. Awaits the SDK's
 * own transport drain and returns whether the envelope was handed off;
 * the caller is on an exit path, so the answer is deliberately not
 * surfaced as a failure — a lost crash report must not change the exit
 * code a caller (or CI) is about to read.
 */
export async function flushSentry(
  timeoutMs: number = FLUSH_TIMEOUT_MS,
): Promise<boolean> {
  if (!sdk) return false;
  try {
    return await sdk.flush(timeoutMs);
  } catch {
    return false;
  }
}
