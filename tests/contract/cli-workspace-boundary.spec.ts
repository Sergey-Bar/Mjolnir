/**
 * T7 — a scan must not read outside the tree it was pointed at.
 *
 * `runScan` calls `discoverWorkspace(args.target)`, which walks UP past the
 * target looking for a `package.json` to establish the project boundary, and
 * reads that manifest. When the target is a strict descendant of the
 * discovered root, the pipeline re-anchors the scan root to the target so
 * sibling packages are not walked — and carried the DISCOVERED root's parsed
 * `packageJson` along with it.
 *
 * `detectFrameworks(workspace)` then answered from that inherited object: a
 * scan of `monorepo/packages/foo` reported `jest` because
 * `monorepo/package.json` said so. Two claims in one. The read happened
 * outside the explicit scan root, and the framework verdict described a tree
 * the reader never pointed at — so a report could name a framework that no
 * file in the scanned subtree uses.
 *
 * This is the CLI equivalent of `tests/contract/mcp-workspace-boundary.spec.ts`,
 * which already proves the same containment property for the MCP stdio tool.
 * The CLI and the MCP server are two entrances to one scan, and a boundary
 * that holds for one and not the other is not a boundary.
 *
 * WHAT THIS DOES NOT DO, deliberately: the deferred half of the same finding
 * is the `postScan` consumer removal (V5-054). The version-surface
 * consistency check and the confidence adjustment both need a trustworthy
 * workspace, and removing the consumer before the evidence is trustworthy
 * would trade one false-green for another. The count is surfaced through
 * `frameworkDetectionUnknown`, which the arms below assert — so a reader who
 * gets no verdict is told so, rather than given a parent's.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseArgs, runScan } from "../../src/cli.js";
import { detectFrameworks } from "../../src/discovery/frameworks.js";
import { discoverWorkspace } from "../../src/discovery/workspace.js";

/** outer/ is a monorepo root with jest; inner/ is the package we point at. */
let outer: string;
let inner: string;
let plain: string;

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

beforeAll(() => {
  outer = mkdtempSync(join(tmpdir(), "mjolnir-containment-"));
  inner = join(outer, "packages", "inner");
  plain = mkdtempSync(join(tmpdir(), "mjolnir-containment-plain-"));
  mkdirSync(join(inner, "e2e"), { recursive: true });
  mkdirSync(join(plain, "e2e"), { recursive: true });

  writeJson(join(outer, "package.json"), {
    name: "outer-monorepo",
    jest: { preset: "ts-jest" },
    devDependencies: { jest: "^29.0.0" },
  });
  // `inner/` deliberately has NO manifest. That is what makes the
  // re-anchor branch fire: `findProjectRoot` walks up past it, finds
  // `outer/`, and the pipeline then re-anchors the scan root back to
  // `inner/`. A fixture where `inner/` had its own package.json would stop
  // the walk here, never trigger the branch, and prove nothing.
  writeJson(join(plain, "package.json"), { name: "plain" });

  // A test file in each so a scan has something to analyze.
  writeFileSync(join(inner, "e2e", "a.spec.ts"), "it('a', () => {});\n");
  writeFileSync(join(plain, "e2e", "a.spec.ts"), "it('a', () => {});\n");
});

afterAll(() => {
  if (outer) rmSync(outer, { recursive: true, force: true });
  if (plain) rmSync(plain, { recursive: true, force: true });
});

function scan(target: string) {
  const parsed = parseArgs([target]);
  if (!parsed) throw new Error("parseArgs failed");
  return runScan({ ...parsed, target, maxDurationMs: 600_000 });
}

describe("T7: framework detection reads only inside the anchored scan root", () => {
  it("a subdirectory scan does not inherit the parent manifest's jest", async () => {
    const result = await scan(inner);

    // The claim that was made: this repository uses jest.
    expect(
      result.frameworks,
      "the parent's package.json declared jest, and the scan read it from outside its own root",
    ).not.toContain("jest");
    // The honest replacement: no in-root evidence, so say the framework is
    // unknown rather than name one. An empty list with a disclosure is a
    // statement a reader can act on; a parent's answer is not.
    expect(result.frameworkDetectionUnknown).toBe(true);
    expect(result.frameworks).toEqual([]);
  });

  it("no finding is attributed to a path outside the scan root", async () => {
    const result = await scan(inner);
    const rootAbs = resolve(inner);
    for (const finding of result.findings) {
      expect(
        resolve(rootAbs, finding.file).startsWith(rootAbs),
        `finding in ${finding.file} resolves outside the scan root ${rootAbs}`,
      ).toBe(true);
      // The parent manifest lives one level up; a finding there would be the
      // clearest possible statement that the containment is nominal.
      expect(finding.file.startsWith("..")).toBe(false);
    }
  });

  it("scanning the project root itself still detects jest", async () => {
    // The control. Without this, "no jest anywhere" would be an equally
    // consistent story, and the arm above would prove nothing.
    const result = await scan(outer);
    expect(result.frameworks).toContain("jest");
    expect(result.frameworkDetectionUnknown).toBe(false);
  });

  it("a manifest-free target with no in-root evidence is disclosed as unknown", () => {
    // The direct unit arm, independent of the scan pipeline, so the
    // property is pinned at the detector rather than only through its
    // caller — and so the fixture itself is proven to exercise the branch.
    const ws = discoverWorkspace(inner) as NonNullable<
      ReturnType<typeof discoverWorkspace>
    >;
    // The walk really did escape `inner/` and land on the monorepo root.
    expect(ws.root).toBe(resolve(outer));
    expect(ws.packageJson["jest"]).toBeDefined();
    // The re-anchored workspace the pipeline builds: root moved to the
    // target, inherited manifest dropped. With the manifest still attached
    // the detector would answer "jest" — which is the defect.
    const anchored = { ...ws, root: resolve(inner), packageJson: {} };
    const info = detectFrameworks(anchored);
    expect(info.frameworks).toEqual([]);
    expect(info.unknown).toBe(true);
  });

  it("a directory with its own manifest still resolves against that manifest", () => {
    // Containment must not become blindness: the fix drops the INHERITED
    // manifest, not the anchor's own. The manifest is read at the anchored
    // root, which is exactly what the pipeline now does.
    const own = join(outer, "packages", "with-own");
    mkdirSync(join(own, "e2e"), { recursive: true });
    const ownManifest = {
      name: "own",
      devDependencies: { vitest: "^3.0.0" },
    };
    writeJson(join(own, "package.json"), ownManifest);

    const ws = discoverWorkspace(own) as NonNullable<
      ReturnType<typeof discoverWorkspace>
    >;
    // Its own manifest stops the walk, so the discovered root IS the target
    // and the re-anchor branch never fires.
    expect(ws.root).toBe(resolve(own));
    const info = detectFrameworks({
      ...ws,
      root: resolve(own),
      packageJson: ownManifest,
    });
    expect(info.frameworks).toEqual(["vitest"]);
    expect(info.unknown).toBe(false);
  });
});
