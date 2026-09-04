/**
 * `npm run docs:forensics-samples` — regenerates the committed forensics
 * samples the site's `/guide/forensics` page renders, from the REAL
 * forensics + selector-health code paths run against
 * `examples/demo-repo`.
 *
 * The guide page used to hand-type these terminal blocks. Hand-typed
 * output is the site's D1 defect class: the page's Selector Health
 * sample said 83/100 for checkout.spec.ts while the tool actually
 * printed 86/100, and it silently omitted login.spec.ts (65/100) —
 * drift with nothing watching, on a page whose argument is that the
 * tool reads real run data. This script closes the gap the same way
 * `docs:hero` did: the samples are actual program output, committed,
 * and locked against drift by a reproducibility spec.
 *
 * The demo repo is deliberately representative, not flattering: its
 * Playwright results contain a TRUE-FLAKE (pass on attempt ≥ 2), a
 * FAILING test, and a spec with a css-chain locator — a clean fixture
 * would contradict the page's own argument.
 *
 * Usage: npm run docs:forensics-samples
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runForensics } from "../src/forensics/run.js";
import {
  computeSelectorHealth,
  renderSelectorHealth,
} from "../src/playwright/selector-health.js";
import { createIgnoreMatcher } from "../src/discovery/ignores.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DEMO_REPO = join(ROOT, "examples", "demo-repo");
const OUT_DIR = join(ROOT, "assets", "readme");

// writeFlakyMd: false — the sample must not scatter artifacts into the
// fixture it reads.
const forensics = runForensics(join(DEMO_REPO, "test-results"), {
  writeFlakyMd: false,
});
writeFileSync(
  join(OUT_DIR, "forensics-sample.txt"),
  forensics.output.trimEnd() + "\n",
  "utf8",
);

const specs = computeSelectorHealth(DEMO_REPO, createIgnoreMatcher(DEMO_REPO));
if (specs.length === 0) {
  throw new Error(
    "selector health found no Playwright specs in examples/demo-repo — " +
      "the fixture moved?",
  );
}
writeFileSync(
  join(OUT_DIR, "selector-health-sample.txt"),
  renderSelectorHealth(specs).trimEnd() + "\n",
  "utf8",
);

const flaky = forensics.report.verdicts.filter((v) => v.passedOnRetry).length;
console.log(
  `Wrote forensics-sample.txt (${forensics.report.totalTests} tests, ` +
    `${flaky} true-flake) and selector-health-sample.txt (${specs.length} specs).`,
);
