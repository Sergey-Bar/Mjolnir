import { readFileSync } from "node:fs";
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
    expect(result.blockers).toEqual([]);
    const parsed = parse(roadmap) as {
      dependencyResolution: { status: string; approvedBy: string };
    };
    expect(parsed.dependencyResolution.status).toBe("APPROVED_STAGED");
    expect(parsed.dependencyResolution.approvedBy).toBe("Sergey-Bar");
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
