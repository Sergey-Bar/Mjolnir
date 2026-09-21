/**
 * Regression: `let [a, b] = …` / `let { page } = …` destructuring at module
 * level used to be split on `,` into junk "names" (`[a`, `b]`) that were then
 * interpolated into a `new RegExp(...)` — a crash risk and a source of
 * nonsense findings. Destructuring is now skipped entirely.
 *
 * Also: a module-level `let` assigned ONLY inside a before* hook is the
 * legitimate per-test setup pattern and must stay silent.
 */
import { expect, test } from "@playwright/test";

let [width, height] = [1280, 720];
let { baseURL } = { baseURL: "http://localhost:3000" };

let page: import("@playwright/test").Page;

test.beforeEach(async ({ browser }) => {
  page = await browser.newPage();
});

test("reassigns destructured bindings — still not order-dependence", async () => {
  [width, height] = [800, 600];
  ({ baseURL } = { baseURL: "http://localhost:4000" });
  await page.setViewportSize({ width, height });
  await page.goto(baseURL);
  await expect(page).toHaveTitle(/Home/);
});
