import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { validateRoadmap } from "../../scripts/roadmap/validate.js";

const root = join(import.meta.dirname, "..", "..");
const roadmap = readFileSync(join(root, "docs", "ROADMAP.yaml"), "utf8");
const parsed = () => parse(roadmap) as Record<string, unknown>;
/** One ladder row, with the free-text fields typed as strings. */
type Row = {
  version: string;
  theme: string;
  promise: string;
  moves: string;
  killCriterion?: string;
  status: string;
};
const rows = (): Row[] => parsed().versions as Row[];

describe("the version ladder", () => {
  it("is structurally valid, with nothing blocking", () => {
    const result = validateRoadmap(parse(roadmap));
    expect(result.errors).toEqual([]);
    expect(result.blockers).toEqual([]);
  });

  it("is five rows, one promise each, one number each", () => {
    const versions = rows();
    expect(versions.map((v) => v.version)).toEqual([
      "6.0",
      "7.0",
      "8.0",
      "9.0",
      "10.0",
    ]);
    for (const row of versions) {
      expect(row.theme, `${row.version} has no theme`).toBeTruthy();
      expect(row.promise, `${row.version} has no promise`).toBeTruthy();
      expect(
        row.moves,
        `${row.version} states no number it moves`,
      ).toBeTruthy();
    }
  });

  it("gives every version a kill criterion, so none of them is a commitment", () => {
    // The failure this prevents is the one the retired program had: a plan a
    // single maintainer could not abandon, because nothing said what abandoning
    // it looked like.
    for (const row of rows()) {
      expect(
        (row.killCriterion ?? "").trim(),
        `${row.version} has no kill criterion`,
      ).not.toBe("");
    }
  });

  it("has exactly one version in progress", () => {
    expect(rows().filter((v) => v.status === "in-progress")).toHaveLength(1);
  });

  it("keeps the retired program's TEXT and says plainly that its claims are not kept", () => {
    const retired = parsed().retiredProgram as Record<string, unknown>;
    expect(retired.id).toBe("M26-M50");
    expect(retired.status).toBe("RETIRED");
    // "Text preserved, claims not." The archive is the record; the plan said
    // so in those words and the gate reads it back, because the failure mode
    // of an archive is that somebody later cites it as a live plan.
    const archive = readFileSync(join(root, String(retired.archive)), "utf8");
    expect(archive).toContain("TEXT PRESERVED, CLAIMS NOT");
    expect(archive).toContain('program: "M26-M50"');
    // The work itself is still in there — a retirement that deleted the text
    // would be indistinguishable from never having written it.
    expect(archive).toMatch(/id:\s*"M50"/);
    expect(archive).toMatch(/dependencyResolution/);
  });

  it("names every ledger the retirement deleted", () => {
    // Otherwise the next reader cannot tell which files went missing on
    // purpose, and re-adds them.
    const retired = parsed().retiredProgram as Record<string, unknown>;
    expect(retired.deletedLedgers).toEqual([
      "docs/M26-GITHUB-SNAPSHOT.json",
      "docs/M26-GAP-LEDGER.jsonl",
      "docs/M26-SUPPORT-MATRIX.json",
      "docs/M26-EXTERNAL-VALIDATION.json",
    ]);
    for (const path of retired.deletedLedgers as string[]) {
      expect(existsSync(join(root, path)), `${path} still exists`).toBe(false);
    }
  });

  it("blocks when the archive does not resolve — a retirement with no record", () => {
    const result = validateRoadmap(parse(roadmap), {
      missingSources: ["docs/archive/ROADMAP-M26-M50.yaml"],
    });
    expect(result.errors.join(" ")).toContain(
      "retiredProgram.archive does not resolve",
    );
  });

  it("blocks on a source git does not track", () => {
    const result = validateRoadmap(parse(roadmap), {
      untrackedSources: ["docs/archive/ROADMAP-M26-M50.yaml"],
    });
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("is not tracked by git"),
      ]),
    );
  });

  it("rejects two versions in progress", () => {
    const broken = JSON.parse(JSON.stringify(parse(roadmap))) as {
      versions: Array<Row>;
    };
    const second = broken.versions[1];
    expect(second).toBeDefined();
    if (second === undefined) return;
    second.status = "in-progress";
    const result = validateRoadmap(broken);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("2 versions are in progress"),
      ]),
    );
  });

  it("rejects a version with no kill criterion", () => {
    const broken = JSON.parse(JSON.stringify(parse(roadmap))) as {
      versions: Array<Row>;
    };
    const third = broken.versions[2];
    expect(third).toBeDefined();
    if (third === undefined) return;
    delete third.killCriterion;
    const result = validateRoadmap(broken);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("8.0 has no killCriterion"),
      ]),
    );
  });
});
