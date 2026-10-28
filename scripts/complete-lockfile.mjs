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
 * WHAT IS RESTORED, AND WHAT IS NOT
 *
 * Only PLATFORM entries (an `os` or `cpu` field) that the current tree still
 * asks for, at the exact version it asks for. The first version restored every
 * key the known-good lockfile had and the current one lacked — and a key a
 * dependency change legitimately removed is exactly such a key, so the tool
 * resurrected it. That is how `siginfo` and `stackback` (dependencies of a
 * `why-is-node-running` that vitest no longer pulls in) sat in the committed
 * lockfile with nothing depending on them. A platform entry wanted at a range
 * rather than an exact version (`fsevents: "~2.3.3"`) is resolved from the
 * registry instead.
 *
 * A restored platform entry is copied alone, without its dependencies. None in
 * this tree has any; one that did would produce a lockfile that fails `npm ci`
 * on that platform, so the tool refuses rather than writing it.
 *
 * This is the recovery step, not the daily workflow. The daily workflow is
 * `npm run lockfile:platforms`, which fails the build when the lockfile has
 * been platform-reduced, so this has to be run at the moment someone has
 * changed dependencies and discovered the problem.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** `node_modules/a/node_modules/@s/b` → `@s/b`. */
function packageName(key) {
  const marker = "node_modules/";
  return key.slice(key.lastIndexOf(marker) + marker.length);
}

function isPlatformScoped(entry) {
  return Array.isArray(entry.os) || Array.isArray(entry.cpu);
}

/**
 * Complete `lock` against the known-good lockfile `good`. Mutates and returns
 * `lock`; `view(spec)` is a registry lookup (`npm view <spec> --json`, parsed)
 * and may throw for a spec the registry cannot resolve.
 *
 * @param {{ packages?: Record<string, any> }} lock
 * @param {{ packages?: Record<string, any> }} good
 * @param {(spec: string) => any} view
 * @returns {{ lock: { packages: Record<string, any> }, restored: string[], fetched: string[] }}
 */
export function completeLockfile(lock, good, view) {
  const packages = lock.packages ?? {};
  const goodPackages = good.packages ?? {};

  // What the CURRENT tree asks for, from every npm-written optional map.
  const wanted = new Map();
  for (const entry of Object.values(packages)) {
    if (!isRecord(entry) || !isRecord(entry.optionalDependencies)) continue;
    for (const [name, range] of Object.entries(entry.optionalDependencies)) {
      if (typeof range === "string") wanted.set(name, range);
    }
  }

  // 1. Platform entries the known-good lockfile had and the current tree still
  //    wants at that exact version.
  const restored = [];
  for (const [key, entry] of Object.entries(goodPackages)) {
    if (key in packages || !isRecord(entry) || !isPlatformScoped(entry))
      continue;
    if (wanted.get(packageName(key)) !== entry.version) continue;
    if (
      isRecord(entry.dependencies) &&
      Object.keys(entry.dependencies).length
    ) {
      throw new Error(
        `complete-lockfile: ${key} has dependencies, which this tool does not ` +
          "restore; the result would fail `npm ci` on that platform. Complete " +
          "this lockfile by hand.",
      );
    }
    packages[key] = entry;
    restored.push(key);
  }

  // 2. Anything still wanted and missing, resolved from the registry.
  const fetched = [];
  for (const [name, range] of wanted) {
    if (`node_modules/${name}` in packages) continue;
    let meta;
    try {
      meta = view(`${name}@${range}`);
    } catch {
      continue; // Not published, or a range we cannot pin. Not fatal.
    }
    if (!isRecord(meta) || !isRecord(meta.dist)) continue;
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
  return { lock, restored, fetched };
}

if (process.argv[1]?.endsWith("complete-lockfile.mjs")) {
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
  const view = (spec) =>
    JSON.parse(
      execFileSync("npm", ["view", spec, "--json"], {
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
        shell: process.platform === "win32",
      }),
    );
  const { lock, restored, fetched } = completeLockfile(
    JSON.parse(readFileSync(LOCK, "utf8")),
    good,
    view,
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
}
