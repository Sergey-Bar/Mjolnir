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
 * The single error-to-message derivation shared by every catch site:
 * Error instances render their message; anything else is stringified
 * honestly (a hostile non-Error throw must surface, not vanish).
 */
export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);
