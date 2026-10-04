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

  it("is ONE row, one promise each, one number each", () => {
    // Was "five rows". 7.0 through 10.0 were `deferred` with a theme, a promise,
    // moves and a kill criterion each, and no owner or date on any of them —
    // which reads as a schedule nobody committed to. They are retired into
    // `retiredPrograms`, where their surviving ideas are recorded, and this
    // assertion is the reason the ladder cannot silently grow them back: a
    // version row has to be added HERE as well as to the YAML.
    const versions = rows();
    expect(versions.map((v) => v.version)).toEqual(["6.0"]);
    for (const row of versions) {
      expect(row.theme, `${row.version} has no theme`).toBeTruthy();
      expect(row.promise, `${row.version} has no promise`).toBeTruthy();
      expect(
        row.moves,
        `${row.version} states no number it moves`,
      ).toBeTruthy();
    }
  });

  it("records what the retired ladder was for, so retiring it is not a deletion", () => {
    const retired = (
      parsed() as unknown as {
        retiredPrograms?: Array<{
          program?: string;
          survivingIdeas?: unknown[];
        }>;
      }
    ).retiredPrograms;
    expect(Array.isArray(retired), "no retiredPrograms array").toBe(true);
    expect(retired ?? []).toHaveLength(1);
    // Each of the four ideas has to name where it went. A retirement that
    // discards the thinking is a deletion wearing a retirement's vocabulary.
    const ideas = (retired?.[0]?.survivingIdeas ?? []) as string[];
    expect(ideas.length).toBeGreaterThanOrEqual(4);
    for (const id of ["7.0", "8.0", "9.0", "10.0"]) {
      expect(
        ideas.some((i) => i.includes(id)),
        `the retired ladder's ${id} idea is not recorded anywhere`,
      ).toBe(true);
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
    expect(result.errors.join(" ")).toContain(".archive does not resolve");
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
    // Built as a SYNTHETIC roadmap rather than by mutating a row of the real
    // one. The live file has a single version now, so these two tests used to
    // reach for `versions[1]` and `versions[2]` — and with the ladder retired
    // those rows are gone, so the assertions silently became tests of nothing.
    // A rule tested only through a fixture that no longer exists is not tested.
    const row = (version: string, status: string): Row => ({
      version,
      status,
      theme: "t",
      promise: "p",
      moves: "m",
      killCriterion: "k",
    });
    const result = validateRoadmap({
      schemaVersion: 3,
      program: "6.0",
      status: "in-progress",
      retiredProgram: {
        id: "M26-M50",
        status: "RETIRED",
        archive: "docs/archive/ROADMAP-M26-M50.yaml",
        deletedLedgers: ["x"],
        why: "y",
      },
      versions: [row("6.0", "in-progress"), row("6.0", "in-progress")],
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("versions are in progress"),
      ]),
    );
  });

  it("rejects a version with no kill criterion", () => {
    const incomplete = {
      version: "6.0",
      status: "in-progress",
      theme: "t",
      promise: "p",
      moves: "m",
    } as unknown as Row;
    const result = validateRoadmap({
      schemaVersion: 3,
      program: "6.0",
      status: "in-progress",
      retiredProgram: {
        id: "M26-M50",
        status: "RETIRED",
        archive: "docs/archive/ROADMAP-M26-M50.yaml",
        deletedLedgers: ["x"],
        why: "y",
      },
      versions: [incomplete],
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("has no killCriterion")]),
    );
  });
});
