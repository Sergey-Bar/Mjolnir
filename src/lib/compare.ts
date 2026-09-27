/**
 * Order that does not depend on who is asking.
 *
 * `String.prototype.localeCompare` with no locale argument resolves against
 * the PROCESS's default locale — the ICU collation chosen by `LANG`,
 * `LC_ALL` or the OS. So a sort written as
 * `[...xs].sort((a, b) => a.localeCompare(b))` produces a different order on
 * a developer's `de_DE` machine than on an en-US CI runner. For a display
 * list that is a nuisance; for anything that reaches a hash, a cache key, a
 * digest or a machine contract it is a correctness bug, because the same
 * repository then produces two different fingerprints.
 *
 * Two comparators, one per kind of site:
 *
 *   compareCodePoints — pure UTF-16 code-unit order. Identical everywhere,
 *   independent of ICU version, and already what `Array.prototype.sort`
 *   defaults to. Use for every value that reaches a fingerprint, a digest,
 *   a cache key, or a contract, and for any ordering with no human-facing
 *   reason to be pretty.
 *
 *   compareLocalized(locale) — the same collator, PINNED to a named locale
 *   instead of inheriting the environment, for a surface that genuinely
 *   wants readable order (a table of rule titles, a Mermaid legend). Pinned
 *   rather than removed because a reader-facing list of "Test / Logic /
 *   Mock" should not be ordered by code unit.
 *
 * A bare `localeCompare` with no second argument in `src/` is a defect and
 * `tests/contract/deterministic-ordering.spec.ts` fails the build on it.
 */

/** Code-unit order. Locale-free, ICU-free, and the Array.sort default. */
export function compareCodePoints(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * A readable-order comparator pinned to `locale`.
 *
 * The pin is the point: `a.localeCompare(b)` reads the environment, and the
 * environment is a machine setting, not a property of the code. Callers that
 * want stable output ask for a named locale and get the same answer on every
 * machine that ships the same ICU data.
 */
export function compareLocalized(
  locale: string,
): (a: string, b: string) => number {
  return (a, b) => a.localeCompare(b, locale);
}

/** The locale human-facing surfaces pin to. */
export const DISPLAY_LOCALE = "en";
