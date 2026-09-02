import { runScan } from "../../src/cli.js";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "probe-test001-"));
mkdirSync(join(dir, "e2e"), { recursive: true });
writeFileSync(
  join(dir, "e2e", "focused.spec.ts"),
  "test.only('a', () => { expect(1 + 1).toBe(2); });\n",
);
const r = await runScan({
  target: dir,
  json: true,
  verbose: false,
  maxDurationMs: Number.POSITIVE_INFINITY,
  scopeChanged: false,
  format: "json",
  strict: true,
});
console.log(r.findings.map((f) => [f.ruleId, f.severity, f.evidenceLevel]));
rmSync(dir, { recursive: true, force: true });
