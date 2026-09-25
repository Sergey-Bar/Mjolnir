import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCandidateManifest,
  MANIFEST_PATH,
} from "./candidate-manifest.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const root = args.find((arg) => !arg.startsWith("--")) ?? process.cwd();
const manifest = buildCandidateManifest(root);
const output = `${JSON.stringify(manifest, null, 2)}\n`;

if (write) {
  writeFileSync(join(root, MANIFEST_PATH), output, "utf8");
} else {
  process.stdout.write(output);
}
