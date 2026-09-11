/**
 * SC-8 — same-input clean-build determinism under the pinned project
 * toolchain (master plan 1789041108156 §6, MR-8.C).
 *
 * Builds the SAME commit twice from two independent clean checkouts
 * (fresh `git worktree` + fresh `npm ci` from the committed lockfile)
 * and compares every dist/ artifact byte-for-byte, then packs twice and
 * compares the tarballs. Any difference is reported as the EXACT
 * limitation — the honest claim this gate supports is "same-input
 * clean-build determinism under the pinned project toolchain", never a
 * cross-environment "reproducible builds" claim.
 *
 * Requires a clean working tree (a fixed input). Runtime: two full
 * installs + builds (~10-20 min).
 *
 * Usage: node scripts/verify-build-determinism.mjs
 * Exit codes: 0 = deterministic, 1 = differences found, 2 = setup error.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

const ROOT = process.cwd();
// Windows: npm is npm.cmd — spawnSync cannot exec .cmd files by bare name.
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

const sha256 = (p) =>
  createHash("sha256").update(readFileSync(p)).digest("hex");

function distManifest(dir) {
  const out = {};
  const walk = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, f.name);
      if (f.isDirectory()) walk(full);
      else out[relative(dir, full).replaceAll("\\", "/")] = sha256(full);
    }
  };
  walk(dir);
  return out;
}

function run() {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const dirty = execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim();
  if (dirty) {
    console.error(
      "SC-8: the working tree is dirty — determinism needs a fixed input. Commit or stash first.",
    );
    return { diffs: null, tarballNote: "" };
  }

  console.log(
    `SC-8: building commit ${sha} twice from independent clean checkouts...\n`,
  );
  const worktrees = [];
  try {
    const manifests = [];
    const tarballHashes = [];
    for (let i = 0; i < 2; i++) {
      // NOT pre-created: `git worktree add` refuses an existing directory
      // and creates it itself.
      const wt = join(
        tmpdir(),
        `sc8-build-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      );
      worktrees.push(wt);
      execFileSync("git", ["worktree", "add", "--detach", wt, sha], {
        cwd: ROOT,
        stdio: "pipe",
      });
      console.log(`  build ${i + 1}: ${wt}`);
      execFileSync(NPM, ["ci", "--no-fund", "--no-audit", "--loglevel=error"], {
        cwd: wt,
        stdio: "inherit",
      });
      execFileSync(NPM, ["run", "build", "--silent"], {
        cwd: wt,
        stdio: "inherit",
      });
      manifests.push(distManifest(join(wt, "dist")));
      execFileSync(
        NPM,
        ["pack", "--pack-destination", join(wt, "pack"), "--silent"],
        {
          cwd: wt,
          stdio: "pipe",
        },
      );
      const tgz = readdirSync(join(wt, "pack"))[0];
      tarballHashes.push([tgz, sha256(join(wt, "pack", tgz))]);
    }

    const diffs = [];
    const keys = Object.keys(manifests[0]).sort();
    const keys2 = Object.keys(manifests[1]).sort();
    for (const k of new Set([...keys, ...keys2])) {
      if (!(k in manifests[0])) diffs.push(`${k}: missing from build 1`);
      else if (!(k in manifests[1])) diffs.push(`${k}: missing from build 2`);
      else if (manifests[0][k] !== manifests[1][k]) {
        diffs.push(
          `${k}: ${manifests[0][k].slice(0, 12)}… != ${manifests[1][k].slice(0, 12)}…`,
        );
      }
    }

    console.log(`\n  dist artifacts compared: ${keys.length} files`);
    if (diffs.length > 0) {
      console.log("  DIST DIFFERENCES (nondeterminism):");
      for (const d of diffs) console.log(`    ${d}`);
    } else {
      console.log("  dist: byte-identical across both clean builds ✓");
    }

    const [t1, t2] = tarballHashes;
    console.log(
      `\n  tarballs: ${t1[0]} (${t1[1].slice(0, 16)}…) vs ${t2[0]} (${t2[1].slice(0, 16)}…)`,
    );
    const tarballNote =
      t1[1] === t2[1]
        ? "  tarball: byte-identical ✓"
        : "  tarball: differs — npm pack embeds file mtimes; the exact " +
          "limitation is the tar envelope, not the shipped bytes (dist/ is the authority).";
    console.log(tarballNote);
    return { diffs, tarballNote };
  } finally {
    for (const wt of worktrees) {
      try {
        execFileSync("git", ["worktree", "remove", "--force", wt], {
          cwd: ROOT,
          stdio: "pipe",
        });
      } catch {
        /* already gone */
      }
      rmSync(wt, { recursive: true, force: true });
    }
  }
}

const { diffs } = run();
if (diffs === null) process.exit(2);
console.log(
  `\nSC-8 verdict: ${diffs.length === 0 ? "same-input clean-build DETERMINISTIC (dist/)" : "NONDETERMINISTIC — investigate"} (pinned toolchain; no cross-environment claim)`,
);
process.exit(diffs.length > 0 ? 1 : 0);
