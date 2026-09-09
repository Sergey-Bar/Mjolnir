/**
 * `npm run brand:marks:update` — re-pins the brand marks.
 *
 * The lock this writes is what `brand-doctor` rule 9 checks. Running
 * this is how you say "yes, I meant to change that image" — and the
 * commit that carries the new hash is where you say why.
 *
 * Deliberately dumb: it re-hashes whatever is on disk. It cannot tell a
 * legitimate re-encode from a redrawn hammer, and it is not trying to.
 * The point is that the change stops being silent.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCK = join(ROOT, "assets", "brand", "marks.lock.json");

const lock = JSON.parse(readFileSync(LOCK, "utf8"));
let changed = 0;

for (const group of ["masters", "derived"]) {
  for (const path of Object.keys(lock[group])) {
    const file = join(ROOT, path);
    if (!existsSync(file)) {
      process.stderr.write(`  MISSING  ${path}\n`);
      process.exitCode = 1;
      continue;
    }
    const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
    if (lock[group][path] !== hash) {
      process.stdout.write(
        `  repinned ${path}\n           ${String(lock[group][path]).slice(0, 16)} -> ${hash.slice(0, 16)}\n`,
      );
      lock[group][path] = hash;
      changed++;
    }
  }
}

writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
process.stdout.write(
  changed === 0
    ? "  no mark changed — lock is already current\n"
    : `\n  ${changed} mark(s) repinned. Say why in the commit message.\n`,
);
