/**
 * complete-lockfile — add the optional platform entries a single-platform
 * lockfile generation cannot produce.
 *
 * Usage: node scripts/complete-lockfile.mjs <known-good-ref>
 *
 * THE PROBLEM
 *
 * `npm install --package-lock-only` on Windows writes a lockfile containing
 * only the win32 variants of optional native dependencies: 475 packages and
 * one os/cpu combination. A lockfile CI can install from has 567 packages and
 * 26 combinations, because CI builds on ubuntu, macOS and windows.
 *
 * So the committed lockfile cannot be regenerated on this machine at all. It
 * can only be completed: take the last lockfile CI accepted — which has the
 * full cross-platform set for every dependency that existed then — and add the
 * platform variants of anything added since, resolved from the registry.
 *
 * Every npm-generated `optionalDependencies` map in the lockfile is the
 * authoritative list of a package's platform variants, so this walks those maps
 * and fills in whatever entries are missing. It reads the registry for the
 * fields npm writes (integrity, tarball, os, cpu), so the result is the same
 * shape npm would have produced — not a hand-written approximation.
 *
 * This is the recovery step, not the daily workflow. The daily workflow is
 * `npm run lockfile:platforms`, which fails the build when the lockfile has
 * been platform-reduced, so this has to be run at the moment someone has
 * changed dependencies and discovered the problem.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const LOCK = "package-lock.json";
const knownGoodRef = process.argv[2];
if (knownGoodRef === undefined) {
  console.error(
    "usage: node scripts/complete-lockfile.mjs <known-good-git-ref>",
  );
  process.exit(1);
}

const good = JSON.parse(
  execFileSync("git", ["show", `${knownGoodRef}:${LOCK}`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }),
);
const lock = JSON.parse(readFileSync(LOCK, "utf8"));

const goodPackages = good.packages ?? {};
const packages = lock.packages ?? {};

// 1. Everything the known-good lockfile had, which CI accepted.
const restored = [];
for (const [key, entry] of Object.entries(goodPackages)) {
  if (key in packages) continue;
  packages[key] = entry;
  restored.push(key);
}

// 2. Every optional variant named by the dependency tree, minus what we have.
const wanted = new Map();
for (const entry of Object.values(packages)) {
  if (entry === null || typeof entry !== "object") continue;
  const optionals = entry.optionalDependencies;
  if (optionals === null || typeof optionals !== "object") continue;
  for (const [name, range] of Object.entries(optionals)) {
    if (typeof range !== "string") continue;
    wanted.set(name, range);
  }
}

const missing = [...wanted].filter(
  ([name]) => !(`node_modules/${name}` in packages),
);
const fetched = [];
for (const [name, range] of missing) {
  let meta;
  try {
    meta = JSON.parse(
      execFileSync("npm", ["view", `${name}@${range}`, "--json"], {
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
        shell: process.platform === "win32",
      }),
    );
  } catch {
    continue; // Not published, or a range we cannot pin. Not fatal.
  }
  if (meta === null || typeof meta !== "object" || meta.dist === undefined) {
    continue;
  }
  packages[`node_modules/${name}`] = {
    version: meta.version,
    resolved: meta.dist.tarball,
    integrity: meta.dist.integrity,
    ...(meta.license ? { license: meta.license } : {}),
    ...(Array.isArray(meta.os) ? { os: meta.os } : {}),
    ...(Array.isArray(meta.cpu) ? { cpu: meta.cpu } : {}),
    optional: true,
  };
  fetched.push(`${name}@${meta.version}`);
}

lock.packages = Object.fromEntries(
  Object.entries(packages).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
);
writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify({
    restoredFromKnownGood: restored.length,
    fetchedFromRegistry: fetched.length,
    fetched: fetched.slice(0, 12),
    totalPackages: Object.keys(lock.packages).length,
  }),
);
