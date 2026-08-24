/**
 * Default ignore list (Product-MVP.txt R1 — Tier-1 launch blocker).
 *
 * Resolution order: defaults → user config → CLI flags (later wins).
 * All patterns use forward slashes; matching is path-separator agnostic.
 */

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
];

/** Hard caps — malicious-repo guards (R3, Week-1 partial hardening). */
export const LIMITS = {
  /** Files larger than this are skipped and reported as observations. */
  maxFileBytes: 1 * 1024 * 1024,
  /** Directory traversal never goes deeper than this. */
  maxDepth: 32,
} as const;

export function isDefaultIgnored(relPath: string): boolean {
  const p = relPath.replaceAll("\\", "/");
  return DEFAULT_IGNORES.some((pattern) => globToRegExp(pattern).test(p));
}

/** Minimal glob matcher for our ignore patterns (`**`, `*`, literal). */
function globToRegExp(glob: string): RegExp {
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
