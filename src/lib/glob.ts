/**
 * One glob dialect, one compiler.
 *
 * This repository compiled globs twice, independently, and they disagreed:
 *
 *  - `src/discovery/ignores.ts` treated `?` as "any one character".
 *  - `src/engine/scan-pipeline.ts` treated `?` as a LITERAL question mark.
 *  - The two also compiled a trailing `**` differently, and mid-pattern `**`
 *    to different segment-repeat forms.
 *
 * That is not a cosmetic difference. The mass-suppression integrity gate
 * measures the suppressed set with the ignores dialect while the scan applies
 * the suppressions with the scan-pipeline dialect, so the gate could report a
 * suppressed ratio for a set that was never suppressed — a gate measuring a
 * different thing than the thing it is a gate about.
 *
 * `pathMatchesGlob` is the authority, because it is the dialect the SCAN
 * actually applies. Everything else delegates here.
 *
 * * **The dialect, precisely.**
 *
 *  - `*` matches within one segment, never across `/`.
 *  - a `**` SEGMENT matches zero or more whole segments, so a
 *    double-star between slashes matches the empty case as well as any depth.
 *  - a trailing `**` matches everything INSIDE the prefix, and never the
 *    prefix directory itself (gitignore semantics).
 *  - `?`, `[...]` and `!` are NOT metacharacters. They are literal
 *    characters.
 *
 * That last line is a narrowing for config `exclude` patterns, which accepted
 * `?` as a wildcard. It is the right direction to narrow: a suppression that
 * silently stops matching is a scan that silently starts reporting findings
 * someone chose to hide, which is worse than an exclude that stops matching and
 * produces findings. It also makes the two surfaces say the same thing, which
 * is the entire point of this module.
 */

import { compareCodePoints } from "./compare.js";

/**
 * The shared segment compiler: a glob to a regex BODY, with no anchors.
 *
 * Module-private because the anchoring is a caller decision and the DIALECT is
 * not: the repository needs a full-path match and a bare-name-at-any-depth
 * match, and duplicating the segment walk to get the second one is exactly how
 * two compilers came to disagree. Callers pick an anchoring; the dialect is
 * decided here and nowhere else.
 *
 * `?`, `[`, `]`, `!` and every other regex metacharacter in the literal parts
 * are escaped, so nothing a user writes in a config or ledger can reach the
 * regex engine as syntax. `*` is the only metacharacter.
 */
function globBody(glob: string): string {
  const segments = glob.replaceAll("\\", "/").split("/");
  let re = "";
  for (const [i, segment] of segments.entries()) {
    const last = i === segments.length - 1;
    if (segment === "**") {
      // Zero or more WHOLE segments. The `*` on the group is what makes
      // `a/**/b` match `a/b`; the old ignores dialect used `[^/]*` inside the
      // group, which also matched the empty segment `a//b`.
      re += last ? "(?:[^/]+/)*[^/]+" : "(?:[^/]+/)*";
      continue;
    }
    re += segment
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replaceAll("*", "[^/]*");
    if (!last) re += "/";
  }
  return re;
}

/** A glob as a regex anchored to the WHOLE path. */
export function anchoredGlobRegExp(glob: string): RegExp {
  // Every literal metacharacter is escaped inside `globBody`; the only
  // unescaped syntax is the `*` substitution and the `**` segment forms it
  // emits.
  // eslint-disable-next-line security/detect-non-literal-regexp
  return new RegExp(`^${globBody(glob)}$`);
}

/**
 * A glob as a regex matching at ANY DEPTH — a bare name.
 *
 * `node_modules` becomes "a file or directory of this name anywhere", which is
 * gitignore semantics: every path inside the directory contains the segment, so
 * a directory match carries to its contents.
 */
export function anyDepthGlobRegExp(glob: string): RegExp {
  // eslint-disable-next-line security/detect-non-literal-regexp
  return new RegExp(`(?:^|/)${globBody(glob)}(?:/|$)`);
}

/**
 * Whether `path` matches `glob`, in the dialect documented above.
 *
 * Both sides are normalized to forward slashes first. Finding paths are already
 * normalized by the walker, but a suppression `files` pattern written on
 * Windows ("e2e\\x.spec.ts") compiled to a literal-backslash regex that could
 * never match any finding — the suppression silently never applied, which is
 * the defect that made the whole dialect worth unifying.
 */
export function pathMatchesGlob(path: string, glob: string): boolean {
  return anchoredGlobRegExp(glob).test(path.replaceAll("\\", "/"));
}

/**
 * A predicate over many globs, OR-ed.
 *
 * Sorted so the function's identity does not depend on the order the config
 * happened to list its patterns in — a matcher whose behaviour changes with
 * declaration order is a matcher two callers can disagree about.
 */
export function matchesAnyGlob(
  path: string,
  globs: readonly string[],
): boolean {
  return [...globs]
    .sort(compareCodePoints)
    .some((glob) => pathMatchesGlob(path, glob));
}
