import { execFile, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { normalizeCliJson } from "../../scripts/lib/normalize-cli-json.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..", "..");
const target = join(root, "examples", "demo-repo");
const runs = 4;

if (!existsSync(join(root, "dist", "cli.mjs"))) {
  execSync("npm run build", { cwd: root, stdio: "pipe" });
}

async function scan() {
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [join(root, "dist", "cli.mjs"), target, "--json"],
      {
        encoding: "utf8",
        env: { ...process.env, MJOLNIR_ASCII: "1" },
        maxBuffer: 256 * 1024 * 1024,
      },
    );
    return { code: 0, signature: normalizeCliJson(stdout) };
  } catch (error) {
    const result =
      error && typeof error === "object" ? error : { code: 1, stdout: "{}" };
    if (result.code !== 0 && result.code !== 1) {
      throw error;
    }
    return {
      code: result.code,
      signature: normalizeCliJson(String(result.stdout ?? "{}")),
    };
  }
}

async function main() {
  console.log(`launching ${runs} concurrent scans of ${target}`);
  const results = await Promise.all(Array.from({ length: runs }, scan));
  const first = results[0];
  if (!first) throw new Error("no scan results");
  let failures = 0;
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    if (!result) continue;
    if (result.code !== first.code) {
      failures++;
      console.error(
        `FAIL: scan ${index} exited ${result.code}, expected ${first.code}`,
      );
    }
    if (result.signature !== first.signature) {
      failures++;
      console.error(`FAIL: scan ${index} JSON differs from scan 0`);
    }
  }
  console.log(
    `concurrent scans: ${results.length} runs, ${failures} failure(s)`,
  );
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("concurrent scans failed:", error);
  process.exit(1);
});
