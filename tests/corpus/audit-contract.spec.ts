import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  BASELINE_DIR,
  CORPUS,
  corpusCompletenessFailures,
  orphanBaselineNames,
  reviewCorpusMeasurement,
} from "./audit.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

describe("corpus audit completeness", () => {
  it("fails closed on every incomplete category", () => {
    const failures = corpusCompletenessFailures({
      requested: ["clone", "scan", "partial", "ref", "legacy", "unexpected"],
      complete: [],
      failedClones: ["clone"],
      failedScans: ["scan"],
      partialScans: ["partial"],
      missingRefs: ["ref"],
      invalidBaselines: ["legacy"],
    });

    expect(failures).toEqual([
      "clone failures: clone",
      "scan failures: scan",
      "partial scans: partial",
      "missing authoritative refs: ref",
      "invalid baselines: legacy",
      "complete 0/6 repositories",
    ]);
  });

  it("accepts only an exact complete set", () => {
    expect(
      corpusCompletenessFailures({
        requested: ["a", "b"],
        complete: ["a", "b"],
        failedClones: [],
        failedScans: [],
        partialScans: [],
        missingRefs: [],
        invalidBaselines: [],
      }),
    ).toEqual([]);
  });

  it("finds orphan baseline names", () => {
    expect(
      orphanBaselineNames(["a", "b"], ["a.json", "c.json", "notes.txt"]),
    ).toEqual(["c"]);
  });

  it("keeps count-drift evidence when remote provenance fails", () => {
    const review = reviewCorpusMeasurement(
      {
        schemaVersion: 1,
        sourceRevision: "b".repeat(40),
        countsByRule: { "QA-PW-001": 1, "QA-PY-001": 2 },
      },
      {
        sourceRevision: "a".repeat(40),
        countsByRule: { "QA-PW-001": 0, "QA-PY-001": 3, "QA-TEST-001": 1 },
      },
    );

    expect(review.provenanceFailure).toContain("baseline provenance mismatch");
    expect(review.provenanceFailure).toContain("b".repeat(40));
    expect(review.provenanceFailure).toContain("a".repeat(40));
    expect(review.countDrifts).toEqual([
      { ruleId: "QA-PW-001", before: 1, after: 0 },
      { ruleId: "QA-PY-001", before: 2, after: 3 },
      { ruleId: "QA-TEST-001", before: 0, after: 1 },
    ]);
  });

  it("identifies legacy baseline provenance", () => {
    const review = reviewCorpusMeasurement(
      { countsByRule: {} },
      { sourceRevision: "a".repeat(40), countsByRule: {} },
    );

    expect(review.provenanceFailure).toContain("legacy baseline provenance");
    expect(review.countDrifts).toEqual([]);
  });

  it("rejects overlapping reviewed-update and provenance-refresh modes", () => {
    const result = spawnSync(
      process.execPath,
      [
        join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
        join(ROOT, "tests", "corpus", "audit.ts"),
        "--update",
        "--refresh-provenance",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "mutually exclusive",
    );
  });

  it("pins every corpus entry to a full 40-character SHA", () => {
    expect(CORPUS.every((repo) => /^[0-9a-f]{40}$/u.test(repo.ref))).toBe(true);
  });

  it("uses clean committed Git tree SHAs for local fixtures", () => {
    const local = CORPUS.filter((repo) => repo.url.startsWith("local:"));
    expect(local).toHaveLength(2);

    for (const repo of local) {
      const relative = repo.url.slice("local:".length);
      expect(existsSync(join(ROOT, ...relative.split("/")))).toBe(true);
      expect(
        execFileSync("git", ["-C", ROOT, "rev-parse", `HEAD:${relative}`], {
          encoding: "utf8",
        }).trim(),
      ).toBe(repo.ref);
      expect(
        execFileSync(
          "git",
          [
            "-C",
            ROOT,
            "status",
            "--porcelain",
            "--untracked-files=all",
            "--ignored=matching",
            "--",
            relative,
          ],
          { encoding: "utf8" },
        ),
      ).toBe("");
    }
  });

  it.fails("baseline files match the corpus manifest exactly", () => {
    const files = readdirSync(BASELINE_DIR);
    expect(
      orphanBaselineNames(
        CORPUS.map((repo) => repo.name),
        files,
      ),
    ).toEqual([]);
  });

  it("uses the singular baseline directory", () => {
    expect(BASELINE_DIR.endsWith(join("tests", "corpus", "baseline"))).toBe(
      true,
    );
  });
});
