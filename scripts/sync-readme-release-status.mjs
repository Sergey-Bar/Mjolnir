import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { syncTranslation } from "./readme-release-status.mjs";

const root = process.argv[2] ?? process.cwd();
const readme = readFileSync(join(root, "README.md"), "utf8");
const syncedAt = new Date().toISOString().slice(0, 10);
const files = readdirSync(root)
  .filter((file) => /^README\.[a-z]+\.md$/u.test(file))
  .sort();
let changed = 0;
for (const file of files) {
  const path = join(root, file);
  const before = readFileSync(path, "utf8");
  const after = syncTranslation(before, readme, syncedAt);
  if (after !== before) {
    writeFileSync(path, after, "utf8");
    changed += 1;
  }
}
console.log(
  JSON.stringify({
    status: "PASS",
    translations: files.length,
    changed,
    syncedAt,
  }),
);
