import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  discoverEvidenceCandidates,
  missingEvidenceMessage,
} from "../../src/discovery/evidence-discovery.js";

const scratch: string[] = [];
afterEach(() => {
  for (const dir of scratch.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

const TRX = `<?xml version="1.0" encoding="UTF-8"?>
<TestRun name="dotnet test">
  <Results>
    <UnitTestResult executionId="e1" testId="t1" testName="Passes" outcome="Passed" duration="00:00:00.0010000" />
  </Results>
</TestRun>`;

describe("the .NET evidence convention", () => {
  it("finds `./TestResults` — the directory `dotnet test` writes by default", () => {
    // The convention is the DIRECTORY, not a `*.trx` file pattern, because
    // `dotnet test` names the file `<timestamp>_<machine>.trx` and nothing about
    // that is predictable. Discovery matches exact names, so a glob would have
    // meant the finder and the runner disagreed about what a convention is.
    const root = mkdtempSync(join(tmpdir(), "mjolnir-dotnet-"));
    scratch.push(root);
    mkdirSync(join(root, "TestResults"), { recursive: true });
    writeFileSync(join(root, "TestResults", "machine_2026-10-04.trx"), TRX);

    const found = discoverEvidenceCandidates(root);
    expect(found.map((c) => c.convention)).toContain("dotnet-trx");
    const hit = found.find((c) => c.convention === "dotnet-trx");
    expect(hit?.path.replace(/\\/g, "/")).toContain("TestResults");
  });

  it("does not fire on a directory that is merely named like one", () => {
    // A bare `TestResults/` with no `.trx` in it is still discovered as a
    // CANDIDATE — discovery proposes, the parser disposes. What must not happen
    // is the convention matching something else entirely, so this asserts the
    // negative: a repo with no TestResults gets no dotnet candidate.
    const root = mkdtempSync(join(tmpdir(), "mjolnir-nodotnet-"));
    scratch.push(root);
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "Program.cs"), "class P {}");
    expect(
      discoverEvidenceCandidates(root).map((c) => c.convention),
    ).not.toContain("dotnet-trx");
  });

  it("names the .NET convention in the missing-evidence message", () => {
    // The message tells a user where to look when nothing was found. Leaving
    // `TestResults` out of it would make the new convention undiscoverable by
    // the one mechanism that explains discovery.
    const root = mkdtempSync(join(tmpdir(), "mjolnir-empty-"));
    scratch.push(root);
    const message = missingEvidenceMessage(root);
    expect(message).toContain("TestResults");
  });

  it("still searches the same depth as every other convention", () => {
    // The convention is a directory, and directories are discovered by NAME at
    // each level — the same traversal every file convention uses. Asserting it
    // is reachable at depth 1 keeps a future change to SEARCH_DEPTH from
    // quietly making .NET the only ecosystem that needs a deeper tree.
    const root = mkdtempSync(join(tmpdir(), "mjolnir-depth-"));
    scratch.push(root);
    mkdirSync(join(root, "tests"), { recursive: true });
    mkdirSync(join(root, "tests", "TestResults"), { recursive: true });
    expect(discoverEvidenceCandidates(root).map((c) => c.convention)).toContain(
      "dotnet-trx",
    );
  });
});
