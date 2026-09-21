/** Test helper: parse a snippet through ts-morph's in-memory project and
 * return the loose `ast` seam value the scanner pipeline would provide. */
import { parseTsFile } from "../../src/engine/ts-ast.js";

export function parseTsSourceFile(
  text: string,
  path = "probe.spec.ts",
): unknown {
  return parseTsFile({ path, text, ast: undefined });
}
