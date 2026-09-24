import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildMachineContract } from "../../src/engine/machine-contract.js";
import { runScan } from "../../src/engine/scan-pipeline.js";

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

describe("same-process scan concurrency", () => {
  it("keeps machine-contract digests identical across concurrent scans", async () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-concurrent-"));
    roots.push(root);
    mkdirSync(join(root, "e2e"), { recursive: true });
    for (let index = 0; index < 4; index++) {
      writeFileSync(
        join(root, "e2e", `flow-${index}.spec.ts`),
        `import { test, expect } from '@playwright/test';\ntest('flow ${index}', async ({ page }) => { await expect(page).toBeTruthy(); });\n`,
        "utf8",
      );
    }
    const args = {
      target: root,
      json: true,
      verbose: false,
      maxDurationMs: 600_000,
      scopeChanged: false,
      format: "json" as const,
      strict: false,
      cache: true,
    };
    const results = await Promise.all(
      Array.from({ length: 4 }, () => runScan(args)),
    );
    const digests = results.map(
      (result) => buildMachineContract(result).summary.digest,
    );
    expect(new Set(digests).size).toBe(1);
  });
});
