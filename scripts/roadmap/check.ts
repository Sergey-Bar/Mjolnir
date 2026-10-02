/**
 * Roadmap gate.
 *
 * It reads what the roadmap cites and hands the validator the facts, so
 * "the archive is there" means a path that resolves in this checkout and is
 * tracked by git — not that a string was typed into the file. The M26–M50
 * version of this entry point read four ledgers and computed blockers from
 * their contents; those ledgers are deleted and the retired program is not
 * something to keep reconciled.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { validateRoadmap, type RoadmapFacts } from "./validate.js";

const root = process.argv[2] ?? process.cwd();

/**
 * Files git actually tracks. A reference that resolves only on the machine
 * that wrote it is not an authority: a record under an ignored directory cannot
 * be the archive for anybody who clones.
 */
function trackedFiles(): Set<string> {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) return new Set();
  return new Set(
    (result.stdout ?? "")
      .split("\0")
      .filter(Boolean)
      .map((path) => path.replace(/\\/g, "/")),
  );
}

const tracked = trackedFiles();
const readText = (path: string): string | null => {
  try {
    return readFileSync(join(root, path), "utf8");
  } catch {
    return null;
  }
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const roadmapText = readText("docs/ROADMAP.yaml") ?? "";
const roadmap = roadmapText === "" ? null : (parse(roadmapText) as unknown);

const cited = [
  isRecord(roadmap) && isRecord(roadmap.retiredProgram)
    ? roadmap.retiredProgram.archive
    : undefined,
].filter(
  (value): value is string => typeof value === "string" && value.length > 0,
);

const missingSources = cited.filter((path) => !existsSync(join(root, path)));
const untrackedSources = cited.filter(
  (path) => existsSync(join(root, path)) && !tracked.has(path),
);

const facts: RoadmapFacts = { missingSources, untrackedSources };
const result = validateRoadmap(roadmap, facts);

console.log(
  JSON.stringify(
    {
      status:
        result.errors.length > 0
          ? "FAIL"
          : result.blockers.length > 0
            ? "BLOCKED"
            : "PASS",
      cited: {
        missingSources,
        untrackedSources,
      },
      ...result,
    },
    null,
    2,
  ),
);
if (result.errors.length > 0 || result.blockers.length > 0) process.exit(1);
