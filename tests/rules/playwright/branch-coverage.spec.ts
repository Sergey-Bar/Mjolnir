/**
 * Branch-coverage completion for the Playwright + Python rules that were
 * previously exercised only by a single must-fire / must-not-fire fixture
 * pair. Each `it` here targets a specific arm — an additional regex
 * pattern, a skip guard, a filename gate, or a "no finding" path — that
 * the fixture happened not to reach.
 *
 * These are pure `(SourceFileContext) => Finding[]` calls; no filesystem.
 */

import { describe, expect, it } from "vitest";

import { brittleSelectors } from "../../../src/rules/playwright/qa-pw-004-brittle-selectors.js";
import { evaluateBusinessLogic } from "../../../src/rules/playwright/qa-pw-005-evaluate-logic.js";
import { pwWaitForTimeout } from "../../../src/rules/playwright/qa-pw-101-wait-for-timeout.js";
import { pwMissingTimeout } from "../../../src/rules/playwright/qa-pw-103-missing-timeout.js";
import { pwDeepFrameLocator } from "../../../src/rules/playwright/qa-pw-113-deep-frames.js";
import { pwStorageStateNoExpiry } from "../../../src/rules/playwright/qa-pw-116-storage-state.js";
import { pwSerialNoJustification } from "../../../src/rules/playwright/qa-pw-117-serial.js";
import { pwNoTraceOnRetry } from "../../../src/rules/playwright/qa-pw-122-no-trace.js";
import { hardcodedBaseUrl } from "../../../src/rules/playwright/qa-pw-123-hardcoded-url.js";
import { pwSingleBrowserMatrix } from "../../../src/rules/playwright/qa-pw-144-single-browser.js";
import { pyRandomTimeDependence } from "../../../src/rules/python/qa-py-010-random-time.js";

type Ctx = Parameters<typeof pwWaitForTimeout.run>[0];
const ctx = (path: string, text: string, extra: Partial<Ctx> = {}): Ctx => ({
  path,
  text,
  ...extra,
});

describe("QA-PW-004 brittle selectors — every pattern arm + masked skip", () => {
  it("flags a multi-class chain, a deep structural chain, and an xpath call", () => {
    const src = [
      `await page.locator(".btn.btn-primary").click();`,
      `await page.locator("div > span > a").click();`,
      `await page.locator("xpath=//div[@id='x']").click();`,
      `await page.$x("//a");`,
    ].join("\n");
    const f = brittleSelectors.run(ctx("e2e/a.spec.ts", src));
    expect(f.length).toBeGreaterThanOrEqual(3);
  });

  it("stays silent when the locator call is itself inside a string literal (codeText mask)", () => {
    const raw = `const sample = "page.locator('.a.b.c')";`;
    const codeText = `const sample = ${" ".repeat(raw.length - 15)}`;
    expect(
      brittleSelectors.run(ctx("e2e/a.spec.ts", raw, { codeText })),
    ).toEqual([]);
  });

  it("falls back to comment stripping when no codeText is supplied", () => {
    const src = `// page.locator(".a.b.c")\nawait page.getByRole("button");`;
    expect(brittleSelectors.run(ctx("e2e/a.spec.ts", src))).toEqual([]);
  });
});

describe("QA-PW-005 evaluate logic — AST path and regex fallback", () => {
  it("regex fallback (no ast) flags branching inside evaluate()", () => {
    const src = `await page.evaluate(() => { if (window.x) return 1; return 2; });`;
    const f = evaluateBusinessLogic.run(ctx("e2e/a.spec.ts", src));
    expect(f.length).toBe(1);
  });

  it("regex fallback stays silent on a trivial evaluate read", () => {
    const src = `const t = await page.evaluate(() => document.title);`;
    expect(evaluateBusinessLogic.run(ctx("e2e/a.spec.ts", src))).toEqual([]);
  });
});

describe("QA-PW-101 waitForTimeout", () => {
  it("flags each occurrence", () => {
    const src = `await page.waitForTimeout(500);\nawait page.waitForTimeout(1000);`;
    expect(pwWaitForTimeout.run(ctx("e2e/a.spec.ts", src))).toHaveLength(2);
  });
  it("silent when absent", () => {
    expect(
      pwWaitForTimeout.run(
        ctx("e2e/a.spec.ts", `await expect(x).toBeVisible();`),
      ),
    ).toEqual([]);
  });
});

describe("QA-PW-103 missing timeout", () => {
  it("flags a bare goto() with a single string arg", () => {
    expect(
      pwMissingTimeout.run(
        ctx("e2e/a.spec.ts", `await page.goto("/checkout");`),
      ),
    ).toHaveLength(1);
  });
  it("silent when an options object is passed", () => {
    expect(
      pwMissingTimeout.run(
        ctx("e2e/a.spec.ts", `await page.goto("/x", { timeout: 5000 });`),
      ),
    ).toEqual([]);
  });
});

