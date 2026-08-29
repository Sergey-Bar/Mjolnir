/**
 * Real npm-registry install smoke test (Test Hardening Plan — closes the
 * gap `package-smoke.spec.ts` explicitly leaves open).
 *
 * package-smoke.spec.ts packs the tarball and symlinks this repo's own
 * node_modules into place to avoid a network dependency in the default
 * suite. That's fast and fine for every-PR coverage, but it is NOT the
 * same thing as `npm install mjolnir-qa` — it can't catch a genuinely
 * broken transitive dependency resolution, a dependency that's
 * unpublishable, or a registry-specific packaging issue, because the
 * symlinked node_modules is this dev environment's already-working
 * install, not a fresh resolution from the registry.
 *
 * This test does the real thing: packs the tarball, `npm install`s it
 * into a genuinely empty temp directory with NO pre-existing
 * node_modules, letting npm resolve `dependencies` from the registry
 * over the network, then runs the installed binary.
 *
 * Deliberately NOT in the default `npm test` run (network + slower) —
 * wire it into a release/nightly CI job instead, same as corpus audit.
 */

import { execFileSync, execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const RUN = process.env["RUN_REGISTRY_INSTALL_TEST"] === "1";

let workDir: string;
let installDir: string;
// The actual JS entry file (run via `node <entry>`), not the OS-specific
// shim npm generates in .bin/ — that shim needs .cmd on Windows and a
// #!/usr/bin/env node shebang + exec bit on POSIX, neither of which
// execFileSync invokes portably without shell:true. Running the real
// entry file directly is what the shim itself does under the hood, and
// is what package-smoke.spec.ts already does for the same reason.
let entryPath: string;

beforeAll(() => {
  if (!RUN) return;
  execSync("npm run build", { cwd: ROOT, stdio: "pipe" });

  workDir = mkdtempSync(join(tmpdir(), "mjolnir-registry-pack-"));
  const packOut = execSync(`npm pack --pack-destination "${workDir}" --json`, {
    cwd: ROOT,
  }).toString();
  const packResult = (JSON.parse(packOut) as Array<{ filename: string }>)[0];
  if (!packResult) throw new Error("npm pack produced no output entry");
  const { filename } = packResult;
  const tarball = join(workDir, filename);

  installDir = mkdtempSync(join(tmpdir(), "mjolnir-registry-install-"));
  mkdirSync(join(installDir, "node_modules"), { recursive: true });

  // The real thing: let npm resolve `dependencies` from the registry
  // into a directory that never had this repo's node_modules in it.
  execSync(`npm install "${tarball}"`, { cwd: installDir, stdio: "pipe" });

  const installedPkgDir = join(installDir, "node_modules", "mjolnir-qa");
  const installedPkgJson = JSON.parse(
    readFileSync(join(installedPkgDir, "package.json"), "utf8"),
  );
  const binRel =
    typeof installedPkgJson.bin === "string"
      ? installedPkgJson.bin
      : (installedPkgJson.bin["mjolnir"] ?? installedPkgJson.bin.mjolnir);
  entryPath = join(installedPkgDir, binRel);
}, 120_000);

afterAll(() => {
  if (!RUN) return;
  rmSync(workDir, { recursive: true, force: true });
  rmSync(installDir, { recursive: true, force: true });
});

describe.runIf(RUN)(
  "real `npm install` from a tarball, no symlink shortcuts",
  () => {
    it("resolves a real bin entry file from the installed package", () => {
      expect(existsSync(entryPath)).toBe(true);
    });

    it("the installed binary runs against a real fixture repo", () => {
      const fixtureDir = mkdtempSync(
        join(tmpdir(), "mjolnir-registry-fixture-"),
      );
      try {
        mkdirSync(join(fixtureDir, "e2e"), { recursive: true });
        execFileSync("node", [
          "-e",
          `require("fs").mkdirSync(${JSON.stringify(join(fixtureDir, "e2e"))}, {recursive:true});` +
            `require("fs").writeFileSync(${JSON.stringify(
              join(fixtureDir, "e2e", "checkout.spec.ts"),
            )}, "it.only('x', () => { expect(true).toBe(true); });")`,
        ]);

        let out = "";
        try {
          out = execFileSync("node", [entryPath, fixtureDir]).toString();
        } catch (err) {
          // Findings present → non-zero exit by contract; that's success
          // here, not a crash.
          out = String((err as { stdout?: unknown }).stdout ?? "");
        }
        expect(out).toMatch(/SCORE|score/);
      } finally {
        rmSync(fixtureDir, { recursive: true, force: true });
      }
    });
  },
);

if (!RUN) {
  // vitest requires at least one assertion path to exist per file when
  // the suite is otherwise entirely skipped, so this stays visible in
  // reporters instead of silently vanishing.
  describe("real npm-registry install", () => {
    it.skip("set RUN_REGISTRY_INSTALL_TEST=1 to run (network + slow, not in default npm test)", () => {});
  });
}
