import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { validateRoadmap } from "./validate.js";

const root = process.argv[2] ?? process.cwd();
const path = join(root, "docs", "ROADMAP.yaml");
const result = validateRoadmap(parse(readFileSync(path, "utf8")));
console.log(
  JSON.stringify(
    { status: result.errors.length > 0 ? "FAIL" : "PASS", ...result },
    null,
    2,
  ),
);
if (result.errors.length > 0 || result.blockers.length > 0) process.exit(1);
