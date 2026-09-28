import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Line-ending normalisation for the working-tree hash.
 *
 * 6.0. `workingTreeSha256` hashed the working-tree bytes directly, which made
 * it a property of the CHECKOUT rather than of the repository: git's
 * `core.autocrlf` gives a Windows working tree CRLF and a Linux one LF for
 * the same commit, so a manifest stamped on one platform failed
 * `check-candidate-manifest` on the other. It went unnoticed because the
 * stamp and the check both ran on the author's machine, and CI — which runs
 * Linux — is the first place the two could ever have disagreed.
 *
 * A "working tree hash" that changes when the file content does not is not a
 * working tree hash. Normalising CRLF keeps the property that matters — an
 * unstaged edit changes the hash — and drops the one that does not.
 *
 * Implemented at the BYTE level, not via a string round-trip. The first
 * version did `buffer.toString("utf8").replaceAll(...)`, and a spec asserting
 * binary passthrough caught it immediately: decoding invalid UTF-8 replaces
 * every bad byte with U+FFFD, so every binary asset in the tree — images,
 * the WASM grammars, the packed icon — would hash differently from a byte
 * mangling nobody chose. That is a worse cross-platform defect than the one
 * this replaces, and it was introduced by the fix for the first one.
 *
 * A buffer-level `CRLF -> LF` rewrite cannot touch a byte it was not told
 * to, so a binary file with no CRLF pair is bit-identical afterwards.
 *
 * A lone `0D` is deliberately left alone. It is a line ending in old-Mac
 * Python source, but it is also a legitimate byte inside a string literal, and
 * normalising it would change the meaning of the file it claims to describe.
 *
 * Exported so the property is testable WITHOUT mutating a tracked file: a
 * test that rewrites a file in the working tree races every parallel worker
 * that hashes the tree, which is how the first version of this suite made
 * `candidate-manifest.spec.ts` fail intermittently three suites away from the
 * cause.
 */
export function normalizeForHash(buffer) {
  // Fast path: most files contain no CRLF at all, and a scan is cheaper than
  // building a second copy of the content.
  if (!buffer.includes(0x0d)) return buffer;
  const out = Buffer.allocUnsafe(buffer.length);
  let written = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const byte = buffer[i];
    if (byte === 0x0d && buffer[i + 1] === 0x0a) continue;
    out[written] = byte;
    written += 1;
  }
  return out.subarray(0, written);
}

export const MANIFEST_PATH = "candidate-trust-manifest.json";

/**
 * STAMP ORDER, because it has bitten three times in one release.
 *
 * `identity.changedPathCount` and `dirtyFiles` describe the WORKING TREE at
 * the moment the stamp is taken, so a stamp is only valid for the commit it
 * is part of if nothing else was uncommitted when it was taken. The sequence
 * that is always correct:
 *
 *     1. commit everything
 *     2. npm run candidate:manifest:update
 *     3. commit the stamp, alone
 *
 * Skip a step and the committed stamp describes a tree state that never
 * existed — which fails `check-candidate-manifest.mjs` on every fresh
 * checkout, because CI has all those files committed and sees a different
 * `changedPathCount` than the one recorded. That failure looks like a
 * tampering alarm and is not one.
 *
 * The stamp is self-consistent here: `pathsFromGit` drops `MANIFEST_PATH`
 * from every list (line 28), so the tree hash does not depend on the
 * manifest's own contents and committing the stamp changes no count.
 */
function git(root, args, encoding = "utf8") {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr?.toString().trim() ?? "unknown error"}`,
    );
  }
  return result.stdout;
}

function pathsFromGit(root, args) {
  return git(root, args, null)
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((path) => path !== MANIFEST_PATH)
    .sort();
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function readCandidateManifest(root) {
  return JSON.parse(readFileSync(join(root, MANIFEST_PATH), "utf8"));
}

export function inspectCandidateWorktree(root) {
  const trackedPaths = pathsFromGit(root, ["ls-files", "-z"]);
  const untrackedPaths = pathsFromGit(root, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
  ]);
  const changedPaths = pathsFromGit(root, [
    "diff",
    "--name-only",
    "-z",
    "HEAD",
  ]);
  const treePaths = [...new Set([...trackedPaths, ...untrackedPaths])].sort();
  const treeParts = treePaths.flatMap((path) => {
    const absolutePath = join(root, path);
    const content = existsSync(absolutePath)
      ? normalizeForHash(readFileSync(absolutePath))
      : Buffer.from("deleted");
    return [Buffer.from(`${path}\0`), content];
  });
  const allDirtyPaths = [
    ...new Set([...changedPaths, ...untrackedPaths]),
  ].sort();
  const packageContent = readFileSync(join(root, "package.json"));
  const { version } = JSON.parse(packageContent.toString("utf8"));

  return {
    version,
    baseSha: git(root, ["rev-parse", "HEAD"]).trim(),
    packageSha256: sha256(packageContent),
    lockfileSha256: sha256(readFileSync(join(root, "package-lock.json"))),
    workingTreeSha256: sha256(Buffer.concat(treeParts)),
    changedPathCount: allDirtyPaths.length,
    dirtyFiles: allDirtyPaths,
    worktreeInventory: {
      changedPaths,
      untrackedPaths,
    },
  };
}

export function buildCandidateManifest(root) {
  const manifest = readCandidateManifest(root);
  return {
    ...manifest,
    generatedAt: new Date().toISOString().slice(0, 10),
    identity: {
      ...manifest.identity,
      ...inspectCandidateWorktree(root),
    },
  };
}
