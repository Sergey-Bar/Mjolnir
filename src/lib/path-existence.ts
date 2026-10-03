/**
 * One existence check, several callers.
 *
 * Every artifact claim in this repository is a path in a file: a
 * `dependencyResolution` citation in the archived program, an `evidence`
 * citation in the v6 inventory, a `regression_test` / `evidence_artifact` on a
 * ledger entry. Three checkers read those claims and all three were written
 * independently, which is how the same class of defect survived in three
 * places: each validator asked "is this field a non-empty string?" and none
 * asked whether the path exists. A ledger entry citing
 * `src/commands/debt.ts` — a file the carve deleted — validated clean, because
 * the string was a string.
 *
 * This module is the shared answer so the next caller cannot re-derive it
 * more weakly. It is deliberately narrow: it answers "does this path resolve
 * in this root", not "is this artifact meaningful". A path that exists but is
 * the wrong file is a different defect, and answering it here would mean this
 * function had opinions about content.
 */

import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";

/** One cited path that does not resolve. */
export interface MissingPath {
  /** The path exactly as it was cited, so the message is greppable. */
  path: string;
  /** What cited it — a train, a spec section, a gap id. */
  citedBy: string;
}

export interface PathClaim {
  /** The path as written in the source of truth. */
  path: string;
  /** What to name in the message: a train, a section, a gap id. */
  citedBy: string;
}

/**
 * Resolve `path` against `root`.
 *
 * Absolute paths are checked as given: a citation to an absolute path is
 * almost always a bug (it cannot resolve in another checkout), and rewriting
 * it with `join` would produce a nonsense path that silently "exists" or
 * silently does not, depending on the machine.
 *
 * `..` segments are NOT collapsed away, because a citation that escapes the
 * repository root is itself the defect, and normalizing first would hide it.
 */
function resolvesIn(root: string, path: string): boolean {
  if (isAbsolute(path)) return existsSync(path);
  return existsSync(join(root, path));
}

/** Every claim whose path does not resolve, in input order. */
export function findMissingPaths(
  root: string,
  claims: readonly PathClaim[],
): MissingPath[] {
  const seen = new Set<string>();
  const missing: MissingPath[] = [];
  for (const claim of claims) {
    // Dedupe on the pair, not the path: the same path cited by two trains is
    // two separate facts about the file, and reporting both is the point.
    const key = `${claim.citedBy}\u0000${claim.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!resolvesIn(root, claim.path)) {
      missing.push({ path: claim.path, citedBy: claim.citedBy });
    }
  }
  return missing;
}

/**
 * Report every claim whose path does not resolve, via `report`.
 *
 * `report` is called once per missing path rather than being handed a list,
 * because the three callers each need a different diagnostic shape: a string
 * in an `errors` array, a JSON row, or a typed ledger diagnostic. Returning a
 * list would force all three to unwrap and re-wrap.
 */
export function assertPathsExist(
  root: string,
  claims: readonly PathClaim[],
  report: (missing: MissingPath) => void,
): void {
  for (const missing of findMissingPaths(root, claims)) {
    report(missing);
  }
}

/**
 * Extract repo-relative paths from backticked spans in rendered markdown.
 *
 * The generated `.md` half of a docs artifact is a *rendering* of data the
 * JSON half carries, and it is hand-editable. That is the defect this
 * function exists to close: `scripts/check-provenance-artifacts.ts` compares
 * the committed JSON against a fresh render, so the JSON cannot drift from
 * the generator — but nothing checked the rendered markdown at all, which is
 * how `docs/V6-CURRENT-STATE.md:17` came to contradict the JSON beside it.
 *
 * Only spans that LOOK like repo paths are returned — they must contain a `/`
 * and must not be a bare word, a flag, an enum value, or a glob. This is
 * deliberately a heuristic: a false positive produces a gate failure naming a
 * path that does not exist, which is a one-line fix, whereas a false negative
 * silently keeps the defect.
 */
export function backtickedPaths(markdown: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of markdown.matchAll(/`([^`\n]+)`/g)) {
    const span = match[1];
    if (span === undefined) continue;
    // Must look like a path: a separator, no spaces (prose in backticks is
    // not a path), and a known source-ish extension or a directory shape.
    if (/\s/.test(span)) continue;
    if (!span.includes("/")) continue;
    // Flags and options render in backticks too (`--strict`, `-t name`).
    if (span.startsWith("-")) continue;
    // A glob describes a set of files; there is no single path to check.
    if (/[*?[\]{}]/.test(span)) continue;
    // Must be repo-relative. An absolute or protocol-ish span is prose.
    if (span.startsWith("/") || /^[a-z]+:\/\//i.test(span)) continue;
    // A path with a known code/doc extension is one; a bare `lib/helper` is
    // not — there is no such file to check, so requiring an extension is what
    // keeps this heuristic from flagging every prose fragment. (`script:paths`
    // enforces the same shape on comments, so an example written here as a
    // real path would fail that gate — which is exactly the point of it.)
    if (!/\.[a-z0-9]{1,6}$/i.test(span)) continue;
    if (seen.has(span)) continue;
    seen.add(span);
    out.push(span);
  }
  return out;
}
