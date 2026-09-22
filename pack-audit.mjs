/**
 * Pack-audit gate (SC-6, master plan 1789041108156 §6): the npm tarball
 * may contain ONLY whitelisted intent — shippable product code, the
 * package metadata npm mandates, and the README set. No tests, no
 * coverage, no scratch, no sourcemaps, no machine-local agent dirs, no
 * local paths, no secret material.
 *
 * Runs against the EXACT tarball the publication step uploads (the
 * release job packs once, audits, then publishes that same file — no
 * second pack, no "equivalent source").
 *
 * Usage: node scripts/pack-audit.mjs <mjolnir-qa-<version>.tgz>
 * Exit codes: 0 = clean, 1 = violations (blocks the release).
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const tgz = process.argv[2];

if (!tgz || !existsSync(tgz) || !statSync(tgz).isFile()) {
  console.error(
    `pack-audit: usage: node scripts/pack-audit.mjs <mjolnir-qa-<version>.tgz>`,
  );
  process.exit(1);
}

const violations = [];
const allow = (entry) => {
  if (entry === "package/package.json") return true;
  if (entry === "package/LICENSE") return true;
  if (entry === "package/CHANGELOG.md") return true;
  if (/^package\/README[^/]*\.md$/.test(entry)) return true;
  // The shipped product: the CLI bundle, its types, the MCP stdio
  // entry. Source maps are deliberately absent (tsdown emits none).
  if (/^package\/dist\/[^/]+\.(mjs|cjs|d\.mts|d\.ts)$/.test(entry)) return true;
  if (/^package\/dist\/mcp\/[^/]+\.(mjs|cjs|d\.mts|d\.ts)$/.test(entry))
    return true;
  return false;
};

/** Patterns no shipped artifact may contain (local paths, key material). */
const CONTENT_PATTERNS = [
  /BEGIN (RSA |OPENSSH |EC |PGP |DSA )?PRIVATE KEY/,
  /C:\\\\?Users\\\\?[^"'\\]+/,
  /\/home\/[a-z0-9_-]+\//,
];

const listing = execFileSync("tar", ["-tzf", tgz], { encoding: "utf8" })
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

for (const raw of listing) {
  // Directory entries (some tar implementations emit them, npm's own
  // packer does not): skipped for the allowlist, still checked against
  // the forbidden patterns (a shipped `tests/` directory is a violation
  // no matter who wrote the tarball).
  const isDir = raw.endsWith("/");
  const entry = isDir ? raw.slice(0, -1) : raw;
  const inRoot = entry === "package" || entry.startsWith("package/");
  if (!inRoot || entry.includes("..")) {
    violations.push(`entry escapes the package root: ${entry}`);
    continue;
  }
  if (
    /\.map$/.test(entry) ||
    /(^|\/)(tests?|coverage|scratch|\.mjolnir|\.claude|\.agents|\.git|\.github)(\/|$)/.test(
      entry,
    ) ||
    /\.env($|\.)/.test(entry)
  ) {
    violations.push(`forbidden entry: ${entry}`);
    continue;
  }
  if (!isDir && !allow(entry)) {
    violations.push(
      `entry outside the whitelisted intent (update scripts/pack-audit.mjs deliberately if it truly belongs): ${entry}`,
    );
  }
}

// The product must actually be inside.
for (const required of [
  "package/dist/cli.mjs",
  "package/dist/mcp/stdio.mjs",
  "package/package.json",
]) {
  if (!listing.includes(required)) {
    violations.push(`required entry missing from the tarball: ${required}`);
  }
}

// Content audit: extract and scan every file (bounded at 1 MB each).
const tmp = mkdtempSync(join(tmpdir(), "mjolnir-pack-audit-"));
try {
  execFileSync("tar", ["-xzf", tgz, "-C", tmp]);
  const scan = (dir) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, f.name);
      if (f.isDirectory()) {
        scan(full);
        continue;
      }
      if (!f.isFile() || statSync(full).size > 1024 * 1024) continue;
      const text = readFileSync(full, "utf8");
      for (const pattern of CONTENT_PATTERNS) {
        if (pattern.test(text)) {
          violations.push(
            `local-path/secret pattern in ${full.slice(tmp.length + 1)}: ${pattern}`,
          );
        }
      }
    }
  };
  scan(tmp);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (violations.length > 0) {
  console.error(`pack-audit: ${violations.length} violation(s) in ${tgz}:`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    "pack-audit: the tarball is not publishable — fix the pack intent (package.json files / build config), never widen this audit to make it pass.",
  );
  process.exit(1);
}
console.log(
  `pack-audit: ${listing.length} entries, all within the whitelisted intent; no local paths or secret material — ${tgz} is publishable ✓`,
);
