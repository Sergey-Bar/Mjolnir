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

const MAX_JSON_BYTES = 16 * 1024 * 1024;

export function parseJsonFile<T>(
  text: string,
  source: string,
  validate: (v: unknown) => v is T,
): T {
  if (Buffer.byteLength(text, "utf8") > MAX_JSON_BYTES) {
    throw new Error(
      `JSON source exceeds the ${MAX_JSON_BYTES}-byte limit: ${source}`,
    );
  }
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
  // `Array.isArray` throws a TypeError on a revoked Proxy, and a revoked
  // proxy is a value a caller can hand this predicate — the M38 challenge
  // contract's "bounds hostile input" case does exactly that. A predicate
  // whose whole job is "may I index into this?" must answer no to a value it
  // cannot inspect, not throw. Wrapping the body cannot change the result for
  // any value that is inspectable: it only decides what happens for the ones
  // that are not.
  try {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  } catch {
    return false;
  }
}
