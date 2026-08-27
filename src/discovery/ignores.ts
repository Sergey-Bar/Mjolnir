/**
 * Default ignore list (Product-MVP.txt R1 — Tier-1 launch blocker).
 *
 * Resolution order: defaults → .mjolnirignore → user config → CLI flags (later wins).
 * All patterns use forward slashes; matching is path-separator agnostic.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_IGNORES: readonly string[] = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  "out/**",
  "coverage/**",
  ".nyc_output/**",
  ".turbo/**",
  ".next/**",
  ".nuxt/**",
  ".cache/**",
  "__snapshots__/**",
  "vendor/**",
  "**/*.min.js",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  // Phase 2 (Tempering Plan): unambiguous fixture/testdata conventions.
  // These directories hold test data by universal convention — scanning
  // them produces findings on files whose entire purpose is to contain
  // the anti-pattern being reported.
  "**/__fixtures__/**",
  "**/testdata/**",
];

/** Hard caps — malicious-repo guards (R3, Week-1 partial hardening). */
export const LIMITS = {
  /** Files larger than this are skipped and reported as observations. */
  maxFileBytes: 1 * 1024 * 1024,
  /** Directory traversal never goes deeper than this. */
  maxDepth: 32,
} as const;

/**
 * Check if a relative path should be ignored during discovery.
 * Checks DEFAULT_IGNORES, .mjolnirignore patterns, and config exclude
 * patterns (all loaded lazily and cached per root).
 */
export function isDefaultIgnored(relPath: string): boolean {
  const p = relPath.replaceAll("\\", "/");
  return getAllIgnorePatterns().some((pattern) =>
    globToRegExp(pattern).test(p),
  );
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

// ─── .mjolnirignore support ──────────────────────────────────────────

let cachedRoot: string | null = null;
let cachedExtraPatterns: string[] = [];

/**
 * Initialize ignore state for a workspace root. Call once before scanning.
 * Loads .mjolnirignore and config exclude patterns.
 */
export function initIgnores(root: string): void {
  if (cachedRoot === root) return;
  cachedRoot = root;
  cachedExtraPatterns = [];

  // Load .mjolnirignore (same glob dialect as DEFAULT_IGNORES)
  const ignorePath = join(root, ".mjolnirignore");
  if (existsSync(ignorePath)) {
    try {
      const content = readFileSync(ignorePath, "utf8");
      const patterns = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));
      cachedExtraPatterns.push(...patterns);
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
        cachedExtraPatterns.push(...cfg.exclude);
      }
    } catch {
      // Malformed config — ignore silently
    }
  }
}

/**
 * Reset cached ignore state. Used in tests.
 */
export function _resetIgnoresForTests(): void {
  cachedRoot = null;
  cachedExtraPatterns = [];
}

function getAllIgnorePatterns(): readonly string[] {
  if (cachedExtraPatterns.length === 0) return DEFAULT_IGNORES;
  return [...DEFAULT_IGNORES, ...cachedExtraPatterns];
}

// ─── Glob matching ───────────────────────────────────────────────────

/** Minimal glob matcher for our ignore patterns (`**`, `*`, literal). */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c: string = glob[i] ?? "";
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // `**/` matches zero or more path segments; `**` matches anything.
        if (glob[i + 2] === "/") {
          re += "(?:.*/)?";
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
  return new RegExp(`^${re}$`);
}
