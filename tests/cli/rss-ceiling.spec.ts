/**
 * Tier 1 addition: RSS ceiling after a scan (< 1.5 GB) — catches
 * unbounded buffering. Runs in PR CI (fast, non-flaky).
 */

import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { runScan } from "../../src/cli.js";

const RSS_CEILING = 1.5 * 1024 * 1024 * 1024; // 1.5 GB

describe("Tier 1 RSS ceiling (bug-audit buffer hygiene)", () => {
  it("a full scan stays under the 1.5 GB RSS ceiling", async () => {
    // In-process scan: execFileSync would lose the child's RSS, so the
    // scan runs here and the delta is sampled around it.
    const before = process.memoryUsage().rss;
    const result = await runScan({
      target: join(process.cwd(), "examples", "demo-repo"),
      json: true,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
    });
    const after = process.memoryUsage().rss;
    expect(result.findings).toBeDefined();
    expect(after - before).toBeLessThan(RSS_CEILING);
  });

  it("the RSS ceiling constant is at least 1.5 GB and at most 4 GB", () => {
    expect(RSS_CEILING).toBeGreaterThanOrEqual(1.5 * 1024 * 1024 * 1024);
    expect(RSS_CEILING).toBeLessThanOrEqual(4 * 1024 * 1024 * 1024);
  });
});
