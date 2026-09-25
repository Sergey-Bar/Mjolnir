import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { decideRelease } from "../src/release/decision.js";

type CommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (script: string): CommandResult =>
  spawnSync(npm, ["run", "--silent", script], {
    encoding: "utf8",
    windowsHide: true,
    shell: process.platform === "win32",
    maxBuffer: 20 * 1024 * 1024,
  });
const jsonStatus = (result: CommandResult) => {
  if (result.status === 0) return "PASS";
  const output = `${result.stdout}\n${result.stderr}`;
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(output.slice(start, end + 1)) as {
        status?: string;
      };
      return parsed.status === "PASS" ? "PASS" : "BLOCKED";
    } catch {
      return "FAIL";
    }
  }
  return "FAIL";
};
const simpleStatus = (result: CommandResult) =>
  result.status === 0 ? "PASS" : "FAIL";
const candidate = run("candidate:readiness");
const m26 = run("m26:audit");
const version = run("version:check");
const claims = run("claims:check");
const roadmap = run("docs:roadmap:check");
const currentVersion = (
  JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    version: string;
  }
).version;
const decision = decideRelease({
  currentVersion,
  publishedVersion: "3.0.0",
  candidateStatus: jsonStatus(candidate),
  m26Status: jsonStatus(m26),
  versionStatus: simpleStatus(version),
  claimsStatus: simpleStatus(claims),
  roadmapStatus: simpleStatus(roadmap),
});
console.log(JSON.stringify(decision, null, 2));
if (decision.status !== "GO") process.exit(1);
