/**
 * Reusable safe-JSON parse-and-validate helper.
 *
 * Replaces the `JSON.parse(text) as T` pattern with a two-step process:
 *   1. Try/catch around JSON.parse (descriptive error on bad JSON)
 *   2. Runtime validation of the parsed shape (caller-supplied predicate)
 *
 * The `validate` predicate is intentionally lightweight — it checks the
 * expected shape exists rather than exhaustively type-guarding every field.
 * Internal files (cache, hashes) use `isRecord`; user-facing files
 * (config, plugins) use stricter checks that throw descriptive errors.
 */

export function parseJsonFile<T>(
  text: string,
  source: string,
  validate: (v: unknown) => v is T,
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `invalid JSON in ${source}: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
  if (!validate(parsed)) {
    throw new Error(`unexpected shape in ${source}`, { cause: parsed });
  }
  return parsed;
}

/**
 * Minimal validator: value is a plain object (not null, not array).
 * Sufficient for internal files (cache, hashes) where downstream
 * code already checks individual fields.
 */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
