/**
 * Tier 2 stress fixture: generate a mixed-language synthetic repo.
 * Usage: node tests/stress/generate-repo.mjs <fileCount> <targetDir>
 *
 * Deterministic content (seeded) so nightly runs are comparable; the mix
 * mirrors the five shipped adapters (TS/JS, Python, Java, C#, YAML).
 */

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const count = Number(process.argv[2] ?? 10_000);
const target = process.argv[3] ?? join(process.cwd(), "stress-repo");

if (!Number.isFinite(count) || count <= 0) {
  console.error("usage: generate-repo.mjs <fileCount> <targetDir>");
  process.exit(10);
}

// Deterministic PRNG so every nightly generates the SAME repo.
let seed = 0x2f6e2b1;
function rand(max) {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed % max;
}

rmSync(target, { recursive: true, force: true });

const TS_SPEC = (i, debt) =>
  [
    "import { test, expect } from '@playwright/test';",
    `test('generated ${i}', async ({ page }) => {`,
    `  await page.goto('/route-${i}');`,
    debt ? "  await page.waitForTimeout(50);" : "",
    `  await expect(page).toHaveURL('/route-${i}-done');`,
    "});",
    "",
  ]
    .filter(Boolean)
    .join("\n");

const PY_TEST = (i, debt) =>
  [
    "import pytest",
    "",
    `def test_generated_${i}(page):`,
    `    page.goto('/py-${i}')`,
    debt
      ? "    import time; time.sleep(0.01)"
      : "    assert page.url.endswith('/ok')",
    "",
  ]
    .filter(Boolean)
    .join("\n");

const JAVA_TEST = (i) =>
  [
    "import org.junit.jupiter.api.Test;",
    "import static org.junit.jupiter.api.Assertions.assertEquals;",
    "",
    `public class Gen${i}Test {`,
    "  @Test",
    `  void generated${i}() {`,
    `    assertEquals(${i % 7}, 1 + (${i} % 7));`,
    "  }",
    "}",
    "",
  ].join("\n");

const CS_TEST = (i) =>
  [
    "using NUnit.Framework;",
    "",
    `public class Gen${i}Tests {`,
    "  [Test]",
    `  public void Generated${i}() {`,
    `    Assert.That(1 + (${i} % 5), Is.EqualTo(2));`,
    "  }",
    "}",
    "",
  ].join("\n");

const WORKFLOW = (i) =>
  [
    `name: gen-${i}`,
    "on: push",
    "jobs:",
    `  build-${i}:`,
    "    runs-on: ubuntu-latest",
    "    steps:",
    `      - run: echo "generated ${i}"`,
    "",
  ].join("\n");

const generators = [
  (i) => ({
    rel: join("packages", `pkg${i % 20}`, "e2e", `spec${i}.spec.ts`),
    body: TS_SPEC(i, i % 25 === 0),
  }),
  (i) => ({
    rel: join("tests", "python", `test_gen_${i}.py`),
    body: PY_TEST(i, i % 40 === 0),
  }),
  (i) => ({
    rel: join("src", "test", "java", `Gen${i}Test.java`),
    body: JAVA_TEST(i),
  }),
  (i) => ({
    rel: join("tests", "csharp", `Gen${i}Tests.cs`),
    body: CS_TEST(i),
  }),
  (i) => ({
    rel: join(".github", "workflows", `gen-${i}.yml`),
    body: WORKFLOW(i),
  }),
];

let written = 0;
for (let i = 0; written < count; i++) {
  const gen = generators[i % generators.length];
  const { rel, body } = gen(i);
  const full = join(target, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, body);
  written++;
}

console.log(`generated ${written} files in ${target}`);
