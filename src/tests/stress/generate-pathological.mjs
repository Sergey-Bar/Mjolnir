/**
 * Tier 2 stress fixture: pathological trees — deep nesting, 10k-char
 * lines, unicode/space filenames, LF/CRLF/BOM mixes, symlinked dirs.
 * Usage: node tests/stress/generate-pathological.mjs <targetDir>
 */

import {
  mkdirSync,
  symlinkSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";

const target = process.argv[2] ?? join(process.cwd(), "patho");

rmSync(target, { recursive: true, force: true });

// 200-deep directory nesting with one spec at the bottom.
let deep = target;
for (let i = 0; i < 200; i++) {
  deep = join(deep, `level-${i}`);
}
mkdirSync(deep, { recursive: true });
writeFileSync(
  join(deep, "deep.spec.ts"),
  "it('bottom of the rabbit hole', () => { expect(1).toBe(1); });\n",
);

// 10k-character single lines.
mkdirSync(join(target, "long-lines"), { recursive: true });
writeFileSync(
  join(target, "long-lines", "long.spec.ts"),
  `it('long line', () => {\n  const s = "${"x".repeat(10_000)}";\n  expect(s.length).toBe(10_000);\n});\n`,
);

// Unicode + space filenames.
mkdirSync(join(target, "unicode dir ✓"), { recursive: true });
writeFileSync(
  join(target, "unicode dir ✓", "ünïcödé — test.spec.ts"),
  "it('unicode', () => { expect(1).toBe(1); });\n",
);

// LF / CRLF / BOM mixes.
mkdirSync(join(target, "line-endings"), { recursive: true });
writeFileSync(
  join(target, "line-endings", "lf.spec.ts"),
  "it('lf', () => { expect(1).toBe(1); });\nit('lf2', () => { expect(2).toBe(2); });\n",
);
writeFileSync(
  join(target, "line-endings", "crlf.spec.ts"),
  "it('crlf', () => { expect(1).toBe(1); });\r\nit('crlf2', () => { expect(2).toBe(2); });\r\n",
);
writeFileSync(
  join(target, "line-endings", "bom.spec.ts"),
  "\uFEFFit('bom', () => { expect(1).toBe(1); });\n",
);

// Symlinked directory (POSIX only; junctions need privileges on Win32).
const realDir = join(target, "real");
const linkDir = join(target, "linked");
mkdirSync(realDir, { recursive: true });
writeFileSync(join(realDir, "r.spec.ts"), "it('real', () => {});\n");
if (!existsSync(linkDir)) {
  try {
    symlinkSync(realDir, linkDir, "junction");
  } catch {
    // Symlink privileges unavailable — the tree still exercises the walk.
  }
}

// A spec that crashes the parser on purpose? No — honesty: a malformed
// spec that the masker must tolerate without crashing the scan.
writeFileSync(
  join(target, "malformed.spec.ts"),
  "it('unterminated string, () => { const s = '\n",
);

console.log(`generated pathological trees in ${target}`);
