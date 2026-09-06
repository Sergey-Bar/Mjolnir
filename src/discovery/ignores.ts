/**
 * Ignore resolution (Product-MVP.txt R1 — Tier-1 launch blocker).
 *
 * Resolution order: defaults → .mjolnirignore → user config exclude.
 *
 * Pattern syntax — the supported gitignore subset, stated honestly:
 *   - `**`, `*`, `?` wildcards
 *   - a pattern containing `/` is anchored to the scanned root
 *   - a BARE NAME (no `/`) matches at any depth, like gitignore —
 *     "node_modules" ignores every node_modules directory, not just a
 *     root-level one. DEFAULT_IGNORES deliberately uses bare names for
 *     build/dependency directories: any directory named e.g. `out/` or
 *     `build/` at any depth is ignored (gitignore-standard semantics,
 *     the M-01 fix — anchored forms missed monorepo-nested dirs).
 *   - `!pattern` negates; the LAST matching pattern wins, like gitignore
 * Not supported (and not claimed): trailing-`/` directory-only markers.
 *
 * Audits R-8/R-10: ignore state is no longer module-global mutable. Each
 * scan resolves one immutable IgnoreMatcher for its root and threads it
 * through ScanContext, so scanning two roots in one process (library
 * use, the corpus audit, a future watch mode) can never apply the first
 * root's .mjolnirignore to the second. Patterns are also compiled once
 * per matcher instead of once per pattern per walked path.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_IGNORES: readonly string[] = [
  // Bare names (no `/`) — gitignore semantics: the matcher compiles them
  // to `(?:^|/)name(?:/|$)`, so they match at ANY depth. Bug Map M-01:
  // the previous anchored `X/**` forms only matched at the scan root, so
  // `packages/*/node_modules`, nested `dist/`/`build/` etc. in monorepos
  // were discovered and scanned. Deliberate acceptance (gitignore-standard):
  // ANY directory named e.g. `out/` or `build/` at any depth is ignored.
  "node_modules",
  ".git",
  // The tool's own state directory (baseline.json is read directly, not
  // discovered; M5.2 adds .mjolnir/cache/). Its contents are machine
  // state, never test sources.
  ".mjolnir",
  "dist",
  "build",
  "out",
  "coverage",
  ".nyc_output",
  ".turbo",
  ".next",
  ".nuxt",
  ".cache",
  "__snapshots__",
  "vendor",
  "**/*.min.js",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  // Phase 2 (Tempering Plan): unambiguous fixture/testdata conventions.
  // These directories hold test data by universal convention — scanning
  // them produces findings on files whose entire purpose is to contain
  // the anti-pattern being reported. M-01: bare names now, so nested
  // `packages/app/__fixtures__/` is covered too.
  "__fixtures__",
  "testdata",
  // Dogfood-corpus guard (Bug Map M-04, defense in depth for self-scan):
  // the FP corpus audit clones real-world repos under tests/corpus/.cache*
  // — never committed, and their contents are test DATA. Anchored glob
  // form (`**` → `(?:.*/)?`, `[^/]*` covers the `-kit` suffix); do NOT
  // use the trailing-`/` directory marker the matcher doesn't support.
  // Matches only this path shape, never anything in a consumer repo.
  "tests/corpus/.cache*/**",
];

/** Hard caps — malicious-repo guards (R3, Week-1 partial hardening). */
export const LIMITS = {
  /** Files larger than this are skipped and reported as observations. */
  maxFileBytes: 1 * 1024 * 1024,
  /** Directory traversal never goes deeper than this. */
  maxDepth: 32,
  /**
   * Per-adapter discovery budget (audit H-8): each adapter may add at
   * most this many test files, so a first-running language cannot
   * consume the whole list and silently starve the others.
   *
   * Deliberately the SAME number the pre-audit global cap used. H-8 was
   * about the budget being shared (TypeScript could eat all of it and
   * leave Python/Java/C# with nothing, silently); it was not a request
   * to scan fewer files. A lower per-adapter figure would turn an
   * ordinary 3k-file monorepo into a `partial` scan — trading one
   * honesty defect for another.
   */
  maxFilesPerAdapter: 10_000,
  /**
   * Per-FILE analysis budget in ms (audit P-1): scan cost must be
   * linear in repo size, not quadratic in file size. A file whose rule
   * pass exceeds this is skipped mid-way — counted, flagged partial,
   * named in analysisStatus.truncationReasons as "file-budget".
   */
  maxFileAnalysisMs: 5_000,
  /**
   * Audit S2: ignore/glob pattern caps. A pattern (operator config or
   * hostile-repo .mjolnirignore) longer than this, or with more
   * wildcards than this, is rejected at compile time — regex
   * construction cost and match cost are bounded by the pattern, so the
   * caps bound both. Note: the compiled regexes run SYNCHRONOUSLY in
   * the scan loop and cannot be interrupted; the caps are what make
   * that safe.
   */
  maxPatternLength: 512,
  maxPatternWildcards: 64,
} as const;

/** An immutable, per-root resolved ignore matcher (audit R-8). */
export interface IgnoreMatcher {
  isIgnored(relPath: string): boolean;
}

interface CompiledPattern {
  negated: boolean;
  re: RegExp;
}

/**
 * Resolve the full ignore chain for one root: DEFAULT_IGNORES plus
 * .mjolnirignore plus mjolnir.config.json `exclude`. Malformed or
 * unreadable sources degrade to the defaults, never throw.
 */
export function createIgnoreMatcher(root: string): IgnoreMatcher {
  return createMatcherFromPatterns(loadExtraPatterns(root));
}

export function createMatcherFromPatterns(
  extra: readonly string[],
): IgnoreMatcher {
  const compiled: CompiledPattern[] = [];
  for (const raw of [...DEFAULT_IGNORES, ...extra]) {
    const entry = compilePattern(raw);
    if (entry) compiled.push(entry);
  }
  return {
    isIgnored(relPath: string): boolean {
      const p = relPath.replaceAll("\\", "/");
      // Last matching pattern wins — negation (`!pattern`) un-ignores.
      let ignored = false;
      for (const { negated, re } of compiled) {
        if (re.test(p)) ignored = !negated;
      }
      return ignored;
    },
  };
}

function loadExtraPatterns(root: string): string[] {
  const extra: string[] = [];

  // Load .mjolnirignore (same supported dialect as DEFAULT_IGNORES)
  const ignorePath = join(root, ".mjolnirignore");
  if (existsSync(ignorePath)) {
    try {
      const content = readFileSync(ignorePath, "utf8");
      const patterns = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));
      extra.push(...patterns);
    } catch {
      // Unreadable — ignore silently
    }
  }

  // Load exclude patterns from mjolnir.config.json
  const configPath = join(root, "mjolnir.config.json");
  if (existsSync(configPath)) {
    try {
      const cfg = JSON.parse(readFileSync(configPath, "utf8")) as {
        exclude?: string[];
      };
      if (Array.isArray(cfg.exclude)) {
        // Bug-audit QA-2026-08-30 QA-4 (defense in depth): validate()
        // rejects non-string exclude entries with a fixable exit-10
        // error; this filter keeps a programmatically-built matcher from
        // crashing on them anyway.
        extra.push(
          ...cfg.exclude.filter((p): p is string => typeof p === "string"),
        );
      }
    } catch {
      // Malformed config — ignore silently
    }
  }

  return extra;
}

function compilePattern(raw: string): CompiledPattern | null {
  // Bug-audit QA-2026-08-30 QA-4 (defense in depth): non-string patterns
  // (hostile/malformed config) must not reach string methods.
  if (typeof raw !== "string") return null;
  let pattern = raw;
  let negated = false;
  if (pattern.trim() === "") return null;
  if (pattern.startsWith("!")) {
    negated = true;
    pattern = pattern.slice(1);
  }
  if (pattern.trim() === "") return null;
  // Audit S2: pattern caps — length and wildcard count bound both regex
  // construction cost and per-path match cost. A pattern over the cap is
  // rejected at compile (never at match time); a hostile
  // .mjolnirignore with a megabyte of `*a*a*a*…` cannot own the scan.
  if (pattern.length > LIMITS.maxPatternLength) return null;
  const wildcards = (pattern.match(/[*?]/g) ?? []).length;
  if (wildcards > LIMITS.maxPatternWildcards) return null;
  const re = pattern.includes("/")
    ? // eslint-disable-next-line security/detect-non-literal-regexp -- glob compiled from mjolnir.config.json exclude — operator-owned config (§21 trust boundary)
      new RegExp(`^${globBody(pattern)}$`)
    : // Bare name: gitignore semantics — matches a file or directory
      // with this name at ANY depth (a directory match ignores its
      // contents, since every file path inside contains the segment).
      // eslint-disable-next-line security/detect-non-literal-regexp -- glob compiled from mjolnir.config.json exclude — operator-owned config (§21 trust boundary)
      new RegExp(`(?:^|/)${globBody(pattern)}(?:/|$)`);
  return { negated, re };
}

/** The minimal glob dialect as a regex body without anchors. */
function globBody(glob: string): string {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    // i < glob.length guarantees the element exists.
    const c: string = glob[i] as string;
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // Audit S2: `**/` compiles to the segment-aware form — one
        // bounded unit per path segment, repeated. The old `.*` spanned
        // slashes (nested-quantifier surface, and looser than gitignore:
        // it matched `b` inside `a/b/**/c` even when `b` was not a real
        // segment boundary). `(?:[^/]*/)*` matches zero-or-more WHOLE
        // segments with no ambiguity between repeats — gitignore
        // semantics, linear match cost.
        if (glob[i + 2] === "/") {
          re += "(?:[^/]*/)*";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return re;
}

/** Anchored full-path glob — the primitive the matcher builds on. */
export function globToRegExp(glob: string): RegExp {
  // eslint-disable-next-line security/detect-non-literal-regexp -- glob compiled from mjolnir.config.json exclude — operator-owned config (§21 trust boundary)
  return new RegExp(`^${globBody(glob)}$`);
}

/** Defaults-only matcher for callers that have no scan context. */
export const DEFAULT_IGNORE_MATCHER: IgnoreMatcher = createMatcherFromPatterns(
  [],
);
export function isDefaultIgnored(relPath: string): boolean {
  return DEFAULT_IGNORE_MATCHER.isIgnored(relPath);
}

/**
 * Check if a directory is a lint-fixture shape (Phase 2 auto-detection).
 * A directory that contains sibling `must-fire/` and `must-not-fire/`
 * subdirectories has exactly one meaning: it holds rule test fixtures.
 * Returns true if the directory should be skipped entirely.
 */
export function isLintFixtureDir(absoluteDir: string): boolean {
  try {
    const entries = readdirSync(absoluteDir, { withFileTypes: true });
    const names = new Set(
      entries.filter((e) => e.isDirectory()).map((e) => e.name),
    );
    return names.has("must-fire") && names.has("must-not-fire");
  } catch {
    return false;
  }
}
