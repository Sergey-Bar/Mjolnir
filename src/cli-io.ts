/**
 * Shared process IO sinks (certification-audit Phase 5, G6): the variadic
 * console sinks and the internal-error reporter lived in cli.ts, which
 * made every command module that wanted honest IO depend on the dispatch
 * table (or duplicate it). Extracted so command modules (doctor-run et
 * al.) and cli.ts share ONE implementation.
 */

/** The variadic IO signature shared by all command handlers. */
export type Output = (...parts: unknown[]) => void;

// Audit C3: the default sinks must stay variadic — `io.err("mjolnir
// internal error:", msg)` used to print only the prefix, losing the
// actual error. Join with spaces so multi-arg calls render as one
// readable line on the default consoles.
export const out: Output = (...parts) =>
  console.log(parts.map(String).join(" "));
export const err: Output = (...parts) =>
  console.error(parts.map(String).join(" "));

export function internalErrorMessage(
  err: unknown,
  emit: (s: string) => void,
  debug: boolean,
): void {
  const message = err instanceof Error ? err.message : String(err);
  emit("mjolnir internal error — this is a bug in Mjölnir, not your repo:");
  emit(`  ${message}`);
  if (debug && err instanceof Error && err.stack) {
    emit(err.stack);
  }
  emit("Rerun with --debug for the stack trace. Please report this:");
  emit("  https://github.com/Sergey-Bar/Mjolnir/issues");
}

/**
 * The ONE error-to-message derivation in `src/`.
 *
 * This tree carried four near-copies: two `errorMessage` (byte-identical) and
 * two `errorText`. The two `errorText` copies were not identical, which is the
 * part that mattered — `String(someObject)` renders `[object Object]`, so the
 * copy that lost the payload turned a hostile non-Error throw into a message
 * that names nothing. The richer arms are kept here, so every call site gets
 * the informative one and the difference stops being a per-file accident.
 *
 * The arms, in order:
 *   Error            -> `.message`. The 99% case, and the only one that
 *                       carries a stack the caller may still want.
 *   string           -> itself. A thrown string is already the message.
 *   plain object     -> `JSON.stringify`. A non-Error throw of `{ code:
 *                       "EISDIR" }` is a REAL failure shape in Node, and
 *                       `[object Object]` hides the only field that says
 *                       what went wrong.
 *   anything else    -> `String(err)`. Symbols and undefined included, so
 *                       nothing vanishes.
 *
 * The call this replaces was `err instanceof Error ? err.message : String(err)`
 * in `src/mcp/server.ts` and `src/commands/doctor.ts`; `tests/cli/summary.spec.ts`
 * already pins the object arm.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) return JSON.stringify(err);
  return String(err);
}