describe("QA-PW-113 deep frame locators", () => {
  it("flags 3+ chained frameLocator calls", () => {
    const src = `page.frameLocator("#a").frameLocator("#b").frameLocator("#c").locator("x");`;
    expect(pwDeepFrameLocator.run(ctx("e2e/a.spec.ts", src))).toHaveLength(1);
  });
  it("silent on a single frameLocator", () => {
    expect(
      pwDeepFrameLocator.run(
        ctx("e2e/a.spec.ts", `page.frameLocator("#a").locator("x");`),
      ),
    ).toEqual([]);
  });
});

describe("QA-PW-116 storageState expiry", () => {
  it("flags storageState with no visible refresh mechanism", () => {
    const src = `use: { storageState: "auth.json" }`;
    expect(pwStorageStateNoExpiry.run(ctx("pw.config.ts", src))).toHaveLength(
      1,
    );
  });
  it("silent when the file mentions a refresh/expiry keyword", () => {
    const src = `// regenerated each run, see expiresAt check\nuse: { storageState: "auth.json" }`;
    expect(pwStorageStateNoExpiry.run(ctx("pw.config.ts", src))).toEqual([]);
  });
});

describe("QA-PW-117 serial without justification", () => {
  it("flags an unjustified test.describe.serial", () => {
    expect(
      pwSerialNoJustification.run(
        ctx("e2e/a.spec.ts", `test.describe.serial("flow", () => {});`),
      ),
    ).toHaveLength(1);
  });
  it("silent when a justification comment precedes it", () => {
    const src = `// serial: order matters, stateful wizard\ntest.describe.serial("flow", () => {});`;
    expect(pwSerialNoJustification.run(ctx("e2e/a.spec.ts", src))).toEqual([]);
  });
});

describe("QA-PW-122 trace config", () => {
  it("flags a playwright.config with no trace setting", () => {
    expect(
      pwNoTraceOnRetry.run(ctx("playwright.config.ts", `export default {};`)),
    ).toHaveLength(1);
  });
  it("silent when trace: 'on-first-retry' is present", () => {
    expect(
      pwNoTraceOnRetry.run(
        ctx("playwright.config.ts", `use: { trace: "on-first-retry" }`),
      ),
    ).toEqual([]);
  });
  it("ignores non-config files", () => {
    expect(pwNoTraceOnRetry.run(ctx("e2e/a.spec.ts", `no trace here`))).toEqual(
      [],
    );
  });
});

describe("QA-PW-123 hardcoded URL", () => {
  it("flags an absolute non-localhost URL in goto()", () => {
    expect(
      hardcodedBaseUrl.run(
        ctx("e2e/a.spec.ts", `await page.goto("https://staging.acme.com/x");`),
      ),
    ).toHaveLength(1);
  });
  it("silent on a localhost URL", () => {
    expect(
      hardcodedBaseUrl.run(
        ctx("e2e/a.spec.ts", `await page.goto("http://localhost:3000/x");`),
      ),
    ).toEqual([]);
  });
});

describe("QA-PW-144 single-browser matrix", () => {
  it("ignores non-config filenames", () => {
    expect(
      pwSingleBrowserMatrix.run(
        ctx("e2e/a.spec.ts", `projects: [{ name: "x" }]`),
      ),
    ).toEqual([]);
  });
  it("silent when there is no projects array", () => {
    expect(
      pwSingleBrowserMatrix.run(
        ctx("playwright.config.ts", `export default {};`),
      ),
    ).toEqual([]);
  });
  it("flags a config that only ever names one engine", () => {
    const src = `projects: [{ name: "chromium" }, { name: "chrome-hd" }]`;
    expect(
      pwSingleBrowserMatrix.run(ctx("playwright.config.ts", src)),
    ).toHaveLength(1);
  });
  it("silent for a genuine multi-engine matrix", () => {
    const src = `projects: [{ name: "chromium" }, { name: "firefox" }, { name: "webkit" }]`;
    expect(pwSingleBrowserMatrix.run(ctx("playwright.config.ts", src))).toEqual(
      [],
    );
  });
});

describe("QA-PY-010 random/time dependence", () => {
  it("flags random.*, datetime.now(), and time.time()", () => {
    const src = [
      "import random, time, datetime",
      "def test_x():",
      "    a = random.randint(0, 9)",
      "    b = datetime.now()",
      "    c = time.time()",
      "    assert a or b or c",
    ].join("\n");
    const f = pyRandomTimeDependence.run(ctx("test_x.py", src));
    expect(f).toHaveLength(3);
  });

  it("skips a line that also mentions freeze_time / mock / patch", () => {
    const src = [
      "def test_x(freezer):",
      "    with freeze_time('2020-01-01'): now = datetime.now()",
      "    assert now",
    ].join("\n");
    expect(pyRandomTimeDependence.run(ctx("test_x.py", src))).toEqual([]);
  });

  it("ignores non-.py files", () => {
    expect(
      pyRandomTimeDependence.run(ctx("x.ts", `const n = random.randint(0,9)`)),
    ).toEqual([]);
  });
});
