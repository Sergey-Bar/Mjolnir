import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { validateRoadmap } from "../../scripts/roadmap/validate.js";

const root = join(import.meta.dirname, "..", "..");
const roadmap = readFileSync(join(root, "docs", "ROADMAP.yaml"), "utf8");

describe("M26-M50 roadmap", () => {
  it("keeps the complete train registry structurally valid and linked to ledgers", () => {
    const result = validateRoadmap(parse(roadmap));
    expect(result.errors).toEqual([]);
    // Structurally valid is not the same as reconciled — the ledger-backed
    // check below is what computes blockers from what the ledgers say.
    expect(result.blockers).toEqual([]);
    const parsed = parse(roadmap) as {
      dependencyResolution: { status: string; approvedBy: string };
    };
    expect(parsed.dependencyResolution.status).toBe("APPROVED_STAGED");
    expect(parsed.dependencyResolution.approvedBy).toBe("Sergey-Bar");
  });

  it("cites a source authority that every clone can read", () => {
    // The roadmap used to cite a design note under the git-ignored `.kilo/`
    // directory. Present on the authoring machine, absent from the repository:
    // a program whose source of truth nobody else can open.
    const parsed = parse(roadmap) as { source: string };
    expect(parsed.source).toBe("docs/RELEASE-TRAINS.md");
    expect(existsSync(join(root, parsed.source))).toBe(true);
  });

  it("rejects a source authority that git does not track", () => {
    const result = validateRoadmap(parse(roadmap), {
      untrackedSources: ["docs/RELEASE-TRAINS.md"],
    });
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "source authority is not tracked by git: docs/RELEASE-TRAINS.md",
        ),
      ]),
    );
  });

  it("reports untracked decision provenance without blocking on it", () => {
    const result = validateRoadmap(parse(roadmap), {
      untrackedProvenance: [
        ".kilo/plans/1790280258089-qa-sdet-ten-release-trains.md",
      ],
    });
    expect(result.blockers).toEqual([]);
  });

  it("computes real blockers from ledger contents instead of rubber-stamping paths", () => {
    // The previous validator only asked whether the four ledger keys were
    // non-null, so a roadmap pointing at a BLOCKED support matrix reported
    // zero blockers. These facts are what a reader of the ledgers sees.
    const result = validateRoadmap(parse(roadmap), {
      openReleaseBlockers: ["GAP-M26-008", "GAP-M26-009"],
      blockedCells: ["MATRIX-SURFACE-OPTIONAL-CONTROL-PLANE"],
      unboundCells: ["MATRIX-PLATFORM-NODE22-UBUNTU"],
      externalValidationStatus: "BLOCKED",
    });
    expect(result.blockers).toEqual([
      expect.stringContaining(
        "2 open release-blocking gap(s) in the tracked ledger: GAP-M26-008, GAP-M26-009",
      ),
      expect.stringContaining(
        "1 explicitly BLOCKED support-matrix cell(s): MATRIX-SURFACE-OPTIONAL-CONTROL-PLANE",
      ),
      expect.stringContaining(
        "1 support-matrix cell(s) are not bound to a candidate: MATRIX-PLATFORM-NODE22-UBUNTU",
      ),
      expect.stringContaining("external validation is BLOCKED, not COMPLETE"),
    ]);
  });

  it("treats a fully reconciled ledger set as unblocked", () => {
    const result = validateRoadmap(parse(roadmap), {
      openReleaseBlockers: [],
      blockedCells: [],
      unboundCells: [],
      externalValidationStatus: "COMPLETE",
    });
    expect(result.blockers).toEqual([]);
  });

  it("the committed roadmap still resolves every authority it cites", () => {
    const result = validateRoadmap(parse(roadmap), {
      missingSources: ["docs/RELEASE-TRAINS.md"],
    });
    expect(result.blockers.join(" ")).toContain(
      "source authority does not resolve: docs/RELEASE-TRAINS.md",
    );
  });

  it("rejects missing train records and malformed archive ranges", () => {
    const parsed = JSON.parse(JSON.stringify(parse(roadmap))) as {
      trains: Array<{ id: string }>;
      archive: {
        records: Array<{ githubRange: number[]; designRecords: number }>;
      };
    };
    parsed.trains = parsed.trains.filter((train) => train.id !== "M50");
    const firstArchiveRecord = parsed.archive.records[0];
    if (!firstArchiveRecord) throw new Error("roadmap archive is empty");
    firstArchiveRecord.designRecords = 10;
    const result = validateRoadmap(parsed);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "archive M18 count does not match range",
        "missing train M50",
      ]),
    );
  });
});
