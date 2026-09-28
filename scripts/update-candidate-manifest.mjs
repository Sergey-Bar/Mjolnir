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
  // Run the file through the repo's own formatter before it lands, because
  // `JSON.stringify(_, null, 2)` is not what prettier produces: it leaves
  // arrays-of-one-object expanded across six lines where prettier collapses
  // them. The pre-push hook runs `prettier --check .`, so a generated file
  // that does not match the formatter blocks every push — and the fix is
  // here, in the generator, rather than a person remembering to run
  // `prettier --write` after every stamp. The hash is of the WORKING TREE,
  // not of this file, so reformatting it does not invalidate the stamp.
  const { execFileSync } = await import("node:child_process");
  try {
    execFileSync(
      process.execPath,
      [
        join(root, "node_modules", "prettier", "bin", "prettier.cjs"),
        "--write",
        join(root, MANIFEST_PATH),
      ],
      { cwd: root, stdio: "ignore" },
    );
  } catch {
    // Prettier unavailable (a dependency-free install, a vendored tree):
    // the unformatted file is still correct, and the pre-push hook will say
    // so. Swallowing here keeps the stamp usable in environments where the
    // formatter is not installed, which is the whole point of a generator.
  }
} else {
  process.stdout.write(output);
}
